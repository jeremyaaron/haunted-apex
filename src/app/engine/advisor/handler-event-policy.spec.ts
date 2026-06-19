import type { EventId, GameState } from '../model';
import { newGame, resolveEventChoice } from '../simulation';
import {
  buildEventChoicePlans,
  isRecommendedEventChoice,
  recommendHandlerEvent,
} from './handler-event-policy';
import { selectHandlerRecommendation } from './handler-recommendations';
import { selectLegalEventChoiceOptions } from './legal-options';
import {
  createHandlerDecisionTraceEntry,
  createHandlerValidationResult,
} from './run-validation';

describe('Handler event policy', () => {
  it('recommends a legal, explainable event response', () => {
    const state = withPendingEvent('liaison_favor');
    const recommendation = recommendHandlerEvent({ state });
    const eventRecommendation = recommendation.eventRecommendation;

    expect(recommendation.phase).toBe('event');
    expect(eventRecommendation).toBeDefined();
    expect(recommendation.invalidRecommendations).toEqual([]);
    expect(recommendation.planAssessment).toContain('Recommended response');
    expect(eventRecommendation?.eventId).toBe('liaison_favor');
    expect(eventRecommendation?.reason.length ?? 0).toBeGreaterThan(30);
    expect(eventRecommendation?.reasonCodes.length ?? 0).toBeGreaterThan(0);

    const resolved = eventRecommendation
      ? resolveEventChoice(state, state.pendingEvent!.id, eventRecommendation.choiceId)
      : { ok: false };

    expect(resolved.ok).toBeTrue();
  });

  it('does not mutate the input state while building event recommendations', () => {
    const state = withPendingEvent('unexpected_windfall');
    const before = structuredClone(state);

    recommendHandlerEvent({ state });

    expect(state).toEqual(before);
  });

  it('builds one plan per legal event choice', () => {
    const state = withPendingEvent('heat_cools');
    const options = selectLegalEventChoiceOptions(state);
    const plans = buildEventChoicePlans(state, options);

    expect(options.length).toBe(3);
    expect(plans.length).toBe(options.length);
    expect(plans.every((plan) => plan.option.availability.available)).toBeTrue();
  });

  it('prioritizes immediate loss prevention over Dominion upside', () => {
    const state = {
      ...withPendingEvent('safehouse_compromised'),
      pressures: {
        ...withPendingEvent('safehouse_compromised').pressures,
        heat: 94,
        resources: 5000,
      },
    };
    const recommendation = recommendHandlerEvent({ state });

    expect(recommendation.eventRecommendation?.choiceId).toBe('move_immediately');
    expect(isRecommendedEventChoice(recommendation, 'move_immediately')).toBeTrue();
  });

  it('routes public Handler recommendations to event policy during event choice', () => {
    const state = withPendingEvent('corp_patrol_sweep');
    const recommendation = selectHandlerRecommendation(state);

    expect(recommendation.phase).toBe('event');
    expect(recommendation.eventRecommendation).toBeDefined();
    expect(recommendation.recommendedOrders).toEqual([]);
  });

  it('creates compact decision trace entries from event recommendations', () => {
    const state = withPendingEvent('heat_cools');
    const recommendation = recommendHandlerEvent({ state });
    const trace = createHandlerDecisionTraceEntry({ state, recommendation });

    expect(trace).toEqual(
      jasmine.objectContaining({
        week: state.week,
        phase: 'event',
        chosenEventChoiceId: recommendation.eventRecommendation?.choiceId,
      }),
    );
    expect(trace.recommendationSummary).toContain('Recommended response');
    expect(trace.reason.length).toBeGreaterThan(30);
  });

  it('creates validation result summaries for later harness gates', () => {
    const victoryState = {
      ...newGame({ seed: 'HANDLER-VALIDATION-SUMMARY' }),
      phase: 'GAME_OVER' as const,
      gameOver: {
        result: 'victory' as const,
        reason: 'dominion_victory' as const,
      },
    };
    const result = createHandlerValidationResult(victoryState, [], 0);

    expect(result.status).toBe('handler_win');
    expect(result.seed).toBe(victoryState.seed);
    expect(result.campaignTensionId).toBe(victoryState.campaign.tensionId);
    expect(result.runMode).toBe(victoryState.run.mode);
    expect(result.invalidRecommendationCount).toBe(0);
  });
});

function withPendingEvent(definitionId: EventId): GameState {
  return {
    ...newGame({ seed: `HANDLER-EVENT-${definitionId}` }),
    phase: 'EVENT_CHOICE',
    pendingEvent: {
      id: 'event_1_1',
      definitionId,
      week: 1,
    },
  };
}
