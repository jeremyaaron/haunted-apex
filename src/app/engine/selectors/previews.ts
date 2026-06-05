import {
  DISTRICT_ZERO_MAX_OPERATIVES,
  getActionDefinition,
  getOperativeActionModifier,
} from '../content';
import type {
  ActionDefinition,
  ActionId,
  GameState,
  Operative,
  OperativeSkill,
  PressureDelta,
  PressureId,
  QueuedOrder,
} from '../model';
import { PRESSURE_IDS } from '../model';

export type RiskLabel = 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Severe';

export type QueueOrderRequest = {
  actionId: ActionId;
  assignedOperativeId?: string;
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
  | 'roster_full';

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
  riskChance: number;
  riskLabel: RiskLabel;
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

export function getActionPreview(
  state: GameState,
  actionId: ActionId,
  assignedOperativeId?: string,
): ActionPreview | undefined {
  const action = getActionDefinition(actionId);

  if (!action) {
    return undefined;
  }

  const operative = assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === assignedOperativeId)
    : undefined;
  const adjustedEffects = getAdjustedEffects(action, assignedOperativeId);
  const riskChance = calculateRiskChance(action, operative);

  return {
    actionId: action.id,
    label: action.label,
    commandCost: action.commandCost,
    resourceCost: action.resourceCost,
    adjustedResourceCost: getAdjustedResourceCost(action, assignedOperativeId),
    baseEffects: { ...action.effects },
    adjustedEffects,
    selectedOperativeId: assignedOperativeId,
    riskChance,
    riskLabel: riskLabel(riskChance),
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
    const preview = getActionPreview(state, order.actionId, order.assignedOperativeId);

    if (!preview) {
      throw new Error(`Missing preview for queued order ${order.id}`);
    }

    return {
      id: order.id,
      actionId: action.id,
      label: action.label,
      assignedOperativeName: operative?.name,
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
): PressureDelta {
  const modifier = getOperativeActionModifier(assignedOperativeId, action.id);
  return mergePressureDeltas(action.effects, modifier?.effects);
}

export function getAdjustedResourceCost(
  action: ActionDefinition,
  assignedOperativeId?: string,
): number {
  const modifier = getOperativeActionModifier(assignedOperativeId, action.id);
  return Math.max(0, action.resourceCost + (modifier?.resourceCost ?? 0));
}

export function calculateRiskChance(action: ActionDefinition, operative?: Operative): number {
  if (!operative || !action.operativeSkill) {
    return clampRisk(action.baseRisk);
  }

  const skill = getSkill(operative, action.operativeSkill);
  let riskChance = action.baseRisk - Math.floor((skill - 50) / 4);

  riskChance += Math.floor(operative.stress / 10);
  riskChance -= Math.floor(operative.loyalty / 20);

  if (operative.stress >= 60) {
    riskChance += 10;
  }

  return clampRisk(riskChance);
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
