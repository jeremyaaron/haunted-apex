import { getLedgerEntryDefinition } from '../content';
import type {
  EventChoiceDefinition,
  EventChoiceLedgerEffect,
  EventDefinition,
  GameLogEntry,
  GameState,
  LedgerEntry,
  LedgerEntryDefinition,
  LedgerEntrySelector,
} from '../model';
import { addLedgerEntry } from './add-ledger-entry';

export type EventLedgerEffectPreviewRow = {
  type: EventChoiceLedgerEffect['type'];
  entryName: string;
  kind: LedgerEntryDefinition['kind'];
  available: boolean;
  optional: boolean;
  entryId?: string;
};

export type EventLedgerEffectApplication = {
  state: GameState;
  appliedRows: EventLedgerEffectPreviewRow[];
};

export function previewEventLedgerEffects(
  state: GameState,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
): EventLedgerEffectPreviewRow[] {
  return (choice.ledgerEffects ?? []).flatMap((effect) =>
    previewEventLedgerEffect(state, definition, effect),
  );
}

export function eventLedgerEffectsAreAvailable(
  state: GameState,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
): boolean {
  return previewEventLedgerEffects(state, definition, choice).every(
    (row) => row.available || row.optional,
  );
}

export function applyEventLedgerEffects(
  state: GameState,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
): EventLedgerEffectApplication {
  let next = state;
  const appliedRows: EventLedgerEffectPreviewRow[] = [];

  for (const effect of choice.ledgerEffects ?? []) {
    const rows = previewEventLedgerEffect(next, definition, effect);
    const row = rows[0];

    if (!row || (!row.available && row.optional)) {
      continue;
    }

    if (!row.available) {
      continue;
    }

    if (effect.type === 'create') {
      next = addLedgerEntry(next, {
        definitionId: effect.definitionId,
        source: {
          type: 'event',
          eventId: definition.id,
          choiceId: choice.id,
        },
        ...(effect.potency ? { potency: effect.potency } : {}),
        ...(effect.relatedTarget ? { relatedTarget: effect.relatedTarget } : {}),
        ...(effect.relatedOperativeId
          ? { relatedOperativeId: effect.relatedOperativeId }
          : {}),
        ...(effect.relatedRivalId ? { relatedRivalId: effect.relatedRivalId } : {}),
      });
    } else {
      const entry = selectLedgerEntry(next, effect.entrySelector);

      if (!entry) {
        continue;
      }

      next = consumeLedgerEntry(next, entry, definition, choice, effect.type);
    }

    appliedRows.push(row);
  }

  return {
    state: next,
    appliedRows,
  };
}

function previewEventLedgerEffect(
  state: GameState,
  definition: EventDefinition,
  effect: EventChoiceLedgerEffect,
): EventLedgerEffectPreviewRow[] {
  if (effect.type === 'create') {
    const entryDefinition = getLedgerEntryDefinition(effect.definitionId);

    if (!entryDefinition) {
      return [];
    }

    return [
      {
        type: effect.type,
        entryName: entryDefinition.name,
        kind: entryDefinition.kind,
        available: true,
        optional: false,
      },
    ];
  }

  const entry = selectLedgerEntry(state, effect.entrySelector);
  const entryDefinition = entry ? getLedgerEntryDefinition(entry.definitionId) : undefined;

  if (!entry || !entryDefinition) {
    const fallbackDefinition = getSelectorFallbackDefinition(effect.entrySelector);

    return fallbackDefinition
      ? [
          {
            type: effect.type,
            entryName: fallbackDefinition.name,
            kind: fallbackDefinition.kind,
            available: false,
            optional: effect.optional ?? false,
          },
        ]
      : [];
  }

  return [
    {
      type: effect.type,
      entryName: entryDefinition.name,
      kind: entryDefinition.kind,
      available: true,
      optional: effect.optional ?? false,
      entryId: entry.id,
    },
  ];
}

function selectLedgerEntry(
  state: GameState,
  selector: LedgerEntrySelector,
): LedgerEntry | undefined {
  const activeEntries = state.ledger.entries.filter((entry) => !entry.consumed);

  switch (selector.type) {
    case 'entry':
      return activeEntries.find((entry) => entry.id === selector.entryId);
    case 'definition':
      return activeEntries.find((entry) => entry.definitionId === selector.definitionId);
    case 'kind':
      return activeEntries.find((entry) => entry.kind === selector.kind);
    case 'selected_entry':
      return activeEntries.find((entry) => entry.id === state.pendingEvent?.selectedLedgerEntryId);
  }

  return undefined;
}

function getSelectorFallbackDefinition(
  selector: LedgerEntrySelector,
): LedgerEntryDefinition | undefined {
  if (selector.type !== 'definition') {
    return undefined;
  }

  return getLedgerEntryDefinition(selector.definitionId);
}

function consumeLedgerEntry(
  state: GameState,
  entry: LedgerEntry,
  definition: EventDefinition,
  choice: EventChoiceDefinition,
  effectType: Extract<EventChoiceLedgerEffect['type'], 'consume' | 'resolve'>,
): GameState {
  const entryDefinition = getLedgerEntryDefinition(entry.definitionId);
  const logEntry: Omit<GameLogEntry, 'id' | 'week'> = {
    type: 'ledger',
    title: `${effectType === 'resolve' ? 'Ledger entry resolved' : 'Ledger entry consumed'}: ${
      entryDefinition?.name ?? entry.definitionId
    }`,
    body: `${choice.label} ${
      effectType === 'resolve' ? 'resolved' : 'consumed'
    } this Ledger entry during ${renderEventTitle(state, definition.title)}.`,
    tags: [
      'LEDGER',
      effectType.toUpperCase(),
      entry.kind.toUpperCase(),
      ...(entryDefinition?.tags ?? []),
    ],
  };

  return {
    ...state,
    ledger: {
      ...state.ledger,
      entries: state.ledger.entries.map((candidate) =>
        candidate.id === entry.id
          ? {
              ...candidate,
              consumed: true,
              consumedWeek: state.week,
              consumedBy: {
                type: 'event',
                eventId: definition.id,
                choiceId: choice.id,
              },
            }
          : candidate,
      ),
      consumedCount: state.ledger.consumedCount + 1,
    },
    eventLog: [
      ...state.eventLog,
      {
        id: `log_${state.week}_${state.eventLog.length + 1}_ledger`,
        week: state.week,
        ...logEntry,
      },
    ],
  };
}

function renderEventTitle(state: GameState, title: string): string {
  const selectedEntry = state.pendingEvent?.selectedLedgerEntryId
    ? state.ledger.entries.find((entry) => entry.id === state.pendingEvent?.selectedLedgerEntryId)
    : undefined;
  const selectedDefinition = selectedEntry
    ? getLedgerEntryDefinition(selectedEntry.definitionId)
    : undefined;

  return title.replaceAll('{ledgerEntryName}', selectedDefinition?.name ?? 'Ledger Entry');
}
