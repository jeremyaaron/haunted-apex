import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';

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
});
