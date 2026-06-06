import type { GameLogEntry, GameState, PressureDelta } from '../model';
import { applyPressureDelta } from './pressure-delta';

export function applyWeeklyDrift(state: GameState): GameState {
  const baseResourceDrift = -500;
  const baseHeatDrift = -2;
  const baseLoyaltyDrift = -1;
  const drift: PressureDelta = {
    resources: baseResourceDrift,
    heat: baseHeatDrift,
    loyalty: baseLoyaltyDrift,
  };
  const projected = {
    resources: state.pressures.resources + baseResourceDrift,
    heat: state.pressures.heat + baseHeatDrift,
    loyalty: state.pressures.loyalty + baseLoyaltyDrift,
  };

  if (state.pressures.dominion >= 40) {
    drift.heat = (drift.heat ?? 0) + 2;
    projected.heat += 2;
  }

  if (state.pressures.dominion >= 60) {
    drift.loyalty = (drift.loyalty ?? 0) - 1;
    projected.loyalty -= 1;
  }

  if (projected.heat >= 70) {
    drift.heat = (drift.heat ?? 0) + 2;
    projected.heat += 2;
    drift.loyalty = (drift.loyalty ?? 0) - 3;
    projected.loyalty -= 3;
  }

  if (projected.resources <= 1000) {
    drift.loyalty = (drift.loyalty ?? 0) - 3;
  }

  const logEntry: GameLogEntry = {
    id: createLogId(state, 'drift'),
    week: state.week,
    type: 'drift',
    title: 'Weekly Drift',
    body: 'Upkeep, attention, and fatigue move through the network.',
    pressureDelta: drift,
  };

  return {
    ...state,
    pressures: applyPressureDelta(state.pressures, drift),
    eventLog: [...state.eventLog, logEntry],
  };
}

function createLogId(state: GameState, suffix: string): string {
  return `log_${state.week}_${state.eventLog.length + 1}_${suffix}`;
}
