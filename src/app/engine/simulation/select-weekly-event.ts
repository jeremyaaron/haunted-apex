import { DISTRICT_ZERO_EVENTS } from '../content';
import type { EventDefinition, EventTag, GameEventInstance, GameState } from '../model';
import { createRng, nextInt, type RngState } from '../rng';

const MAJOR_NEGATIVE_TAGS = new Set<EventTag>([
  'HEAT',
  'LOYALTY',
  'RESOURCE',
  'VIOLENCE',
  'SAFEHOUSE',
]);

export type EventSelection = {
  event: GameEventInstance;
  definition: EventDefinition;
  rng: RngState;
};

export type WeightedEvent = {
  event: EventDefinition;
  weight: number;
};

export function selectWeeklyEvent(state: GameState): EventSelection {
  const weightedEvents = getWeightedEvents(state);
  const totalWeight = weightedEvents.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, totalWeight);
  let cursor = roll.value;

  for (const candidate of weightedEvents) {
    cursor -= candidate.weight;

    if (cursor <= 0) {
      return createSelection(state, candidate.event, roll.rng);
    }
  }

  const fallback = weightedEvents[weightedEvents.length - 1];

  if (!fallback) {
    throw new Error('No weekly events are available.');
  }

  return createSelection(state, fallback.event, roll.rng);
}

export function getWeightedEvents(state: GameState): WeightedEvent[] {
  const recentPenaltyTags = getRecentPenaltyTags(state);

  return DISTRICT_ZERO_EVENTS.map((event) => ({
    event,
    weight: applyRecentPenalty(calculateEventWeight(state, event), event, recentPenaltyTags),
  })).filter((candidate) => candidate.weight > 0);
}

export function calculateEventWeight(state: GameState, event: EventDefinition): number {
  const ruleWeight = event.weightRules?.reduce((weight, rule) => {
    if (rule.flag && state.flags[rule.flag] !== true) {
      return weight;
    }

    if (rule.pressure) {
      const value = state.pressures[rule.pressure];

      if (rule.min !== undefined && value < rule.min) {
        return weight;
      }

      if (rule.max !== undefined && value > rule.max) {
        return weight;
      }
    }

    return weight + rule.addWeight;
  }, 0);

  return Math.max(0, event.baseWeight + (ruleWeight ?? 0));
}

function createSelection(
  state: GameState,
  definition: EventDefinition,
  rng: RngState,
): EventSelection {
  return {
    definition,
    rng,
    event: {
      id: `event_${state.week}_${rng.cursor}`,
      definitionId: definition.id,
      week: state.week,
    },
  };
}

function getRecentPenaltyTags(state: GameState): Set<EventTag> {
  const recentPresentedEvents = state.eventLog
    .filter((entry) => entry.type === 'event_presented')
    .slice(-2);

  if (recentPresentedEvents.length < 2) {
    return new Set();
  }

  const [first, second] = recentPresentedEvents.map((entry) => new Set(entry.tags ?? []));
  const shared = new Set<EventTag>();

  for (const tag of MAJOR_NEGATIVE_TAGS) {
    if (first?.has(tag) && second?.has(tag)) {
      shared.add(tag);
    }
  }

  return shared;
}

function applyRecentPenalty(
  weight: number,
  event: EventDefinition,
  recentPenaltyTags: Set<EventTag>,
): number {
  if (!event.tags.some((tag) => recentPenaltyTags.has(tag))) {
    return weight;
  }

  return Math.max(1, Math.floor(weight * 0.5));
}

