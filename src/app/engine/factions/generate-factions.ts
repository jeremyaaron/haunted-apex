import { FACTION_DEFINITIONS } from '../content';
import type {
  ActiveAccord,
  ActiveAccordId,
  FactionDefinition,
  FactionId,
  FactionState,
} from '../model';
import { createRng, nextInt } from '../rng';

export const ACTIVE_FACTION_COUNT = 4;
export const ALWAYS_ACTIVE_FACTION_ID: FactionId = 'faction_ashline_bureau';

export type GeneratedFactionNetwork = {
  factions: Partial<Record<FactionId, FactionState>>;
  activeFactionIds: FactionId[];
  activeAccords: Record<ActiveAccordId, ActiveAccord>;
};

export function generateFactions(
  seed: string,
  definitions: readonly FactionDefinition[] = FACTION_DEFINITIONS,
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

  const omittedIndex = nextInt(
    createRng(`${seed}:factions`),
    0,
    optionalDefinitions.length - 1,
  ).value;
  const activeDefinitions = [
    alwaysActiveDefinition,
    ...optionalDefinitions.filter((_, index) => index !== omittedIndex),
  ];

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
