import {
  getActionDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from '../content';
import type {
  ActionDefinition,
  GameLogEntry,
  GameState,
  OperativeState,
  PressureDelta,
  QueuedOrder,
} from '../model';
import {
  calculateRiskChance,
  calculateRivalPressureGain,
  calculateTargetControlGain,
  calculateTargetLocalHeatGain,
  getAdjustedEffects,
  getAdjustedResourceCost,
  getTargetControllerId,
  getTargetLabel,
  getTargetTags,
  resolveTargetDistrictId,
} from '../selectors';
import { createRng, nextInt, type RngState } from '../rng';
import {
  calculateActionStressDelta,
  calculateOperativeModifiers,
  materializeOperativeState,
  type OperativeModifierResult,
} from '../roster';
import { clampStress } from './clamps';
import { applyTargetedActionConsequences } from './district-effects';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';
import { recordRecentActivity } from './recent-activity';

export type ActionResolution = {
  state: GameState;
  rng: RngState;
  complication: boolean;
};

export function resolveQueuedOrder(state: GameState, order: QueuedOrder): ActionResolution {
  const action = getActionDefinition(order.actionId);

  if (!action) {
    return {
      state: appendLog(state, {
        type: 'complication',
        title: 'Unknown Order',
        body: `Order ${order.id} referenced an unknown action and was skipped.`,
      }),
      rng: createRng(state.seed, state.rngCursor),
      complication: true,
    };
  }

  if (
    action.id === 'recruit_operative' &&
    (order.target?.type !== 'recruit' || !state.hirePool.includes(order.target.id))
  ) {
    return {
      state: appendLog(state, {
        type: 'complication',
        title: 'Invalid Recruitment Order',
        body: `Order ${order.id} referenced a candidate who is no longer in the hire pool and was skipped.`,
      }),
      rng: createRng(state.seed, state.rngCursor),
      complication: true,
    };
  }

  const operative = order.assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === order.assignedOperativeId)
    : undefined;
  const operativeModifiers = calculateOperativeModifiers({
    state,
    action,
    operative,
    recruitTargetDefinition:
      order.target?.type === 'recruit'
        ? getOperativeDefinition(order.target.id)
        : undefined,
    target: order.target,
  });
  const riskChance = calculateRiskChance(
    action,
    operative,
    state,
    order.target,
    operativeModifiers,
  );
  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, 100);
  const complication = roll.value <= riskChance;
  const actionDelta = getResolvedActionDelta(
    action,
    order.assignedOperativeId,
    complication,
    state,
    order.target,
    operativeModifiers,
  );
  const complicationDelta = getComplicationDelta(action, complication);
  const totalDelta = mergePressureDeltas(actionDelta, complicationDelta);
  let next = {
    ...state,
    rngCursor: roll.rng.cursor,
    pressures: applyPressureDelta(state.pressures, totalDelta),
    flags: {
      ...state.flags,
      ...(action.id === 'run_small_job' ? { ran_small_job_this_week: true } : {}),
      ...(action.id === 'lay_low' ? { laid_low_this_week: true } : {}),
    },
  };

  next = applyTargetedActionConsequences(
    next,
    action.id,
    order.target,
    totalDelta,
    operativeModifiers.districtControlModifier,
    operativeModifiers.rivalPressureModifier,
  );
  next = recordRecentActivity(next, action.id, order.target, totalDelta);
  next = resolveRecruitment(next, action, order.target);
  next = applyAssignedOperativeStress(
    next,
    action,
    operative,
    order.assignedOperativeId,
    order.target,
    operativeModifiers,
  );
  next = appendLog(next, {
    type: 'order_resolved',
    title: action.label,
    body: createResolutionBody(
      action,
      operative,
      order,
      totalDelta,
      roll.value,
      riskChance,
      complication,
      operativeModifiers,
    ),
    pressureDelta: totalDelta,
    tags: getTargetTags(order.target),
  });

  if (complication) {
    next = applyComplicationSideEffects(next, action, order.assignedOperativeId);
    next = appendLog(next, {
      type: 'complication',
      title: `${action.label} Complication`,
      body: createComplicationBody(action),
      pressureDelta: complicationDelta,
    });
  }

  return {
    state: next,
    rng: roll.rng,
    complication,
  };
}

export function getResolvedActionDelta(
  action: ActionDefinition,
  assignedOperativeId: string | undefined,
  complication: boolean,
  state?: GameState,
  target?: QueuedOrder['target'],
  operativeModifiers?: OperativeModifierResult,
): PressureDelta {
  const adjustedEffects = getAdjustedEffects(
    action,
    assignedOperativeId,
    state,
    target,
    operativeModifiers,
  );
  const adjustedResourceCost = getAdjustedResourceCost(
    action,
    assignedOperativeId,
    state,
    target,
    operativeModifiers,
  );
  const effects =
    action.id === 'bribe_official' && complication
      ? {
          ...adjustedEffects,
          heat: 6,
        }
      : adjustedEffects;

  return mergePressureDeltas(effects, {
    resources: -adjustedResourceCost,
  });
}

export function getActionStressDelta(
  action: ActionDefinition,
  assignedOperativeId?: string,
  state?: GameState,
  target?: QueuedOrder['target'],
  operativeModifiers?: OperativeModifierResult,
): number {
  const operative = state && assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === assignedOperativeId)
    : undefined;

  if (!state || !operative) {
    return 0;
  }

  const context = {
    state,
    action,
    operative,
    target,
  };

  return calculateActionStressDelta(
    action,
    context,
    operativeModifiers ?? calculateOperativeModifiers(context),
  );
}

function getComplicationDelta(action: ActionDefinition, complication: boolean): PressureDelta {
  if (!complication || action.id === 'bribe_official') {
    return {};
  }

  if (action.id === 'run_small_job') {
    return {
      heat: 4,
      loyalty: -1,
    };
  }

  if (action.id === 'expand_influence') {
    return {
      heat: 3,
      loyalty: -1,
    };
  }

  return {
    heat: 2,
  };
}

function resolveRecruitment(
  state: GameState,
  action: ActionDefinition,
  target: QueuedOrder['target'],
): GameState {
  if (
    action.id !== 'recruit_operative' ||
    target?.type !== 'recruit' ||
    !state.hirePool.includes(target.id)
  ) {
    return state;
  }

  return {
    ...state,
    operatives: [...state.operatives, materializeOperativeState(target.id)],
    hirePool: state.hirePool.filter((operativeId) => operativeId !== target.id),
  };
}

function applyAssignedOperativeStress(
  state: GameState,
  action: ActionDefinition,
  operative: OperativeState | undefined,
  assignedOperativeId: string | undefined,
  target: QueuedOrder['target'],
  operativeModifiers: OperativeModifierResult,
): GameState {
  if (!operative || !assignedOperativeId) {
    return state;
  }

  const stressDelta = getActionStressDelta(
    action,
    assignedOperativeId,
    state,
    target,
    operativeModifiers,
  );

  return {
    ...state,
    operatives: state.operatives.map((candidate) => {
      if (candidate.id !== assignedOperativeId) {
        return candidate;
      }

      const stress = clampStress(candidate.stress + stressDelta);

      return {
        ...candidate,
        stress,
        status: stress >= 80 ? 'compromised' : 'available',
      };
    }),
  };
}

function applyComplicationSideEffects(
  state: GameState,
  action: ActionDefinition,
  assignedOperativeId: string | undefined,
): GameState {
  const flags =
    action.id === 'bribe_official'
      ? {
          ...state.flags,
          bribe_exposed: true,
        }
      : state.flags;

  if (!assignedOperativeId) {
    return {
      ...state,
      flags,
    };
  }

  return {
    ...state,
    flags,
    operatives: state.operatives.map((operative) =>
      operative.id === assignedOperativeId
        ? {
            ...operative,
            stress: clampStress(operative.stress + 4),
            status: clampStress(operative.stress + 4) >= 80 ? 'compromised' : operative.status,
          }
        : operative,
    ),
  };
}

function createResolutionBody(
  action: ActionDefinition,
  operative: OperativeState | undefined,
  order: QueuedOrder,
  resolvedDelta: PressureDelta,
  roll: number,
  riskChance: number,
  complication: boolean,
  operativeModifiers: OperativeModifierResult,
): string {
  const operativeName = operative ? getOperativeDefinition(operative.id)?.name : undefined;
  const assignment = operativeName ? ` Assigned: ${operativeName}.` : '';
  const targetLabel = getTargetLabel(order.target);
  const target = targetLabel ? ` Target: ${targetLabel}.` : '';
  const districtImpact = resolveTargetDistrictId(order.target)
    ? ` Local impact: +${calculateTargetControlGain(action.id, order.target, operativeModifiers.districtControlModifier)} control, +${calculateTargetLocalHeatGain(resolvedDelta, order.target)} Heat.`
    : '';
  const rivalId = getTargetControllerId(order.target);
  const rival = rivalId ? getRivalDefinition(rivalId) : undefined;
  const rivalAttention = rival
    ? ` Rival attention: ${rival.name} +${calculateRivalPressureGain(action.id, operativeModifiers.rivalPressureModifier)}.`
    : '';
  const result = complication ? 'Complication triggered.' : 'Resolved cleanly.';

  return `${result}${assignment}${target}${districtImpact}${rivalAttention} Risk ${riskChance}, roll ${roll}.`;
}

function createComplicationBody(action: ActionDefinition): string {
  if (action.id === 'bribe_official') {
    return 'The handoff was exposed. Heat rises instead of falling.';
  }

  return 'The order worked, but left damage behind.';
}

function appendLog(
  state: GameState,
  entry: Omit<GameLogEntry, 'id' | 'week'>,
): GameState {
  return {
    ...state,
    eventLog: [
      ...state.eventLog,
      {
        id: `log_${state.week}_${state.eventLog.length + 1}_${entry.type}`,
        week: state.week,
        ...entry,
      },
    ],
  };
}
