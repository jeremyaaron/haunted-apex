import { advanceWeek, newGame, queueOrder } from '../simulation';
import { selectAdvisorViewModel } from './advisor-view-model';

describe('selectAdvisorViewModel', () => {
  it('returns an empty guidance surface when Advisor mode is off', () => {
    const view = selectAdvisorViewModel(newGame({ seed: 'ADVISOR-OFF' }), 'off');

    expect(view.mode).toBe('off');
    expect(view.currentRead).toEqual([]);
    expect(view.recommendations).toEqual([]);
    expect(view.warnings).toEqual([]);
    expect(view.opportunities).toEqual([]);
  });

  it('shows hints without strategic recommendations', () => {
    const view = selectAdvisorViewModel(newGame({ seed: 'ADVISOR-HINTS' }), 'hints');

    expect(view.currentRead.length).toBeGreaterThan(0);
    expect(view.recommendations).toEqual([]);
    expect(view.currentRead.some((message) => message.id === 'dominion-pace')).toBeTrue();
  });

  it('shows strategic but non-exact guidance in Coach mode', () => {
    const view = selectAdvisorViewModel(newGame({ seed: 'ADVISOR-COACH' }), 'coach');

    expect(view.recommendations.length).toBe(1);
    expect(view.recommendations[0].recommendedActionId).toBeUndefined();
    expect(view.recommendations[0].recommendedTargetKey).toBeUndefined();
    expect(view.recommendations[0].recommendedOperativeId).toBeUndefined();
  });

  it('shows exact command recommendations only in Handler mode', () => {
    const state = newGame({ seed: 'ADVISOR-HANDLER-COMMAND' });
    const view = selectAdvisorViewModel(state, 'handler');
    const firstRecommendation = view.recommendations[0];

    expect(view.mode).toBe('handler');
    expect(view.currentRead.length).toBeGreaterThan(0);
    expect(view.recommendations.length).toBeGreaterThan(0);
    expect(firstRecommendation.recommendedActionId).toBeDefined();
    expect(firstRecommendation.body.length).toBeGreaterThan(30);

    if (firstRecommendation.recommendedTargetKey) {
      const matchingTarget = firstRecommendation.recommendedActionId
        ? view.recommendations.find(
            (recommendation) =>
              recommendation.recommendedTargetKey === firstRecommendation.recommendedTargetKey,
          )
        : undefined;

      expect(matchingTarget?.recommendedTargetKey).toBe(firstRecommendation.recommendedTargetKey);
    }
  });

  it('shows exact event choice recommendations only in Handler mode', () => {
    const queued = queueOrder(newGame({ seed: 'ADVISOR-HANDLER-EVENT' }), {
      actionId: 'gather_intel',
    });

    if (!queued.ok) {
      fail(`Expected queueable order, got ${queued.error}`);
      return;
    }

    const advanced = advanceWeek(queued.state);

    if (!advanced.ok) {
      fail(`Expected advanced week, got ${advanced.error}`);
      return;
    }

    const handlerView = selectAdvisorViewModel(advanced.state, 'handler');
    const coachView = selectAdvisorViewModel(advanced.state, 'coach');

    expect(handlerView.phase).toBe('event');
    expect(handlerView.recommendations[0].recommendedEventChoiceId).toBeDefined();
    expect(coachView.recommendations[0]?.recommendedEventChoiceId).toBeUndefined();
  });

  it('sets the phase from the current game state', () => {
    const commandView = selectAdvisorViewModel(newGame({ seed: 'ADVISOR-PHASE' }), 'coach');
    const eventView = selectAdvisorViewModel(
      {
        ...newGame({ seed: 'ADVISOR-PHASE' }),
        phase: 'EVENT_CHOICE',
      },
      'coach',
    );

    expect(commandView.phase).toBe('command');
    expect(eventView.phase).toBe('event');
  });
});
