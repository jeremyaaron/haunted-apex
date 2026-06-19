import { newGame } from '../simulation';
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
