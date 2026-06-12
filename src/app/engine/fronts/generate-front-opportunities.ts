import {
  FRONT_DEFINITIONS,
  getDistrictDefinition,
  getVenueDefinition,
} from '../content';
import type {
  FrontDefinition,
  FrontDefinitionId,
  FrontId,
  FrontOpportunity,
  FrontRoleTag,
  FrontState,
  RivalId,
} from '../model';
import { createRng, nextInt } from '../rng';

export const OWNED_FRONT_CAP = 3;
export const FRONT_OPPORTUNITY_COUNT = 4;
export const STARTING_FRONT_ID: FrontId = 'front_pale_circuit';

export const FRONT_COVERAGE_GROUPS = [
  ['resources'],
  ['intel', 'heat_control'],
  ['rival_pressure', 'dominion', 'ruin'],
] as const satisfies readonly (readonly FrontRoleTag[])[];

export type GeneratedFrontNetwork = {
  fronts: Partial<Record<FrontId, FrontState>>;
  frontOpportunities: FrontOpportunity[];
};

export function generateFrontNetwork(
  seed: string,
  definitions: readonly FrontDefinition[] = FRONT_DEFINITIONS,
): GeneratedFrontNetwork {
  const startingDefinition = getRequiredDefinition(STARTING_FRONT_ID, definitions);
  const opportunityDefinitions = definitions.filter(
    (definition) => definition.id !== STARTING_FRONT_ID,
  );
  const candidates = buildCoveredOpportunitySets(opportunityDefinitions);

  if (candidates.length === 0) {
    throw new Error('Front generation requires at least one coverage-complete opportunity set.');
  }

  const roll = nextInt(createRng(`${seed}:fronts`), 0, candidates.length - 1);

  return {
    fronts: {
      [STARTING_FRONT_ID]: materializeStartingFront(startingDefinition),
    },
    frontOpportunities: candidates[roll.value].map(materializeFrontOpportunity),
  };
}

export function materializeStartingFront(definition: FrontDefinition): FrontState {
  const venueId = definition.preferredVenueIds?.[0];
  const venue = venueId ? getVenueDefinition(venueId) : undefined;
  const districtId = venue?.districtId ?? definition.preferredDistrictIds?.[0];

  if (!districtId) {
    throw new Error(`Starting Front ${definition.id} requires a district or venue.`);
  }

  const relatedRivalId = getRelatedRivalId(districtId, venueId);

  return {
    id: definition.id,
    definitionId: definition.id,
    districtId,
    ...(venueId ? { venueId } : {}),
    ...(relatedRivalId ? { relatedRivalId } : {}),
    level: 1,
    exposure: definition.exposureOnEstablish,
    establishedWeek: 1,
    compromised: false,
    active: true,
    flags: {},
    yieldHistory: [],
  };
}

export function satisfiesFrontOpportunityCoverage(
  definitions: readonly FrontDefinition[],
  frontDefinitionIds: readonly FrontDefinitionId[],
): boolean {
  const selectedDefinitions = frontDefinitionIds.flatMap((definitionId) => {
    const definition = definitions.find((candidate) => candidate.id === definitionId);
    return definition ? [definition] : [];
  });
  const selectedTags = new Set(selectedDefinitions.flatMap((definition) => definition.roleTags));

  return (
    selectedDefinitions.length === frontDefinitionIds.length &&
    FRONT_COVERAGE_GROUPS.every((group) =>
      group.some((roleTag) => selectedTags.has(roleTag)),
    )
  );
}

function buildCoveredOpportunitySets(
  definitions: readonly FrontDefinition[],
): readonly (readonly FrontDefinition[])[] {
  const sortedDefinitions = [...definitions].sort((first, second) =>
    first.id.localeCompare(second.id),
  );
  const combinations: FrontDefinition[][] = [];

  for (let first = 0; first < sortedDefinitions.length - 3; first += 1) {
    for (let second = first + 1; second < sortedDefinitions.length - 2; second += 1) {
      for (let third = second + 1; third < sortedDefinitions.length - 1; third += 1) {
        for (let fourth = third + 1; fourth < sortedDefinitions.length; fourth += 1) {
          const candidate = [
            sortedDefinitions[first],
            sortedDefinitions[second],
            sortedDefinitions[third],
            sortedDefinitions[fourth],
          ];

          if (
            satisfiesFrontOpportunityCoverage(
              definitions,
              candidate.map((definition) => definition.id),
            )
          ) {
            combinations.push(candidate);
          }
        }
      }
    }
  }

  return combinations;
}

function materializeFrontOpportunity(definition: FrontDefinition): FrontOpportunity {
  const venueId = definition.preferredVenueIds?.[0];
  const venue = venueId ? getVenueDefinition(venueId) : undefined;
  const districtId = venue?.districtId ?? definition.preferredDistrictIds?.[0];

  if (!districtId) {
    throw new Error(`Front opportunity ${definition.id} requires a district or venue.`);
  }

  const relatedRivalId = getRelatedRivalId(districtId, venueId);

  return {
    id: `front_opportunity_${definition.id}`,
    definitionId: definition.id,
    districtId,
    ...(venueId ? { venueId } : {}),
    ...(relatedRivalId ? { relatedRivalId } : {}),
  };
}

function getRelatedRivalId(
  districtId: FrontOpportunity['districtId'],
  venueId?: FrontOpportunity['venueId'],
): RivalId | undefined {
  const venue = venueId ? getVenueDefinition(venueId) : undefined;
  const district = getDistrictDefinition(districtId);

  return venue?.controllingRivalId ?? district?.rivalId;
}

function getRequiredDefinition(
  definitionId: FrontDefinitionId,
  definitions: readonly FrontDefinition[],
): FrontDefinition {
  const definition = definitions.find((candidate) => candidate.id === definitionId);

  if (!definition) {
    throw new Error(`Missing required Front definition ${definitionId}.`);
  }

  return definition;
}
