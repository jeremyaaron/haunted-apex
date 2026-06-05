import type { PressureDelta, Pressures } from '../model';
import { PRESSURE_IDS } from '../model';
import { clampPressures } from './clamps';

export function applyPressureDelta(pressures: Pressures, delta: PressureDelta): Pressures {
  const next: Pressures = { ...pressures };

  for (const id of PRESSURE_IDS) {
    next[id] += delta[id] ?? 0;
  }

  return clampPressures(next);
}

export function mergePressureDeltas(...deltas: readonly PressureDelta[]): PressureDelta {
  const merged: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = deltas.reduce((sum, delta) => sum + (delta[id] ?? 0), 0);

    if (value !== 0) {
      merged[id] = value;
    }
  }

  return merged;
}

