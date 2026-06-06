import { getTraitDefinition, ROSTER_OPERATIVES } from '../content';
import type {
  GeneratedRoster,
  OperativeDefinition,
  OperativeId,
  OperativeRoleTag,
  RosterGenerationConfig,
} from '../model';
import { createRng, nextFloat, type RngState } from '../rng';

export const DEFAULT_ROSTER_GENERATION_CONFIG: RosterGenerationConfig = {
  startingRosterSize: 3,
  hirePoolSize: 4,
  maxStartingRares: 1,
  rarityWeights: {
    common: 6,
    uncommon: 3,
    rare: 1,
  },
};

export const REQUIRED_STARTING_TAG_GROUPS: readonly (readonly OperativeRoleTag[])[] = [
  ['intel', 'tech'],
  ['social', 'heat_control'],
  ['violence', 'money', 'stability'],
];

export function generateRoster(
  seed: string,
  definitions: readonly OperativeDefinition[] = ROSTER_OPERATIVES,
  config: RosterGenerationConfig = DEFAULT_ROSTER_GENERATION_CONFIG,
): GeneratedRoster {
  validateGenerationInputs(definitions, config);

  const ordered = createWeightedOrdering(seed, definitions, config.rarityWeights);
  const selected =
    findValidCombination(ordered.definitions, config) ??
    findValidCombination([...definitions].sort((a, b) => a.id.localeCompare(b.id)), config);

  if (!selected) {
    throw new Error(
      'Roster content error: no valid starting roster satisfies role, Intel, Heat-control, and rarity requirements.',
    );
  }

  const selectedIds = new Set(selected.map((definition) => definition.id));
  const hirePoolIds = ordered.definitions
    .filter((definition) => !selectedIds.has(definition.id))
    .slice(0, config.hirePoolSize)
    .map((definition) => definition.id);

  if (hirePoolIds.length !== config.hirePoolSize) {
    throw new Error(
      `Roster content error: expected ${config.hirePoolSize} hire candidates, found ${hirePoolIds.length}.`,
    );
  }

  return {
    startingOperativeIds: selected.map((definition) => definition.id),
    hirePoolIds,
    rngCursor: ordered.rng.cursor,
  };
}

export function isValidStartingRoster(
  definitions: readonly OperativeDefinition[],
  config: RosterGenerationConfig = DEFAULT_ROSTER_GENERATION_CONFIG,
): boolean {
  if (definitions.length !== config.startingRosterSize) {
    return false;
  }

  if (new Set(definitions.map((definition) => definition.id)).size !== definitions.length) {
    return false;
  }

  const rareCount = definitions.filter((definition) => definition.rarity === 'rare').length;

  return (
    rareCount <= config.maxStartingRares &&
    REQUIRED_STARTING_TAG_GROUPS.every((group) =>
      definitions.some((definition) =>
        definition.roleTags.some((roleTag) => group.includes(roleTag)),
      ),
    ) &&
    definitions.some(hasIntelCapability) &&
    definitions.some(hasHeatControlCapability)
  );
}

function createWeightedOrdering(
  seed: string,
  definitions: readonly OperativeDefinition[],
  rarityWeights: RosterGenerationConfig['rarityWeights'],
): {
  definitions: OperativeDefinition[];
  rng: RngState;
} {
  const remaining = [...definitions];
  const ordered: OperativeDefinition[] = [];
  let rng = createRng(seed);

  while (remaining.length > 0) {
    const totalWeight = remaining.reduce(
      (total, definition) => total + rarityWeights[definition.rarity],
      0,
    );
    const roll = nextFloat(rng);
    let cursor = roll.value * totalWeight;
    let selectedIndex = remaining.length - 1;

    for (let index = 0; index < remaining.length; index += 1) {
      cursor -= rarityWeights[remaining[index].rarity];

      if (cursor < 0) {
        selectedIndex = index;
        break;
      }
    }

    ordered.push(remaining[selectedIndex]);
    remaining.splice(selectedIndex, 1);
    rng = roll.rng;
  }

  return {
    definitions: ordered,
    rng,
  };
}

function findValidCombination(
  definitions: readonly OperativeDefinition[],
  config: RosterGenerationConfig,
): OperativeDefinition[] | undefined {
  const combination: OperativeDefinition[] = [];

  function search(startIndex: number): OperativeDefinition[] | undefined {
    if (combination.length === config.startingRosterSize) {
      return isValidStartingRoster(combination, config) ? [...combination] : undefined;
    }

    const remainingSlots = config.startingRosterSize - combination.length;

    for (
      let index = startIndex;
      index <= definitions.length - remainingSlots;
      index += 1
    ) {
      combination.push(definitions[index]);
      const result = search(index + 1);

      if (result) {
        return result;
      }

      combination.pop();
    }

    return undefined;
  }

  return search(0);
}

function hasIntelCapability(definition: OperativeDefinition): boolean {
  return (
    definition.roleTags.includes('intel') ||
    definition.roleTags.includes('tech') ||
    definition.affinities.some((affinity) => (affinity.effects?.intel ?? 0) > 0)
  );
}

function hasHeatControlCapability(definition: OperativeDefinition): boolean {
  if (
    definition.roleTags.includes('heat_control') ||
    definition.affinities.some((affinity) => (affinity.effects?.heat ?? 0) < 0)
  ) {
    return true;
  }

  const traitIds = [definition.signatureTraitId, definition.liabilityTraitId].filter(
    (traitId): traitId is NonNullable<typeof traitId> => traitId !== undefined,
  );

  return traitIds.some((traitId) =>
    getTraitDefinition(traitId)?.modifiers.some((modifier) => (modifier.effects?.heat ?? 0) < 0),
  );
}

function validateGenerationInputs(
  definitions: readonly OperativeDefinition[],
  config: RosterGenerationConfig,
): void {
  const requiredCount = config.startingRosterSize + config.hirePoolSize;

  if (definitions.length < requiredCount) {
    throw new Error(
      `Roster content error: ${definitions.length} definitions cannot fill ${config.startingRosterSize} starting and ${config.hirePoolSize} hire slots.`,
    );
  }

  if (new Set(definitions.map((definition) => definition.id)).size !== definitions.length) {
    throw new Error('Roster content error: operative IDs must be unique.');
  }

  for (const rarity of ['common', 'uncommon', 'rare'] as const) {
    if (config.rarityWeights[rarity] <= 0) {
      throw new Error(`Roster content error: ${rarity} rarity weight must be positive.`);
    }
  }
}
