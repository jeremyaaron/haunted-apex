import { DISTRICT_ZERO_EVENTS, getLedgerEntryDefinition } from '../content';
import type {
  ContactId,
  DistrictId,
  EventDefinition,
  EventTag,
  GameEventInstance,
  GameState,
  LedgerEntry,
  LedgerEntryKind,
  OperativeEventDefinition,
  RivalId,
} from '../model';
import { createRng, nextInt, type RngState } from '../rng';
import { resolveTargetDistrictId } from '../selectors';
import {
  getOperativeEventEligibility,
  type OperativeEventEligibilityDiagnostics,
} from './operative-events';
import {
  getContactEventEligibility,
  getContactEventRepeatMultiplier,
  selectContactForEvent,
  type ContactEventEligibilityDiagnostics,
} from './contact-events';
import {
  getFrontEventEligibility,
  selectFrontForEvent,
  type FrontEventEligibilityDiagnostics,
} from './front-events';

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
  activeSecrets: number;
  activeDebts: number;
  activeFavors: number;
  oldestDebtAge: number;
  oldestSecretAge: number;
  oldestFavorAge: number;
  ledgerTags: Set<string>;
};

export type EventWeightModifierId =
  | 'recent_nightlife'
  | 'recent_violence'
  | 'recent_memory'
  | 'nyx_pressure'
  | 'knox_pressure'
  | 'recent_high_local_heat'
  | 'operative_eligible'
  | 'operative_stress'
  | 'operative_recent_assignment'
  | 'active_debts'
  | 'old_debt'
  | 'active_secrets'
  | 'leverage_pressure'
  | 'active_favors'
  | 'favor_comeback'
  | 'contact_eligible'
  | 'contact_trusted'
  | 'contact_pressured'
  | 'contact_volatile'
  | 'contact_exposed'
  | 'contact_recent_interaction'
  | 'front_eligible'
  | 'front_exposed'
  | 'front_hot'
  | 'front_level_2';

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
  operativeEligibility?: OperativeEventEligibilityDiagnostics;
  contactEligibility?: ContactEventEligibilityDiagnostics;
  frontEligibility?: FrontEventEligibilityDiagnostics;
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

  return DISTRICT_ZERO_EVENTS.filter((event) => isEligibleEvent(state, event))
    .map((event) => calculateWeightedEvent(state, event, context, recentPenaltyTags))
    .filter((candidate) => candidate.weight > 0);
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
  const activeLedgerEntries = state.ledger.entries.filter((entry) => !entry.consumed);
  const activeSecrets = activeLedgerEntries.filter((entry) => entry.kind === 'secret');
  const activeDebts = activeLedgerEntries.filter((entry) => entry.kind === 'debt');
  const activeFavors = activeLedgerEntries.filter((entry) => entry.kind === 'favor');
  const ledgerTags = new Set<string>();

  for (const entry of activeLedgerEntries) {
    const definition = getLedgerDefinition(entry);

    for (const tag of definition?.tags ?? []) {
      ledgerTags.add(tag);
    }
  }

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
    activeSecrets: activeSecrets.length,
    activeDebts: activeDebts.length,
    activeFavors: activeFavors.length,
    oldestDebtAge: getOldestLedgerAge(state, activeDebts),
    oldestSecretAge: getOldestLedgerAge(state, activeSecrets),
    oldestFavorAge: getOldestLedgerAge(state, activeFavors),
    ledgerTags,
  };
}

function calculateWeightedEvent(
  state: GameState,
  event: EventDefinition,
  context: EventWeightContext,
  recentPenaltyTags: Set<EventTag>,
): WeightedEvent {
  const baseAndRuleWeight = calculateEventWeight(state, event);
  const contextModifiers = getContextModifiers(state, event, context);
  const weightBeforePenalty = Math.max(
    0,
    baseAndRuleWeight + contextModifiers.reduce((sum, modifier) => sum + modifier.amount, 0),
  );
  const recentPenaltyApplied = event.tags.some((tag) => recentPenaltyTags.has(tag));
  const finalWeight = Math.max(
    0,
    Math.floor(
      applyRecentPenalty(weightBeforePenalty, event, recentPenaltyTags) *
        getContactEventRepeatMultiplier(state, event),
    ),
  );

  return {
    event,
    weight: finalWeight,
    diagnostics: {
      baseAndRuleWeight,
      contextModifiers,
      weightBeforePenalty,
      recentPenaltyApplied,
      finalWeight,
      ...(event.kind === 'operative'
        ? { operativeEligibility: getOperativeEventEligibility(state, event) }
        : {}),
      ...(event.contact
        ? { contactEligibility: getContactEventEligibility(state, event) }
        : {}),
      ...(event.front
        ? { frontEligibility: getFrontEventEligibility(state, event) }
        : {}),
    },
  };
}

function getContextModifiers(
  state: GameState,
  event: EventDefinition,
  context: EventWeightContext,
): EventWeightModifier[] {
  const modifiers: EventWeightModifier[] = [];

  if (event.kind === 'operative') {
    const operative = state.operatives.find((candidate) => candidate.id === event.operativeId);
    modifiers.push({ id: 'operative_eligible', amount: 0 });

    if (operative?.stress !== undefined && operative.stress >= 60) {
      modifiers.push({ id: 'operative_stress', amount: 2 });
    }

    if (operative && operative.recentAssignments.length > 0) {
      modifiers.push({ id: 'operative_recent_assignment', amount: 2 });
    }
  }

  if (event.contact) {
    const contactIds = getContactEventEligibility(state, event).eligibleContactIds;
    modifiers.push({ id: 'contact_eligible', amount: 0 });

    for (const contactId of contactIds) {
      const contact = state.contacts[contactId];

      if (!contact) {
        continue;
      }

      if (contact.trust >= 55) {
        modifiers.push({ id: 'contact_trusted', amount: 2 });
      }

      if (contact.leverage >= 45) {
        modifiers.push({ id: 'contact_pressured', amount: 2 });
      }

      if (contact.volatility >= 60) {
        modifiers.push({ id: 'contact_volatile', amount: 3 });
      }

      if (contact.exposure >= 55) {
        modifiers.push({ id: 'contact_exposed', amount: 2 });
      }

      if (contact.recentInteractions.some((interaction) => interaction.week >= state.week - 2)) {
        modifiers.push({ id: 'contact_recent_interaction', amount: 3 });
      }
    }
  }

  if (event.front) {
    const frontEligibility = getFrontEventEligibility(state, event);
    const eligibleFronts = Object.values(state.fronts).filter(
      (front) => front && frontEligibility.eligibleFrontIds.includes(front.id),
    );
    modifiers.push({ id: 'front_eligible', amount: 0 });

    if (frontEligibility.maxExposure >= 60) {
      modifiers.push({ id: 'front_exposed', amount: 2 });
    }

    if (frontEligibility.maxExposure >= 80) {
      modifiers.push({ id: 'front_hot', amount: 3 });
    }

    if (eligibleFronts.some((front) => front.level === 2)) {
      modifiers.push({ id: 'front_level_2', amount: 2 });
    }
  }

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

  if (event.id === 'ledger_debt_comes_due' && context.activeDebts > 0) {
    modifiers.push({ id: 'active_debts', amount: Math.min(14, 8 + context.activeDebts * 3) });

    if (context.oldestDebtAge >= 2) {
      modifiers.push({ id: 'old_debt', amount: Math.min(12, context.oldestDebtAge * 3) });
    }

    if (state.pressures.heat >= 60 || state.pressures.loyalty <= 45) {
      modifiers.push({ id: 'leverage_pressure', amount: 6 });
    }
  }

  if (event.id === 'ledger_leverage_window' && context.activeSecrets > 0) {
    modifiers.push({
      id: 'active_secrets',
      amount: Math.min(9, 4 + context.activeSecrets * 2),
    });

    if (context.oldestSecretAge >= 2 || state.pressures.dominion < 45 || state.pressures.heat >= 65) {
      modifiers.push({ id: 'leverage_pressure', amount: 5 });
    }
  }

  if (event.id === 'ledger_favor_returned' && context.activeFavors > 0) {
    modifiers.push({ id: 'active_favors', amount: Math.min(8, 3 + context.activeFavors * 2) });

    if (state.pressures.heat >= 65 || state.pressures.loyalty <= 40 || state.pressures.resources <= 1000) {
      modifiers.push({ id: 'favor_comeback', amount: 6 });
    }
  }

  return modifiers;
}

function isEligibleEvent(state: GameState, event: EventDefinition): boolean {
  if (event.contact && !getContactEventEligibility(state, event).eligible) {
    return false;
  }

  if (event.front && !getFrontEventEligibility(state, event).eligible) {
    return false;
  }

  if (event.kind !== 'operative') {
    return true;
  }

  return isEligibleOperativeEvent(state, event);
}

function isEligibleOperativeEvent(state: GameState, event: OperativeEventDefinition): boolean {
  return getOperativeEventEligibility(state, event).eligible;
}

function createSelection(
  state: GameState,
  selected: WeightedEvent,
  rng: RngState,
): EventSelection {
  const selectedLedgerEntry = selectLedgerEntryForEvent(state, selected.event);
  const selectedContactId = selectContactForEvent(state, selected.event);
  const selectedFront = selectFrontForEvent(state, selected.event, rng);

  return {
    definition: selected.event,
    rng: selectedFront.rng,
    diagnostics: selected.diagnostics,
    event: {
      id: `event_${state.week}_${selectedFront.rng.cursor}`,
      definitionId: selected.event.id,
      week: state.week,
      ...(selectedLedgerEntry ? { selectedLedgerEntryId: selectedLedgerEntry.id } : {}),
      ...(selectedContactId ? { selectedContactId } : {}),
      ...(selectedFront.frontId ? { selectedFrontId: selectedFront.frontId } : {}),
    },
  };
}

function selectLedgerEntryForEvent(
  state: GameState,
  event: EventDefinition,
): LedgerEntry | undefined {
  switch (event.id) {
    case 'ledger_debt_comes_due':
      return selectOldestActiveLedgerEntry(state, 'debt');
    case 'ledger_leverage_window':
      return selectOldestActiveLedgerEntry(state, 'secret');
    case 'ledger_favor_returned':
      return selectOldestActiveLedgerEntry(state, 'favor');
    default:
      return undefined;
  }
}

function selectOldestActiveLedgerEntry(
  state: GameState,
  kind: LedgerEntryKind,
): LedgerEntry | undefined {
  return state.ledger.entries
    .filter((entry) => entry.kind === kind && !entry.consumed)
    .sort((left, right) => left.createdWeek - right.createdWeek || left.id.localeCompare(right.id))[0];
}

function getOldestLedgerAge(state: GameState, entries: readonly LedgerEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  return Math.max(...entries.map((entry) => Math.max(0, state.week - entry.createdWeek)));
}

function getLedgerDefinition(entry: LedgerEntry) {
  return getLedgerEntryDefinition(entry.definitionId);
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
