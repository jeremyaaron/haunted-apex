import { getEventDefinition } from '../content';
import type {
  EventChoiceDefinition,
  GameLogEntry,
  GameState,
  PressureDelta,
  SpecialCost,
} from '../model';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';
import { applyWinLoss } from './win-loss';

const TRANSIENT_WEEK_FLAGS = ['ran_small_job_this_week', 'laid_low_this_week'] as const;

export type EventChoiceUnavailableReason =
  | 'not_event_choice_phase'
  | 'pending_event_missing'
  | 'event_mismatch'
  | 'choice_not_found'
  | 'not_enough_cost';

export type EventChoiceAvailability = {
  available: boolean;
  reason?: EventChoiceUnavailableReason;
};

export type ResolveEventChoiceResult =
  | {
      ok: true;
      state: GameState;
    }
  | {
      ok: false;
      state: GameState;
      error: EventChoiceUnavailableReason;
    };

export function resolveEventChoice(
  state: GameState,
  eventId: string,
  choiceId: string,
): ResolveEventChoiceResult {
  const availability = getEventChoiceAvailability(state, eventId, choiceId);

  if (!availability.available) {
    return {
      ok: false,
      state,
      error: availability.reason ?? 'choice_not_found',
    };
  }

  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return {
      ok: false,
      state,
      error: 'pending_event_missing',
    };
  }

  const definition = getEventDefinition(pendingEvent.definitionId);
  const choice = definition?.choices.find((candidate) => candidate.id === choiceId);

  if (!definition || !choice) {
    return {
      ok: false,
      state,
      error: 'choice_not_found',
    };
  }

  const costDelta = getCostDelta(choice.cost);
  const pressureDelta = mergePressureDeltas(choice.effects, costDelta);
  const flags = applyEventFlags(clearTransientFlags(state.flags), choice);
  let next: GameState = {
    ...state,
    pendingEvent: undefined,
    pressures: applyPressureDelta(state.pressures, pressureDelta),
    flags,
  };
  next = appendLog(next, {
    type: 'event_choice',
    title: choice.label,
    body: `Response to ${definition.title}.`,
    pressureDelta,
    tags: definition.tags,
  });
  next = applyWinLoss(next);

  if (next.gameOver) {
    return {
      ok: true,
      state: next,
    };
  }

  return {
    ok: true,
    state: {
      ...next,
      week: next.week + 1,
      phase: 'COMMAND',
    },
  };
}

export function getEventChoiceAvailability(
  state: GameState,
  eventId: string,
  choiceId: string,
): EventChoiceAvailability {
  if (state.phase !== 'EVENT_CHOICE') {
    return unavailable('not_event_choice_phase');
  }

  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return unavailable('pending_event_missing');
  }

  if (pendingEvent.id !== eventId && pendingEvent.definitionId !== eventId) {
    return unavailable('event_mismatch');
  }

  const definition = getEventDefinition(pendingEvent.definitionId);
  const choice = definition?.choices.find((candidate) => candidate.id === choiceId);

  if (!choice) {
    return unavailable('choice_not_found');
  }

  if (!canPayCost(state, choice.cost)) {
    return unavailable('not_enough_cost');
  }

  return {
    available: true,
  };
}

function canPayCost(state: GameState, cost: EventChoiceDefinition['cost']): boolean {
  if (!cost) {
    return true;
  }

  if (isSpecialCost(cost)) {
    return state.pressures.intel >= cost.amount;
  }

  return Object.entries(cost).every(([pressure, amount]) => {
    if (amount === undefined || amount <= 0) {
      return true;
    }

    const pressureId = pressure as keyof GameState['pressures'];
    return state.pressures[pressureId] >= amount;
  });
}

function getCostDelta(cost: EventChoiceDefinition['cost']): PressureDelta {
  if (!cost) {
    return {};
  }

  if (isSpecialCost(cost)) {
    return {
      intel: -cost.amount,
    };
  }

  return Object.entries(cost).reduce<PressureDelta>((delta, [pressure, amount]) => {
    if (amount !== undefined && amount !== 0) {
      delta[pressure as keyof PressureDelta] = -amount;
    }

    return delta;
  }, {});
}

function isSpecialCost(cost: EventChoiceDefinition['cost']): cost is SpecialCost {
  return typeof cost === 'object' && cost !== null && 'type' in cost;
}

function applyEventFlags(
  flags: Record<string, boolean | number | string>,
  choice: EventChoiceDefinition,
): Record<string, boolean | number | string> {
  return (choice.flags ?? []).reduce(
    (nextFlags, flag) => ({
      ...nextFlags,
      [flag]: true,
    }),
    flags,
  );
}

function clearTransientFlags(
  flags: Record<string, boolean | number | string>,
): Record<string, boolean | number | string> {
  const next = { ...flags };

  for (const flag of TRANSIENT_WEEK_FLAGS) {
    delete next[flag];
  }

  return next;
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

function unavailable(reason: EventChoiceUnavailableReason): EventChoiceAvailability {
  return {
    available: false,
    reason,
  };
}
