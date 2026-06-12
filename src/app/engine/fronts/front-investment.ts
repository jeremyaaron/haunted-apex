import {
  getDistrictDefinition,
  getFrontDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionTarget,
  FrontDefinition,
  FrontOpportunity,
  FrontState,
  FrontStatus,
  GameState,
  PressureDelta,
  RivalId,
  RivalPressureTier,
} from '../model';
import { mergePressureDeltas } from '../simulation/pressure-delta';
import { deriveFrontStatus } from './derive-front-status';
import {
  calculateFrontWeeklyYield,
  clampFrontExposure,
} from './front-metrics';
import { OWNED_FRONT_CAP } from './generate-front-opportunities';

export type FrontInvestmentMode = 'establish' | 'upgrade';

export type FrontInvestmentUnavailableReason =
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'front_cap_reached'
  | 'front_already_owned'
  | 'front_already_max_level';

export type FrontInvestmentRivalWarning = {
  rivalId: RivalId;
  rivalName: string;
  pressureGain: number;
  currentPressure: number;
  projectedPressure: number;
  projectedTier: RivalPressureTier;
  weeklyPressureGain: number;
};

export type FrontInvestmentPreview =
  | {
      ok: true;
      mode: FrontInvestmentMode;
      target: Extract<ActionTarget, { type: 'front_opportunity' | 'front' }>;
      definition: FrontDefinition;
      frontId: FrontState['id'];
      frontName: string;
      districtId: FrontState['districtId'];
      districtName: string;
      venueId?: FrontState['venueId'];
      venueName?: string;
      relatedRivalId?: RivalId;
      cost: number;
      effects: PressureDelta;
      weeklyYield: PressureDelta;
      districtControlYield: number;
      exposureChange: number;
      currentExposure?: number;
      projectedExposure: number;
      projectedStatus: FrontStatus;
      weeklyExposureGain: number;
      rivalPressureWarning?: FrontInvestmentRivalWarning;
    }
  | {
      ok: false;
      unavailableReason: FrontInvestmentUnavailableReason;
      mode?: FrontInvestmentMode;
      target?: Extract<ActionTarget, { type: 'front_opportunity' | 'front' }>;
      definition?: FrontDefinition;
    };

export function previewFrontInvestment(
  state: GameState,
  target?: ActionTarget,
): FrontInvestmentPreview {
  if (!target) {
    return {
      ok: false,
      unavailableReason: 'target_required',
    };
  }

  if (target.type === 'front_opportunity') {
    return previewEstablishFront(state, target);
  }

  if (target.type === 'front') {
    return previewUpgradeFront(state, target);
  }

  return {
    ok: false,
    unavailableReason: 'target_not_allowed',
  };
}

export function getOwnedActiveFrontCount(state: GameState): number {
  return Object.values(state.fronts).filter((front) => front?.active).length;
}

function previewEstablishFront(
  state: GameState,
  target: Extract<ActionTarget, { type: 'front_opportunity' }>,
): FrontInvestmentPreview {
  const opportunity = state.frontOpportunities.find((candidate) => candidate.id === target.id);
  const definition = opportunity ? getFrontDefinition(opportunity.definitionId) : undefined;

  if (!opportunity || !definition) {
    return {
      ok: false,
      unavailableReason: 'target_not_found',
      mode: 'establish',
      target,
    };
  }

  if (state.fronts[definition.id]) {
    return {
      ok: false,
      unavailableReason: 'front_already_owned',
      mode: 'establish',
      target,
      definition,
    };
  }

  if (getOwnedActiveFrontCount(state) >= OWNED_FRONT_CAP) {
    return {
      ok: false,
      unavailableReason: 'front_cap_reached',
      mode: 'establish',
      target,
      definition,
    };
  }

  return materializeInvestmentPreview(state, target, definition, opportunity, 'establish');
}

function previewUpgradeFront(
  state: GameState,
  target: Extract<ActionTarget, { type: 'front' }>,
): FrontInvestmentPreview {
  const front = state.fronts[target.id];
  const definition = front ? getFrontDefinition(front.definitionId) : undefined;

  if (!front || !definition || !front.active) {
    return {
      ok: false,
      unavailableReason: 'target_not_found',
      mode: 'upgrade',
      target,
    };
  }

  if (front.level >= definition.maxLevel) {
    return {
      ok: false,
      unavailableReason: 'front_already_max_level',
      mode: 'upgrade',
      target,
      definition,
    };
  }

  return materializeInvestmentPreview(state, target, definition, front, 'upgrade');
}

function materializeInvestmentPreview(
  state: GameState,
  target: Extract<ActionTarget, { type: 'front_opportunity' | 'front' }>,
  definition: FrontDefinition,
  source: FrontOpportunity | FrontState,
  mode: FrontInvestmentMode,
): Extract<FrontInvestmentPreview, { ok: true }> {
  const district = getDistrictDefinition(source.districtId);
  const venue = source.venueId ? getVenueDefinition(source.venueId) : undefined;
  const currentExposure = mode === 'upgrade' ? (source as FrontState).exposure : undefined;
  const exposureChange =
    mode === 'establish' ? definition.exposureOnEstablish : definition.exposureOnUpgrade;
  const projectedExposure = clampFrontExposure((currentExposure ?? 0) + exposureChange);
  const projectedLevel = mode === 'establish' ? 1 : 2;
  const effects = mode === 'establish'
    ? { ...definition.establishEffects }
    : { ...definition.upgradeEffects };
  const pressureGain = mode === 'establish' ? definition.rivalPressureOnEstablish ?? 0 : 0;

  return {
    ok: true,
    mode,
    target,
    definition,
    frontId: definition.id,
    frontName: definition.name,
    districtId: source.districtId,
    districtName: district?.name ?? source.districtId,
    ...(source.venueId ? { venueId: source.venueId } : {}),
    ...(venue ? { venueName: venue.name } : {}),
    ...(source.relatedRivalId ? { relatedRivalId: source.relatedRivalId } : {}),
    cost: mode === 'establish' ? definition.setupCost : definition.upgradeCost,
    effects,
    weeklyYield: calculateFrontWeeklyYield({ level: projectedLevel }, definition),
    districtControlYield: definition.districtControlYield ?? 0,
    exposureChange,
    ...(currentExposure !== undefined ? { currentExposure } : {}),
    projectedExposure,
    projectedStatus: deriveFrontStatus(projectedExposure),
    weeklyExposureGain: definition.exposurePerWeek,
    rivalPressureWarning: createRivalPressureWarning(
      state,
      source.relatedRivalId,
      pressureGain,
      definition.rivalPressurePerWeek ?? 0,
    ),
  };
}

function createRivalPressureWarning(
  state: GameState,
  rivalId: RivalId | undefined,
  pressureGain: number,
  weeklyPressureGain: number,
): FrontInvestmentRivalWarning | undefined {
  if (!rivalId || (pressureGain === 0 && weeklyPressureGain === 0)) {
    return undefined;
  }

  const rival = getRivalDefinition(rivalId);
  const rivalState = state.rivals[rivalId];

  if (!rival || !rivalState) {
    return undefined;
  }

  const projectedPressure = Math.max(0, Math.min(100, rivalState.pressure + pressureGain));

  return {
    rivalId,
    rivalName: rival.name,
    pressureGain,
    currentPressure: rivalState.pressure,
    projectedPressure,
    projectedTier: rivalPressureTier(projectedPressure),
    weeklyPressureGain,
  };
}

function rivalPressureTier(pressure: number): RivalPressureTier {
  if (pressure < 25) {
    return 'watching';
  }

  if (pressure < 50) {
    return 'interested';
  }

  if (pressure < 75) {
    return 'provoked';
  }

  return 'retaliating';
}

export function frontInvestmentTotalEffects(
  preview: Extract<FrontInvestmentPreview, { ok: true }>,
): PressureDelta {
  return mergePressureDeltas(preview.effects, {
    resources: preview.cost > 0 ? -preview.cost : undefined,
  });
}
