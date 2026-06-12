import { getFrontDefinition } from '../content';
import type {
  EventDefinition,
  FrontId,
  FrontRoleTag,
  FrontState,
  GameState,
  RivalId,
} from '../model';
import { nextInt, type RngState } from '../rng';

export type FrontEventEligibilityDiagnostics = {
  eligible: boolean;
  eligibleFrontIds: FrontId[];
  maxExposure: number;
};

export type FrontEventSelection = {
  frontId?: FrontId;
  rng: RngState;
};

export function getFrontEventEligibility(
  state: GameState,
  event: EventDefinition,
): FrontEventEligibilityDiagnostics {
  if (!event.front) {
    return {
      eligible: true,
      eligibleFrontIds: [],
      maxExposure: 0,
    };
  }

  const eligibleFrontIds = getFrontStates(state)
    .filter((front) => frontIsEligibleForEvent(state, event, front))
    .map((front) => front.id);
  const maxExposure = Math.max(
    0,
    ...eligibleFrontIds.map((frontId) => state.fronts[frontId]?.exposure ?? 0),
  );

  return {
    eligible: eligibleFrontIds.length > 0,
    eligibleFrontIds,
    maxExposure,
  };
}

export function selectFrontForEvent(
  state: GameState,
  event: EventDefinition,
  rng: RngState,
): FrontEventSelection {
  if (!event.front) {
    return { rng };
  }

  const eligibleFronts = getFrontStates(state).filter((front) =>
    frontIsEligibleForEvent(state, event, front),
  );
  const weightedFronts = eligibleFronts
    .map((front) => ({
      front,
      weight: getFrontEventTargetWeight(state, event, front),
    }))
    .filter((candidate) => candidate.weight > 0);

  if (weightedFronts.length === 0) {
    return { rng };
  }

  const totalWeight = weightedFronts.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = nextInt(rng, 1, totalWeight);
  let cursor = roll.value;

  for (const candidate of weightedFronts) {
    cursor -= candidate.weight;

    if (cursor <= 0) {
      return {
        frontId: candidate.front.id,
        rng: roll.rng,
      };
    }
  }

  return {
    frontId: weightedFronts[weightedFronts.length - 1]?.front.id,
    rng: roll.rng,
  };
}

export function getFrontEventTargetWeight(
  state: GameState,
  event: EventDefinition,
  front: FrontState,
): number {
  if (!frontIsEligibleForEvent(state, event, front)) {
    return 0;
  }

  let weight = 10 + front.exposure;

  if (front.exposure >= 80) {
    weight += 20;
  }

  if (event.id === 'front_rival_leans_on_your_front' && front.relatedRivalId) {
    weight += 10;
  }

  if (front.level === 2) {
    weight += 10;
  }

  if (state.week - front.establishedWeek <= 1) {
    weight += 5;
  }

  return weight;
}

export function resolveSelectedFrontRivalId(state: GameState): RivalId | undefined {
  const selectedFront = getSelectedFront(state);

  return selectedFront?.relatedRivalId;
}

export function getSelectedFrontName(state: GameState): string {
  const selectedFront = getSelectedFront(state);
  const selectedDefinition = selectedFront ? getFrontDefinition(selectedFront.definitionId) : undefined;

  return selectedDefinition?.name ?? 'Front';
}

export function getSelectedFront(state: GameState): FrontState | undefined {
  const selectedFrontId = state.pendingEvent?.selectedFrontId;

  return selectedFrontId ? state.fronts[selectedFrontId] : undefined;
}

function getFrontStates(state: GameState): FrontState[] {
  return Object.values(state.fronts).filter((front): front is FrontState => front !== undefined);
}

function frontIsEligibleForEvent(
  state: GameState,
  event: EventDefinition,
  front: FrontState,
): boolean {
  const frontEvent = event.front;

  if (!frontEvent || !front.active || front.compromised) {
    return false;
  }

  const definition = getFrontDefinition(front.definitionId);

  if (!definition || !definition.eventIds.includes(event.id)) {
    return false;
  }

  if (frontEvent.minExposure !== undefined && front.exposure < frontEvent.minExposure) {
    return false;
  }

  if (frontEvent.roleTags && !hasAnyRoleTag(definition.roleTags, frontEvent.roleTags)) {
    return false;
  }

  if (frontEvent.requiresRelatedRival && !front.relatedRivalId) {
    return false;
  }

  if (
    frontEvent.minRelatedRivalPressure !== undefined &&
    (!front.relatedRivalId ||
      state.rivals[front.relatedRivalId].pressure < frontEvent.minRelatedRivalPressure)
  ) {
    return false;
  }

  return true;
}

function hasAnyRoleTag(
  candidateTags: readonly FrontRoleTag[],
  requiredTags: readonly FrontRoleTag[],
): boolean {
  return requiredTags.some((tag) => candidateTags.includes(tag));
}
