import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';
import { materializeOperativeState } from '../roster';

describe('resolveQueuedOrder recruitment', () => {
  it('fails closed when a queued candidate is no longer in the hire pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const candidateId = state.hirePool[0];
    const staleState = {
      ...state,
      hirePool: state.hirePool.slice(1),
    };
    const result = resolveQueuedOrder(staleState, {
      id: 'order_1_1',
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: candidateId,
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.rng.cursor).toBe(state.rngCursor);
    expect(result.state.operatives).toEqual(state.operatives);
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'complication',
        title: 'Invalid Recruitment Order',
      }),
    );
  });

  it('applies selected candidate recruitment modifiers during resolution', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const recruitState = {
      ...state,
      hirePool: ['op_mother_neon' as const],
    };
    const result = resolveQueuedOrder(recruitState, {
      id: 'order_1_1',
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: 'op_mother_neon',
      },
    });

    expect(result.state.pressures.dominion).toBe(state.pressures.dominion + 3);
    expect(result.state.pressures.loyalty).toBe(state.pressures.loyalty + 2);
    expect(result.state.pressures.resources).toBe(state.pressures.resources - 1300);
    expect(result.state.pressures.ruin).toBe(state.pressures.ruin + 2);
  });
});

describe('resolveQueuedOrder operative territory modifiers', () => {
  it('applies Rook Vale Control and Iris Vale rival Pressure modifiers', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const rookState = {
      ...base,
      operatives: [materializeOperativeState('op_rook_vale')],
    };
    const rookResult = resolveQueuedOrder(rookState, {
      id: 'order_1_1',
      actionId: 'expand_influence',
      assignedOperativeId: 'op_rook_vale',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });
    const irisState = {
      ...base,
      operatives: [materializeOperativeState('op_iris_vale')],
    };
    const irisResult = resolveQueuedOrder(irisState, {
      id: 'order_1_1',
      actionId: 'expand_influence',
      assignedOperativeId: 'op_iris_vale',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });

    expect(rookResult.state.districts.district_violet_ward.control).toBe(26);
    expect(irisResult.state.rivals.rival_nyx_ardent.pressure).toBe(16);
  });
});
