import {
  getActionDefinition,
  getDistrictDefinition,
  getEventDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionTarget,
  GameState,
  LedgerEntry,
  LedgerEntryDefinition,
  LedgerEntryDefinitionId,
  LedgerEntryId,
  LedgerEntryKind,
  LedgerUseOptionDefinition,
  LedgerUseOptionId,
  PressureDelta,
  PressureId,
} from '../model';
import { PRESSURE_IDS } from '../model';

export type LedgerEntryStatus = 'active' | 'spent' | 'resolved';

export type LedgerDeltaRow = {
  id: PressureId;
  value: number;
};

export type LedgerUseOptionView = {
  id: LedgerUseOptionId;
  label: string;
  description?: string;
  costRows: LedgerDeltaRow[];
  effectRows: LedgerDeltaRow[];
  consumesEntry: boolean;
  affordable: boolean;
  unavailableReason?: 'insufficient_resources' | 'insufficient_intel' | 'entry_consumed';
};

export type LedgerEntryView = {
  id: LedgerEntryId;
  definitionId: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  name: string;
  description: string;
  createdWeek: number;
  potency: number;
  status: LedgerEntryStatus;
  sourceLabel: string;
  relatedContextLabel?: string;
  tags: string[];
  useOptions: LedgerUseOptionView[];
};

export type LedgerPanelView = {
  secrets: LedgerEntryView[];
  debts: LedgerEntryView[];
  favors: LedgerEntryView[];
  consumed: LedgerEntryView[];
};

export type LedgerSummary = {
  totalEntries: number;
  activeSecrets: number;
  activeDebts: number;
  activeFavors: number;
  consumedEntries: number;
  unresolvedDebtCount: number;
};

export function getLedgerEntry(
  state: GameState,
  entryId: LedgerEntryId,
): LedgerEntry | undefined {
  return state.ledger.entries.find((entry) => entry.id === entryId);
}

export function getLedgerDefinition(
  definitionId: LedgerEntryDefinitionId,
): LedgerEntryDefinition | undefined {
  return getLedgerEntryDefinition(definitionId);
}

export function selectActiveSecrets(state: GameState): LedgerEntry[] {
  return selectActiveLedgerEntriesByKind(state, 'secret');
}

export function selectActiveDebts(state: GameState): LedgerEntry[] {
  return selectActiveLedgerEntriesByKind(state, 'debt');
}

export function selectActiveFavors(state: GameState): LedgerEntry[] {
  return selectActiveLedgerEntriesByKind(state, 'favor');
}

export function selectUnresolvedLedgerEntries(state: GameState): LedgerEntry[] {
  return state.ledger.entries.filter((entry) => !entry.consumed);
}

export function selectActiveLedgerEntryViews(state: GameState): LedgerEntryView[] {
  return state.ledger.entries
    .filter((entry) => !entry.consumed)
    .flatMap((entry) => toLedgerEntryView(state, entry));
}

export function selectConsumedLedgerEntryViews(state: GameState): LedgerEntryView[] {
  return state.ledger.entries
    .filter((entry) => entry.consumed)
    .flatMap((entry) => toLedgerEntryView(state, entry));
}

export function selectLedgerPanelView(state: GameState): LedgerPanelView {
  const activeViews = selectActiveLedgerEntryViews(state);

  return {
    secrets: activeViews.filter((entry) => entry.kind === 'secret'),
    debts: activeViews.filter((entry) => entry.kind === 'debt'),
    favors: activeViews.filter((entry) => entry.kind === 'favor'),
    consumed: selectConsumedLedgerEntryViews(state),
  };
}

export function selectLedgerSummary(state: GameState): LedgerSummary {
  const activeSecrets = selectActiveSecrets(state).length;
  const activeDebts = selectActiveDebts(state).length;
  const activeFavors = selectActiveFavors(state).length;
  const consumedEntries = state.ledger.entries.filter((entry) => entry.consumed).length;

  return {
    totalEntries: state.ledger.entries.length,
    activeSecrets,
    activeDebts,
    activeFavors,
    consumedEntries,
    unresolvedDebtCount: activeDebts,
  };
}

function selectActiveLedgerEntriesByKind(
  state: GameState,
  kind: LedgerEntryKind,
): LedgerEntry[] {
  return state.ledger.entries.filter((entry) => entry.kind === kind && !entry.consumed);
}

function toLedgerEntryView(state: GameState, entry: LedgerEntry): LedgerEntryView[] {
  const definition = getLedgerEntryDefinition(entry.definitionId);

  if (!definition) {
    return [];
  }

  return [
    {
      id: entry.id,
      definitionId: entry.definitionId,
      kind: entry.kind,
      name: definition.name,
      description: definition.description,
      createdWeek: entry.createdWeek,
      potency: entry.potency,
      status: getLedgerEntryStatus(entry),
      sourceLabel: getSourceLabel(entry),
      relatedContextLabel: getRelatedContextLabel(entry),
      tags: [...definition.tags],
      useOptions: definition.useOptions.map((option) =>
        toLedgerUseOptionView(state, entry, option),
      ),
    },
  ];
}

function toLedgerUseOptionView(
  state: GameState,
  entry: LedgerEntry,
  option: LedgerUseOptionDefinition,
): LedgerUseOptionView {
  const unavailableReason = getUseUnavailableReason(state, entry, option);

  return {
    id: option.id,
    label: option.label,
    description: option.description,
    costRows: toCostRows(option.cost),
    effectRows: toDeltaRows(option.effects),
    consumesEntry: option.consumesEntry,
    affordable: unavailableReason === undefined,
    unavailableReason,
  };
}

function getUseUnavailableReason(
  state: GameState,
  entry: LedgerEntry,
  option: LedgerUseOptionDefinition,
): LedgerUseOptionView['unavailableReason'] {
  if (entry.consumed) {
    return 'entry_consumed';
  }

  if ((option.cost?.resources ?? 0) > state.pressures.resources) {
    return 'insufficient_resources';
  }

  if ((option.cost?.intel ?? 0) > state.pressures.intel) {
    return 'insufficient_intel';
  }

  return undefined;
}

function getLedgerEntryStatus(entry: LedgerEntry): LedgerEntryStatus {
  if (!entry.consumed) {
    return 'active';
  }

  return entry.kind === 'debt' ? 'resolved' : 'spent';
}

function getSourceLabel(entry: LedgerEntry): string {
  switch (entry.source.type) {
    case 'action':
      return getActionDefinition(entry.source.actionId)?.label ?? entry.source.actionId;
    case 'event':
      return getEventDefinition(entry.source.eventId)?.title ?? entry.source.eventId;
    case 'operative_event': {
      const operativeName = getOperativeDefinition(entry.source.operativeId)?.name;
      const eventTitle = getEventDefinition(entry.source.eventId)?.title;
      return [operativeName, eventTitle].filter(Boolean).join(' - ') || entry.source.eventId;
    }
  }
}

function getRelatedContextLabel(entry: LedgerEntry): string | undefined {
  if (entry.relatedTarget) {
    return getTargetLabel(entry.relatedTarget);
  }

  if (entry.relatedOperativeId) {
    return getOperativeDefinition(entry.relatedOperativeId)?.name;
  }

  if (entry.relatedRivalId) {
    return getRivalDefinition(entry.relatedRivalId)?.name;
  }

  return undefined;
}

function getTargetLabel(target: ActionTarget): string | undefined {
  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.name;
    case 'venue':
      return getVenueDefinition(target.id)?.name;
    case 'rival':
      return getRivalDefinition(target.id)?.name;
    case 'recruit':
      return getOperativeDefinition(target.id)?.name;
  }
}

function toCostRows(cost: LedgerUseOptionDefinition['cost']): LedgerDeltaRow[] {
  if (!cost) {
    return [];
  }

  return toDeltaRows({
    resources: cost.resources ? -cost.resources : undefined,
    intel: cost.intel ? -cost.intel : undefined,
  });
}

function toDeltaRows(delta: PressureDelta): LedgerDeltaRow[] {
  return PRESSURE_IDS.flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0
      ? [
          {
            id,
            value,
          },
        ]
      : [];
  });
}
