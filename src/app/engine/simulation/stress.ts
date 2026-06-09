import { getOperativeDefinition } from '../content';
import type { GameLogEntry, GameState, QueuedOrder } from '../model';
import { getStressTier } from '../roster';
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
    eventLog: appendIdleTierChangeLogs(state, assignedOperativeIds),
  };
}

export function pruneRecentAssignments(state: GameState): GameState {
  const oldestWeek = state.week - 2;

  return {
    ...state,
    operatives: state.operatives.map((operative) => ({
      ...operative,
      recentAssignments: operative.recentAssignments.filter(
        (assignment) => assignment.week >= oldestWeek,
      ),
    })),
  };
}

function appendIdleTierChangeLogs(
  state: GameState,
  assignedOperativeIds: ReadonlySet<string>,
): GameLogEntry[] {
  const logs = [...state.eventLog];

  for (const operative of state.operatives) {
    if (assignedOperativeIds.has(operative.id) || operative.stress <= 0) {
      continue;
    }

    const nextStress = clampStress(operative.stress - IDLE_STRESS_RECOVERY);
    const previousTier = getStressTier(operative.stress);
    const nextTier = getStressTier(nextStress);

    if (previousTier === nextTier) {
      continue;
    }

    const name = getOperativeDefinition(operative.id)?.name ?? operative.id;
    logs.push({
      id: `log_${state.week}_${logs.length + 1}_operative_condition`,
      week: state.week,
      type: 'operative_condition',
      title: `${name} Stabilizes`,
      body: `${name} moved from ${previousTier} to ${nextTier} after a week off assignment.`,
      tags: ['OPERATIVE', operative.id, previousTier, nextTier],
    });
  }

  return logs;
}
