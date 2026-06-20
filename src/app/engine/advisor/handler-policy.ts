import { DISTRICT_ZERO_WIN_LOSS_THRESHOLDS, getOperativeDefinition } from '../content';
import type {
  GameState,
  OperativeId,
  PressureDelta,
  PressureId,
  Pressures,
  QueuedOrder,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { getActionPreview, getCommandPointsRemaining, type ActionPreview } from '../selectors';
import { getRunRules, queueOrder, removeQueuedOrder } from '../simulation';
import type {
  AdvisorConfidence,
  AdvisorMessage,
  HandlerInvalidRecommendation,
  HandlerQueuedPlanAssessment,
  HandlerReasonCode,
  HandlerRecommendation,
  HandlerRecommendedOrder,
} from './advisor-types';
import { selectDominionPace } from './dominion-pace';
import {
  getActionTargetKey,
  selectLegalOrderOptions,
  type LegalOrderOption,
} from './legal-options';

export type HandlerCommandPolicyInput = {
  state: GameState;
  legalOptions?: readonly LegalOrderOption[];
};

type HandlerCommandPlan = {
  orders: readonly LegalOrderOption[];
  projectedPressures: Pressures;
  score: number;
  reasonCodes: HandlerReasonCode[];
};

export function recommendHandlerCommand(input: HandlerCommandPolicyInput): HandlerRecommendation {
  const state = input.state;
  const currentRead = selectHandlerCurrentRead(state);
  const queuedPlanAssessment = assessQueuedPlan(state);
  const commandRemaining = getCommandPointsRemaining(state);
  const legalOptions = input.legalOptions ?? selectLegalOrderOptions(state);

  if (state.gameOver) {
    return emptyRecommendation('game_over', 'Run complete.', currentRead, queuedPlanAssessment);
  }

  if (state.phase !== 'COMMAND') {
    return emptyRecommendation('event', 'Resolve the current event before queueing orders.', currentRead, queuedPlanAssessment);
  }

  if (commandRemaining <= 0) {
    return {
      ...emptyRecommendation('command', queuedPlanAssessment.summary, currentRead, queuedPlanAssessment),
      warnings: queuedPlanAssessment.warnings,
      confidence: confidenceForAssessment(queuedPlanAssessment),
    };
  }

  const plans = buildCommandPlans(state, legalOptions);
  const bestPlan = [...plans].sort((left, right) => right.score - left.score)[0];

  if (!bestPlan) {
    return {
      ...emptyRecommendation('command', 'No legal orders are available this week.', currentRead, queuedPlanAssessment),
      warnings: [
        ...queuedPlanAssessment.warnings,
        {
          id: 'handler-no-legal-orders',
          tone: 'danger',
          text: 'No legal orders are available. Check Resources, command points, and target requirements.',
          reasonCode: 'plan_warning',
        },
      ],
      confidence: 'low',
    };
  }

  const warnings = [
    ...queuedPlanAssessment.warnings,
    ...selectPlanWarnings(state, bestPlan.projectedPressures),
  ];
  const recommendedOrders = bestPlan.orders.map((order, index) =>
    toRecommendedOrder(order, index, bestPlan),
  );
  const invalidRecommendations = validateRecommendedOrders(state, bestPlan.orders);

  return {
    phase: 'command',
    confidence: getPlanConfidence(bestPlan, warnings, invalidRecommendations),
    currentRead,
    recommendedOrders,
    warnings,
    opportunities: selectPlanOpportunities(bestPlan.orders),
    planAssessment: summarizePlan(bestPlan, state),
    queuedPlanAssessment,
    invalidRecommendations,
  };
}

export function buildCommandPlans(
  state: GameState,
  legalOptions: readonly LegalOrderOption[] = selectLegalOrderOptions(state),
): HandlerCommandPlan[] {
  const commandRemaining = getCommandPointsRemaining(state);

  if (state.phase !== 'COMMAND' || commandRemaining <= 0) {
    return [];
  }

  if (commandRemaining === 1) {
    return legalOptions.map((option) => scorePlan(state, [option]));
  }

  return legalOptions.flatMap((first) => {
    const queued = queueOrder(state, toQueueRequest(first));

    if (!queued.ok) {
      return [];
    }

    const secondOptions = selectLegalOrderOptions(queued.state);

    if (secondOptions.length === 0) {
      return [scorePlan(state, [first])];
    }

    return secondOptions.map((second) => scorePlan(state, [first, second]));
  });
}

export function assessQueuedPlan(state: GameState): HandlerQueuedPlanAssessment {
  if (state.queuedOrders.length === 0) {
    return {
      status: 'stable',
      summary: 'No orders are queued yet.',
      warnings: [],
      suggestedRemovals: [],
      suggestedReplacements: [],
    };
  }

  const projected = projectQueuedPressures(state);
  const planWarnings = selectPlanWarnings(state, projected);
  const riskyOrderIds = selectRiskyQueuedOrderIds(state, projected);
  const orderWarnings = riskyOrderIds.flatMap((orderId) =>
    selectQueuedOrderWarnings(state, orderId, projected),
  );
  const warnings = dedupeMessages([...planWarnings, ...orderWarnings]);
  const dangerous = warnings.some((warning) => warning.tone === 'danger');
  const risky = dangerous || warnings.some((warning) => warning.tone === 'warning');
  const suggestedRemovals = dangerous
    ? state.queuedOrders.map((order) => order.id)
    : riskyOrderIds;
  const suggestedReplacements = suggestedRemovals.flatMap((orderId) =>
    selectReplacementSuggestion(state, orderId),
  );

  return {
    status: dangerous ? 'dangerous' : risky ? 'risky' : 'stable',
    summary: dangerous
      ? 'Queued orders project a dangerous pressure state.'
      : risky
        ? 'Queued orders are playable, but the projected state needs care.'
        : 'Queued orders look stable.',
    warnings,
    suggestedRemovals,
    suggestedReplacements,
  };
}

function scorePlan(state: GameState, orders: readonly LegalOrderOption[]): HandlerCommandPlan {
  const projectedPressures = applyOrderPlan(projectQueuedPressures(state), orders);
  const reasonCodes = selectReasonCodes(state, orders, projectedPressures);

  return {
    orders,
    projectedPressures,
    score: scoreProjectedPressures(state, projectedPressures) + scoreOrders(state, orders),
    reasonCodes,
  };
}

function scoreProjectedPressures(state: GameState, projected: Pressures): number {
  const rules = getRunRules(state);
  const dominionNeeded = Math.max(0, rules.dominionTarget - state.pressures.dominion);
  const dominionGain = projected.dominion - state.pressures.dominion;
  const heatDelta = projected.heat - state.pressures.heat;
  const resourceDelta = projected.resources - state.pressures.resources;
  const loyaltyDelta = projected.loyalty - state.pressures.loyalty;
  const ruinDelta = projected.ruin - state.pressures.ruin;
  const immediateLossPenalty = isLosingProjection(projected) ? -100_000 : 0;
  const nearTermLossPenalty = scoreNearTermLossRisk(state, projected);
  const victoryBonus = projected.dominion >= rules.dominionTarget ? 25_000 : 0;
  const paceMultiplier = dominionNeeded > 45 || state.week >= 5 ? 26 : 18;
  const heatSafety = safetyBandScore(projected.heat, 58, 76, 92, true) * 2.2;
  const loyaltySafety = safetyBandScore(projected.loyalty, 58, 34, 16, false) * 1.8;
  const resourceSafety = resourceScore(projected.resources);

  return (
    immediateLossPenalty +
    nearTermLossPenalty +
    victoryBonus +
    dominionGain * paceMultiplier +
    Math.min(projected.intel, 70) * 0.7 +
    heatSafety +
    loyaltySafety +
    resourceSafety +
    Math.min(0, resourceDelta) * 0.008 +
    Math.max(0, resourceDelta) * 0.006 +
    Math.min(0, loyaltyDelta) * 4 +
    (heatDelta < 0 ? Math.abs(heatDelta) * 8 : heatDelta * -7) +
    ruinDelta * -4
  );
}

function scoreNearTermLossRisk(state: GameState, projected: Pressures): number {
  const rules = getRunRules(state);
  const finishingLine = projected.dominion >= rules.dominionTarget;
  const lateLine = state.week >= Math.max(1, state.maxWeeks - 2);
  const pressure = finishingLine || lateLine ? 1.15 : 1;
  let penalty = 0;

  if (finishingLine && projected.heat >= 88) {
    penalty -= 36_000 * pressure;
  } else if (finishingLine && projected.heat >= 84) {
    penalty -= 14_000 * pressure;
  } else if (projected.heat >= 96) {
    penalty -= 36_000 * pressure;
  } else if (projected.heat >= 92) {
    penalty -= 14_000 * pressure;
  } else if (projected.heat >= 88) {
    penalty -= 4_000;
  }

  if (finishingLine && projected.resources < 1800) {
    penalty -= 36_000 * pressure;
  } else if (finishingLine && projected.resources < 2400) {
    penalty -= 14_000 * pressure;
  } else if (projected.resources < 700) {
    penalty -= 36_000 * pressure;
  } else if (projected.resources < 1200) {
    penalty -= 14_000 * pressure;
  } else if (projected.resources < 1800) {
    penalty -= 4_000;
  }

  if (projected.loyalty <= 8) {
    penalty -= 36_000 * pressure;
  } else if (projected.loyalty <= 16) {
    penalty -= 14_000 * pressure;
  }

  return penalty;
}

function scoreOrders(state: GameState, orders: readonly LegalOrderOption[]): number {
  return orders.reduce((score, order) => {
    const preview = order.preview;
    const stressPenalty = preview.selectedOperative
      ? Math.max(0, preview.selectedOperative.projectedStress - 55) * -1.6
      : 0;
    const riskPenalty = preview.riskChance * -1.25;
    const leverageBonus =
      (preview.ledgerUse?.ok ? 30 : 0) +
      (preview.contactUse?.ok ? 18 : 0) +
      (preview.frontExposure ? 24 : 0) +
      (preview.frontInvestment?.ok ? 16 : 0) +
      (preview.brokerAccord?.ok ? 20 : 0) +
      (preview.secretDiscovery?.eligible ? 16 : 0);
    const campaignBias = scoreCampaignFit(state, order);

    return score + stressPenalty + riskPenalty + leverageBonus + campaignBias;
  }, 0);
}

function scoreCampaignFit(state: GameState, order: LegalOrderOption): number {
  const tensionId = state.campaign.tensionId;

  if (tensionId === 'campaign_dirty_capital') {
    return order.preview.adjustedEffects.resources ? 8 : 0;
  }

  if (tensionId === 'campaign_nightlife_war') {
    return order.preview.adjustedEffects.dominion ? 8 : 0;
  }

  if (tensionId === 'campaign_ghostline_signal') {
    return order.preview.adjustedEffects.intel || order.preview.adjustedEffects.ruin !== undefined
      ? 8
      : 0;
  }

  return 0;
}

function selectReasonCodes(
  state: GameState,
  orders: readonly LegalOrderOption[],
  projected: Pressures,
): HandlerReasonCode[] {
  const codes = new Set<HandlerReasonCode>();

  if (projected.dominion > state.pressures.dominion) {
    codes.add('dominion_pace');
  }

  if (state.pressures.heat >= 76 || projected.heat <= state.pressures.heat) {
    codes.add('heat_crisis');
  }

  if (state.pressures.resources <= 1800 || projected.resources > state.pressures.resources) {
    codes.add('resource_danger');
  }

  if (state.pressures.loyalty <= 32 || projected.loyalty > state.pressures.loyalty) {
    codes.add('loyalty_danger');
  }

  for (const order of orders) {
    if (order.preview.ledgerUse?.ok) {
      codes.add('useful_ledger');
    }

    if (order.preview.frontExposure || order.preview.frontInvestment?.ok) {
      codes.add('front_exposure');
    }

    if (order.preview.brokerAccord?.ok) {
      codes.add('faction_obligation');
    }

    if (order.preview.contactUse?.ok) {
      codes.add('contact_volatility');
    }

    if (order.preview.selectedOperative?.projectedStress ?? 0 > 55) {
      codes.add('operative_stress');
    }
  }

  if (state.campaign.tensionId) {
    codes.add('campaign_priority');
  }

  return [...codes];
}

function toRecommendedOrder(
  option: LegalOrderOption,
  index: number,
  plan: HandlerCommandPlan,
): HandlerRecommendedOrder {
  const operativeId = option.assignedOperativeId as OperativeId | undefined;
  const operativeName = operativeId ? getOperativeDefinition(operativeId)?.name : undefined;

  return {
    actionId: option.actionId,
    actionLabel: option.actionLabel,
    ...(option.target ? { target: option.target } : {}),
    ...(option.targetLabel ? { targetLabel: option.targetLabel } : {}),
    ...(operativeId ? { assignedOperativeId: operativeId } : {}),
    ...(operativeName ? { operativeName } : {}),
    preview: option.preview,
    confidence: confidenceForOrder(option, plan),
    reason: explainOrder(option, index, plan),
    reasonCodes: plan.reasonCodes,
    warnings: selectOrderWarnings(option),
  };
}

function explainOrder(
  option: LegalOrderOption,
  index: number,
  plan: HandlerCommandPlan,
): string {
  const effects = option.preview.adjustedEffects;
  const parts = [
    effects.dominion ? `${effects.dominion > 0 ? '+' : ''}${effects.dominion} Dominion` : '',
    effects.heat && effects.heat < 0 ? `${effects.heat} Heat` : '',
    effects.resources ? `${effects.resources > 0 ? '+' : ''}${effects.resources} Resources` : '',
    effects.loyalty ? `${effects.loyalty > 0 ? '+' : ''}${effects.loyalty} Loyalty` : '',
    effects.intel ? `${effects.intel > 0 ? '+' : ''}${effects.intel} Intel` : '',
  ].filter(Boolean);
  const targetText = option.targetLabel ? ` at ${option.targetLabel}` : '';
  const sequence = plan.orders.length > 1 ? `Order ${index + 1}: ` : '';

  return `${sequence}${option.actionLabel}${targetText} is recommended because it ${
    parts.length > 0 ? `moves ${parts.join(', ')}` : 'improves the board state'
  } while keeping the projected run playable.`;
}

function validateRecommendedOrders(
  state: GameState,
  orders: readonly LegalOrderOption[],
): HandlerInvalidRecommendation[] {
  const invalid: HandlerInvalidRecommendation[] = [];
  let next = state;

  for (const order of orders) {
    const queued = queueOrder(next, toQueueRequest(order));

    if (!queued.ok) {
      invalid.push({
        id: order.key,
        reason: queued.error,
      });
      continue;
    }

    next = queued.state;
  }

  return invalid;
}

function applyOrderPlan(pressures: Pressures, orders: readonly LegalOrderOption[]): Pressures {
  return orders.reduce((next, order) => applyPressureDelta(next, getOrderNetDelta(order)), {
    ...pressures,
  });
}

function projectQueuedPressures(state: GameState): Pressures {
  return state.queuedOrders.reduce((next, order) => {
    const preview = getQueuedOrderPreview(state, order);
    return preview ? applyPressureDelta(next, getPreviewNetDelta(preview)) : next;
  }, { ...state.pressures });
}

function selectRiskyQueuedOrderIds(state: GameState, projected: Pressures): string[] {
  return state.queuedOrders.flatMap((order) => {
    const preview = getQueuedOrderPreview(state, order);

    if (!preview) {
      return [order.id];
    }

    const delta = getPreviewNetDelta(preview);
    const stressRisk = preview.selectedOperative?.projectedStress ?? 0;
    const risky =
      projected.heat >= 88 && (delta.heat ?? 0) > 0 ||
      projected.loyalty <= 18 && (delta.loyalty ?? 0) < 0 ||
      projected.resources <= 650 && (delta.resources ?? 0) < 0 ||
      (delta.ruin ?? 0) >= 5 ||
      preview.riskChance >= 28 ||
      stressRisk >= 70;

    return risky ? [order.id] : [];
  });
}

function selectQueuedOrderWarnings(
  state: GameState,
  orderId: string,
  projected: Pressures,
): AdvisorMessage[] {
  const order = state.queuedOrders.find((candidate) => candidate.id === orderId);
  const preview = order ? getQueuedOrderPreview(state, order) : undefined;

  if (!order || !preview) {
    return [
      {
        id: `${orderId}:queued-preview-missing`,
        tone: 'danger',
        text: 'A queued order cannot be previewed cleanly. Remove it and choose a legal order again.',
        reasonCode: 'plan_warning',
      },
    ];
  }

  const delta = getPreviewNetDelta(preview);

  return [
    ...(projected.heat >= 88 && (delta.heat ?? 0) > 0
      ? [
          {
            id: `${order.id}:queued-heat`,
            tone: projected.heat >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss
              ? 'danger'
              : 'warning',
            text: `${preview.label} is adding Heat while the queued plan is already hot.`,
            reasonCode: 'heat_crisis',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(projected.loyalty <= 18 && (delta.loyalty ?? 0) < 0
      ? [
          {
            id: `${order.id}:queued-loyalty`,
            tone: projected.loyalty <= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss
              ? 'danger'
              : 'warning',
            text: `${preview.label} is cutting Loyalty while the queued plan is fragile.`,
            reasonCode: 'loyalty_danger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(projected.resources <= 650 && (delta.resources ?? 0) < 0
      ? [
          {
            id: `${order.id}:queued-resources`,
            tone: projected.resources < DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss
              ? 'danger'
              : 'warning',
            text: `${preview.label} is spending Resources while the queued plan is cash-thin.`,
            reasonCode: 'resource_danger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...((delta.ruin ?? 0) >= 5
      ? [
          {
            id: `${order.id}:queued-ruin`,
            tone: 'warning',
            text: `${preview.label} adds a notable amount of Ruin.`,
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(preview.riskChance >= 28
      ? [
          {
            id: `${order.id}:queued-risk`,
            tone: 'warning',
            text: `${preview.label} has elevated risk in the current board state.`,
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...((preview.selectedOperative?.projectedStress ?? 0) >= 70
      ? [
          {
            id: `${order.id}:queued-stress`,
            tone: 'warning',
            text: `${preview.selectedOperative?.name ?? 'The assigned operative'} would be pushed into a strained stress state.`,
            reasonCode: 'operative_stress',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function selectReplacementSuggestion(
  state: GameState,
  orderId: string,
): HandlerQueuedPlanAssessment['suggestedReplacements'] {
  const removed = removeQueuedOrder(state, orderId);

  if (!removed.ok || getCommandPointsRemaining(removed.state) <= 0) {
    return [];
  }

  const replacementPlan = [...buildCommandPlans(removed.state)].sort(
    (left, right) => right.score - left.score,
  )[0];

  if (!replacementPlan) {
    return [];
  }

  return [
    {
      removeOrderId: orderId,
      replacementOrders: replacementPlan.orders.map((order, index) =>
        toRecommendedOrder(order, index, replacementPlan),
      ),
      summary: summarizeReplacementPlan(replacementPlan, removed.state),
    },
  ];
}

function summarizeReplacementPlan(plan: HandlerCommandPlan, state: GameState): string {
  const dominionGain = plan.projectedPressures.dominion - state.pressures.dominion;
  const heatDelta = plan.projectedPressures.heat - state.pressures.heat;
  const resourcesDelta = plan.projectedPressures.resources - state.pressures.resources;

  return `If this queued order is removed, Handler prefers ${plan.orders.length} replacement order${
    plan.orders.length === 1 ? '' : 's'
  }: ${formatDelta(dominionGain)} Dominion, ${formatDelta(heatDelta)} Heat, ${formatDelta(resourcesDelta)} Resources projected.`;
}

function dedupeMessages(messages: readonly AdvisorMessage[]): AdvisorMessage[] {
  const seen = new Set<string>();
  const deduped: AdvisorMessage[] = [];

  for (const message of messages) {
    if (seen.has(message.id)) {
      continue;
    }

    seen.add(message.id);
    deduped.push(message);
  }

  return deduped;
}

function getQueuedOrderPreview(state: GameState, order: QueuedOrder): ActionPreview | undefined {
  return getActionPreview(state, order.actionId, order.assignedOperativeId, order.target);
}

function getOrderNetDelta(order: LegalOrderOption): PressureDelta {
  return getPreviewNetDelta(order.preview);
}

function getPreviewNetDelta(preview: ActionPreview): PressureDelta {
  const delta: PressureDelta = {
    ...preview.adjustedEffects,
    resources: (preview.adjustedEffects.resources ?? 0) - preview.adjustedResourceCost,
  };

  for (const cost of [...(preview.ledgerCosts ?? []), ...(preview.contactCosts ?? [])]) {
    if (cost.id === 'intel') {
      delta[cost.id] = (delta[cost.id] ?? 0) - cost.value;
    }
  }

  if (preview.brokerAccord?.ok && preview.brokerAccord.cost.intel > 0) {
    delta.intel = (delta.intel ?? 0) - preview.brokerAccord.cost.intel;
  }

  return delta;
}

function applyPressureDelta(pressures: Pressures, delta: PressureDelta): Pressures {
  return PRESSURE_IDS.reduce(
    (next, id) => ({
      ...next,
      [id]: pressures[id] + (delta[id] ?? 0),
    }),
    {} as Pressures,
  );
}

function selectHandlerCurrentRead(state: GameState): AdvisorMessage[] {
  const pace = selectDominionPace(state);

  return [
    {
      id: 'handler-dominion-pace',
      tone: pace.status === 'ahead' ? 'good' : pace.status === 'critical' ? 'danger' : 'info',
      text: pace.summary,
      reasonCode: 'dominion_pace',
    },
    {
      id: 'handler-command-points',
      tone: 'info',
      text: `${getCommandPointsRemaining(state)} Command remaining this week.`,
    },
  ];
}

function selectPlanWarnings(state: GameState, projected: Pressures): AdvisorMessage[] {
  return [
    ...(projected.heat >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss
      ? [
          {
            id: 'handler-heat-loss',
            tone: 'danger',
            text: 'This plan projects a Heat lockdown.',
            reasonCode: 'heat_crisis',
          } satisfies AdvisorMessage,
        ]
      : projected.heat >= 88
        ? [
            {
              id: 'handler-heat-risk',
              tone: 'warning',
              text: 'This plan leaves Heat dangerously high.',
              reasonCode: 'heat_crisis',
            } satisfies AdvisorMessage,
          ]
        : []),
    ...(projected.loyalty <= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss
      ? [
          {
            id: 'handler-loyalty-loss',
            tone: 'danger',
            text: 'This plan projects a Loyalty collapse.',
            reasonCode: 'loyalty_danger',
          } satisfies AdvisorMessage,
        ]
      : projected.loyalty <= 18
        ? [
            {
              id: 'handler-loyalty-risk',
              tone: 'warning',
              text: 'This plan leaves Loyalty in a fragile state.',
              reasonCode: 'loyalty_danger',
            } satisfies AdvisorMessage,
          ]
        : []),
    ...(projected.resources < DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss
      ? [
          {
            id: 'handler-resource-loss',
            tone: 'danger',
            text: 'This plan projects bankruptcy.',
            reasonCode: 'resource_danger',
          } satisfies AdvisorMessage,
        ]
      : projected.resources <= 650
        ? [
            {
              id: 'handler-resource-risk',
              tone: 'warning',
              text: 'This plan leaves little cash for weekly fallout.',
              reasonCode: 'resource_danger',
            } satisfies AdvisorMessage,
          ]
        : []),
    ...(projected.ruin >= state.pressures.ruin + 8
      ? [
          {
            id: 'handler-ruin-risk',
            tone: 'warning',
            text: 'This plan takes on a notable amount of Ruin.',
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function selectOrderWarnings(option: LegalOrderOption): AdvisorMessage[] {
  return [
    ...(option.preview.riskChance >= 28
      ? [
          {
            id: `${option.key}:risk`,
            tone: 'warning',
            text: `${option.actionLabel} has elevated risk.`,
            reasonCode: 'plan_warning',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(option.preview.selectedOperative?.projectedStress ?? 0 >= 70
      ? [
          {
            id: `${option.key}:stress`,
            tone: 'warning',
            text: 'This assignment pushes the operative into a strained stress state.',
            reasonCode: 'operative_stress',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function selectPlanOpportunities(orders: readonly LegalOrderOption[]): AdvisorMessage[] {
  return orders.flatMap((order) => [
    ...(order.preview.ledgerUse?.ok
      ? [
          {
            id: `${order.key}:ledger`,
            tone: 'good',
            text: 'This plan uses visible Ledger leverage.',
            reasonCode: 'useful_ledger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(order.preview.secretDiscovery?.eligible
      ? [
          {
            id: `${order.key}:secret`,
            tone: 'good',
            text: 'This plan can uncover new leverage.',
            reasonCode: 'useful_ledger',
          } satisfies AdvisorMessage,
        ]
      : []),
  ]);
}

function summarizePlan(plan: HandlerCommandPlan, state: GameState): string {
  const dominionGain = plan.projectedPressures.dominion - state.pressures.dominion;
  const heatDelta = plan.projectedPressures.heat - state.pressures.heat;
  const resourcesDelta = plan.projectedPressures.resources - state.pressures.resources;

  return `Recommended plan: ${plan.orders.length} order${plan.orders.length === 1 ? '' : 's'}, ${formatDelta(dominionGain)} Dominion, ${formatDelta(heatDelta)} Heat, ${formatDelta(resourcesDelta)} Resources projected.`;
}

function confidenceForOrder(option: LegalOrderOption, plan: HandlerCommandPlan): AdvisorConfidence {
  if (isLosingProjection(plan.projectedPressures) || option.preview.riskChance >= 35) {
    return 'low';
  }

  if (option.preview.riskChance >= 20 || plan.score < 40) {
    return 'medium';
  }

  return 'high';
}

function getPlanConfidence(
  plan: HandlerCommandPlan,
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

function confidenceForAssessment(assessment: HandlerQueuedPlanAssessment): AdvisorConfidence {
  switch (assessment.status) {
    case 'stable':
      return 'high';
    case 'risky':
      return 'medium';
    case 'dangerous':
      return 'low';
  }
}

function emptyRecommendation(
  phase: HandlerRecommendation['phase'],
  planAssessment: string,
  currentRead: AdvisorMessage[],
  queuedPlanAssessment: HandlerQueuedPlanAssessment,
): HandlerRecommendation {
  return {
    phase,
    confidence: 'medium',
    currentRead,
    recommendedOrders: [],
    warnings: [],
    opportunities: [],
    planAssessment,
    queuedPlanAssessment,
    invalidRecommendations: [],
  };
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

function toQueueRequest(order: LegalOrderOption) {
  return {
    actionId: order.actionId,
    ...(order.assignedOperativeId ? { assignedOperativeId: order.assignedOperativeId } : {}),
    ...(order.target ? { target: order.target } : {}),
  };
}

function formatDelta(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

export function isRecommendedAction(
  recommendation: HandlerRecommendation,
  actionId: string,
): boolean {
  return recommendation.recommendedOrders.some((order) => order.actionId === actionId);
}

export function isRecommendedTarget(
  recommendation: HandlerRecommendation,
  actionId: string,
  targetKey: string,
): boolean {
  return recommendation.recommendedOrders.some(
    (order) =>
      order.actionId === actionId &&
      order.target !== undefined &&
      getActionTargetKey(order.target) === targetKey,
  );
}
