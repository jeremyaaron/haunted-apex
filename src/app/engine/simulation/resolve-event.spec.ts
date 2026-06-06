import type { GameState } from '../model';
import { newGame } from './new-game';
import { getEventChoiceAvailability, resolveEventChoice } from './resolve-event';

describe('resolveEventChoice', () => {
  it('applies event costs, effects, flags, and advances to the next week', () => {
    const state = withPendingEvent('liaison_favor');
    const result = resolveEventChoice(state, 'event_1_1', 'accept_the_favor');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.week).toBe(2);
    expect(result.state.phase).toBe('COMMAND');
    expect(result.state.pendingEvent).toBeUndefined();
    expect(result.state.pressures.intel).toBe(20);
    expect(result.state.pressures.dominion).toBe(15);
    expect(result.state.pressures.ruin).toBe(2);
    expect(result.state.flags['owes_liaison']).toBeTrue();
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'event_choice',
        title: 'Accept the favor',
      }),
    );
  });

  it('subtracts regular event costs', () => {
    const state = withPendingEvent('corp_patrol_sweep');
    const result = resolveEventChoice(state, 'event_1_1', 'pay_for_clean_passage');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.pressures.resources).toBe(4000);
    expect(result.state.pressures.heat).toBe(8);
  });

  it('subtracts tech_or_intel costs from Intel in v0', () => {
    const state = withPendingEvent('rival_sends_flowers');
    const result = resolveEventChoice(state, 'event_1_1', 'keep_the_device_and_reverse_it');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.pressures.intel).toBe(12);
    expect(result.state.pressures.heat).toBe(20);
  });

  it('rejects unaffordable event choices', () => {
    const state = {
      ...withPendingEvent('safehouse_compromised'),
      pressures: {
        ...withPendingEvent('safehouse_compromised').pressures,
        resources: 100,
      },
    };

    expect(getEventChoiceAvailability(state, 'event_1_1', 'move_immediately')).toEqual({
      available: false,
      reason: 'not_enough_cost',
    });
    expect(resolveEventChoice(state, 'event_1_1', 'move_immediately')).toEqual({
      ok: false,
      state,
      error: 'not_enough_cost',
    });
  });

  it('checks win/loss after the event choice before incrementing the week', () => {
    const state = {
      ...withPendingEvent('rival_tests_border'),
      week: 8,
      pressures: {
        ...withPendingEvent('rival_tests_border').pressures,
        dominion: 70,
      },
    };
    const result = resolveEventChoice(state, 'event_1_1', 'answer_publicly');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.week).toBe(8);
    expect(result.state.phase).toBe('GAME_OVER');
    expect(result.state.gameOver).toEqual({
      result: 'victory',
      reason: 'dominion_victory',
    });
  });

  it('clears transient weekly action flags after event resolution', () => {
    const state = {
      ...withPendingEvent('heat_cools'),
      flags: {
        ran_small_job_this_week: true,
        laid_low_this_week: true,
      },
    };
    const result = resolveEventChoice(state, 'event_1_1', 'use_the_quiet_to_listen');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.flags['ran_small_job_this_week']).toBeUndefined();
    expect(result.state.flags['laid_low_this_week']).toBeUndefined();
  });

  it('rejects choices outside event choice phase', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(resolveEventChoice(state, 'event_1_1', 'accept_the_favor')).toEqual({
      ok: false,
      state,
      error: 'not_event_choice_phase',
    });
  });
});

function withPendingEvent(definitionId: string): GameState {
  return {
    ...newGame({ seed: 'VIOLET-ASH-1047' }),
    phase: 'EVENT_CHOICE',
    pendingEvent: {
      id: 'event_1_1',
      definitionId,
      week: 1,
    },
  };
}
