import { CONTACT_DEFINITIONS } from '../content';
import type {
  ContactDefinition,
  ContactId,
  ContactRoleTag,
  ContactState,
} from '../model';
import { createRng, nextInt } from '../rng';

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

export function generateContacts(
  seed: string,
  definitions: readonly ContactDefinition[] = CONTACT_DEFINITIONS,
): GeneratedContactNetwork {
  const candidates = buildCoveredCombinations(definitions);

  if (candidates.length === 0) {
    throw new Error('Contact generation requires at least one coverage-complete combination.');
  }

  const roll = nextInt(
    createRng(`${seed}:contacts`),
    0,
    candidates.length - 1,
  );

  return {
    contacts: Object.fromEntries(
      definitions.map((definition) => [
        definition.id,
        materializeContactState(definition),
      ]),
    ) as Record<ContactId, ContactState>,
    activeContactIds: [...candidates[roll.value]],
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
