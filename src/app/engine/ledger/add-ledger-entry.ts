import { getLedgerEntryDefinition } from '../content';
import type { GameLogEntry, GameState, LedgerEntry, LedgerEntryDefinitionId } from '../model';

export type AddLedgerEntryRequest = {
  definitionId: LedgerEntryDefinitionId;
  source: LedgerEntry['source'];
  potency?: LedgerEntry['potency'];
  relatedTarget?: LedgerEntry['relatedTarget'];
  relatedOperativeId?: LedgerEntry['relatedOperativeId'];
  relatedRivalId?: LedgerEntry['relatedRivalId'];
  flags?: LedgerEntry['flags'];
};

export function addLedgerEntry(
  state: GameState,
  request: AddLedgerEntryRequest,
): GameState {
  const definition = getLedgerEntryDefinition(request.definitionId);

  if (!definition) {
    return state;
  }

  const entry: LedgerEntry = {
    id: createLedgerEntryId(state, request.definitionId),
    definitionId: request.definitionId,
    kind: definition.kind,
    createdWeek: state.week,
    source: request.source,
    potency: request.potency ?? 1,
    revealed: true,
    consumed: false,
    ...(request.relatedTarget ? { relatedTarget: request.relatedTarget } : {}),
    ...(request.relatedOperativeId
      ? { relatedOperativeId: request.relatedOperativeId }
      : {}),
    ...(request.relatedRivalId ? { relatedRivalId: request.relatedRivalId } : {}),
    ...(request.flags ? { flags: request.flags } : {}),
  };

  const logEntry: GameLogEntry = {
    id: `log_${state.week}_${state.eventLog.length + 1}_ledger`,
    week: state.week,
    type: 'ledger',
    title: `Ledger entry added: ${definition.name}`,
    body: definition.description,
    tags: ['LEDGER', definition.kind.toUpperCase()],
  };

  return {
    ...state,
    ledger: {
      ...state.ledger,
      entries: [...state.ledger.entries, entry],
      discoveredCount: state.ledger.discoveredCount + 1,
    },
    eventLog: [...state.eventLog, logEntry],
  };
}

function createLedgerEntryId(
  state: GameState,
  definitionId: LedgerEntryDefinitionId,
): string {
  return `ledger_${definitionId}_${state.week}_${state.ledger.entries.length + 1}`;
}
