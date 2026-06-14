import { FACTION_DEFINITIONS } from '../content';
import type {
  ActiveAccord,
  ActiveAccordId,
  CampaignGenerationBias,
  FactionDefinition,
  FactionId,
  FactionState,
} from '../model';
import { createRng, nextFloat, nextInt, type RngState } from '../rng';

export const ACTIVE_FACTION_COUNT = 4;
export const ALWAYS_ACTIVE_FACTION_ID: FactionId = 'faction_ashline_bureau';

export type GeneratedFactionNetwork = {
  factions: Partial<Record<FactionId, FactionState>>;
  activeFactionIds: FactionId[];
  activeAccords: Record<ActiveAccordId, ActiveAccord>;
};

export type FactionGenerationBias = Pick<
  CampaignGenerationBias,
  'requiredFactionIds' | 'weightedFactionIds'
>;

export function generateFactions(
  seed: string,
  definitions: readonly FactionDefinition[] = FACTION_DEFINITIONS,
  bias: FactionGenerationBias = {},
): GeneratedFactionNetwork {
  const alwaysActiveDefinition = getRequiredFactionDefinition(
    ALWAYS_ACTIVE_FACTION_ID,
    definitions,
  );
  const optionalDefinitions = definitions
    .filter((definition) => definition.id !== ALWAYS_ACTIVE_FACTION_ID)
    .sort((first, second) => first.id.localeCompare(second.id));

  if (optionalDefinitions.length < ACTIVE_FACTION_COUNT - 1) {
    throw new Error('Faction generation requires enough optional factions for a complete network.');
  }

  const activeDefinitions = selectActiveFactionDefinitions(
    seed,
    alwaysActiveDefinition,
    optionalDefinitions,
    bias,
  );

  return {
    factions: Object.fromEntries(
      activeDefinitions.map((definition) => [
        definition.id,
        materializeFactionState(definition),
      ]),
    ) as Partial<Record<FactionId, FactionState>>,
    activeFactionIds: activeDefinitions.map((definition) => definition.id),
    activeAccords: {},
  };
}

function selectActiveFactionDefinitions(
  seed: string,
  alwaysActiveDefinition: FactionDefinition,
  optionalDefinitions: readonly FactionDefinition[],
  bias: FactionGenerationBias,
): readonly FactionDefinition[] {
  const requiredDefinitions = getRequiredFactionDefinitions(
    bias.requiredFactionIds ?? [],
    optionalDefinitions,
  );
  const requiredIds = new Set([
    alwaysActiveDefinition.id,
    ...requiredDefinitions.map((definition) => definition.id),
  ]);
  const remainingSlots = ACTIVE_FACTION_COUNT - requiredIds.size;

  if (remainingSlots < 0) {
    throw new Error('Faction generation received too many required factions.');
  }

  const candidates = optionalDefinitions.filter((definition) => !requiredIds.has(definition.id));

  if (candidates.length < remainingSlots) {
    throw new Error('Faction generation requires enough optional factions for a complete network.');
  }

  if (!hasFactionBias(bias)) {
    const omittedIndex = nextInt(createRng(`${seed}:factions`), 0, optionalDefinitions.length - 1)
      .value;
    return [
      alwaysActiveDefinition,
      ...optionalDefinitions.filter((_, index) => index !== omittedIndex),
    ];
  }

  return [
    alwaysActiveDefinition,
    ...requiredDefinitions,
    ...selectWeightedFactions(seed, candidates, remainingSlots, bias),
  ].slice(0, ACTIVE_FACTION_COUNT);
}

export function materializeFactionState(definition: FactionDefinition): FactionState {
  return {
    id: definition.id,
    standing: definition.baseStanding,
    suspicion: definition.baseSuspicion,
    obligation: definition.baseObligation,
    usedAccordIds: [],
    activeAccordIds: [],
    flags: {},
    recentInteractions: [],
  };
}

function getRequiredFactionDefinition(
  factionId: FactionId,
  definitions: readonly FactionDefinition[],
): FactionDefinition {
  const definition = definitions.find((candidate) => candidate.id === factionId);

  if (!definition) {
    throw new Error(`Missing required Faction definition ${factionId}.`);
  }

  return definition;
}

function getRequiredFactionDefinitions(
  factionIds: readonly FactionId[],
  definitions: readonly FactionDefinition[],
): readonly FactionDefinition[] {
  const required: FactionDefinition[] = [];
  const seen = new Set<FactionId>();

  for (const factionId of factionIds) {
    if (factionId === ALWAYS_ACTIVE_FACTION_ID || seen.has(factionId)) {
      continue;
    }

    required.push(getRequiredFactionDefinition(factionId, definitions));
    seen.add(factionId);
  }

  return required.sort((first, second) => first.id.localeCompare(second.id));
}

function hasFactionBias(bias: FactionGenerationBias): boolean {
  return (
    (bias.requiredFactionIds?.some((factionId) => factionId !== ALWAYS_ACTIVE_FACTION_ID) ??
      false) ||
    Object.keys(bias.weightedFactionIds ?? {}).length > 0
  );
}

function selectWeightedFactions(
  seed: string,
  candidates: readonly FactionDefinition[],
  count: number,
  bias: FactionGenerationBias,
): readonly FactionDefinition[] {
  let rng = createRng(`${seed}:factions`);
  const remaining = [...candidates];
  const selected: FactionDefinition[] = [];

  while (selected.length < count) {
    const result = takeWeightedFaction(remaining, rng, bias);
    selected.push(result.definition);
    remaining.splice(result.index, 1);
    rng = result.rng;
  }

  return selected;
}

function takeWeightedFaction(
  candidates: readonly FactionDefinition[],
  rng: RngState,
  bias: FactionGenerationBias,
): { definition: FactionDefinition; index: number; rng: RngState } {
  const weights = candidates.map((definition) =>
    Math.max(1, 1 + (bias.weightedFactionIds?.[definition.id] ?? 0)),
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = nextFloat(rng);
  let threshold = roll.value * totalWeight;

  for (let index = 0; index < candidates.length; index += 1) {
    threshold -= weights[index];

    if (threshold <= 0) {
      return {
        definition: candidates[index],
        index,
        rng: roll.rng,
      };
    }
  }

  return {
    definition: candidates[candidates.length - 1],
    index: candidates.length - 1,
    rng: roll.rng,
  };
}
