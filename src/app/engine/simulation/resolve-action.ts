import { getActionDefinition, getOperativeActionModifier } from '../content';
import type {
  ActionDefinition,
  GameLogEntry,
  GameState,
  Operative,
  PressureDelta,
  QueuedOrder,
  RecruitCandidate,
} from '../model';
import { calculateRiskChance, getAdjustedEffects, getAdjustedResourceCost } from '../selectors';
import { createRng, nextInt, type RngState } from '../rng';
import { clampStress } from './clamps';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';

const NORMAL_ACTION_STRESS = 6;
const DANGEROUS_ACTION_STRESS = 10;
const LAY_LOW_STRESS_RECOVERY = -8;

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

  const operative = order.assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === order.assignedOperativeId)
    : undefined;
  const riskChance = calculateRiskChance(action, operative);
  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, 100);
  const complication = roll.value <= riskChance;
  const actionDelta = getResolvedActionDelta(action, order.assignedOperativeId, complication);
  const complicationDelta = getComplicationDelta(action, complication);
  const totalDelta = mergePressureDeltas(actionDelta, complicationDelta);
  let next = {
    ...state,
    rngCursor: roll.rng.cursor,
    pressures: applyPressureDelta(state.pressures, totalDelta),
  };

  next = resolveRecruitment(next, action);
  next = applyAssignedOperativeStress(next, action, operative, order.assignedOperativeId);
  next = appendLog(next, {
    type: 'order_resolved',
    title: action.label,
    body: createResolutionBody(action, operative, roll.value, riskChance, complication),
    pressureDelta: totalDelta,
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
): PressureDelta {
  const adjustedEffects = getAdjustedEffects(action, assignedOperativeId);
  const adjustedResourceCost = getAdjustedResourceCost(action, assignedOperativeId);
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
): number {
  const modifier = getOperativeActionModifier(assignedOperativeId, action.id);
  let stress = modifier?.stress ?? 0;

  switch (action.stressType) {
    case 'normal':
      stress += NORMAL_ACTION_STRESS;
      break;
    case 'dangerous':
      stress += DANGEROUS_ACTION_STRESS;
      break;
    case 'recovery':
      stress += LAY_LOW_STRESS_RECOVERY;
      break;
    case 'none':
      break;
  }

  return stress;
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

function resolveRecruitment(state: GameState, action: ActionDefinition): GameState {
  if (action.id !== 'recruit_operative' || state.recruitPool.length === 0) {
    return state;
  }

  const [candidate, ...remainingRecruitPool] = state.recruitPool;

  return {
    ...state,
    operatives: [...state.operatives, recruitCandidateToOperative(candidate)],
    recruitPool: remainingRecruitPool,
  };
}

function recruitCandidateToOperative(candidate: RecruitCandidate): Operative {
  return {
    ...candidate,
    loyalty: 55,
    stress: 10,
    status: 'available',
    traitIds: [...candidate.traitIds],
  };
}

function applyAssignedOperativeStress(
  state: GameState,
  action: ActionDefinition,
  operative: Operative | undefined,
  assignedOperativeId: string | undefined,
): GameState {
  if (!operative || !assignedOperativeId) {
    return state;
  }

  const stressDelta = getActionStressDelta(action, assignedOperativeId);

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
  operative: Operative | undefined,
  roll: number,
  riskChance: number,
  complication: boolean,
): string {
  const assignment = operative ? ` Assigned: ${operative.name}.` : '';
  const result = complication ? 'Complication triggered.' : 'Resolved cleanly.';

  return `${result}${assignment} Risk ${riskChance}, roll ${roll}.`;
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
