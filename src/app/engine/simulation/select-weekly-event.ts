import { DISTRICT_ZERO_EVENTS } from '../content';
import type {
  DistrictId,
  EventDefinition,
  EventTag,
  GameEventInstance,
  GameState,
  RivalId,
} from '../model';
import { createRng, nextInt, type RngState } from '../rng';
import { resolveTargetDistrictId } from '../selectors';

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
  diagnostics: EventWeightDiagnostics;
};

export type WeightedEvent = {
  event: EventDefinition;
  weight: number;
  diagnostics: EventWeightDiagnostics;
};

export type EventWeightContext = {
  recentTargetTags: Set<string>;
  recentRivalIds: Set<RivalId>;
  recentDistrictIds: Set<DistrictId>;
  rivalPressures: Record<RivalId, number>;
  districtHeat: Record<DistrictId, number>;
};

export type EventWeightModifierId =
  | 'recent_nightlife'
  | 'recent_violence'
  | 'recent_memory'
  | 'nyx_pressure'
  | 'knox_pressure'
  | 'recent_high_local_heat';

export type EventWeightModifier = {
  id: EventWeightModifierId;
  amount: number;
};

export type EventWeightDiagnostics = {
  baseAndRuleWeight: number;
  contextModifiers: EventWeightModifier[];
  weightBeforePenalty: number;
  recentPenaltyApplied: boolean;
  finalWeight: number;
};

export function selectWeeklyEvent(state: GameState): EventSelection {
  const weightedEvents = getWeightedEvents(state);
  const totalWeight = weightedEvents.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, totalWeight);
  let cursor = roll.value;

  for (const candidate of weightedEvents) {
    cursor -= candidate.weight;

    if (cursor <= 0) {
      return createSelection(state, candidate, roll.rng);
    }
  }

  const fallback = weightedEvents[weightedEvents.length - 1];

  if (!fallback) {
    throw new Error('No weekly events are available.');
  }

  return createSelection(state, fallback, roll.rng);
}

export function getWeightedEvents(state: GameState): WeightedEvent[] {
  const context = buildEventWeightContext(state);
  const recentPenaltyTags = getRecentPenaltyTags(state);

  return DISTRICT_ZERO_EVENTS.map((event) =>
    calculateWeightedEvent(state, event, context, recentPenaltyTags),
  ).filter((candidate) => candidate.weight > 0);
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

export function buildEventWeightContext(state: GameState): EventWeightContext {
  const recentTargetTags = new Set<string>();
  const recentRivalIds = new Set<RivalId>();
  const recentDistrictIds = new Set<DistrictId>();

  for (const activity of state.recentActivity) {
    for (const tag of activity.targetTags) {
      recentTargetTags.add(tag);
    }

    if (activity.rivalId) {
      recentRivalIds.add(activity.rivalId);
    }

    const districtId = resolveTargetDistrictId(activity.target);

    if (districtId) {
      recentDistrictIds.add(districtId);
    }
  }

  return {
    recentTargetTags,
    recentRivalIds,
    recentDistrictIds,
    rivalPressures: {
      rival_nyx_ardent: state.rivals.rival_nyx_ardent.pressure,
      rival_knox_marrow: state.rivals.rival_knox_marrow.pressure,
    },
    districtHeat: {
      district_violet_ward: state.districts.district_violet_ward.heat,
      district_chrome_narrows: state.districts.district_chrome_narrows.heat,
      district_ghostline_market: state.districts.district_ghostline_market.heat,
    },
  };
}

function calculateWeightedEvent(
  state: GameState,
  event: EventDefinition,
  context: EventWeightContext,
  recentPenaltyTags: Set<EventTag>,
): WeightedEvent {
  const baseAndRuleWeight = calculateEventWeight(state, event);
  const contextModifiers = getContextModifiers(event, context);
  const weightBeforePenalty = Math.max(
    0,
    baseAndRuleWeight + contextModifiers.reduce((sum, modifier) => sum + modifier.amount, 0),
  );
  const recentPenaltyApplied = event.tags.some((tag) => recentPenaltyTags.has(tag));
  const finalWeight = applyRecentPenalty(weightBeforePenalty, event, recentPenaltyTags);

  return {
    event,
    weight: finalWeight,
    diagnostics: {
      baseAndRuleWeight,
      contextModifiers,
      weightBeforePenalty,
      recentPenaltyApplied,
      finalWeight,
    },
  };
}

function getContextModifiers(
  event: EventDefinition,
  context: EventWeightContext,
): EventWeightModifier[] {
  const modifiers: EventWeightModifier[] = [];

  if (context.recentTargetTags.has('nightlife') && event.id === 'liaison_favor') {
    modifiers.push({ id: 'recent_nightlife', amount: 8 });
  }

  if (context.recentTargetTags.has('violence') && event.id === 'job_goes_loud') {
    modifiers.push({ id: 'recent_violence', amount: 8 });
  }

  if (
    context.recentTargetTags.has('memory') &&
    (event.id === 'unexpected_windfall' || event.id === 'blackmail_lead')
  ) {
    modifiers.push({ id: 'recent_memory', amount: 8 });
  }

  if (
    context.rivalPressures.rival_nyx_ardent >= 40 &&
    (event.id === 'liaison_favor' || event.id === 'operative_wants_more')
  ) {
    modifiers.push({ id: 'nyx_pressure', amount: 10 });
  }

  if (
    context.rivalPressures.rival_knox_marrow >= 40 &&
    (event.id === 'rival_tests_border' || event.id === 'job_goes_loud')
  ) {
    modifiers.push({ id: 'knox_pressure', amount: 10 });
  }

  const hasRecentHighHeatDistrict = [...context.recentDistrictIds].some(
    (districtId) => context.districtHeat[districtId] >= 60,
  );

  if (hasRecentHighHeatDistrict && event.tags.includes('HEAT')) {
    modifiers.push({ id: 'recent_high_local_heat', amount: 4 });
  }

  return modifiers;
}

function createSelection(
  state: GameState,
  selected: WeightedEvent,
  rng: RngState,
): EventSelection {
  return {
    definition: selected.event,
    rng,
    diagnostics: selected.diagnostics,
    event: {
      id: `event_${state.week}_${rng.cursor}`,
      definitionId: selected.event.id,
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
