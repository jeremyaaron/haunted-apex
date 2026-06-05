import type { PressureId, Pressures } from '../model';

const PRESSURE_LIMITS: Partial<Record<PressureId, { min: number; max: number }>> = {
  dominion: { min: 0, max: 100 },
  heat: { min: 0, max: 100 },
  loyalty: { min: 0, max: 100 },
  intel: { min: 0, max: 100 },
  ruin: { min: 0, max: 100 },
};

export function clampPressures(pressures: Pressures): Pressures {
  return {
    dominion: clampPressure('dominion', pressures.dominion),
    heat: clampPressure('heat', pressures.heat),
    loyalty: clampPressure('loyalty', pressures.loyalty),
    resources: pressures.resources,
    intel: clampPressure('intel', pressures.intel),
    ruin: clampPressure('ruin', pressures.ruin),
  };
}

export function clampStress(stress: number): number {
  return Math.min(100, Math.max(0, stress));
}

function clampPressure(id: PressureId, value: number): number {
  const limit = PRESSURE_LIMITS[id];

  if (!limit) {
    return value;
  }

  return Math.min(limit.max, Math.max(limit.min, value));
}

