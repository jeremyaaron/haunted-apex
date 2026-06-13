import { createActiveAccordId, previewBrokerAccord } from '../accords';
import { clampFactionMetric } from '../factions';
import { clampFrontExposure } from '../fronts';
import { addLedgerEntry } from '../ledger';
import type {
  ActiveAccord,
  ActiveAccordId,
  AccordId,
  ActionTarget,
  FactionId,
  FactionInteraction,
  FactionMetricDelta,
  GameLogEntry,
  GameState,
  PressureDelta,
} from '../model';
import { createRng } from '../rng';
import type { ActionResolution } from './resolve-action';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';

type ResolvedBrokerAccordPreview = Extract<ReturnType<typeof previewBrokerAccord>, { ok: true }>;

export function resolveBrokerAccord(
  state: GameState,
  target: ActionTarget | undefined,
): ActionResolution {
  const preview = previewBrokerAccord(state, target);

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

  const resolvedDelta = mergePressureDeltas(preview.immediateEffects, {
    resources: -preview.cost.resources,
    intel: -preview.cost.intel,
  });
  const activeAccordId = nextActiveAccordId(state, preview.definition.id);
  let next: GameState = {
    ...state,
    pressures: applyPressureDelta(state.pressures, resolvedDelta),
  };

  next = applyFactionMetricDelta(next, preview.faction.id, preview.factionEffectsOnStart, {
    sourceType: 'accord',
    sourceId: activeAccordId,
  });
  next = applyRivalPressureEffects(next, preview);
  next = applyFrontEffects(next, preview);
  next = createLedgerEntries(next, preview);
  next = activateAccord(next, preview, activeAccordId);
  next = appendLog(next, {
    type: 'order_resolved',
    title: `Broker Accord: ${preview.factionName} - ${preview.accordLabel}`,
    body: createResolutionBody(preview, activeAccordId),
    pressureDelta: resolvedDelta,
    tags: ['ACCORD', preview.faction.id, preview.definition.id, activeAccordId],
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

export function applyFactionMetricDelta(
  state: GameState,
  factionId: FactionId,
  delta: FactionMetricDelta,
  context: Pick<FactionInteraction, 'sourceType' | 'sourceId'>,
): GameState {
  const faction = state.factions[factionId];

  if (!faction) {
    return state;
  }

  const standing = clampFactionMetric(faction.standing + (delta.standing ?? 0));
  const suspicion = clampFactionMetric(faction.suspicion + (delta.suspicion ?? 0));
  const obligation = clampFactionMetric(faction.obligation + (delta.obligation ?? 0));
  const changed =
    standing !== faction.standing ||
    suspicion !== faction.suspicion ||
    obligation !== faction.obligation;
  const interaction: FactionInteraction = {
    week: state.week,
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    ...(standing !== faction.standing ? { standingDelta: standing - faction.standing } : {}),
    ...(suspicion !== faction.suspicion ? { suspicionDelta: suspicion - faction.suspicion } : {}),
    ...(obligation !== faction.obligation
      ? { obligationDelta: obligation - faction.obligation }
      : {}),
  };

  return {
    ...state,
    factions: {
      ...state.factions,
      [factionId]: {
        ...faction,
        standing,
        suspicion,
        obligation,
        recentInteractions: changed
          ? [...faction.recentInteractions, interaction].slice(-8)
          : faction.recentInteractions,
      },
    },
  };
}

function applyRivalPressureEffects(
  state: GameState,
  preview: ResolvedBrokerAccordPreview,
): GameState {
  if (preview.rivalPressureEffectsOnStart.length === 0) {
    return state;
  }

  const rivals = { ...state.rivals };

  for (const effect of preview.rivalPressureEffectsOnStart) {
    const rival = rivals[effect.rivalId];

    if (!rival) {
      continue;
    }

    rivals[effect.rivalId] = {
      ...rival,
      pressure: clampPercent(rival.pressure + effect.pressureGain),
    };
  }

  return {
    ...state,
    rivals,
  };
}

function applyFrontEffects(
  state: GameState,
  preview: ResolvedBrokerAccordPreview,
): GameState {
  if (preview.frontEffectsOnStart.length === 0) {
    return state;
  }

  const fronts = { ...state.fronts };

  for (const effect of preview.frontEffectsOnStart) {
    const front = fronts[effect.frontId];

    if (!front) {
      continue;
    }

    fronts[effect.frontId] = {
      ...front,
      exposure: clampFrontExposure(front.exposure + effect.exposureDelta),
    };
  }

  return {
    ...state,
    fronts,
  };
}

function createLedgerEntries(
  state: GameState,
  preview: ResolvedBrokerAccordPreview,
): GameState {
  return preview.ledgerEffectsOnStart.reduce((next, effect) => {
    if (effect.type !== 'create') {
      return next;
    }

    return addLedgerEntry(next, {
      definitionId: effect.definitionId,
      source: {
        type: 'action',
        actionId: 'broker_accord',
        target: preview.target,
      },
      relatedFactionId: effect.relatedFactionId ?? preview.faction.id,
    });
  }, state);
}

function activateAccord(
  state: GameState,
  preview: ResolvedBrokerAccordPreview,
  activeAccordId: ActiveAccordId,
): GameState {
  const faction = state.factions[preview.faction.id];

  if (!faction) {
    return state;
  }

  const activeAccord: ActiveAccord = {
    id: activeAccordId,
    definitionId: preview.definition.id,
    factionId: preview.faction.id,
    startedWeek: state.week,
    remainingWeeks: preview.definition.durationWeeks,
    firstWeeklyEffectWeek: state.week + 1,
    source: {
      type: 'broker_accord',
    },
  };

  return {
    ...state,
    activeAccords: {
      ...state.activeAccords,
      [activeAccordId]: activeAccord,
    },
    factions: {
      ...state.factions,
      [preview.faction.id]: {
        ...faction,
        usedAccordIds: [...new Set([...faction.usedAccordIds, preview.definition.id])],
        activeAccordIds: [...new Set([...faction.activeAccordIds, activeAccordId])],
      },
    },
  };
}

function nextActiveAccordId(state: GameState, accordId: AccordId): ActiveAccordId {
  const prefix = `active_${accordId}_`;
  const maxExistingId = Object.keys(state.activeAccords).reduce((max, id) => {
    if (!id.startsWith(prefix)) {
      return max;
    }

    const suffix = Number.parseInt(id.slice(prefix.length), 10);
    return Number.isNaN(suffix) ? max : Math.max(max, suffix);
  }, 0);

  return createActiveAccordId(accordId, maxExistingId + 1);
}

function createResolutionBody(
  preview: ResolvedBrokerAccordPreview,
  activeAccordId: ActiveAccordId,
): string {
  const costs = formatPressureDelta({
    resources: -preview.cost.resources,
    intel: -preview.cost.intel,
  });
  const immediate = formatPressureDelta(preview.immediateEffects);
  const faction = formatFactionDelta(preview.factionEffectsOnStart);
  const weekly = formatPressureDelta(preview.weeklyEffects);
  const ledger =
    preview.ledgerEffectsOnStart.length > 0
      ? ` Ledger: ${preview.ledgerEffectsOnStart.map((effect) => effect.entryName).join(', ')}.`
      : '';
  const rivals =
    preview.rivalPressureEffectsOnStart.length > 0
      ? ` Rival pressure: ${preview.rivalPressureEffectsOnStart
          .map((effect) => `${effect.rivalName} +${effect.pressureGain}`)
          .join(', ')}.`
      : '';
  const fronts =
    preview.frontEffectsOnStart.length > 0
      ? ` Fronts: ${preview.frontEffectsOnStart
          .map((effect) => `${effect.frontName} Exposure ${effect.exposureDelta}`)
          .join(', ')}.`
      : '';

  return [
    `${preview.accordLabel} is active as ${activeAccordId}.`,
    costs ? `Cost: ${costs}.` : '',
    immediate ? `Immediate: ${immediate}.` : '',
    weekly ? `${preview.timingLabel}: ${weekly} / Week.` : preview.timingLabel ?? '',
    faction ? `Faction: ${faction}.` : '',
    ledger,
    rivals,
    fronts,
  ]
    .filter(Boolean)
    .join(' ');
}

function appendBlockedLog(state: GameState, reason: string): GameState {
  return appendLog(state, {
    type: 'complication',
    title: 'Broker Accord Blocked',
    body: `Broker Accord could not resolve: ${reason}.`,
    tags: ['ACCORD', 'BLOCKED', reason],
  });
}

function formatPressureDelta(delta: PressureDelta): string {
  return Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([id, value]) => `${signed(value)} ${formatToken(id)}`)
    .join(', ');
}

function formatFactionDelta(delta: FactionMetricDelta): string {
  return Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([id, value]) => `${signed(value)} ${formatToken(id)}`)
    .join(', ');
}

function signed(value: number | undefined): string {
  const safeValue = value ?? 0;
  return safeValue > 0 ? `+${safeValue}` : `${safeValue}`;
}

function formatToken(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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
