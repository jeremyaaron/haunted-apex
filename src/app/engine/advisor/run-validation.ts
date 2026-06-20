import type { GameState } from '../model';
import type {
  HandlerDecisionTraceEntry,
  HandlerRecommendation,
  HandlerValidationResult,
  HandlerValidationStatus,
} from './advisor-types';

export type HandlerDecisionTraceInput = {
  state: GameState;
  recommendation: HandlerRecommendation;
};

export function createHandlerDecisionTraceEntry(
  input: HandlerDecisionTraceInput,
): HandlerDecisionTraceEntry {
  const recommendation = input.recommendation;
  const warnings = recommendation.warnings.map((warning) => warning.text);

  return {
    week: input.state.week,
    phase: recommendation.phase,
    recommendationSummary:
      recommendation.planAssessment ?? summarizeRecommendation(recommendation),
    ...(recommendation.recommendedOrders.length > 0
      ? { chosenOrders: recommendation.recommendedOrders }
      : {}),
    ...(recommendation.eventRecommendation
      ? { chosenEventChoiceId: recommendation.eventRecommendation.choiceId }
      : {}),
    reason: summarizeRecommendationReason(recommendation),
    warnings,
  };
}

export function createHandlerValidationResult(
  state: GameState,
  decisionTrace: readonly HandlerDecisionTraceEntry[],
  invalidRecommendationCount: number,
): HandlerValidationResult {
  const lossCause = getValidationLossCause(state, invalidRecommendationCount);

  return {
    status: getValidationStatus(state, invalidRecommendationCount),
    seed: state.seed,
    campaignTensionId: state.campaign.tensionId,
    runMode: state.run.mode,
    ...(state.gameOver ? { resultWeek: state.week } : {}),
    finalPressures: state.pressures,
    ...(lossCause ? { lossCause } : {}),
    invalidRecommendationCount,
    decisionTrace: [...decisionTrace],
  };
}

function getValidationStatus(
  state: GameState,
  invalidRecommendationCount: number,
): HandlerValidationStatus {
  if (invalidRecommendationCount > 0) {
    return 'invalid_state';
  }

  if (state.gameOver?.result === 'victory') {
    return 'handler_win';
  }

  return 'handler_loss';
}

function getValidationLossCause(
  state: GameState,
  invalidRecommendationCount: number,
): HandlerValidationResult['lossCause'] | undefined {
  if (invalidRecommendationCount > 0) {
    return 'invalid_recommendation';
  }

  if (state.gameOver?.result === 'loss') {
    return state.gameOver.reason;
  }

  if (!state.gameOver && state.phase !== 'GAME_OVER') {
    return 'agent_stalled';
  }

  return undefined;
}

function summarizeRecommendationReason(recommendation: HandlerRecommendation): string {
  if (recommendation.eventRecommendation) {
    return recommendation.eventRecommendation.reason;
  }

  const orderReasons = recommendation.recommendedOrders.map((order) => order.reason).join(' ');

  return orderReasons || recommendation.planAssessment || 'No Handler recommendation available.';
}

function summarizeRecommendation(recommendation: HandlerRecommendation): string {
  if (recommendation.eventRecommendation) {
    return `Recommended event response: ${recommendation.eventRecommendation.choiceLabel}.`;
  }

  if (recommendation.recommendedOrders.length > 0) {
    return `Recommended ${recommendation.recommendedOrders.length} command order${
      recommendation.recommendedOrders.length === 1 ? '' : 's'
    }.`;
  }

  return 'No Handler recommendation available.';
}
