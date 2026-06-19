import { DISTRICT_ZERO_SOFT_WARNINGS } from '../content';
import type { GameState, Pressures } from '../model';
import { selectDominionPace } from './dominion-pace';
import { getActionTargetKey } from './legal-options';
import { selectHandlerRecommendation } from './handler-recommendations';
import type {
  AdvisorConfidence,
  AdvisorMessage,
  AdvisorMode,
  AdvisorRecommendationView,
  HandlerRecommendation,
  HandlerRecommendedOrder,
  AdvisorViewModel,
  HandlerRecommendationPhase,
} from './advisor-types';

export function selectAdvisorViewModel(state: GameState, mode: AdvisorMode): AdvisorViewModel {
  const dominionPace = selectDominionPace(state);
  const phase = getAdvisorPhase(state);
  const pressureWarnings = selectPressureWarnings(state.pressures);
  const paceWarnings =
    dominionPace.status === 'behind' || dominionPace.status === 'critical'
      ? [
          {
            id: 'dominion-pace-warning',
            tone: dominionPace.status === 'critical' ? 'danger' : 'warning',
            text: dominionPace.summary,
            reasonCode: 'dominion_pace',
          } satisfies AdvisorMessage,
        ]
      : [];
  const opportunities = selectOpportunityMessages(state);
  const handlerRecommendation =
    mode === 'handler' ? selectHandlerRecommendation(state) : undefined;
  const currentRead =
    mode === 'off'
      ? []
      : mode === 'handler' && handlerRecommendation
        ? handlerRecommendation.currentRead
        : selectCurrentRead(state, dominionPace.summary);
  const warnings =
    mode === 'off'
      ? []
      : mode === 'handler' && handlerRecommendation
        ? handlerRecommendation.warnings
        : [...pressureWarnings, ...paceWarnings];
  const recommendations = selectModeRecommendations(
    state,
    mode,
    warnings,
    dominionPace.status,
    handlerRecommendation,
  );

  return {
    mode,
    runMode: state.run.mode,
    validationStatus: state.run.validationStatus,
    phase,
    title: getAdvisorTitle(mode),
    summary: getAdvisorSummary(state, mode),
    dominionPace,
    currentRead,
    recommendations,
    warnings,
    opportunities:
      mode === 'off'
        ? []
        : mode === 'handler' && handlerRecommendation
          ? handlerRecommendation.opportunities
          : opportunities,
    confidence:
      mode === 'handler' && handlerRecommendation
        ? handlerRecommendation.confidence
        : getAdvisorConfidence(warnings),
  };
}

function getAdvisorPhase(state: GameState): HandlerRecommendationPhase {
  if (state.gameOver) {
    return 'game_over';
  }

  if (state.phase === 'EVENT_CHOICE') {
    return 'event';
  }

  return 'command';
}

function getAdvisorTitle(mode: AdvisorMode): string {
  switch (mode) {
    case 'off':
      return 'Advisor Off';
    case 'hints':
      return 'Field Hints';
    case 'coach':
      return 'Strategic Coach';
    case 'handler':
      return 'Handler Guidance';
  }
}

function getAdvisorSummary(state: GameState, mode: AdvisorMode): string {
  if (mode === 'off') {
    return 'Advisor guidance is disabled.';
  }

  if (state.gameOver?.result === 'victory') {
    return 'Run complete. Dominion target reached.';
  }

  if (state.gameOver?.result === 'loss') {
    return 'Run complete. Review the final pressure state before starting again.';
  }

  if (state.phase === 'EVENT_CHOICE') {
    return 'Choose a fallout response before the next Command phase.';
  }

  return 'Spend Command points on orders, then advance to weekly fallout.';
}

function selectCurrentRead(state: GameState, dominionSummary: string): AdvisorMessage[] {
  return [
    {
      id: 'run-mode',
      tone: state.run.mode === 'training' ? 'good' : 'info',
      text:
        state.run.mode === 'training'
          ? 'Training Run: Handler guidance starts enabled and the Dominion target is 80.'
          : `Standard Run: ${formatValidationStatus(state.run.validationStatus)}.`,
    },
    {
      id: 'dominion-pace',
      tone: 'info',
      text: dominionSummary,
      reasonCode: 'dominion_pace',
    },
  ];
}

function selectPressureWarnings(pressures: Pressures): AdvisorMessage[] {
  return [
    ...(pressures.heat >= 92
      ? [
          {
            id: 'heat-danger',
            tone: 'danger',
            text: 'Heat is near lockdown. Prioritize Heat relief before risky Dominion plays.',
            reasonCode: 'heat_crisis',
          } satisfies AdvisorMessage,
        ]
      : pressures.heat >= DISTRICT_ZERO_SOFT_WARNINGS.heat
        ? [
            {
              id: 'heat-warning',
              tone: 'warning',
              text: 'Heat is high. Look for quieter orders, safer assignments, or Heat relief.',
              reasonCode: 'heat_crisis',
            } satisfies AdvisorMessage,
          ]
        : []),
    ...(pressures.loyalty <= 10
      ? [
          {
            id: 'loyalty-danger',
            tone: 'danger',
            text: 'Loyalty is close to collapse. Avoid choices that sacrifice crew stability.',
            reasonCode: 'loyalty_danger',
          } satisfies AdvisorMessage,
        ]
      : pressures.loyalty <= DISTRICT_ZERO_SOFT_WARNINGS.loyalty
        ? [
            {
              id: 'loyalty-warning',
              tone: 'warning',
              text: 'Loyalty is strained. Stabilize the crew before taking harsh bargains.',
              reasonCode: 'loyalty_danger',
            } satisfies AdvisorMessage,
          ]
        : []),
    ...(pressures.resources <= 250
      ? [
          {
            id: 'resources-danger',
            tone: 'danger',
            text: 'Resources are almost gone. Find money or reduce costs immediately.',
            reasonCode: 'resource_danger',
          } satisfies AdvisorMessage,
        ]
      : pressures.resources <= DISTRICT_ZERO_SOFT_WARNINGS.resources
        ? [
            {
              id: 'resources-warning',
              tone: 'warning',
              text: 'Resources are low. Weekly fallout and upkeep can force bankruptcy.',
              reasonCode: 'resource_danger',
            } satisfies AdvisorMessage,
          ]
        : []),
  ];
}

function selectOpportunityMessages(state: GameState): AdvisorMessage[] {
  return [
    ...(state.ledger.entries.length > 0
      ? [
          {
            id: 'ledger-opportunity',
            tone: 'good',
            text: 'You have Ledger leverage. Useful secrets, debts, or favors can shift pressure.',
            reasonCode: 'useful_ledger',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(state.pressures.intel >= 45
      ? [
          {
            id: 'intel-opportunity',
            tone: 'good',
            text: 'Intel is strong. Look for ways to convert it into Dominion, Heat relief, or bargains.',
          } satisfies AdvisorMessage,
        ]
      : []),
    ...(Object.keys(state.fronts).length > 0
      ? [
          {
            id: 'front-opportunity',
            tone: 'info',
            text: 'Owned Fronts can produce weekly value, but Exposure and rival attention still matter.',
            reasonCode: 'front_exposure',
          } satisfies AdvisorMessage,
        ]
      : []),
  ];
}

function selectStrategicRecommendations(
  state: GameState,
  warnings: readonly AdvisorMessage[],
  paceStatus: string,
): AdvisorRecommendationView[] {
  const criticalWarning = warnings.find((warning) => warning.tone === 'danger') ?? warnings[0];

  if (criticalWarning) {
    return [
      {
        id: `coach-${criticalWarning.id}`,
        title: 'Stabilize the danger meter',
        body: criticalWarning.text,
        chips: ['Stability', 'Risk Control'],
        confidence: criticalWarning.tone === 'danger' ? 'high' : 'medium',
      },
    ];
  }

  if (paceStatus === 'critical' || paceStatus === 'behind') {
    return [
      {
        id: 'coach-dominion-pace',
        title: 'Increase Dominion pace',
        body: 'You are behind the Dominion curve. Favor controlled Dominion gains over pure setup.',
        chips: ['Dominion', 'Tempo'],
        confidence: 'medium',
      },
    ];
  }

  return [
    {
      id: 'coach-balanced-plan',
      title: 'Keep the board balanced',
      body:
        state.pressures.heat < 70
          ? 'You have room for measured Dominion pressure. Preserve enough Resources for weekly fallout.'
          : 'You can still advance, but avoid stacking more Heat unless Dominion gains are decisive.',
      chips: ['Dominion', 'Safety'],
      confidence: 'medium',
    },
  ];
}

function selectModeRecommendations(
  state: GameState,
  mode: AdvisorMode,
  warnings: readonly AdvisorMessage[],
  paceStatus: string,
  handlerRecommendation: HandlerRecommendation | undefined,
): AdvisorRecommendationView[] {
  if (mode === 'off' || mode === 'hints') {
    return [];
  }

  if (mode === 'coach') {
    return selectStrategicRecommendations(state, warnings, paceStatus);
  }

  return handlerRecommendation ? selectHandlerRecommendationViews(handlerRecommendation) : [];
}

function selectHandlerRecommendationViews(
  recommendation: HandlerRecommendation,
): AdvisorRecommendationView[] {
  if (recommendation.eventRecommendation) {
    return [
      {
        id: `handler-event-${recommendation.eventRecommendation.choiceId}`,
        title: recommendation.eventRecommendation.choiceLabel,
        subtitle: 'Recommended fallout response',
        body: recommendation.eventRecommendation.reason,
        chips: recommendation.eventRecommendation.reasonCodes.map(formatReasonCode),
        confidence: recommendation.eventRecommendation.confidence,
        recommendedEventChoiceId: recommendation.eventRecommendation.choiceId,
      },
    ];
  }

  return recommendation.recommendedOrders.map(toHandlerOrderView);
}

function toHandlerOrderView(
  order: HandlerRecommendedOrder,
  index: number,
): AdvisorRecommendationView {
  return {
    id: `handler-order-${index + 1}-${order.actionId}`,
    title: order.actionLabel,
    ...(order.targetLabel || order.operativeName
      ? { subtitle: [order.targetLabel, order.operativeName].filter(Boolean).join(' / ') }
      : {}),
    body: order.reason,
    chips: order.reasonCodes.map(formatReasonCode),
    confidence: order.confidence,
    recommendedActionId: order.actionId,
    ...(order.target ? { recommendedTargetKey: getActionTargetKey(order.target) } : {}),
    ...(order.assignedOperativeId ? { recommendedOperativeId: order.assignedOperativeId } : {}),
  };
}

function formatReasonCode(reasonCode: string): string {
  return reasonCode
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getAdvisorConfidence(warnings: readonly AdvisorMessage[]): AdvisorConfidence {
  if (warnings.some((warning) => warning.tone === 'danger')) {
    return 'low';
  }

  if (warnings.length > 0) {
    return 'medium';
  }

  return 'high';
}

function formatValidationStatus(status: GameState['run']['validationStatus']): string {
  switch (status) {
    case 'validated':
      return 'Validated setup';
    case 'harness_validated':
      return 'Harness-validated seed';
    case 'unvalidated':
      return 'Unvalidated custom seed';
  }
}
