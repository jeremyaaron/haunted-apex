import type { GameState, QueuedOrder } from '../model';
import { clampStress } from './clamps';

const IDLE_STRESS_RECOVERY = 2;

export function applyIdleStressRecovery(
  state: GameState,
  resolvedOrders: readonly QueuedOrder[],
): GameState {
  const assignedOperativeIds = new Set(
    resolvedOrders.flatMap((order) =>
      order.assignedOperativeId === undefined ? [] : [order.assignedOperativeId],
    ),
  );

  return {
    ...state,
    operatives: state.operatives.map((operative) => {
      if (assignedOperativeIds.has(operative.id) || operative.stress <= 0) {
        return operative;
      }

      return {
        ...operative,
        stress: clampStress(operative.stress - IDLE_STRESS_RECOVERY),
        status: operative.status === 'idle' ? 'available' : operative.status,
      };
    }),
  };
}

