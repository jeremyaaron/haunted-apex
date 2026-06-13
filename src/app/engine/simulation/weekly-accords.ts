import { getAccordDefinition, getFactionDefinition } from '../content';
import type {
  AccordDefinition,
  ActiveAccord,
  ActiveAccordId,
  FactionMetricDelta,
  GameLogEntry,
  GameState,
  PressureDelta,
} from '../model';
import { applyFactionMetricDelta } from './faction-effects';
import { applyPressureDelta, mergePressureDeltas } from './pressure-delta';

type AccordTick = {
  activeAccord: ActiveAccord;
  definition: AccordDefinition;
  pressureDelta: PressureDelta;
  factionDelta: FactionMetricDelta;
  remainingWeeks: number;
};

type AccordExpiration = {
  activeAccord: ActiveAccord;
  definition: AccordDefinition;
};

export function applyWeeklyAccordEffects(state: GameState): GameState {
  const activeAccords = Object.values(state.activeAccords).sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  if (activeAccords.length === 0) {
    return state;
  }

  let next = state;
  const ticks: AccordTick[] = [];
  const expirations: AccordExpiration[] = [];

  for (const activeAccord of activeAccords) {
    const definition = getAccordDefinition(activeAccord.definitionId);

    if (!definition || !shouldApplyWeeklyTick(state.week, activeAccord, definition)) {
      continue;
    }

    const tick: AccordTick = {
      activeAccord,
      definition,
      pressureDelta: { ...(definition.weeklyEffects ?? {}) },
      factionDelta: { ...(definition.factionEffectsPerWeek ?? {}) },
      remainingWeeks: Math.max(0, activeAccord.remainingWeeks - 1),
    };

    ticks.push(tick);
    next = applyFactionMetricDelta(next, activeAccord.factionId, tick.factionDelta, {
      sourceType: 'accord',
      sourceId: activeAccord.id,
    });

    if (tick.remainingWeeks === 0) {
      expirations.push({ activeAccord, definition });
      continue;
    }

    next = updateActiveAccord(next, activeAccord.id, {
      ...activeAccord,
      remainingWeeks: tick.remainingWeeks,
    });
  }

  if (ticks.length === 0) {
    return state;
  }

  const pressureDelta = mergePressureDeltas(...ticks.map((tick) => tick.pressureDelta));

  if (Object.keys(pressureDelta).length > 0) {
    next = {
      ...next,
      pressures: applyPressureDelta(next.pressures, pressureDelta),
    };
  }

  next = appendLog(next, {
    type: 'accord',
    title: 'Accord Weekly Effects',
    body: ticks.map(createTickSummary).join(' '),
    ...(Object.keys(pressureDelta).length > 0 ? { pressureDelta } : {}),
    tags: [
      'ACCORD',
      'WEEKLY',
      ...ticks.flatMap((tick) => [
        tick.activeAccord.id,
        tick.definition.id,
        tick.activeAccord.factionId,
      ]),
    ],
  });

  for (const expiration of expirations) {
    next = expireAccord(next, expiration.activeAccord, expiration.definition);
  }

  return next;
}

export function shouldApplyWeeklyTick(
  week: number,
  activeAccord: ActiveAccord,
  definition: AccordDefinition,
): boolean {
  if (activeAccord.remainingWeeks <= 0) {
    return false;
  }

  const elapsedTicks = Math.max(0, definition.durationWeeks - activeAccord.remainingWeeks);
  const nextTickWeek = activeAccord.firstWeeklyEffectWeek + elapsedTicks;

  return week >= nextTickWeek;
}

function updateActiveAccord(
  state: GameState,
  activeAccordId: ActiveAccordId,
  activeAccord: ActiveAccord,
): GameState {
  return {
    ...state,
    activeAccords: {
      ...state.activeAccords,
      [activeAccordId]: activeAccord,
    },
  };
}

function expireAccord(
  state: GameState,
  activeAccord: ActiveAccord,
  definition: AccordDefinition,
): GameState {
  let next = applyFactionMetricDelta(
    state,
    activeAccord.factionId,
    definition.factionEffectsOnExpire ?? {},
    {
      sourceType: 'accord',
      sourceId: activeAccord.id,
    },
  );
  const activeAccords = { ...next.activeAccords };
  delete activeAccords[activeAccord.id];
  const faction = next.factions[activeAccord.factionId];

  next = {
    ...next,
    activeAccords,
    factions: faction
      ? {
          ...next.factions,
          [activeAccord.factionId]: {
            ...faction,
            activeAccordIds: faction.activeAccordIds.filter((id) => id !== activeAccord.id),
          },
        }
      : next.factions,
  };

  return appendLog(next, {
    type: 'accord',
    title: `Accord Expired: ${getFactionName(activeAccord.factionId)} - ${definition.label}`,
    body: createExpirationSummary(activeAccord, definition),
    tags: ['ACCORD', 'EXPIRED', activeAccord.id, definition.id, activeAccord.factionId],
  });
}

function createTickSummary(tick: AccordTick): string {
  const pressure = formatPressureDelta(tick.pressureDelta);
  const faction = formatFactionDelta(tick.factionDelta);
  const pressureText = pressure ? ` ${pressure}.` : '';
  const factionText = faction ? ` Faction: ${faction}.` : '';
  const weeks = tick.remainingWeeks === 1 ? '1 week' : `${tick.remainingWeeks} weeks`;

  return `${getFactionName(tick.activeAccord.factionId)} - ${tick.definition.label}:` +
    `${pressureText}${factionText} ${weeks} remaining.`;
}

function createExpirationSummary(
  activeAccord: ActiveAccord,
  definition: AccordDefinition,
): string {
  const faction = formatFactionDelta(definition.factionEffectsOnExpire ?? {});
  const factionText = faction ? ` Faction: ${faction}.` : '';

  return `${definition.label} closes after its final tick.${factionText}`;
}

function getFactionName(factionId: ActiveAccord['factionId']): string {
  return getFactionDefinition(factionId)?.name ?? factionId;
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
