import { getDistrictDefinition } from '../content';
import type { ActionId, ActionTarget, GameState, PressureDelta } from '../model';
import {
  calculateRivalPressureGain,
  calculateTargetControlGain,
  calculateTargetLocalHeatGain,
  getTargetControllerId,
  resolveTargetDistrictId,
} from '../selectors';

export function applyTargetedActionConsequences(
  state: GameState,
  actionId: ActionId,
  target: ActionTarget | undefined,
  resolvedDelta: PressureDelta,
): GameState {
  const districtId = resolveTargetDistrictId(target);
  const rivalId = getTargetControllerId(target);
  const controlGain = calculateTargetControlGain(actionId, target);
  const localHeatGain = calculateTargetLocalHeatGain(resolvedDelta, target);
  const rivalPressureGain = rivalId ? calculateRivalPressureGain(actionId) : 0;

  return {
    ...state,
    districts:
      districtId && state.districts[districtId]
        ? {
            ...state.districts,
            [districtId]: {
              ...state.districts[districtId],
              control: clampTerritoryValue(state.districts[districtId].control + controlGain),
              heat: clampTerritoryValue(state.districts[districtId].heat + localHeatGain),
            },
          }
        : state.districts,
    rivals:
      rivalId && state.rivals[rivalId]
        ? {
            ...state.rivals,
            [rivalId]: {
              ...state.rivals[rivalId],
              pressure: clampTerritoryValue(
                state.rivals[rivalId].pressure + rivalPressureGain,
              ),
            },
          }
        : state.rivals,
  };
}

export function applyLocalDistrictCooling(state: GameState): GameState {
  const districts = { ...state.districts };

  for (const districtId of Object.keys(districts) as (keyof typeof districts)[]) {
    const definition = getDistrictDefinition(districtId);
    const district = districts[districtId];

    if (!definition) {
      continue;
    }

    districts[districtId] = {
      ...district,
      heat: Math.max(definition.baseHeat, clampTerritoryValue(district.heat - 1)),
    };
  }

  return {
    ...state,
    districts,
  };
}

function clampTerritoryValue(value: number): number {
  return Math.min(100, Math.max(0, value));
}
