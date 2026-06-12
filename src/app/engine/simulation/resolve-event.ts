import { getContactDefinition, getEventDefinition, getLedgerEntryDefinition } from '../content';
import { applyContactMetricDelta } from '../contacts';
import {
  applyEventLedgerEffects,
  eventLedgerEffectsAreAvailable,
  previewEventLedgerEffects,
  type EventLedgerEffectPreviewRow,
} from '../ledger';
import type {
  EventChoiceDefinition,
  EventDefinition,
  GameLogEntry,
  GameState,
  OperativeState,
  PressureDelta,
  RivalId,
  SpecialCost,
} from '../model';
import { clampStress } from './clamps';
import {
  previewEventContactEffects,
  resolveEventContactId,
  type ContactEffectPreviewRow,
} from './contact-events';
import {
  getSelectedFront,
  getSelectedFrontName,
  resolveSelectedFrontRivalId,
} from './front-events';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';
import { applyWinLoss } from './win-loss';

const TRANSIENT_WEEK_FLAGS = ['ran_small_job_this_week', 'laid_low_this_week'] as const;

export type EventChoiceUnavailableReason =
  | 'not_event_choice_phase'
  | 'pending_event_missing'
  | 'event_mismatch'
  | 'choice_not_found'
  | 'not_enough_cost'
  | 'ledger_entry_not_found';

export type EventChoiceAvailability = {
  available: boolean;
  reason?: EventChoiceUnavailableReason;
};

export type EventChoicePreview = {
  choiceId: string;
  label: string;
  ledgerEffects: EventLedgerEffectPreviewRow[];
  contactEffects: ContactEffectPreviewRow[];
  frontEffects: FrontEffectPreviewRow[];
};

export type FrontEffectPreviewRow = {
  frontId: string;
  frontName: string;
  id: 'exposure' | 'active' | 'compromised';
  value: number | boolean;
  current: number | boolean;
  projected: number | boolean;
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
    pressures: applyPressureDelta(state.pressures, pressureDelta),
  };
  next = applyOperativeEffects(next, definition, choice);
  next = applyContactEffects(next, definition, choice);
  next = applyFrontEffects(next, choice);
  next = applyRivalPressureEffects(next, choice.rivalPressure);
  next = {
    ...next,
    flags,
  };
  const ledgerApplication = applyEventLedgerEffects(next, definition, choice);
  next = ledgerApplication.state;
  next = {
    ...next,
    pendingEvent: undefined,
  };
  next = appendLog(next, {
    type: 'event_choice',
    title: choice.label,
    body: createEventChoiceLogBody(
      state,
      definition,
      ledgerApplication.appliedRows,
      previewEventContactEffects(state, definition, choice),
      previewEventFrontEffects(state, choice),
    ),
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

function applyOperativeEffects(
  state: GameState,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
): GameState {
  if (definition.kind !== 'operative' || !choice.operativeEffects) {
    return state;
  }

  return {
    ...state,
    operatives: state.operatives.map((operative) =>
      operative.id === definition.operativeId
        ? applyOperativeDelta(operative, choice.operativeEffects ?? {})
        : operative,
    ),
  };
}

function applyOperativeDelta(
  operative: OperativeState,
  delta: NonNullable<EventChoiceDefinition['operativeEffects']>,
): OperativeState {
  return {
    ...operative,
    loyalty: clampPercent(operative.loyalty + (delta.loyalty ?? 0)),
    stress: clampStress(operative.stress + (delta.stress ?? 0)),
    status: delta.status ?? operative.status,
    hiddenFlags: {
      ...operative.hiddenFlags,
      ...(delta.hiddenFlags ?? {}),
    },
  };
}

function applyRivalPressureEffects(
  state: GameState,
  effects: EventChoiceDefinition['rivalPressure'],
): GameState {
  if (!effects) {
    return state;
  }

  const rivals = { ...state.rivals };

  for (const [rawRivalId, amount] of Object.entries(effects) as [
    RivalId | 'selected_front_rival',
    number | undefined,
  ][]) {
    if (amount === undefined) {
      continue;
    }

    const rivalId = rawRivalId === 'selected_front_rival'
      ? resolveSelectedFrontRivalId(state)
      : rawRivalId;

    if (!rivalId) {
      continue;
    }

    rivals[rivalId] = {
      ...rivals[rivalId],
      pressure: clampPercent(rivals[rivalId].pressure + amount),
    };
  }

  return {
    ...state,
    rivals,
  };
}

function applyFrontEffects(
  state: GameState,
  choice: EventChoiceDefinition,
): GameState {
  if (!choice.frontEffects || !state.pendingEvent?.selectedFrontId) {
    return state;
  }

  const selectedFrontId = state.pendingEvent.selectedFrontId;
  const selectedFront = state.fronts[selectedFrontId];

  if (!selectedFront) {
    return state;
  }

  return {
    ...state,
    fronts: {
      ...state.fronts,
      [selectedFrontId]: {
        ...selectedFront,
        exposure: clampPercent(selectedFront.exposure + (choice.frontEffects?.exposure ?? 0)),
        active: choice.frontEffects?.active ?? selectedFront.active,
        compromised: choice.frontEffects?.compromised ?? selectedFront.compromised,
        flags: {
          ...selectedFront.flags,
          ...(choice.frontEffects?.flags ?? {}),
        },
      },
    },
  };
}

export function previewEventFrontEffects(
  state: GameState,
  choice: EventChoiceDefinition,
): FrontEffectPreviewRow[] {
  const selectedFront = getSelectedFront(state);

  if (!selectedFront || !choice.frontEffects) {
    return [];
  }

  const frontName = getSelectedFrontName(state);
  const rows: FrontEffectPreviewRow[] = [];

  if (choice.frontEffects.exposure !== undefined) {
    rows.push({
      frontId: selectedFront.id,
      frontName,
      id: 'exposure',
      value: choice.frontEffects.exposure,
      current: selectedFront.exposure,
      projected: clampPercent(selectedFront.exposure + choice.frontEffects.exposure),
    });
  }

  if (choice.frontEffects.active !== undefined) {
    rows.push({
      frontId: selectedFront.id,
      frontName,
      id: 'active',
      value: choice.frontEffects.active,
      current: selectedFront.active,
      projected: choice.frontEffects.active,
    });
  }

  if (choice.frontEffects.compromised !== undefined) {
    rows.push({
      frontId: selectedFront.id,
      frontName,
      id: 'compromised',
      value: choice.frontEffects.compromised,
      current: selectedFront.compromised,
      projected: choice.frontEffects.compromised,
    });
  }

  return rows;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
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

  if (!definition || !choice) {
    return unavailable('choice_not_found');
  }

  if (!canPayCost(state, choice.cost)) {
    return unavailable('not_enough_cost');
  }

  if (!eventLedgerEffectsAreAvailable(state, definition, choice)) {
    return unavailable('ledger_entry_not_found');
  }

  return {
    available: true,
  };
}

export function getEventChoicePreview(
  state: GameState,
  eventId: string,
  choiceId: string,
): EventChoicePreview | undefined {
  const pendingEvent = state.pendingEvent;

  if (!pendingEvent || (pendingEvent.id !== eventId && pendingEvent.definitionId !== eventId)) {
    return undefined;
  }

  const definition = getEventDefinition(pendingEvent.definitionId);
  const choice = definition?.choices.find((candidate) => candidate.id === choiceId);

  if (!definition || !choice) {
    return undefined;
  }

  return {
    choiceId: choice.id,
    label: choice.label,
    ledgerEffects: previewEventLedgerEffects(state, definition, choice),
    contactEffects: previewEventContactEffects(state, definition, choice),
    frontEffects: previewEventFrontEffects(state, choice),
  };
}

function applyContactEffects(
  state: GameState,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
): GameState {
  const contactId = resolveEventContactId(state, definition, choice);

  if (!contactId || !choice.contactEffects) {
    return state;
  }

  const contact = state.contacts[contactId];

  if (!contact) {
    return state;
  }

  return {
    ...state,
    contacts: {
      ...state.contacts,
      [contactId]: applyContactMetricDelta(contact, choice.contactEffects),
    },
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

function createEventChoiceLogBody(
  state: GameState,
  definition: EventDefinition,
  ledgerRows: readonly EventLedgerEffectPreviewRow[],
  contactRows: readonly ContactEffectPreviewRow[],
  frontRows: readonly FrontEffectPreviewRow[],
): string {
  const ledger = ledgerRows.length > 0
    ? ` Ledger: ${ledgerRows.map(formatLedgerEffectRow).join('; ')}.`
    : '';
  const contact = contactRows.length > 0
    ? ` Contact: ${formatContactEffectRows(contactRows)}.`
    : '';
  const front = frontRows.length > 0
    ? ` Front: ${formatFrontEffectRows(frontRows)}.`
    : '';

  return `Response to ${renderEventTitle(state, definition.title)}.${ledger}${contact}${front}`;
}

function formatContactEffectRows(rows: readonly ContactEffectPreviewRow[]): string {
  const contactName = rows[0]?.contactName ?? 'Contact';
  const effects = rows
    .map((row) => `${row.id} ${row.value > 0 ? `+${row.value}` : row.value}`)
    .join(', ');

  return `${contactName}: ${effects}`;
}

function formatFrontEffectRows(rows: readonly FrontEffectPreviewRow[]): string {
  const frontName = rows[0]?.frontName ?? 'Front';
  const effects = rows.map(formatFrontEffectRow).join(', ');

  return `${frontName}: ${effects}`;
}

function formatFrontEffectRow(row: FrontEffectPreviewRow): string {
  if (row.id === 'exposure' && typeof row.value === 'number') {
    return `exposure ${row.value > 0 ? `+${row.value}` : row.value}`;
  }

  return `${row.id} ${String(row.projected)}`;
}

function formatLedgerEffectRow(row: EventLedgerEffectPreviewRow): string {
  const kind = capitalize(row.kind);

  switch (row.type) {
    case 'create':
      return `Creates ${kind}: ${row.entryName}`;
    case 'consume':
      return `Consumes ${kind}: ${row.entryName}`;
    case 'resolve':
      return `Resolves ${kind}: ${row.entryName}`;
  }

  return row.entryName;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderEventTitle(state: GameState, title: string): string {
  const selectedEntry = state.pendingEvent?.selectedLedgerEntryId
    ? state.ledger.entries.find((entry) => entry.id === state.pendingEvent?.selectedLedgerEntryId)
    : undefined;
  const selectedDefinition = selectedEntry
    ? getLedgerEntryDefinition(selectedEntry.definitionId)
    : undefined;
  const selectedContact = state.pendingEvent?.selectedContactId
    ? getContactDefinition(state.pendingEvent.selectedContactId)
    : undefined;

  return title
    .replaceAll('{ledgerEntryName}', selectedDefinition?.name ?? 'Ledger Entry')
    .replaceAll('{contactName}', selectedContact?.name ?? 'Contact')
    .replaceAll('{frontName}', getSelectedFrontName(state));
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
