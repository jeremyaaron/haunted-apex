import { getFactionDefinition } from '../content';
import type {
  EventChoiceDefinition,
  EventChoiceFactionEffect,
  EventDefinition,
  FactionId,
  FactionMetricDelta,
  FactionState,
  GameState,
  RivalId,
} from '../model';
import { nextInt, type RngState } from '../rng';

export type FactionEventEligibilityDiagnostics = {
  eligible: boolean;
  eligibleFactionIds: FactionId[];
  maxStanding: number;
  maxSuspicion: number;
  maxObligation: number;
  maxAssociatedRivalPressure: number;
  activeAccordCount: number;
};

export type FactionEventSelection = {
  factionId?: FactionId;
  rng: RngState;
};

export type FactionEffectPreviewRow = {
  factionId: FactionId;
  factionName: string;
  id: keyof FactionMetricDelta;
  value: number;
};

export function getFactionEventEligibility(
  state: GameState,
  event: EventDefinition,
): FactionEventEligibilityDiagnostics {
  if (!event.faction) {
    return emptyEligibility(true);
  }

  const eligibleFactionIds = state.activeFactionIds.filter((factionId) =>
    factionIsEligibleForEvent(state, event, factionId),
  );
  const eligibleFactions = eligibleFactionIds.flatMap((factionId) => {
    const faction = state.factions[factionId];
    return faction ? [faction] : [];
  });

  return {
    eligible: eligibleFactionIds.length > 0,
    eligibleFactionIds,
    maxStanding: Math.max(0, ...eligibleFactions.map((faction) => faction.standing)),
    maxSuspicion: Math.max(0, ...eligibleFactions.map((faction) => faction.suspicion)),
    maxObligation: Math.max(0, ...eligibleFactions.map((faction) => faction.obligation)),
    maxAssociatedRivalPressure: Math.max(
      0,
      ...eligibleFactionIds.map((factionId) => getAssociatedRivalPressure(state, factionId)),
    ),
    activeAccordCount: eligibleFactions.reduce(
      (count, faction) => count + faction.activeAccordIds.length,
      0,
    ),
  };
}

export function selectFactionForEvent(
  state: GameState,
  event: EventDefinition,
  rng: RngState,
): FactionEventSelection {
  if (!event.faction) {
    return { rng };
  }

  const weightedFactions = getFactionEventEligibility(state, event)
    .eligibleFactionIds.map((factionId) => ({
      factionId,
      weight: getFactionEventTargetWeight(state, event, factionId),
    }))
    .filter((candidate) => candidate.weight > 0);

  if (weightedFactions.length === 0) {
    return { rng };
  }

  const totalWeight = weightedFactions.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = nextInt(rng, 1, totalWeight);
  let cursor = roll.value;

  for (const candidate of weightedFactions) {
    cursor -= candidate.weight;

    if (cursor <= 0) {
      return {
        factionId: candidate.factionId,
        rng: roll.rng,
      };
    }
  }

  return {
    factionId: weightedFactions[weightedFactions.length - 1]?.factionId,
    rng: roll.rng,
  };
}

export function getFactionEventTargetWeight(
  state: GameState,
  event: EventDefinition,
  factionId: FactionId,
): number {
  if (!factionIsEligibleForEvent(state, event, factionId)) {
    return 0;
  }

  const faction = state.factions[factionId];

  if (!event.faction || !faction) {
    return 0;
  }

  switch (event.faction.kind) {
    case 'demand':
      return 10 + faction.obligation + (faction.obligation >= 70 ? 25 : 0);
    case 'scrutiny':
      return 10 + faction.suspicion + (faction.suspicion >= 70 ? 20 : 0);
    case 'accord_terms_shift':
      return (
        15 +
        faction.activeAccordIds.length * 20 +
        (faction.obligation >= 40 ? 10 : 0) +
        (faction.suspicion >= 50 ? 10 : 0)
      );
    case 'market_access':
      return 10 + faction.standing;
    case 'proxy_conflict':
      return 10 + getAssociatedRivalPressure(state, factionId) + (faction.standing >= 45 ? 10 : 0);
    case 'institutional_blind_spot':
      return 10 + faction.standing + Math.max(0, 45 - faction.suspicion);
  }
}

export function resolveSelectedFactionRivalId(state: GameState): RivalId | undefined {
  const selectedFactionId = state.pendingEvent?.selectedFactionId;
  const definition = selectedFactionId ? getFactionDefinition(selectedFactionId) : undefined;

  return definition?.associatedRivalIds
    ?.filter((rivalId) => state.rivals[rivalId])
    .sort(
      (left, right) =>
        state.rivals[right].pressure - state.rivals[left].pressure || left.localeCompare(right),
    )[0];
}

export function getSelectedFactionName(state: GameState): string {
  const selectedFactionId = state.pendingEvent?.selectedFactionId;

  return selectedFactionId
    ? getFactionDefinition(selectedFactionId)?.name ?? selectedFactionId
    : 'Faction';
}

export function previewEventFactionEffects(
  state: GameState,
  choice: EventChoiceDefinition,
): FactionEffectPreviewRow[] {
  return getEventFactionEffectRows(state, choice).flatMap(({ factionId, delta }) => {
    const factionName = getFactionDefinition(factionId)?.name ?? factionId;

    return normalizeFactionDelta(delta).map((row) => ({
      factionId,
      factionName,
      ...row,
    }));
  });
}

export function getEventFactionEffectRows(
  state: GameState,
  choice: EventChoiceDefinition,
): { factionId: FactionId; delta: FactionMetricDelta }[] {
  if (!choice.factionEffects) {
    return [];
  }

  if (isFactionEffectArray(choice.factionEffects)) {
    return choice.factionEffects.flatMap((effect) => {
      const factionId = effect.factionId ?? state.pendingEvent?.selectedFactionId;

      return factionId ? [{ factionId, delta: effect.delta }] : [];
    });
  }

  const selectedFactionId = state.pendingEvent?.selectedFactionId;

  return selectedFactionId ? [{ factionId: selectedFactionId, delta: choice.factionEffects }] : [];
}

function isFactionEffectArray(
  effects: NonNullable<EventChoiceDefinition['factionEffects']>,
): effects is readonly EventChoiceFactionEffect[] {
  return Array.isArray(effects);
}

function factionIsEligibleForEvent(
  state: GameState,
  event: EventDefinition,
  factionId: FactionId,
): boolean {
  if (!event.faction || !state.activeFactionIds.includes(factionId)) {
    return false;
  }

  const faction = state.factions[factionId];

  if (!faction) {
    return false;
  }

  switch (event.faction.kind) {
    case 'demand':
      return faction.obligation >= 50;
    case 'scrutiny':
      return faction.suspicion >= 60;
    case 'accord_terms_shift':
      return faction.activeAccordIds.length > 0;
    case 'market_access':
      return faction.standing >= 65;
    case 'proxy_conflict':
      return getAssociatedRivalPressure(state, factionId) >= 50;
    case 'institutional_blind_spot':
      return faction.standing >= 55 && faction.suspicion <= 45;
  }
}

function getAssociatedRivalPressure(state: GameState, factionId: FactionId): number {
  const definition = getFactionDefinition(factionId);

  return Math.max(
    0,
    ...(definition?.associatedRivalIds ?? []).map((rivalId) => state.rivals[rivalId]?.pressure ?? 0),
  );
}

function normalizeFactionDelta(
  delta: FactionMetricDelta,
): { id: keyof FactionMetricDelta; value: number }[] {
  return (['standing', 'suspicion', 'obligation'] as const).flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0 ? [{ id, value }] : [];
  });
}

function emptyEligibility(eligible: boolean): FactionEventEligibilityDiagnostics {
  return {
    eligible,
    eligibleFactionIds: [],
    maxStanding: 0,
    maxSuspicion: 0,
    maxObligation: 0,
    maxAssociatedRivalPressure: 0,
    activeAccordCount: 0,
  };
}
