import {
  getContactDefinition,
  getRivalDefinition,
} from '../content';
import {
  applyContactMetricDelta,
  previewContactOption,
  type ContactOptionPreview,
} from '../contacts';
import type {
  ActionTarget,
  ContactId,
  GameLogEntry,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';
import { createRng, nextInt, type RngState } from '../rng';
import { clampStress } from './clamps';
import { applyPressureDelta } from './pressure-delta';

export type ResolveContactOptionResult = {
  state: GameState;
  rng: RngState;
  complication: boolean;
  riskChance: number;
  resolvedDelta: PressureDelta;
  stressDelta: number;
};

export function resolveContactOption(
  state: GameState,
  target: ActionTarget | undefined,
): ResolveContactOptionResult {
  const preview = previewContactOption(state, target);

  if (!preview.ok) {
    return {
      state: appendLog(state, {
        type: 'complication',
        title: 'Contact Move Blocked',
        body: `Manage Contact could not resolve: ${preview.unavailableReason}.`,
        tags: ['CONTACT', 'BLOCKED', preview.unavailableReason],
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
  let next: GameState = {
    ...state,
    rngCursor: roll.rng.cursor,
    pressures: applyPressureDelta(state.pressures, preview.resolvedDelta),
    contacts: {
      ...state.contacts,
      [preview.contactId]: {
        ...applyContactMetricDelta(
          state.contacts[preview.contactId],
          preview.resolvedContactEffects,
        ),
        recentInteractions: [
          ...state.contacts[preview.contactId].recentInteractions,
          {
            week: state.week,
            optionId: preview.id,
            kind: preview.kind,
            label: preview.label,
            effectsSummary: { ...preview.resolvedContactEffects },
          },
        ],
      },
    },
  };

  const quietTreatment = applyQuietTreatment(next, preview);
  next = quietTreatment.state;
  next = applyRivalPressureEffects(next, preview.rivalPressureEffects);
  next = appendLog(next, {
    type: 'order_resolved',
    title: `Manage Contact: ${preview.contactName}`,
    body: createResolutionBody(preview, roll.value, complication, quietTreatment.stressDelta),
    pressureDelta: preview.resolvedDelta,
    tags: ['CONTACT', preview.contactId, preview.kind, preview.id],
  });

  if (complication) {
    next = appendLog(next, {
      type: 'complication',
      title: `${preview.contactName} Blowback`,
      body: `${preview.label} resolved, but the relationship left a visible trace.`,
      tags: ['CONTACT', 'COMPLICATION', preview.contactId],
    });
  }

  return {
    state: next,
    rng: roll.rng,
    complication,
    riskChance: preview.riskChance,
    resolvedDelta: preview.resolvedDelta,
    stressDelta: quietTreatment.stressDelta,
  };
}

function applyQuietTreatment(
  state: GameState,
  preview: Extract<ContactOptionPreview, { ok: true }>,
): { state: GameState; stressDelta: number } {
  const target = preview.quietTreatment;

  if (!target) {
    return {
      state,
      stressDelta: 0,
    };
  }

  let stressDelta = 0;

  return {
    state: {
      ...state,
      operatives: state.operatives.map((operative) => {
        if (operative.id !== target.operativeId) {
          return operative;
        }

        const stress = clampStress(operative.stress + target.stressDelta);
        stressDelta = stress - operative.stress;

        return {
          ...operative,
          stress,
        };
      }),
    },
    stressDelta,
  };
}

function applyRivalPressureEffects(
  state: GameState,
  effects: Partial<Record<RivalId, number>>,
): GameState {
  const entries = Object.entries(effects) as [RivalId, number][];

  if (entries.length === 0) {
    return state;
  }

  return {
    ...state,
    rivals: entries.reduce(
      (rivals, [rivalId, amount]) => {
        const rival = rivals[rivalId];

        if (!rival) {
          return rivals;
        }

        return {
          ...rivals,
          [rivalId]: {
            ...rival,
            pressure: Math.min(100, Math.max(0, rival.pressure + amount)),
          },
        };
      },
      { ...state.rivals },
    ),
  };
}

function createResolutionBody(
  preview: Extract<ContactOptionPreview, { ok: true }>,
  roll: number,
  complication: boolean,
  stressDelta: number,
): string {
  const cost = preview.costRows.map((row) => `${row.value} ${row.id}`).join(', ');
  const costText = cost ? ` Cost: ${cost}.` : '';
  const contactText = formatContactDelta(preview.contactId, preview.resolvedContactEffects);
  const rivalText = formatRivalEffects(preview.rivalPressureEffects);
  const stressText = preview.quietTreatment
    ? ` ${preview.quietTreatment.operativeName} Stress ${stressDelta}.`
    : '';
  const ledgerText = preview.ledgerEffects.length > 0
    ? ` Ledger hooks pending: ${preview.ledgerEffects.map((effect) => effect.entryName).join(', ')}.`
    : '';
  const result = complication ? 'Resolved with blowback.' : 'Resolved cleanly.';

  return `${result} Option: ${preview.label}.${costText}${contactText}${rivalText}${stressText}${ledgerText} Risk ${preview.riskChance}, roll ${roll}.`;
}

function formatContactDelta(
  contactId: ContactId,
  delta: Extract<ContactOptionPreview, { ok: true }>['resolvedContactEffects'],
): string {
  const contactName = getContactDefinition(contactId)?.name ?? contactId;
  const parts = Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([metric, value]) => `${metric} ${formatSigned(value)}`);

  return parts.length > 0 ? ` ${contactName}: ${parts.join(', ')}.` : '';
}

function formatRivalEffects(effects: Partial<Record<RivalId, number>>): string {
  const parts = (Object.entries(effects) as [RivalId, number][])
    .filter(([, value]) => value !== 0)
    .map(([rivalId, value]) => {
      const rivalName = getRivalDefinition(rivalId)?.name ?? rivalId;
      return `${rivalName} ${formatSigned(value)}`;
    });

  return parts.length > 0 ? ` Rival pressure: ${parts.join(', ')}.` : '';
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
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
