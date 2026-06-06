import {
  DISTRICT_ZERO_MAX_OPERATIVES,
  getActionDefinition,
  getDistrictDefinition,
  getOperativeActionModifier,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionDefinition,
  ActionId,
  ActionTarget,
  DistrictDefinition,
  DistrictId,
  GameState,
  Operative,
  OperativeSkill,
  PressureDelta,
  PressureId,
  QueuedOrder,
  RivalId,
  RivalPressureTier,
  VenueDefinition,
} from '../model';
import { PRESSURE_IDS } from '../model';
import {
  calculateTargetControlGain,
  calculateTargetLocalHeatGain,
  getTargetControllerId,
  getTargetLabel,
  resolveTargetDistrictId,
} from './territory';
import { calculateRivalPressureGain, getRivalPressureTier } from './rivals';

export type RiskLabel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Severe';

export type QueueOrderRequest = {
  actionId: ActionId;
  assignedOperativeId?: string;
  target?: ActionTarget;
};

export type QueueOrderUnavailableReason =
  | 'not_command_phase'
  | 'action_not_found'
  | 'not_enough_command_points'
  | 'not_enough_resources'
  | 'operative_not_allowed'
  | 'operative_required'
  | 'operative_not_found'
  | 'operative_unavailable'
  | 'operative_already_assigned'
  | 'roster_full'
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'target_inactive';

export type OrderAvailability = {
  available: boolean;
  reason?: QueueOrderUnavailableReason;
};

export type PressureDeltaView = {
  id: PressureId;
  value: number;
};

export type OperativeOptionView = {
  id: string;
  name: string;
  disabled: boolean;
  reason?: QueueOrderUnavailableReason;
};

export type ActionPreview = {
  actionId: ActionId;
  label: string;
  commandCost: number;
  resourceCost: number;
  adjustedResourceCost: number;
  baseEffects: PressureDelta;
  adjustedEffects: PressureDelta;
  selectedOperativeId?: string;
  selectedTarget?: ActionTarget;
  targetLabel?: string;
  riskChance: number;
  riskLabel: RiskLabel;
  rivalAttention?: RivalAttentionPreview;
  localImpact?: LocalImpactPreview;
};

export type RivalAttentionPreview = {
  rivalId: RivalId;
  rivalName: string;
  pressureGain: number;
  currentPressure: number;
  projectedPressure: number;
  projectedTier: RivalPressureTier;
};

export type LocalImpactPreview = {
  districtId: DistrictId;
  districtName: string;
  controlGain: number;
  localHeatGain: number;
};

export type ActionCardView = ActionPreview & {
  state: 'available' | 'queued' | 'unavailable';
  unavailableReason?: QueueOrderUnavailableReason;
  availableOperatives: OperativeOptionView[];
};

export type QueuedOrderView = {
  id: string;
  actionId: ActionId;
  label: string;
  assignedOperativeName?: string;
  targetLabel?: string;
  adjustedEffects: PressureDelta;
  adjustedResourceCost: number;
  riskLabel: RiskLabel;
};

export function getCommandPointsSpent(state: GameState): number {
  return state.queuedOrders.reduce((spent, order) => {
    const action = getActionDefinition(order.actionId);
    return spent + (action?.commandCost ?? 0);
  }, 0);
}

export function getCommandPointsRemaining(state: GameState): number {
  return Math.max(0, state.commandPointsPerWeek - getCommandPointsSpent(state));
}

export function getQueuedResourceCost(state: GameState): number {
  return state.queuedOrders.reduce((cost, order) => {
    const action = getActionDefinition(order.actionId);

    if (!action) {
      return cost;
    }

    return cost + getAdjustedResourceCost(action, order.assignedOperativeId);
  }, 0);
}

export function getOrderAvailability(
  state: GameState,
  request: QueueOrderRequest,
): OrderAvailability {
  if (state.phase !== 'COMMAND') {
    return unavailable('not_command_phase');
  }

  const action = getActionDefinition(request.actionId);

  if (!action) {
    return unavailable('action_not_found');
  }

  const targetAvailability = getTargetAvailability(state, action, request.target);

  if (!targetAvailability.available) {
    return targetAvailability;
  }

  if (getCommandPointsRemaining(state) < action.commandCost) {
    return unavailable('not_enough_command_points');
  }

  if (action.assignment === 'none' && request.assignedOperativeId) {
    return unavailable('operative_not_allowed');
  }

  if (action.assignment === 'required' && !request.assignedOperativeId) {
    return unavailable('operative_required');
  }

  if (request.assignedOperativeId) {
    const operativeAvailability = getOperativeAvailability(state, request.assignedOperativeId);

    if (!operativeAvailability.available) {
      return operativeAvailability;
    }
  }

  if (action.id === 'recruit_operative' && wouldExceedRosterCap(state)) {
    return unavailable('roster_full');
  }

  const adjustedResourceCost = getAdjustedResourceCost(action, request.assignedOperativeId);

  if (state.pressures.resources - getQueuedResourceCost(state) < adjustedResourceCost) {
    return unavailable('not_enough_resources');
  }

  return {
    available: true,
  };
}

function getTargetAvailability(
  state: GameState,
  action: ActionDefinition,
  target: ActionTarget | undefined,
): OrderAvailability {
  if (!target) {
    return action.requiresTarget ? unavailable('target_required') : { available: true };
  }

  if (!action.allowedTargetTypes.includes(target.type)) {
    return unavailable('target_not_allowed');
  }

  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)
        ? { available: true }
        : unavailable('target_not_found');
    case 'venue':
      return getVenueDefinition(target.id)
        ? { available: true }
        : unavailable('target_not_found');
    case 'rival':
      if (!getRivalDefinition(target.id) || !state.rivals[target.id]) {
        return unavailable('target_not_found');
      }

      return state.rivals[target.id].active
        ? { available: true }
        : unavailable('target_inactive');
  }
}

export function getActionPreview(
  state: GameState,
  actionId: ActionId,
  assignedOperativeId?: string,
  target?: ActionTarget,
): ActionPreview | undefined {
  const action = getActionDefinition(actionId);

  if (!action) {
    return undefined;
  }

  const operative = assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === assignedOperativeId)
    : undefined;
  const adjustedEffects = getAdjustedEffects(action, assignedOperativeId, state, target);
  const riskChance = calculateRiskChance(action, operative, state, target);

  return {
    actionId: action.id,
    label: action.label,
    commandCost: action.commandCost,
    resourceCost: action.resourceCost,
    adjustedResourceCost: getAdjustedResourceCost(action, assignedOperativeId),
    baseEffects: { ...action.effects },
    adjustedEffects,
    selectedOperativeId: assignedOperativeId,
    selectedTarget: target,
    targetLabel: getTargetLabel(target),
    riskChance,
    riskLabel: riskLabel(riskChance),
    rivalAttention: getRivalAttentionPreview(state, action.id, target),
    localImpact: getLocalImpactPreview(state, action.id, adjustedEffects, target),
  };
}

export function selectActionCards(state: GameState): ActionCardView[] {
  const actionIds = [
    'gather_intel',
    'run_small_job',
    'bribe_official',
    'recruit_operative',
    'expand_influence',
    'lay_low',
  ] satisfies ActionId[];

  return actionIds.map((actionId) => {
    const preview = getActionPreview(state, actionId);

    if (!preview) {
      throw new Error(`Missing action definition for ${actionId}`);
    }

    const availability = getOrderAvailability(state, { actionId });
    const isQueued = state.queuedOrders.some((order) => order.actionId === actionId);

    return {
      ...preview,
      state: isQueued ? 'queued' : availability.available ? 'available' : 'unavailable',
      unavailableReason: availability.reason,
      availableOperatives: state.operatives.map((operative) =>
        getOperativeOptionView(state, actionId, operative),
      ),
    };
  });
}

export function selectQueuedOrderViews(state: GameState): QueuedOrderView[] {
  return state.queuedOrders.map((order) => {
    const action = requireAction(order.actionId);
    const operative = order.assignedOperativeId
      ? state.operatives.find((candidate) => candidate.id === order.assignedOperativeId)
      : undefined;
    const preview = getActionPreview(state, order.actionId, order.assignedOperativeId, order.target);

    if (!preview) {
      throw new Error(`Missing preview for queued order ${order.id}`);
    }

    return {
      id: order.id,
      actionId: action.id,
      label: action.label,
      assignedOperativeName: operative?.name,
      targetLabel: preview.targetLabel,
      adjustedEffects: preview.adjustedEffects,
      adjustedResourceCost: preview.adjustedResourceCost,
      riskLabel: preview.riskLabel,
    };
  });
}

export function pressureDeltaToView(delta: PressureDelta): PressureDeltaView[] {
  return PRESSURE_IDS.flatMap((id) => {
    const value = delta[id];
    return value === undefined || value === 0 ? [] : [{ id, value }];
  });
}

export function getAdjustedEffects(
  action: ActionDefinition,
  assignedOperativeId?: string,
  state?: GameState,
  target?: ActionTarget,
): PressureDelta {
  const modifier = getOperativeActionModifier(assignedOperativeId, action.id);
  let effects = mergePressureDeltas(action.effects, modifier?.effects);
  const districtId = resolveTargetDistrictId(target);

  if (state && districtId) {
    const districtDefinition = getDistrictDefinition(districtId);
    const districtState = state.districts[districtId];

    if (districtDefinition && districtState) {
      effects = applyDistrictModifiers(effects, districtDefinition, districtState.heat);
    }
  }

  if (target?.type === 'venue') {
    const venue = getVenueDefinition(target.id);

    if (venue) {
      effects = applyVenueModifiers(effects, venue);
    }
  }

  return effects;
}

export function applyDistrictModifiers(
  effects: PressureDelta,
  district: DistrictDefinition,
  currentDistrictHeat: number,
): PressureDelta {
  const next = { ...effects };

  if (effects.resources !== undefined) {
    next.resources = effects.resources + Math.round((district.wealth - 50) * 8);
  }

  if (effects.intel !== undefined) {
    next.intel = effects.intel + Math.round((district.secrecy - 50) / 15);
  }

  if (effects.heat !== undefined && effects.heat > 0) {
    next.heat = effects.heat + Math.round(currentDistrictHeat / 20);
  }

  return normalizePressureDelta(next);
}

export function applyVenueModifiers(
  effects: PressureDelta,
  venue: VenueDefinition,
): PressureDelta {
  const next = { ...effects };

  if (effects.resources !== undefined) {
    next.resources = effects.resources + venue.wealthMod * 150;
  }

  if (effects.intel !== undefined) {
    next.intel = effects.intel + venue.intelMod;
  }

  if (effects.heat !== undefined) {
    next.heat = effects.heat + venue.heatMod;
  }

  if (effects.loyalty !== undefined) {
    next.loyalty = effects.loyalty + venue.loyaltyMod;
  }

  if (effects.ruin !== undefined) {
    next.ruin = effects.ruin + venue.ruinMod;
  }

  return normalizePressureDelta(next);
}

export function getAdjustedResourceCost(
  action: ActionDefinition,
  assignedOperativeId?: string,
): number {
  const modifier = getOperativeActionModifier(assignedOperativeId, action.id);
  return Math.max(0, action.resourceCost + (modifier?.resourceCost ?? 0));
}

export function calculateRiskChance(
  action: ActionDefinition,
  operative?: Operative,
  state?: GameState,
  target?: ActionTarget,
): number {
  let riskChance = action.baseRisk;

  if (operative && action.operativeSkill) {
    const skill = getSkill(operative, action.operativeSkill);
    riskChance -= Math.floor((skill - 50) / 4);
    riskChance += Math.floor(operative.stress / 10);
    riskChance -= Math.floor(operative.loyalty / 20);

    if (operative.stress >= 60) {
      riskChance += 10;
    }
  }

  const districtId = resolveTargetDistrictId(target);

  if (state && districtId) {
    const district = state.districts[districtId];
    const definition = getDistrictDefinition(districtId);

    if (district && definition) {
      riskChance += Math.floor(Math.max(0, district.heat - definition.baseHeat) / 10);
      riskChance -= district.control >= 70 ? 4 : district.control >= 40 ? 2 : 0;
    }
  }

  return clampRisk(riskChance);
}

function getRivalAttentionPreview(
  state: GameState,
  actionId: ActionId,
  target?: ActionTarget,
): RivalAttentionPreview | undefined {
  const rivalId = getTargetControllerId(target);

  if (!rivalId) {
    return undefined;
  }

  const rival = getRivalDefinition(rivalId);
  const rivalState = state.rivals[rivalId];

  if (!rival || !rivalState) {
    return undefined;
  }

  const pressureGain = calculateRivalPressureGain(actionId);
  const projectedPressure = Math.min(100, Math.max(0, rivalState.pressure + pressureGain));

  return {
    rivalId,
    rivalName: rival.name,
    pressureGain,
    currentPressure: rivalState.pressure,
    projectedPressure,
    projectedTier: getRivalPressureTier(projectedPressure),
  };
}

function getLocalImpactPreview(
  state: GameState,
  actionId: ActionId,
  effects: PressureDelta,
  target?: ActionTarget,
): LocalImpactPreview | undefined {
  const districtId = resolveTargetDistrictId(target);

  if (!districtId) {
    return undefined;
  }

  const district = getDistrictDefinition(districtId);

  if (!district || !state.districts[districtId]) {
    return undefined;
  }

  return {
    districtId,
    districtName: district.name,
    controlGain: calculateTargetControlGain(actionId, target),
    localHeatGain: calculateTargetLocalHeatGain(effects, target),
  };
}

export function riskLabel(chance: number): RiskLabel {
  if (chance <= 6) {
    return 'Very Low';
  }

  if (chance <= 14) {
    return 'Low';
  }

  if (chance <= 24) {
    return 'Moderate';
  }

  if (chance <= 34) {
    return 'High';
  }

  return 'Severe';
}

function getOperativeAvailability(state: GameState, operativeId: string): OrderAvailability {
  const operative = state.operatives.find((candidate) => candidate.id === operativeId);

  if (!operative) {
    return unavailable('operative_not_found');
  }

  if (state.queuedOrders.some((order) => order.assignedOperativeId === operativeId)) {
    return unavailable('operative_already_assigned');
  }

  if (operative.status !== 'available' && operative.status !== 'idle') {
    return unavailable('operative_unavailable');
  }

  return {
    available: true,
  };
}

function getOperativeOptionView(
  state: GameState,
  actionId: ActionId,
  operative: Operative,
): OperativeOptionView {
  const action = requireAction(actionId);

  if (action.assignment === 'none') {
    return {
      id: operative.id,
      name: operative.name,
      disabled: true,
      reason: 'operative_not_allowed',
    };
  }

  const availability = getOperativeAvailability(state, operative.id);

  return {
    id: operative.id,
    name: operative.name,
    disabled: !availability.available,
    reason: availability.reason,
  };
}

function wouldExceedRosterCap(state: GameState): boolean {
  const queuedRecruitCount = state.queuedOrders.filter(
    (order) => order.actionId === 'recruit_operative',
  ).length;

  return state.operatives.length + queuedRecruitCount >= DISTRICT_ZERO_MAX_OPERATIVES;
}

function mergePressureDeltas(base: PressureDelta, modifier: PressureDelta = {}): PressureDelta {
  const merged: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = (base[id] ?? 0) + (modifier[id] ?? 0);

    if (value !== 0) {
      merged[id] = value;
    }
  }

  return merged;
}

function normalizePressureDelta(delta: PressureDelta): PressureDelta {
  const normalized: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = delta[id];

    if (value !== undefined && value !== 0) {
      normalized[id] = value;
    }
  }

  return normalized;
}

function getSkill(operative: Operative, skill: OperativeSkill): number {
  switch (skill) {
    case 'violence':
      return operative.violence;
    case 'charm':
      return operative.charm;
    case 'tech':
      return operative.tech;
    case 'subtlety':
      return operative.subtlety;
  }
}

function clampRisk(value: number): number {
  return Math.min(45, Math.max(3, value));
}

function requireAction(actionId: ActionId): ActionDefinition {
  const action = getActionDefinition(actionId);

  if (!action) {
    throw new Error(`Missing action definition for ${actionId}`);
  }

  return action;
}

function unavailable(reason: QueueOrderUnavailableReason): OrderAvailability {
  return {
    available: false,
    reason,
  };
}
