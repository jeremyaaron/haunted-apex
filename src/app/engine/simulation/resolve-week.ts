import type { GameState } from '../model';
import { applyIdleStressRecovery } from './stress';
import { applyWeeklyDrift } from './weekly-drift';
import { applyWinLoss } from './win-loss';
import { resolveQueuedOrder } from './resolve-action';

export type AdvanceWeekResult =
  | {
      ok: true;
      state: GameState;
    }
  | {
      ok: false;
      state: GameState;
      error: 'no_queued_orders' | 'not_command_phase';
    };

export function advanceWeek(state: GameState): AdvanceWeekResult {
  if (state.phase !== 'COMMAND') {
    return {
      ok: false,
      state,
      error: 'not_command_phase',
    };
  }

  if (state.queuedOrders.length === 0) {
    return {
      ok: false,
      state,
      error: 'no_queued_orders',
    };
  }

  let next: GameState = {
    ...state,
    phase: 'RESOLVING_ACTIONS',
  };

  for (const order of state.queuedOrders) {
    next = resolveQueuedOrder(next, order).state;
  }

  next = applyIdleStressRecovery(next, state.queuedOrders);
  next = applyWeeklyDrift(next);
  next = {
    ...next,
    queuedOrders: [],
    phase: 'WEEK_COMPLETE',
  };
  next = applyWinLoss(next);

  return {
    ok: true,
    state: next,
  };
}

