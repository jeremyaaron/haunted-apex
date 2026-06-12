import type { FrontDefinition, FrontState, PressureDelta } from '../model';
import { mergePressureDeltas } from '../simulation/pressure-delta';

export function clampFrontExposure(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateFrontWeeklyYield(
  front: Pick<FrontState, 'level'>,
  definition: FrontDefinition,
): PressureDelta {
  return front.level >= 2
    ? mergePressureDeltas(definition.baseWeeklyYield, definition.level2BonusYield)
    : { ...definition.baseWeeklyYield };
}
