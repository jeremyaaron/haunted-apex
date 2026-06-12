import { getFrontDefinition } from '../content';
import {
  calculateFrontWeeklyYield,
  clampFrontExposure,
} from '../fronts';
import type {
  FrontId,
  FrontState,
  GameLogEntry,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';

const YIELD_HISTORY_LIMIT = 8;

export function applyWeeklyFrontYields(state: GameState): GameState {
  const activeFronts = getActiveFronts(state);

  if (activeFronts.length === 0) {
    return state;
  }

  let next = state;
  const frontSummaries: string[] = [];
  const tags = ['FRONT', 'YIELD'];
  const pressureDeltas: PressureDelta[] = [];

  for (const front of activeFronts) {
    const definition = getFrontDefinition(front.definitionId);

    if (!definition) {
      continue;
    }

    const effects = calculateFrontWeeklyYield(front, definition);
    const exposureDelta = definition.exposurePerWeek + (front.level >= 2 ? 1 : 0);
    const nextExposure = clampFrontExposure(front.exposure + exposureDelta);
    const districtControlDelta = definition.districtControlYield ?? 0;
    const rivalPressureDelta = definition.rivalPressurePerWeek ?? 0;
    const updatedFront: FrontState = {
      ...front,
      exposure: nextExposure,
      yieldHistory: [
        ...front.yieldHistory,
        {
          week: state.week,
          effects,
          exposureDelta,
        },
      ].slice(-YIELD_HISTORY_LIMIT),
    };

    next = {
      ...next,
      fronts: {
        ...next.fronts,
        [front.id]: updatedFront,
      },
    };
    next = applyDistrictControlYield(next, front, districtControlDelta);
    next = applyFrontRivalPressure(next, front.relatedRivalId, rivalPressureDelta);

    pressureDeltas.push(effects);
    tags.push(front.id, front.districtId);

    if (front.relatedRivalId && rivalPressureDelta !== 0) {
      tags.push(front.relatedRivalId);
    }

    frontSummaries.push(
      createFrontSummary(
        definition.name,
        effects,
        front.exposure,
        nextExposure,
        districtControlDelta,
        rivalPressureDelta,
      ),
    );
  }

  if (pressureDeltas.length === 0) {
    return state;
  }

  const pressureDelta = mergePressureDeltas(...pressureDeltas);

  next = {
    ...next,
    pressures: applyPressureDelta(next.pressures, pressureDelta),
  };

  return appendLog(next, {
    type: 'front_yield',
    title: 'Front Network Yield',
    body: frontSummaries.join(' '),
    pressureDelta,
    tags,
  });
}

function getActiveFronts(state: GameState): FrontState[] {
  return (Object.keys(state.fronts) as FrontId[])
    .map((frontId) => state.fronts[frontId])
    .filter((front): front is FrontState => Boolean(front?.active));
}

function applyDistrictControlYield(
  state: GameState,
  front: FrontState,
  controlDelta: number,
): GameState {
  if (controlDelta === 0 || !state.districts[front.districtId]) {
    return state;
  }

  const district = state.districts[front.districtId];

  return {
    ...state,
    districts: {
      ...state.districts,
      [front.districtId]: {
        ...district,
        control: clampTerritoryValue(district.control + controlDelta),
      },
    },
  };
}

function applyFrontRivalPressure(
  state: GameState,
  rivalId: RivalId | undefined,
  pressureDelta: number,
): GameState {
  if (!rivalId || pressureDelta === 0 || !state.rivals[rivalId]) {
    return state;
  }

  const rival = state.rivals[rivalId];

  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...rival,
        pressure: clampTerritoryValue(rival.pressure + pressureDelta),
      },
    },
  };
}

function createFrontSummary(
  name: string,
  effects: PressureDelta,
  previousExposure: number,
  nextExposure: number,
  districtControlDelta: number,
  rivalPressureDelta: number,
): string {
  const effectText = formatPressureDelta(effects);
  const control = districtControlDelta !== 0
    ? ` Control +${districtControlDelta}.`
    : '';
  const rival = rivalPressureDelta !== 0
    ? ` Rival Pressure +${rivalPressureDelta}.`
    : '';

  return `${name}: ${effectText || 'no pressure change'}; Exposure ${previousExposure} -> ${nextExposure}.${control}${rival}`;
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

function clampTerritoryValue(value: number): number {
  return Math.min(100, Math.max(0, value));
}
