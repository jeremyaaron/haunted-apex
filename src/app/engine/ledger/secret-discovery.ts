import {
  getDistrictDefinition,
  getRivalDefinition,
  getVenueDefinition,
  LEDGER_ENTRY_DEFINITIONS,
} from '../content';
import type {
  ActionTarget,
  GameState,
  LedgerEntryDefinition,
  LedgerEntryDefinitionId,
  OperativeState,
  QueuedOrder,
} from '../model';
import { createRng, nextFloat, nextInt, type RngState } from '../rng';
import { getStressTier } from '../roster';
import { addLedgerEntry } from './add-ledger-entry';

export type SecretDiscoveryCandidate = {
  definitionId: LedgerEntryDefinitionId;
  weight: number;
  duplicateCount: number;
};

export type SecretDiscoveryPreview =
  | {
      eligible: true;
      chance: number;
      target: DiscoveryTarget;
      candidateDefinitionIds: LedgerEntryDefinitionId[];
      candidates: SecretDiscoveryCandidate[];
    }
  | {
      eligible: false;
      chance: 0;
      candidateDefinitionIds: [];
      candidates: [];
    };

export type ResolveSecretDiscoveryResult = {
  state: GameState;
  rng: RngState;
  discovered: boolean;
  preview: SecretDiscoveryPreview;
  roll?: number;
  selectedDefinitionId?: LedgerEntryDefinitionId;
};

type DiscoveryTarget = Extract<ActionTarget, { type: 'district' | 'venue' | 'rival' }>;

export function previewSecretDiscovery(
  state: GameState,
  order: Pick<QueuedOrder, 'actionId' | 'assignedOperativeId' | 'target'>,
): SecretDiscoveryPreview {
  if (order.actionId !== 'gather_intel' || !isDiscoveryTarget(order.target)) {
    return ineligible();
  }

  const candidates = getSecretDiscoveryCandidates(state, order.target);

  if (candidates.length === 0) {
    return ineligible();
  }

  const operative = order.assignedOperativeId
    ? state.operatives.find((candidate) => candidate.id === order.assignedOperativeId)
    : undefined;
  const chance = clampChance(
    18 +
      Math.floor(state.pressures.intel / 10) +
      getTargetIntelDiscoveryBonus(order.target) -
      getAssignedOperativeStressPenalty(operative),
  );

  return {
    eligible: true,
    chance,
    target: { ...order.target },
    candidateDefinitionIds: candidates.map((candidate) => candidate.definitionId),
    candidates,
  };
}

export function resolveSecretDiscovery(
  state: GameState,
  order: Pick<QueuedOrder, 'actionId' | 'assignedOperativeId' | 'target'>,
  preview: SecretDiscoveryPreview,
): ResolveSecretDiscoveryResult {
  if (!preview.eligible) {
    return {
      state,
      rng: createRng(state.seed, state.rngCursor),
      discovered: false,
      preview,
    };
  }

  const roll = nextInt(createRng(state.seed, state.rngCursor), 1, 100);

  if (roll.value > preview.chance) {
    return {
      state: {
        ...state,
        rngCursor: roll.rng.cursor,
      },
      rng: roll.rng,
      discovered: false,
      preview,
      roll: roll.value,
    };
  }

  const selected = selectWeightedCandidate(preview.candidates, roll.rng);
  const relatedOperativeId = order.assignedOperativeId
    ? state.operatives.find((operative) => operative.id === order.assignedOperativeId)?.id
    : undefined;
  const relatedRivalId = getTargetControllerId(preview.target);
  const next = addLedgerEntry(
    {
      ...state,
      rngCursor: selected.rng.cursor,
    },
    {
      definitionId: selected.candidate.definitionId,
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: { ...preview.target },
      },
      relatedTarget: { ...preview.target },
      ...(relatedOperativeId ? { relatedOperativeId } : {}),
      ...(relatedRivalId ? { relatedRivalId } : {}),
      flags: {
        discoveryChance: preview.chance,
        discoveryRoll: roll.value,
        discoveryCandidateCount: preview.candidates.length,
        discoverySelectedWeight: selected.candidate.weight,
      },
    },
  );

  return {
    state: next,
    rng: selected.rng,
    discovered: true,
    preview,
    roll: roll.value,
    selectedDefinitionId: selected.candidate.definitionId,
  };
}

function getSecretDiscoveryCandidates(
  state: GameState,
  target: DiscoveryTarget,
): SecretDiscoveryCandidate[] {
  return (LEDGER_ENTRY_DEFINITIONS as readonly LedgerEntryDefinition[]).flatMap((definition) => {
    if (definition.kind !== 'secret' || !definition.discovery) {
      return [];
    }

    const duplicateCount = countActiveDefinitionInstances(state, definition.id);

    if (definition.unique && duplicateCount > 0) {
      return [];
    }

    if (
      definition.discovery.minIntel !== undefined &&
      state.pressures.intel < definition.discovery.minIntel
    ) {
      return [];
    }

    const affinityWeight = getDefinitionAffinityWeight(definition, target);

    if (affinityWeight <= 0) {
      return [];
    }

    const repeatMultiplier = Math.pow(
      definition.repeatWeightMultiplier ?? 0.6,
      duplicateCount,
    );
    const weight = Math.max(0.1, Number((affinityWeight * repeatMultiplier).toFixed(3)));

    return [
      {
        definitionId: definition.id,
        weight,
        duplicateCount,
      },
    ];
  });
}

function getDefinitionAffinityWeight(
  definition: LedgerEntryDefinition,
  target: DiscoveryTarget,
): number {
  const discovery = definition.discovery;

  if (!discovery) {
    return 0;
  }

  const targetTags = getTargetTags(target);
  const tagMatches = (discovery.targetTags ?? []).filter((tag) =>
    targetTags.includes(tag),
  ).length;
  const districtId = resolveTargetDistrictId(target);
  const districtMatches = districtId && discovery.districtIds?.includes(districtId) ? 1 : 0;
  const venueMatches =
    target.type === 'venue' && discovery.venueIds?.includes(target.id) ? 1 : 0;
  const rivalId = getTargetControllerId(target) ?? (target.type === 'rival' ? target.id : undefined);
  const rivalMatches = rivalId && discovery.rivalIds?.includes(rivalId) ? 1 : 0;

  if (tagMatches + districtMatches + venueMatches + rivalMatches === 0) {
    return 0;
  }

  return (
    discovery.baseWeight +
    tagMatches * 3 +
    districtMatches * 5 +
    venueMatches * 7 +
    rivalMatches * 5
  );
}

function selectWeightedCandidate(
  candidates: readonly SecretDiscoveryCandidate[],
  rng: RngState,
): { candidate: SecretDiscoveryCandidate; rng: RngState } {
  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  const selection = nextFloat(rng);
  let threshold = selection.value * totalWeight;

  for (const candidate of candidates) {
    threshold -= candidate.weight;

    if (threshold <= 0) {
      return {
        candidate,
        rng: selection.rng,
      };
    }
  }

  return {
    candidate: candidates[candidates.length - 1],
    rng: selection.rng,
  };
}

function getTargetIntelDiscoveryBonus(target: DiscoveryTarget): number {
  switch (target.type) {
    case 'district':
      return Math.floor((getDistrictDefinition(target.id)?.secrecy ?? 0) / 20);
    case 'venue': {
      const venue = getVenueDefinition(target.id);
      const district = venue ? getDistrictDefinition(venue.districtId) : undefined;
      return Math.floor((district?.secrecy ?? 0) / 25) + Math.max(0, venue?.intelMod ?? 0);
    }
    case 'rival': {
      const rival = getRivalDefinition(target.id);
      return Math.floor((rival?.subtlety ?? 0) / 25);
    }
  }
}

function resolveTargetDistrictId(target: DiscoveryTarget) {
  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.id;
    case 'venue':
      return getVenueDefinition(target.id)?.districtId;
    case 'rival':
      return undefined;
  }
}

function getTargetTags(target: DiscoveryTarget): string[] {
  switch (target.type) {
    case 'district':
      return [...(getDistrictDefinition(target.id)?.tags ?? [])];
    case 'venue': {
      const venue = getVenueDefinition(target.id);
      const district = venue ? getDistrictDefinition(venue.districtId) : undefined;

      return [...new Set([...(district?.tags ?? []), ...(venue?.tags ?? [])])];
    }
    case 'rival':
      return [...(getRivalDefinition(target.id)?.traits ?? [])];
  }
}

function getTargetControllerId(target: DiscoveryTarget) {
  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.rivalId;
    case 'venue': {
      const venue = getVenueDefinition(target.id);

      if (!venue) {
        return undefined;
      }

      return venue.controllingRivalId ?? getDistrictDefinition(venue.districtId)?.rivalId;
    }
    case 'rival':
      return getRivalDefinition(target.id)?.id;
  }
}

function getAssignedOperativeStressPenalty(operative?: OperativeState): number {
  if (!operative) {
    return 0;
  }

  switch (getStressTier(operative.stress)) {
    case 'stable':
      return 0;
    case 'strained':
      return 4;
    case 'unstable':
      return 9;
    case 'breaking':
      return 15;
  }
}

function countActiveDefinitionInstances(
  state: GameState,
  definitionId: LedgerEntryDefinitionId,
): number {
  return state.ledger.entries.filter(
    (entry) => entry.definitionId === definitionId && !entry.consumed,
  ).length;
}

function isDiscoveryTarget(
  target: ActionTarget | undefined,
): target is DiscoveryTarget {
  return target?.type === 'district' || target?.type === 'venue' || target?.type === 'rival';
}

function clampChance(value: number): number {
  return Math.max(5, Math.min(45, value));
}

function ineligible(): SecretDiscoveryPreview {
  return {
    eligible: false,
    chance: 0,
    candidateDefinitionIds: [],
    candidates: [],
  };
}
