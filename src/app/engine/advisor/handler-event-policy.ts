import {
  DISTRICT_ZERO_WIN_LOSS_THRESHOLDS,
  getLedgerEntryDefinition,
} from '../content';
import type {
  EventChoiceDefinition,
  GameState,
  PressureDelta,
  PressureId,
  Pressures,
} from '../model';
import { PRESSURE_IDS } from '../model';
import {
  getRunRules,
  resolveEventChoice,
} from '../simulation';
import type {
  AdvisorConfidence,
  AdvisorMessage,
  HandlerEventRecommendation,
  HandlerInvalidRecommendation,
  HandlerReasonCode,
  HandlerRecommendation,
} from './advisor-types';
import { selectDominionPace } from './dominion-pace';
import {
  selectLegalEventChoiceOptions,
  type LegalEventChoiceOption,
} from './legal-options';

export type HandlerEventPolicyInput = {
  state: GameState;
  legalOptions?: readonly LegalEventChoiceOption[];
};

type HandlerEventPlan = {
  option: LegalEventChoiceOption;
  eventDefinitionId: HandlerEventRecommendation['eventId'];
  projectedState: GameState;
  projectedPressures: Pressures;
  score: number;
  reasonCodes: HandlerReasonCode[];
};

export function recommendHandlerEvent(input: HandlerEventPolicyInput): HandlerRecommendation {
  const state = input.state;
  const currentRead = selectEventCurrentRead(state);
  const legalOptions = input.legalOptions ?? selectLegalEventChoiceOptions(state);

  if (state.gameOver) {
    return emptyEventRecommendation('game_over', 'Run complete.', currentRead);
  }

  if (state.phase !== 'EVENT_CHOICE') {
    return emptyEventRecommendation(
      'command',
      'Queue orders and advance the week before choosing fallout.',
      currentRead,
    );
  }

  const plans = buildEventChoicePlans(state, legalOptions);
  const bestPlan = [...plans].sort((left, right) => right.score - left.score)[0];

  if (!bestPlan) {
    return {
      ...emptyEventRecommendation('event', 'No legal event choices are available.', currentRead),
      confidence: 'low',
      warnings: [
        {
          id: 'handler-no-legal-event-choices',
          tone: 'danger',
          text: 'No legal fallout responses are available. Check event costs and Ledger requirements.',
          reasonCode: 'plan_warning',
        },
      ],
      invalidRecommendations: [
        {
          id: state.pendingEvent?.id ?? 'missing-event',
          reason: 'No legal event choices available',
        },
      ],
    };
  }

  const warnings = selectEventWarnings(state, bestPlan);
  const invalidRecommendations = validateEventRecommendation(state, bestPlan.option);
  const recommendation = toEventRecommendation(bestPlan, warnings);

  return {
    phase: 'event',
    confidence: getEventConfidence(bestPlan, warnings, invalidRecommendations),
    currentRead,
    recommendedOrders: [],
    eventRecommendation: recommendation,
    warnings,
    opportunities: selectEventOpportunities(bestPlan),
    planAssessment: summarizeEventPlan(state, bestPlan),
    invalidRecommendations,
  };
}

export function buildEventChoicePlans(
  state: GameState,
  legalOptions: readonly LegalEventChoiceOption[] = selectLegalEventChoiceOptions(state),
): HandlerEventPlan[] {
  if (state.phase !== 'EVENT_CHOICE') {
    return [];
  }

  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return [];
  }

  return legalOptions.flatMap((option) => {
    const resolved = resolveEventChoice(state, option.eventId, option.choiceId);

    if (!resolved.ok) {
      return [];
    }

    const projectedPressures = resolved.state.pressures;
    const reasonCodes = selectEventReasonCodes(state, option.choice, projectedPressures);

    return [
      {
        option,
        eventDefinitionId: pendingEvent.definitionId,
        projectedState: resolved.state,
        projectedPressures,
        score:
          scoreProjectedPressures(state, projectedPressures) +
          scoreEventChoice(state, option, resolved.state),
        reasonCodes,
      },
    ];
  });
}

export function isRecommendedEventChoice(
  recommendation: HandlerRecommendation,
  choiceId: string,
): boolean {
  return recommendation.eventRecommendation?.choiceId === choiceId;
}

function scoreProjectedPressures(state: GameState, projected: Pressures): number {
  const rules = getRunRules(state);
  const delta = diffPressures(state.pressures, projected);
  const immediateLossPenalty = isLosingProjection(projected) ? -120_000 : 0;
  const victoryBonus = projected.dominion >= rules.dominionTarget ? 28_000 : 0;
  const dominionNeeded = Math.max(0, rules.dominionTarget - state.pressures.dominion);
  const stable = getWorstSafetyMargin(state.pressures) >= 0.34;
  const dominionWeight = stable ? 20 : 7;
  const lateDominionWeight = state.week >= 6 || dominionNeeded <= 24 ? 26 : dominionWeight;

  return (
    immediateLossPenalty +
    victoryBonus +
    (delta.dominion ?? 0) * lateDominionWeight +
    pressureSafetyScore(projected) +
    redZoneReliefScore(state.pressures, projected) +
    (delta.resources ?? 0) * (state.pressures.resources <= 1400 ? 0.045 : 0.012) +
    (delta.intel ?? 0) * 0.9 +
    (delta.ruin ?? 0) * -5
  );
}

function scoreEventChoice(
  state: GameState,
  option: LegalEventChoiceOption,
  projected: GameState,
): number {
  const choice = option.choice;
  const netDelta = getChoiceNetDelta(choice);
  const ledgerScore = scoreLedgerEffects(choice);
  const contactScore = option.preview.contactEffects.reduce(
    (score, effect) => score + scoreContactEffect(effect.id, effect.value),
    0,
  );
  const frontScore = option.preview.frontEffects.reduce(
    (score, effect) => score + scoreFrontEffect(effect.id, effect.value),
    0,
  );
  const factionScore = option.preview.factionEffects.reduce(
    (score, effect) => score + scoreFactionEffect(effect.id, effect.value),
    0,
  );
  const campaignScore = scoreCampaignFit(state, netDelta);
  const futureToolScore =
    projected.ledger.entries.filter((entry) => !entry.consumed).length -
    state.ledger.entries.filter((entry) => !entry.consumed).length;

  return (
    ledgerScore +
    contactScore +
    frontScore +
    factionScore +
    campaignScore +
    futureToolScore * 10
  );
}

function scoreLedgerEffects(choice: EventChoiceDefinition): number {
  return (choice.ledgerEffects ?? []).reduce((score, effect) => {
    if (effect.type === 'create') {
      const definition = getLedgerEntryDefinition(effect.definitionId);

      if (definition?.kind === 'debt') {
        return score - 38;
      }

      if (definition?.kind === 'favor') {
        return score + 22;
      }

      return score + 16;
    }

    if (effect.type === 'resolve') {
      return score + 42;
    }

    return score - 12;
  }, 0);
}

function scoreContactEffect(id: string, value: number): number {
  switch (id) {
    case 'trust':
      return value * 2.8;
    case 'leverage':
      return value * 1.4;
    case 'volatility':
      return value * -2.6;
    case 'exposure':
      return value * -1.8;
    default:
      return 0;
  }
}

function scoreFrontEffect(id: string, value: number | boolean): number {
  if (id === 'exposure' && typeof value === 'number') {
    return value * -2.2;
  }

  if (id === 'compromised' && value === true) {
    return -45;
  }

  if (id === 'active' && value === true) {
    return 12;
  }

  return 0;
}

function scoreFactionEffect(id: string, value: number): number {
  switch (id) {
    case 'standing':
      return value * 1.8;
    case 'suspicion':
      return value * -2.4;
    case 'obligation':
      return value * -2.8;
    default:
      return 0;
  }
}

function scoreCampaignFit(state: GameState, delta: PressureDelta): number {
  switch (state.campaign.tensionId) {
    case 'campaign_corp_crackdown':
      return (delta.heat ?? 0) * (state.pressures.heat >= 62 ? -4.8 : -1.8);
    case 'campaign_nightlife_war':
      return (delta.loyalty ?? 0) * 3 + (delta.dominion ?? 0) * 1.3;
    case 'campaign_ghostline_signal':
      return (delta.ruin ?? 0) * (state.pressures.ruin >= 18 ? -5 : -1.8) + (delta.intel ?? 0);
    case 'campaign_industrial_cut':
      return (delta.resources ?? 0) * 0.018 + (delta.heat ?? 0) * -2.2;
    case 'campaign_dirty_capital':
      return (delta.resources ?? 0) * 0.018 - createsDebtLikeRisk(delta) * 8;
  }
}

function selectEventReasonCodes(
  state: GameState,
  choice: EventChoiceDefinition,
  projected: Pressures,
): HandlerReasonCode[] {
  const codes = new Set<HandlerReasonCode>();

  if (projected.dominion > state.pressures.dominion) {
    codes.add('dominion_pace');
  }

  if (state.pressures.heat >= 76 || projected.heat < state.pressures.heat) {
    codes.add('heat_crisis');
  }

  if (state.pressures.resources <= 1800 || projected.resources > state.pressures.resources) {
    codes.add('resource_danger');
  }

  if (state.pressures.loyalty <= 32 || projected.loyalty > state.pressures.loyalty) {
    codes.add('loyalty_danger');
  }

  if ((choice.ledgerEffects ?? []).length > 0) {
    codes.add('useful_ledger');
  }

  if (choice.frontEffects) {
    codes.add('front_exposure');
  }

  if (choice.factionEffects) {
    codes.add('faction_obligation');
  }

  if (choice.contactEffects) {
    codes.add('contact_volatility');
  }

  codes.add('campaign_priority');

  return [...codes];
}

function toEventRecommendation(
  plan: HandlerEventPlan,
  warnings: readonly AdvisorMessage[],
): HandlerEventRecommendation {
  return {
    eventId: plan.eventDefinitionId,
    choiceId: plan.option.choiceId,
    choiceLabel: plan.option.choiceLabel,
    confidence: warnings.some((warning) => warning.tone === 'danger')
      ? 'low'
      : warnings.length > 0
        ? 'medium'
        : 'high',
    reason: explainEventChoice(plan),
    reasonCodes: plan.reasonCodes,
    warnings: [...warnings],
  };
}

function explainEventChoice(plan: HandlerEventPlan): string {
  const delta = getChoiceNetDelta(plan.option.choice);
  const parts = [
    delta.dominion ? `${formatDelta(delta.dominion)} Dominion` : '',
    delta.heat ? `${formatDelta(delta.heat)} Heat` : '',
    delta.loyalty ? `${formatDelta(delta.loyalty)} Loyalty` : '',
    delta.resources ? `${formatDelta(delta.resources)} Resources` : '',
    delta.intel ? `${formatDelta(delta.intel)} Intel` : '',
    delta.ruin ? `${formatDelta(delta.ruin)} Ruin` : '',
  ].filter(Boolean);
  const extra =
    plan.option.preview.ledgerEffects.length > 0
      ? ' and manages visible Ledger consequences'
      : plan.option.preview.contactEffects.length > 0
        ? ' while protecting contact position'
        : plan.option.preview.frontEffects.length > 0
          ? ' while controlling Front exposure'
          : plan.option.preview.factionEffects.length > 0
            ? ' while managing faction pressure'
            : '';

  return `${plan.option.choiceLabel} is recommended because it ${
    parts.length > 0 ? `moves ${parts.join(', ')}` : 'keeps the board stable'
  }${extra}.`;
}

function selectEventWarnings(state: GameState, plan: HandlerEventPlan): AdvisorMessage[] {
  const delta = getChoiceNetDelta(plan.option.choice);

  return [
    ...(isLosingProjection(plan.projectedPressures)
      ? [
          {
            id: `${plan.option.key}:event-loss`,
            tone: 'danger',
            text: 'This response projects an immediate loss condition.',
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(plan.projectedPressures.heat >= 88
      ? [
          {
            id: `${plan.option.key}:event-heat`,
            tone: 'warning',
            text: 'This response leaves Heat dangerously high.',
            reasonCode: 'heat_crisis',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(plan.projectedPressures.loyalty <= 18
      ? [
          {
            id: `${plan.option.key}:event-loyalty`,
            tone: 'warning',
            text: 'This response leaves Loyalty fragile.',
            reasonCode: 'loyalty_danger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(plan.projectedPressures.resources <= 650
      ? [
          {
            id: `${plan.option.key}:event-resources`,
            tone: 'warning',
            text: 'This response leaves little cash for the next week.',
            reasonCode: 'resource_danger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...((delta.ruin ?? 0) >= 5
      ? [
          {
            id: `${plan.option.key}:event-ruin`,
            tone: 'warning',
            text: 'This response adds notable Ruin.',
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(state.week >= state.maxWeeks && plan.projectedState.gameOver?.result !== 'victory'
      ? [
          {
            id: `${plan.option.key}:event-time`,
            tone: 'danger',
            text: 'This response does not finish the run before time expires.',
            reasonCode: 'dominion_pace',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function selectEventOpportunities(plan: HandlerEventPlan): AdvisorMessage[] {
  return [
    ...(plan.option.preview.ledgerEffects.some((effect) => effect.type === 'create')
      ? [
          {
            id: `${plan.option.key}:ledger-create`,
            tone: 'good',
            text: 'This response creates future Ledger leverage.',
            reasonCode: 'useful_ledger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(plan.option.preview.ledgerEffects.some((effect) => effect.type === 'resolve')
      ? [
          {
            id: `${plan.option.key}:ledger-resolve`,
            tone: 'good',
            text: 'This response resolves a visible Ledger problem.',
            reasonCode: 'useful_ledger',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function summarizeEventPlan(state: GameState, plan: HandlerEventPlan): string {
  const delta = diffPressures(state.pressures, plan.projectedPressures);

  return `Recommended response: ${plan.option.choiceLabel}, ${formatDelta(delta.dominion ?? 0)} Dominion, ${formatDelta(delta.heat ?? 0)} Heat, ${formatDelta(delta.resources ?? 0)} Resources projected.`;
}

function validateEventRecommendation(
  state: GameState,
  option: LegalEventChoiceOption,
): HandlerInvalidRecommendation[] {
  const resolved = resolveEventChoice(state, option.eventId, option.choiceId);

  if (resolved.ok) {
    return [];
  }

  return [
    {
      id: option.key,
      reason: resolved.error,
    },
  ];
}

function getEventConfidence(
  plan: HandlerEventPlan,
  warnings: readonly AdvisorMessage[],
  invalid: readonly HandlerInvalidRecommendation[],
): AdvisorConfidence {
  if (
    invalid.length > 0 ||
    isLosingProjection(plan.projectedPressures) ||
    warnings.some((warning) => warning.tone === 'danger')
  ) {
    return 'low';
  }

  return warnings.length > 0 ? 'medium' : 'high';
}

function selectEventCurrentRead(state: GameState): AdvisorMessage[] {
  const pace = selectDominionPace(state);

  return [
    {
      id: 'handler-event-pace',
      tone: pace.status === 'critical' ? 'danger' : 'info',
      text: pace.summary,
      reasonCode: 'dominion_pace',
    },
    {
      id: 'handler-event-phase',
      tone: 'info',
      text:
        state.phase === 'EVENT_CHOICE'
          ? 'Weekly fallout is waiting for a response.'
          : 'No weekly fallout response is pending.',
    },
  ];
}

function emptyEventRecommendation(
  phase: HandlerRecommendation['phase'],
  planAssessment: string,
  currentRead: AdvisorMessage[],
): HandlerRecommendation {
  return {
    phase,
    confidence: 'medium',
    currentRead,
    recommendedOrders: [],
    warnings: [],
    opportunities: [],
    planAssessment,
    invalidRecommendations: [],
  };
}

function getChoiceNetDelta(choice: EventChoiceDefinition): PressureDelta {
  const delta: PressureDelta = { ...choice.effects };

  if (!choice.cost) {
    return delta;
  }

  if ('type' in choice.cost) {
    delta.intel = (delta.intel ?? 0) - choice.cost.amount;
    return delta;
  }

  for (const [pressure, value] of Object.entries(choice.cost)) {
    delta[pressure as PressureId] = (delta[pressure as PressureId] ?? 0) - value;
  }

  return delta;
}

function diffPressures(before: Pressures, after: Pressures): PressureDelta {
  return PRESSURE_IDS.reduce<PressureDelta>((delta, pressure) => {
    const value = after[pressure] - before[pressure];

    if (value !== 0) {
      delta[pressure] = value;
    }

    return delta;
  }, {});
}

function pressureSafetyScore(pressures: Pressures): number {
  return (
    safetyBandScore(pressures.heat, 58, 76, 92, true) * 2.4 +
    safetyBandScore(pressures.loyalty, 58, 34, 16, false) * 2 +
    resourceScore(pressures.resources)
  );
}

function redZoneReliefScore(before: Pressures, after: Pressures): number {
  return PRESSURE_IDS.reduce((score, pressure) => {
    const delta = after[pressure] - before[pressure];

    if (pressure === 'heat' && before.heat >= 76 && delta < 0) {
      return score + Math.abs(delta) * 14;
    }

    if (pressure === 'loyalty' && before.loyalty <= 34 && delta > 0) {
      return score + delta * 12;
    }

    if (pressure === 'resources' && before.resources <= 1400 && delta > 0) {
      return score + delta * 0.06;
    }

    return score;
  }, 0);
}

function getWorstSafetyMargin(pressures: Pressures): number {
  const heatMargin = Math.max(0, 100 - pressures.heat) / 100;
  const loyaltyMargin = Math.max(0, pressures.loyalty) / 100;
  const resourceMargin = Math.min(1, Math.max(0, pressures.resources) / 2400);

  return Math.min(heatMargin, loyaltyMargin, resourceMargin);
}

function isLosingProjection(pressures: Pressures): boolean {
  return (
    pressures.heat >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss ||
    pressures.loyalty <= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss ||
    pressures.resources < DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss
  );
}

function safetyBandScore(
  value: number,
  good: number,
  risky: number,
  danger: number,
  highIsBad: boolean,
): number {
  if (highIsBad) {
    if (value <= good) {
      return 35;
    }
    if (value <= risky) {
      return 10;
    }
    if (value <= danger) {
      return -35;
    }
    return -120;
  }

  if (value >= good) {
    return 35;
  }
  if (value >= risky) {
    return 10;
  }
  if (value >= danger) {
    return -35;
  }
  return -120;
}

function resourceScore(resources: number): number {
  if (resources >= 3500) {
    return 45;
  }
  if (resources >= 1600) {
    return 20;
  }
  if (resources >= 650) {
    return -20;
  }
  return -95;
}

function createsDebtLikeRisk(delta: PressureDelta): number {
  return Math.max(0, delta.ruin ?? 0);
}

function formatDelta(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}
