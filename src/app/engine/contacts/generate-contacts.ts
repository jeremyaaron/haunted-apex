import { CONTACT_DEFINITIONS } from '../content';
import type {
  CampaignGenerationBias,
  CampaignRoleTag,
  ContactDefinition,
  ContactId,
  ContactRoleTag,
  ContactState,
} from '../model';
import { createRng, nextFloat, nextInt } from '../rng';

export const ACTIVE_CONTACT_COUNT = 3;

export const CONTACT_COVERAGE_GROUPS = [
  ['heat_control', 'security', 'stability'],
  ['intel', 'ledger', 'nightlife', 'social'],
  ['weird', 'ruin', 'rival_pressure'],
] as const satisfies readonly (readonly ContactRoleTag[])[];

export type GeneratedContactNetwork = {
  contacts: Record<ContactId, ContactState>;
  activeContactIds: ContactId[];
};

export type ContactGenerationBias = Pick<
  CampaignGenerationBias,
  'requiredContactIds' | 'weightedContactIds'
> & {
  roleTags?: readonly CampaignRoleTag[];
};

export function generateContacts(
  seed: string,
  definitions: readonly ContactDefinition[] = CONTACT_DEFINITIONS,
  bias: ContactGenerationBias = {},
): GeneratedContactNetwork {
  const candidates = buildCoveredCombinations(definitions);

  if (candidates.length === 0) {
    throw new Error('Contact generation requires at least one coverage-complete combination.');
  }

  const activeContactIds = selectActiveContactIds(seed, definitions, candidates, bias);

  return {
    contacts: Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        materializeContactState(definition),
      ]),
    ) as Record<ContactId, ContactState>,
    activeContactIds,
  };
}

export function materializeContactState(definition: ContactDefinition): ContactState {
  return {
    id: definition.id,
    trust: definition.baseTrust,
    leverage: definition.baseLeverage,
    volatility: definition.baseVolatility,
    exposure: definition.baseExposure,
    burned: false,
    recentInteractions: [],
    flags: {},
  };
}

export function satisfiesContactCoverage(
  definitions: readonly ContactDefinition[],
  contactIds: readonly ContactId[],
): boolean {
  const selectedDefinitions = contactIds.flatMap((contactId) => {
    const definition = definitions.find((candidate) => candidate.id === contactId);
    return definition ? [definition] : [];
  });
  const selectedTags = new Set(selectedDefinitions.flatMap((definition) => definition.roleTags));

  return (
    selectedDefinitions.length === contactIds.length &&
    CONTACT_COVERAGE_GROUPS.every((group) =>
      group.some((roleTag) => selectedTags.has(roleTag)),
    )
  );
}

function buildCoveredCombinations(
  definitions: readonly ContactDefinition[],
): readonly (readonly ContactId[])[] {
  const sortedIds = definitions.map((definition) => definition.id).sort();
  const combinations: ContactId[][] = [];

  for (let first = 0; first < sortedIds.length - 2; first += 1) {
    for (let second = first + 1; second < sortedIds.length - 1; second += 1) {
      for (let third = second + 1; third < sortedIds.length; third += 1) {
        const candidate = [sortedIds[first], sortedIds[second], sortedIds[third]];

        if (satisfiesContactCoverage(definitions, candidate)) {
          combinations.push(candidate);
        }
      }
    }
  }

  return combinations;
}

function selectActiveContactIds(
  seed: string,
  definitions: readonly ContactDefinition[],
  candidates: readonly (readonly ContactId[])[],
  bias: ContactGenerationBias,
): ContactId[] {
  if (!hasContactBias(bias)) {
    const roll = nextInt(createRng(`${seed}:contacts`), 0, candidates.length - 1);
    return [...candidates[roll.value]];
  }

  const requiredContactIds = [...new Set(bias.requiredContactIds ?? [])];
  const eligibleCandidates = candidates.filter((candidate) =>
    requiredContactIds.every((contactId) => candidate.includes(contactId)),
  );
  const safeCandidates = eligibleCandidates.length > 0 ? eligibleCandidates : candidates;
  const weights = safeCandidates.map((candidate) =>
    getCombinationWeight(candidate, definitions, bias),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = nextFloat(createRng(`${seed}:contacts`));
  let threshold = roll.value * totalWeight;

  for (let index = 0; index < safeCandidates.length; index += 1) {
    threshold -= weights[index];

    if (threshold <= 0) {
      return [...safeCandidates[index]];
    }
  }

  return [...safeCandidates[safeCandidates.length - 1]];
}

function hasContactBias(bias: ContactGenerationBias): boolean {
  return (
    (bias.requiredContactIds?.length ?? 0) > 0 ||
    Object.keys(bias.weightedContactIds ?? {}).length > 0 ||
    (bias.roleTags?.length ?? 0) > 0
  );
}

function getCombinationWeight(
  contactIds: readonly ContactId[],
  definitions: readonly ContactDefinition[],
  bias: ContactGenerationBias,
): number {
  return Math.max(
    1,
    1 +
      contactIds.reduce(
        (sum, contactId) =>
          sum +
          (bias.weightedContactIds?.[contactId] ?? 0) +
          getRoleTagWeight(contactId, definitions, bias.roleTags ?? []),
        0,
      ),
  );
}

function getRoleTagWeight(
  contactId: ContactId,
  definitions: readonly ContactDefinition[],
  roleTags: readonly CampaignRoleTag[],
): number {
  const definition = definitions.find((candidate) => candidate.id === contactId);

  if (!definition) {
    return 0;
  }

  const contactRoleTags = new Set(definition.roleTags);

  return roleTags.reduce(
    (sum, roleTag) => sum + (contactRoleTags.has(roleTag as ContactRoleTag) ? 5 : 0),
    0,
  );
}
