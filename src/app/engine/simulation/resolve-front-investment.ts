import {
  frontInvestmentTotalEffects,
  previewFrontInvestment,
  type FrontInvestmentPreview,
} from '../fronts';
import type {
  ActionTarget,
  FrontState,
  GameLogEntry,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';
import { createRng } from '../rng';
import type { ActionResolution } from './resolve-action';
import { applyPressureDelta } from './pressure-delta';

type ResolvedFrontInvestmentPreview = Extract<FrontInvestmentPreview, { ok: true }>;

export function resolveInvestFront(
  state: GameState,
  target: ActionTarget | undefined,
): ActionResolution {
  const preview = previewFrontInvestment(state, target);

  if (!preview.ok) {
    return {
      state: appendBlockedLog(state, preview.unavailableReason),
      rng: createRng(state.seed, state.rngCursor),
      complication: true,
      riskChance: 0,
      resolvedDelta: {},
      stressDelta: 0,
    };
  }

  if (state.pressures.resources < preview.cost) {
    return {
      state: appendBlockedLog(state, 'not_enough_resources'),
      rng: createRng(state.seed, state.rngCursor),
      complication: true,
      riskChance: 0,
      resolvedDelta: {},
      stressDelta: 0,
    };
  }

  const resolvedDelta = frontInvestmentTotalEffects(preview);
  let next: GameState = {
    ...state,
    pressures: applyPressureDelta(state.pressures, resolvedDelta),
  };

  next = preview.mode === 'establish'
    ? establishFront(next, preview)
    : upgradeFront(next, preview);
  next = applyEstablishRivalPressure(next, preview);
  next = appendLog(next, {
    type: 'order_resolved',
    title: `Invest in Front: ${preview.frontName}`,
    body: createResolutionBody(preview, resolvedDelta),
    pressureDelta: resolvedDelta,
    tags: [
      'FRONT',
      preview.mode,
      preview.frontId,
      preview.districtId,
      ...(preview.venueId ? [preview.venueId] : []),
      ...(preview.relatedRivalId ? [preview.relatedRivalId] : []),
    ],
  });

  return {
    state: next,
    rng: createRng(state.seed, state.rngCursor),
    complication: false,
    riskChance: 10,
    resolvedDelta,
    stressDelta: 0,
  };
}

function appendBlockedLog(state: GameState, reason: string): GameState {
  return appendLog(state, {
    type: 'complication',
    title: 'Invest in Front Blocked',
    body: `Invest in Front could not resolve: ${reason}.`,
    tags: ['FRONT', 'BLOCKED', reason],
  });
}

function establishFront(state: GameState, preview: ResolvedFrontInvestmentPreview): GameState {
  const front: FrontState = {
    id: preview.frontId,
    definitionId: preview.definition.id,
    districtId: preview.districtId,
    ...(preview.venueId ? { venueId: preview.venueId } : {}),
    ...(preview.relatedRivalId ? { relatedRivalId: preview.relatedRivalId } : {}),
    level: 1,
    exposure: preview.projectedExposure,
    establishedWeek: state.week,
    compromised: false,
    active: true,
    flags: {},
    yieldHistory: [],
  };

  return {
    ...state,
    fronts: {
      ...state.fronts,
      [front.id]: front,
    },
    frontOpportunities:
      preview.target.type === 'front_opportunity'
        ? state.frontOpportunities.filter((opportunity) => opportunity.id !== preview.target.id)
        : state.frontOpportunities,
  };
}

function upgradeFront(state: GameState, preview: ResolvedFrontInvestmentPreview): GameState {
  const front = state.fronts[preview.frontId];

  if (!front) {
    return state;
  }

  return {
    ...state,
    fronts: {
      ...state.fronts,
      [preview.frontId]: {
        ...front,
        level: 2,
        exposure: preview.projectedExposure,
      },
    },
  };
}

function applyEstablishRivalPressure(
  state: GameState,
  preview: ResolvedFrontInvestmentPreview,
): GameState {
  const warning = preview.rivalPressureWarning;

  if (preview.mode !== 'establish' || !warning || warning.pressureGain === 0) {
    return state;
  }

  return applyRivalPressure(state, warning.rivalId, warning.pressureGain);
}

function applyRivalPressure(state: GameState, rivalId: RivalId, amount: number): GameState {
  const rival = state.rivals[rivalId];

  if (!rival) {
    return state;
  }

  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...rival,
        pressure: Math.min(100, Math.max(0, rival.pressure + amount)),
      },
    },
  };
}

function createResolutionBody(
  preview: ResolvedFrontInvestmentPreview,
  resolvedDelta: PressureDelta,
): string {
  const action =
    preview.mode === 'establish'
      ? `Established ${preview.frontName}`
      : `Upgraded ${preview.frontName} to level 2`;
  const cost = preview.cost > 0 ? ` Cost: ${preview.cost} Resources.` : '';
  const pressure = formatPressureDelta(resolvedDelta);
  const pressureText = pressure ? ` Effects: ${pressure}.` : '';
  const exposure =
    preview.currentExposure === undefined
      ? ` Exposure starts at ${preview.projectedExposure}.`
      : ` Exposure ${preview.currentExposure} -> ${preview.projectedExposure}.`;
  const rival = preview.rivalPressureWarning && preview.rivalPressureWarning.pressureGain > 0
    ? ` ${preview.rivalPressureWarning.rivalName} Pressure +${preview.rivalPressureWarning.pressureGain}.`
    : '';

  return `${action} in ${preview.districtName}.${cost}${pressureText}${exposure}${rival}`;
}

function formatPressureDelta(delta: PressureDelta): string {
  return Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([pressure, value]) => `${value > 0 ? '+' : ''}${value} ${pressure}`)
    .join(', ');
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
