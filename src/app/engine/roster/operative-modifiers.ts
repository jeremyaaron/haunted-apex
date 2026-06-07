import {
  getDistrictDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getTraitDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionDefinition,
  ActionTarget,
  GameState,
  ModifierCondition,
  OperativeAffinity,
  OperativeDefinition,
  OperativeState,
  PressureDelta,
  RivalId,
  StressTier,
  TraitModifier,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { getStressTier } from './stress';

const STRESS_TIER_ORDER: Record<StressTier, number> = {
  stable: 0,
  strained: 1,
  unstable: 2,
  breaking: 3,
};

const BASE_STRESS_BY_ACTION_TYPE = {
  normal: 6,
  dangerous: 10,
  recovery: -8,
  none: 0,
} as const;

export type OperativeActionContext = {
  state: GameState;
  action: ActionDefinition;
  operative?: OperativeState;
  recruitTargetDefinition?: OperativeDefinition;
  target?: ActionTarget;
};

export type AppliedModifierSource = {
  sourceType: 'trait' | 'affinity';
  sourceId: string;
  label: string;
  effects?: PressureDelta;
  riskModifier?: number;
  stressModifier?: number;
  resourceCostModifier?: number;
  rivalPressureModifier?: number;
  districtControlModifier?: number;
};

export type OperativeModifierResult = {
  effects: PressureDelta;
  resourceCostModifier: number;
  riskModifier: number;
  stressModifier: number;
  rivalPressureModifier: number;
  districtControlModifier: number;
  appliedSources: AppliedModifierSource[];
};

type ResolvedOperativeContext = {
  definition: OperativeDefinition;
  state?: OperativeState;
};

export function calculateOperativeModifiers(
  context: OperativeActionContext,
): OperativeModifierResult {
  const result = emptyModifierResult();
  const operativeContext = resolveOperativeContext(context);

  if (!operativeContext) {
    return result;
  }

  const traitIds = operativeContext.state
    ? operativeContext.state.revealedTraits
    : [
        operativeContext.definition.signatureTraitId,
        ...(operativeContext.definition.liabilityTraitId
          ? [operativeContext.definition.liabilityTraitId]
          : []),
      ];

  for (const traitId of traitIds) {
    const trait = getTraitDefinition(traitId);

    if (!trait || trait.kind === 'hidden') {
      continue;
    }

    for (const modifier of trait.modifiers) {
      if (!matchesModifierCondition(modifier.condition, context, operativeContext)) {
        continue;
      }

      applyModifier(result, modifier);
      result.appliedSources.push(toTraitSource(trait.name, modifier));
    }
  }

  for (const affinity of operativeContext.definition.affinities) {
    if (!matchesAffinity(affinity, context)) {
      continue;
    }

    applyModifier(result, affinity);
    result.appliedSources.push(toAffinitySource(affinity));
  }

  return result;
}

export function calculateActionStressDelta(
  action: ActionDefinition,
  context: OperativeActionContext,
  modifiers = calculateOperativeModifiers(context),
): number {
  const operativeContext = resolveOperativeContext(context);

  if (!operativeContext?.state) {
    return 0;
  }

  return (
    BASE_STRESS_BY_ACTION_TYPE[action.stressType] +
    operativeContext.definition.stressProfile.stressGainModifier +
    modifiers.stressModifier
  );
}

export function matchesModifierCondition(
  condition: ModifierCondition,
  context: OperativeActionContext,
  operativeContext = resolveOperativeContext(context),
): boolean {
  if (condition.actionIds && !condition.actionIds.includes(context.action.id)) {
    return false;
  }

  const targetTags = getContextTargetTags(context.target);

  if (
    condition.targetTags &&
    !condition.targetTags.some((targetTag) => targetTags.includes(targetTag))
  ) {
    return false;
  }

  const rivalId = getContextRivalId(context.target);

  if (condition.rivalIds && (!rivalId || !condition.rivalIds.includes(rivalId))) {
    return false;
  }

  const districtId = getContextDistrictId(context.target);
  const localHeat = districtId ? context.state.districts[districtId]?.heat : undefined;

  if (condition.minLocalHeat !== undefined && (localHeat ?? -Infinity) < condition.minLocalHeat) {
    return false;
  }

  const stress = operativeContext?.state?.stress ?? operativeContext?.definition.startingStress;
  const stressTier = stress === undefined ? undefined : getStressTier(stress);

  if (
    condition.minStressTier &&
    (!stressTier ||
      STRESS_TIER_ORDER[stressTier] < STRESS_TIER_ORDER[condition.minStressTier])
  ) {
    return false;
  }

  if (
    condition.maxStressTier &&
    (!stressTier ||
      STRESS_TIER_ORDER[stressTier] > STRESS_TIER_ORDER[condition.maxStressTier])
  ) {
    return false;
  }

  if (
    condition.minPressure &&
    PRESSURE_IDS.some(
      (pressureId) =>
        condition.minPressure?.[pressureId] !== undefined &&
        context.state.pressures[pressureId] < (condition.minPressure[pressureId] ?? 0),
    )
  ) {
    return false;
  }

  return !(
    condition.maxPressure &&
    PRESSURE_IDS.some(
      (pressureId) =>
        condition.maxPressure?.[pressureId] !== undefined &&
        context.state.pressures[pressureId] > (condition.maxPressure[pressureId] ?? 0),
    )
  );
}

export function matchesAffinity(
  affinity: OperativeAffinity,
  context: OperativeActionContext,
): boolean {
  if (affinity.actionId && affinity.actionId !== context.action.id) {
    return false;
  }

  const targetTags = getContextTargetTags(context.target);

  if (affinity.targetTag && !targetTags.includes(affinity.targetTag)) {
    return false;
  }

  const districtId = getContextDistrictId(context.target);

  if (affinity.districtId && affinity.districtId !== districtId) {
    return false;
  }

  if (affinity.districtTag) {
    const districtTags = districtId ? getDistrictDefinition(districtId)?.tags ?? [] : [];

    if (!districtTags.includes(affinity.districtTag)) {
      return false;
    }
  }

  return !affinity.rivalId || affinity.rivalId === getContextRivalId(context.target);
}

function resolveOperativeContext(
  context: OperativeActionContext,
): ResolvedOperativeContext | undefined {
  if (context.operative) {
    const definition = getOperativeDefinition(context.operative.id);
    return definition ? { definition, state: context.operative } : undefined;
  }

  return context.recruitTargetDefinition
    ? { definition: context.recruitTargetDefinition }
    : undefined;
}

function emptyModifierResult(): OperativeModifierResult {
  return {
    effects: {},
    resourceCostModifier: 0,
    riskModifier: 0,
    stressModifier: 0,
    rivalPressureModifier: 0,
    districtControlModifier: 0,
    appliedSources: [],
  };
}

function applyModifier(
  result: OperativeModifierResult,
  modifier: TraitModifier | OperativeAffinity,
): void {
  result.effects = mergePressureDeltas(result.effects, modifier.effects);
  result.resourceCostModifier +=
    'resourceCostModifier' in modifier ? modifier.resourceCostModifier ?? 0 : 0;
  result.riskModifier += modifier.riskModifier ?? 0;
  result.stressModifier += modifier.stressModifier ?? 0;
  result.rivalPressureModifier += modifier.rivalPressureModifier ?? 0;
  result.districtControlModifier +=
    'districtControlModifier' in modifier ? modifier.districtControlModifier ?? 0 : 0;
}

function toTraitSource(
  traitName: string,
  modifier: TraitModifier,
): AppliedModifierSource {
  return compactSource({
    sourceType: 'trait',
    sourceId: modifier.id,
    label: traitName,
    effects: modifier.effects,
    riskModifier: modifier.riskModifier,
    stressModifier: modifier.stressModifier,
    resourceCostModifier: modifier.resourceCostModifier,
    rivalPressureModifier: modifier.rivalPressureModifier,
    districtControlModifier: modifier.districtControlModifier,
  });
}

function toAffinitySource(affinity: OperativeAffinity): AppliedModifierSource {
  return compactSource({
    sourceType: 'affinity',
    sourceId: affinity.id,
    label: humanizeId(affinity.id),
    effects: affinity.effects,
    riskModifier: affinity.riskModifier,
    stressModifier: affinity.stressModifier,
    resourceCostModifier: undefined,
    rivalPressureModifier: affinity.rivalPressureModifier,
    districtControlModifier: undefined,
  });
}

function compactSource(source: AppliedModifierSource): AppliedModifierSource {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  ) as AppliedModifierSource;
}

function humanizeId(id: string): string {
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getContextDistrictId(target?: ActionTarget) {
  if (target?.type === 'district') {
    return target.id;
  }

  return target?.type === 'venue' ? getVenueDefinition(target.id)?.districtId : undefined;
}

function getContextTargetTags(target?: ActionTarget): readonly string[] {
  const districtId = getContextDistrictId(target);
  const districtTags = districtId ? getDistrictDefinition(districtId)?.tags ?? [] : [];
  const targetTags =
    target?.type === 'venue'
      ? getVenueDefinition(target.id)?.tags ?? []
      : target?.type === 'district'
        ? []
        : target?.type === 'rival'
          ? getRivalDefinition(target.id)?.traits ?? []
          : [];

  return [...new Set([...districtTags, ...targetTags])];
}

function getContextRivalId(target?: ActionTarget): RivalId | undefined {
  if (target?.type === 'rival') {
    return target.id;
  }

  const districtId = getContextDistrictId(target);

  if (target?.type === 'venue') {
    const venue = getVenueDefinition(target.id);
    return venue?.controllingRivalId ?? (districtId
      ? getDistrictDefinition(districtId)?.rivalId
      : undefined);
  }

  return districtId ? getDistrictDefinition(districtId)?.rivalId : undefined;
}

function mergePressureDeltas(
  base: PressureDelta,
  modifier: PressureDelta = {},
): PressureDelta {
  const merged: PressureDelta = {};

  for (const pressureId of PRESSURE_IDS) {
    const value = (base[pressureId] ?? 0) + (modifier[pressureId] ?? 0);

    if (value !== 0) {
      merged[pressureId] = value;
    }
  }

  return merged;
}
