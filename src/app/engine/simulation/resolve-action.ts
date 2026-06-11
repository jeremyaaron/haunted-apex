import {
  getActionDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from '../content';
import { previewSecretDiscovery, resolveLedgerUse, resolveSecretDiscovery } from '../ledger';
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
  getStressTier,
  materializeOperativeState,
  type OperativeModifierResult,
} from '../roster';
import { clampStress } from './clamps';
import { applyTargetedActionConsequences } from './district-effects';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';
import { recordRecentActivity } from './recent-activity';
import { resolveContactOption } from './resolve-contact';

export type ActionResolution = {
  state: GameState;
  rng: RngState;
  complication: boolean;
  riskChance: number;
  resolvedDelta: PressureDelta;
  stressDelta: number;
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
      riskChance: 0,
      resolvedDelta: {},
      stressDelta: 0,
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
      riskChance: 0,
      resolvedDelta: {},
      stressDelta: 0,
    };
  }

  if (action.id === 'work_the_ledger') {
    return resolveLedgerUse(state, order.target);
  }

  if (action.id === 'manage_contact') {
    return resolveContactOption(state, order.target);
  }

  const secretDiscoveryPreview = previewSecretDiscovery(state, order);
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
  next = applyComplicationFlags(next, action, complication);
  const assignmentOutcome = applyAssignedOperativeOutcome(
    next,
    action,
    operative,
    order.assignedOperativeId,
    order.target,
    operativeModifiers,
    complication,
  );
  next = assignmentOutcome.state;
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

  if (assignmentOutcome.tierChange) {
    next = appendStressTierChangeLog(next, assignmentOutcome.tierChange);
  }

  if (complication) {
    next = appendLog(next, {
      type: 'complication',
      title: `${action.label} Complication`,
      body: createComplicationBody(action),
      pressureDelta: complicationDelta,
    });
  }

  const secretDiscovery = resolveSecretDiscovery(next, order, secretDiscoveryPreview);
  next = secretDiscovery.state;

  return {
    state: next,
    rng: secretDiscovery.rng,
    complication,
    riskChance,
    resolvedDelta: totalDelta,
    stressDelta: assignmentOutcome.stressDelta,
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

type StressTierChange = {
  operativeId: OperativeState['id'];
  operativeName: string;
  previousTier: ReturnType<typeof getStressTier>;
  nextTier: ReturnType<typeof getStressTier>;
  stress: number;
};

type AssignmentOutcome = {
  state: GameState;
  stressDelta: number;
  tierChange?: StressTierChange;
};

function applyAssignedOperativeOutcome(
  state: GameState,
  action: ActionDefinition,
  operative: OperativeState | undefined,
  assignedOperativeId: string | undefined,
  target: QueuedOrder['target'],
  operativeModifiers: OperativeModifierResult,
  complication: boolean,
): AssignmentOutcome {
  if (!operative || !assignedOperativeId) {
    return {
      state,
      stressDelta: 0,
    };
  }

  const requestedStressDelta =
    getActionStressDelta(
      action,
      assignedOperativeId,
      state,
      target,
      operativeModifiers,
    ) + (complication ? 4 : 0);
  const stress = clampStress(operative.stress + requestedStressDelta);
  const stressDelta = stress - operative.stress;
  const previousTier = getStressTier(operative.stress);
  const nextTier = getStressTier(stress);
  const alreadyAssignedThisWeek = operative.recentAssignments.some(
    (assignment) => assignment.week === state.week,
  );
  const assignment = {
    id: nextAssignmentId(operative, state.week),
    week: state.week,
    actionId: action.id,
    ...(target ? { target: { ...target } } : {}),
    targetTags: getTargetTags(target),
    complication,
    stressDelta,
  };

  return {
    state: {
      ...state,
      operatives: state.operatives.map((candidate) =>
        candidate.id === assignedOperativeId
          ? {
              ...candidate,
              stress,
              status: 'available',
              weeksAssigned:
                candidate.weeksAssigned + (alreadyAssignedThisWeek ? 0 : 1),
              recentAssignments: [...candidate.recentAssignments, assignment],
            }
          : candidate,
      ),
    },
    stressDelta,
    ...(previousTier !== nextTier
      ? {
          tierChange: {
            operativeId: operative.id,
            operativeName:
              getOperativeDefinition(operative.id)?.name ?? operative.id,
            previousTier,
            nextTier,
            stress,
          },
        }
      : {}),
  };
}

function applyComplicationFlags(
  state: GameState,
  action: ActionDefinition,
  complication: boolean,
): GameState {
  if (!complication || action.id !== 'bribe_official') {
    return state;
  }

  return {
    ...state,
    flags: {
      ...state.flags,
      bribe_exposed: true,
    },
  };
}

function appendStressTierChangeLog(
  state: GameState,
  tierChange: StressTierChange,
): GameState {
  const direction =
    stressTierRank(tierChange.nextTier) > stressTierRank(tierChange.previousTier)
      ? 'Escalates'
      : 'Stabilizes';

  return appendLog(state, {
    type: 'operative_condition',
    title: `${tierChange.operativeName} ${direction}`,
    body: `${tierChange.operativeName} moved from ${tierChange.previousTier} to ${tierChange.nextTier} at ${tierChange.stress} Stress.`,
    tags: [
      'OPERATIVE',
      tierChange.operativeId,
      tierChange.previousTier,
      tierChange.nextTier,
    ],
  });
}

function stressTierRank(tier: ReturnType<typeof getStressTier>): number {
  switch (tier) {
    case 'stable':
      return 0;
    case 'strained':
      return 1;
    case 'unstable':
      return 2;
    case 'breaking':
      return 3;
  }
}

function nextAssignmentId(operative: OperativeState, week: number): string {
  const prefix = `assignment_${week}_`;
  const maxExistingId = operative.recentAssignments.reduce((max, assignment) => {
    if (!assignment.id.startsWith(prefix)) {
      return max;
    }

    const suffix = Number.parseInt(assignment.id.slice(prefix.length), 10);
    return Number.isNaN(suffix) ? max : Math.max(max, suffix);
  }, 0);

  return `${prefix}${maxExistingId + 1}`;
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
