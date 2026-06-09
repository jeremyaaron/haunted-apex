import type { EventId, GameState } from '../model';
import { materializeOperativeState } from '../roster';
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
        dominion: 85,
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

  it('applies operative effects to the event owner and clamps Stress', () => {
    const juno = materializeOperativeState('op_juno_hex');
    const mara = materializeOperativeState('op_mara_voss');
    juno.stress = 98;
    const state = {
      ...withPendingEvent('event_juno_static_in_her_voice'),
      operatives: [juno, mara],
    };
    const result = resolveEventChoice(state, 'event_1_1', 'push_deeper');

    if (!result.ok) {
      fail(`Expected operative event resolution, got ${result.error}`);
      return;
    }

    expect(result.state.operatives.find((operative) => operative.id === juno.id)?.stress).toBe(100);
    expect(result.state.operatives.find((operative) => operative.id === mara.id)?.stress).toBe(
      mara.stress,
    );
  });

  it('clamps operative Loyalty and applies rival-pressure effects', () => {
    const saint = materializeOperativeState('op_saint_calder');
    saint.loyalty = 2;
    const saintState = {
      ...withPendingEvent('event_saint_lie_comes_due'),
      operatives: [saint],
    };
    const saintResult = resolveEventChoice(saintState, 'event_1_1', 'use_the_lie');

    if (!saintResult.ok) {
      fail(`Expected operative event resolution, got ${saintResult.error}`);
      return;
    }

    expect(saintResult.state.operatives[0].loyalty).toBe(0);

    const iris = materializeOperativeState('op_iris_vale');
    const irisBase = withPendingEvent('event_iris_velvet_access');
    const irisState = {
      ...irisBase,
      operatives: [iris],
      rivals: {
        ...irisBase.rivals,
        rival_nyx_ardent: {
          ...irisBase.rivals.rival_nyx_ardent,
          pressure: 95,
        },
      },
    };
    const irisResult = resolveEventChoice(irisState, 'event_1_1', 'take_the_room');

    if (!irisResult.ok) {
      fail(`Expected operative event resolution, got ${irisResult.error}`);
      return;
    }

    expect(irisResult.state.rivals.rival_nyx_ardent.pressure).toBe(100);
  });
});

function withPendingEvent(definitionId: EventId): GameState {
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
