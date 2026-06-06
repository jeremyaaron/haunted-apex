import { RIVAL_TERRITORY_RIVALS } from '../content';
import type { GameLogEntry, GameState, PressureDelta, RivalId } from '../model';
import { applyPressureDelta } from './pressure-delta';

type RivalPassiveEffect = {
  applies: (state: GameState) => boolean;
  title: string;
  body: string;
  pressureDelta: PressureDelta;
  tags: string[];
};

const RIVAL_PASSIVE_EFFECTS: Record<RivalId, RivalPassiveEffect> = {
  rival_nyx_ardent: {
    applies: (state) =>
      state.rivals.rival_nyx_ardent.pressure >= 40 && state.pressures.intel < 20,
    title: 'Nyx Ardent Exploits Uncertainty',
    body: 'Nyx Ardent turns scarce intelligence into whispers through the network.',
    pressureDelta: {
      loyalty: -5,
    },
    tags: ['RIVAL', 'LOYALTY'],
  },
  rival_knox_marrow: {
    applies: (state) => state.rivals.rival_knox_marrow.pressure >= 40,
    title: 'Knox Marrow Escalates',
    body: 'Knox Marrow answers mounting pressure by making the streets louder.',
    pressureDelta: {
      heat: 5,
    },
    tags: ['RIVAL', 'HEAT'],
  },
};

export function applyRivalPassiveEffects(state: GameState): GameState {
  return RIVAL_TERRITORY_RIVALS.reduce((next, rivalDefinition) => {
    const rival = next.rivals[rivalDefinition.id];
    const effect = RIVAL_PASSIVE_EFFECTS[rivalDefinition.id];

    if (!rival.active || hasAppliedThisWeek(next, rival.id) || !effect.applies(next)) {
      return next;
    }

    const logEntry: GameLogEntry = {
      id: `log_${next.week}_${next.eventLog.length + 1}_rival_effect`,
      week: next.week,
      type: 'rival_effect',
      title: effect.title,
      body: effect.body,
      pressureDelta: effect.pressureDelta,
      tags: [...effect.tags, rival.id],
    };

    return {
      ...next,
      pressures: applyPressureDelta(next.pressures, effect.pressureDelta),
      eventLog: [...next.eventLog, logEntry],
    };
  }, state);
}

function hasAppliedThisWeek(state: GameState, rivalId: RivalId): boolean {
  return state.eventLog.some(
    (entry) =>
      entry.week === state.week &&
      entry.type === 'rival_effect' &&
      entry.tags?.includes(rivalId),
  );
}
