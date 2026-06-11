import { getContactDefinition, getLedgerEntryDefinition } from '../content';
import { applyContactMetricDelta } from '../contacts';
import type {
  ActionTarget,
  ContactId,
  ContactMetricDelta,
  GameLogEntry,
  GameState,
  LedgerEntry,
  LedgerEntryDefinition,
  LedgerUseOptionDefinition,
  LedgerUseOptionId,
  PressureDelta,
  PressureId,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { createRng, nextInt, type RngState } from '../rng';
import { applyPressureDelta, mergePressureDeltas } from '../simulation/pressure-delta';

export type LedgerUseUnavailableReason =
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'ledger_entry_consumed'
  | 'ledger_use_option_not_found'
  | 'not_enough_resources'
  | 'not_enough_intel';

export type LedgerCostRow = {
  id: Extract<PressureId, 'resources' | 'intel'>;
  value: number;
};

export type LedgerContactEffectRow = {
  id: keyof ContactMetricDelta;
  value: number;
};

export type LedgerUsePreview =
  | {
      ok: true;
      entry: LedgerEntry;
      definition: LedgerEntryDefinition;
      useOption: LedgerUseOptionDefinition;
      entryName: string;
      useOptionLabel: string;
      targetLabel: string;
      cost: {
        resources: number;
        intel: number;
      };
      costRows: LedgerCostRow[];
      effects: PressureDelta;
      resolvedDelta: PressureDelta;
      relatedContactId?: ContactId;
      relatedContactName?: string;
      relatedContactEffects: ContactMetricDelta;
      relatedContactEffectRows: LedgerContactEffectRow[];
      consumesEntry: boolean;
      affordable: true;
      riskModifier: number;
      riskChance: number;
    }
  | {
      ok: false;
      reason: LedgerUseUnavailableReason;
      affordable: false;
      riskChance: number;
    };

export type ResolveLedgerUseResult = {
  state: GameState;
  rng: RngState;
  complication: boolean;
  riskChance: number;
  resolvedDelta: PressureDelta;
  stressDelta: 0;
};

export function previewLedgerUse(
  state: GameState,
  target: ActionTarget | undefined,
  baseRiskChance = 3,
): LedgerUsePreview {
  if (!target) {
    return unavailable('target_required', baseRiskChance);
  }

  if (target.type !== 'ledger') {
    return unavailable('target_not_allowed', baseRiskChance);
  }

  const entry = state.ledger.entries.find((candidate) => candidate.id === target.entryId);

  if (!entry) {
    return unavailable('target_not_found', baseRiskChance);
  }

  if (entry.consumed) {
    return unavailable('ledger_entry_consumed', baseRiskChance);
  }

  const definition = getLedgerEntryDefinition(entry.definitionId);
  const useOption = definition?.useOptions.find(
    (candidate) => candidate.id === target.useOptionId,
  );

  if (!definition || !useOption) {
    return unavailable('ledger_use_option_not_found', baseRiskChance);
  }

  const cost = {
    resources: useOption.cost?.resources ?? 0,
    intel: useOption.cost?.intel ?? 0,
  };
  const riskChance = clampRisk(baseRiskChance + (useOption.riskModifier ?? 0));
  const relatedContactName = entry.relatedContactId
    ? getContactDefinition(entry.relatedContactId)?.name
    : undefined;
  const relatedContactEffects = normalizeRelatedContactEffects(
    entry,
    useOption.relatedContactEffects,
  );

  if (cost.resources > state.pressures.resources) {
    return unavailable('not_enough_resources', riskChance);
  }

  if (cost.intel > state.pressures.intel) {
    return unavailable('not_enough_intel', riskChance);
  }

  return {
    ok: true,
    entry,
    definition,
    useOption,
    entryName: definition.name,
    useOptionLabel: useOption.label,
    targetLabel: `${definition.name} - ${useOption.label}`,
    cost,
    costRows: toCostRows(cost),
    effects: normalizePressureDelta(useOption.effects),
    resolvedDelta: mergePressureDeltas(useOption.effects, toCostDelta(cost)),
    ...(entry.relatedContactId ? { relatedContactId: entry.relatedContactId } : {}),
    ...(relatedContactName ? { relatedContactName } : {}),
    relatedContactEffects,
    relatedContactEffectRows: toContactEffectRows(relatedContactEffects),
    consumesEntry: useOption.consumesEntry,
    affordable: true,
    riskModifier: useOption.riskModifier ?? 0,
    riskChance,
  };
}

export function resolveLedgerUse(
  state: GameState,
  target: ActionTarget | undefined,
): ResolveLedgerUseResult {
  const preview = previewLedgerUse(state, target);

  if (!preview.ok) {
    return {
      state: appendLog(state, {
        type: 'complication',
        title: 'Ledger Use Blocked',
        body: `Work the Ledger could not resolve: ${preview.reason}.`,
        tags: ['LEDGER', 'BLOCKED', preview.reason],
      }),
      rng: createRng(state.seed, state.rngCursor),
      complication: true,
      riskChance: preview.riskChance,
      resolvedDelta: {},
      stressDelta: 0,
    };
  }

  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, 100);
  const complication = roll.value <= preview.riskChance;
  let next = {
    ...state,
    rngCursor: roll.rng.cursor,
    pressures: applyPressureDelta(state.pressures, preview.resolvedDelta),
    ledger: {
      ...state.ledger,
      entries: state.ledger.entries.map((entry): LedgerEntry =>
        entry.id === preview.entry.id && preview.consumesEntry
          ? {
              ...entry,
              consumed: true,
              consumedWeek: state.week,
              consumedBy: {
                type: 'action',
                actionId: 'work_the_ledger',
                useOptionId: preview.useOption.id as LedgerUseOptionId,
              },
            }
          : entry,
      ),
      consumedCount: state.ledger.consumedCount + (preview.consumesEntry ? 1 : 0),
    },
  };

  next = applyRelatedContactEffects(next, preview);

  next = appendLog(next, {
    type: 'order_resolved',
    title: `Work the Ledger: ${preview.entryName}`,
    body: createResolutionBody(preview, roll.value, complication),
    pressureDelta: preview.resolvedDelta,
    tags: [
      'LEDGER',
      preview.definition.kind.toUpperCase(),
      ...preview.definition.tags,
      ...(preview.useOption.tags ?? []),
      ...(preview.relatedContactId ? ['CONTACT', preview.relatedContactId] : []),
    ],
  });

  if (complication) {
    next = appendLog(next, {
      type: 'complication',
      title: `${preview.entryName} Blowback`,
      body: `${preview.useOptionLabel} resolved, but the move left a trace in the Ledger.`,
      tags: ['LEDGER', 'COMPLICATION', preview.definition.kind.toUpperCase()],
    });
  }

  return {
    state: next,
    rng: roll.rng,
    complication,
    riskChance: preview.riskChance,
    resolvedDelta: preview.resolvedDelta,
    stressDelta: 0,
  };
}

function createResolutionBody(
  preview: Extract<LedgerUsePreview, { ok: true }>,
  roll: number,
  complication: boolean,
): string {
  const cost = preview.costRows
    .map((row) => `${row.value} ${row.id}`)
    .join(', ');
  const costText = cost ? ` Cost: ${cost}.` : '';
  const consumption = preview.consumesEntry ? ' Entry consumed.' : ' Entry retained.';
  const contactText =
    preview.relatedContactId && preview.relatedContactEffectRows.length > 0
      ? ` ${preview.relatedContactName ?? preview.relatedContactId}: ${preview.relatedContactEffectRows
          .map((row) => `${row.id} ${formatSigned(row.value)}`)
          .join(', ')}.`
      : '';
  const result = complication ? 'Resolved with blowback.' : 'Resolved cleanly.';

  return `${result} Use: ${preview.useOptionLabel}.${costText}${consumption}${contactText} Risk ${preview.riskChance}, roll ${roll}.`;
}

function toCostDelta(cost: { resources: number; intel: number }): PressureDelta {
  return normalizePressureDelta({
    resources: cost.resources > 0 ? -cost.resources : 0,
    intel: cost.intel > 0 ? -cost.intel : 0,
  });
}

function toCostRows(cost: { resources: number; intel: number }): LedgerCostRow[] {
  return [
    ...(cost.resources > 0
      ? [
          {
            id: 'resources' as const,
            value: cost.resources,
          },
        ]
      : []),
    ...(cost.intel > 0
      ? [
          {
            id: 'intel' as const,
            value: cost.intel,
          },
        ]
      : []),
  ];
}

function normalizePressureDelta(delta: PressureDelta): PressureDelta {
  const normalized: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = delta[id];

    if (value !== undefined && value !== 0) {
      normalized[id] = value;
    }
  }

  return normalized;
}

function normalizeRelatedContactEffects(
  entry: LedgerEntry,
  delta: ContactMetricDelta | undefined,
): ContactMetricDelta {
  if (!entry.relatedContactId || !delta) {
    return {};
  }

  const normalized: ContactMetricDelta = {};

  for (const id of ['trust', 'leverage', 'volatility', 'exposure'] as const) {
    const value = delta[id];

    if (value !== undefined && value !== 0) {
      normalized[id] = value;
    }
  }

  return normalized;
}

function toContactEffectRows(delta: ContactMetricDelta): LedgerContactEffectRow[] {
  return (['trust', 'leverage', 'volatility', 'exposure'] as const).flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0 ? [{ id, value }] : [];
  });
}

function applyRelatedContactEffects(
  state: GameState,
  preview: Extract<LedgerUsePreview, { ok: true }>,
): GameState {
  if (!preview.relatedContactId || preview.relatedContactEffectRows.length === 0) {
    return state;
  }

  const contact = state.contacts[preview.relatedContactId];

  if (!contact) {
    return state;
  }

  return {
    ...state,
    contacts: {
      ...state.contacts,
      [preview.relatedContactId]: applyContactMetricDelta(
        contact,
        preview.relatedContactEffects,
      ),
    },
  };
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function clampRisk(value: number): number {
  return Math.min(45, Math.max(3, value));
}

function unavailable(
  reason: LedgerUseUnavailableReason,
  riskChance: number,
): LedgerUsePreview {
  return {
    ok: false,
    reason,
    affordable: false,
    riskChance: clampRisk(riskChance),
  };
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
