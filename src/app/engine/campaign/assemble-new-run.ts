import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  DISTRICT_ZERO_WIN_LOSS_THRESHOLDS,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import { generateContacts } from '../contacts';
import { generateFactions } from '../factions';
import { generateFrontNetwork } from '../fronts';
import type {
  CampaignState,
  DistrictId,
  DistrictState,
  GameState,
  NewGameConfig,
  RivalId,
  RivalState,
  RunMode,
} from '../model';
import { createDefaultSeed, createRunId, normalizeSeed } from '../rng';
import { generateRoster, materializeOperativeState } from '../roster';
import { applyCampaignModifiersToRun } from './apply-campaign-modifiers';
import { generateCityIdentity } from './generate-city-identity';
import { getCampaignTensionDefinitionOrThrow, selectCampaignTension } from './select-campaign-tension';

export function assembleNewRun(config: NewGameConfig = {}): GameState {
  const seed = normalizeSeed(config.seed ?? createDefaultSeed());
  const runMode = config.runMode ?? 'standard';
  const customSeed = config.customSeed ?? config.seed !== undefined;
  const campaignTension = config.campaignTensionId
    ? getCampaignTensionDefinitionOrThrow(config.campaignTensionId)
    : selectCampaignTension(seed);
  const city = generateCityIdentity(seed, campaignTension);
  const roster = generateRoster(
    seed,
    undefined,
    undefined,
    campaignTension.generationBias,
  );
  const contactNetwork = generateContacts(seed, undefined, {
    ...campaignTension.generationBias,
    roleTags: campaignTension.roleTags,
  });
  const factionNetwork = generateFactions(seed, undefined, campaignTension.generationBias);
  const frontNetwork = generateFrontNetwork(seed, undefined, campaignTension.generationBias);
  const rivals = initializeRivals();

  const state: GameState = {
    schemaVersion: 9,
    id: createRunId(seed),
    seed,
    rngCursor: roster.rngCursor,
    week: 1,
    maxWeeks: DISTRICT_ZERO_MAX_WEEKS,
    phase: 'COMMAND',
    commandPointsPerWeek: DISTRICT_ZERO_COMMAND_POINTS,
    run: createRunSettings(runMode, customSeed),
    campaign: createCampaignState({
      campaignTensionId: campaignTension.id,
      cityName: city.name,
      cityProfile: city.profile,
      activeFactionIds: factionNetwork.activeFactionIds,
      activeContactIds: contactNetwork.activeContactIds,
      activeRivalIds: Object.values(rivals).flatMap((rival) => (rival.active ? [rival.id] : [])),
      activeFrontDefinitionIds: [
        ...Object.values(frontNetwork.fronts).flatMap((front) => front?.definitionId ?? []),
        ...frontNetwork.frontOpportunities.map((opportunity) => opportunity.definitionId),
      ],
      startingOperativeIds: roster.startingOperativeIds,
    }),
    pressures: { ...DISTRICT_ZERO_INITIAL_PRESSURES },
    operatives: roster.startingOperativeIds.map(materializeOperativeState),
    hirePool: [...roster.hirePoolIds],
    contacts: contactNetwork.contacts,
    activeContactIds: contactNetwork.activeContactIds,
    factions: factionNetwork.factions,
    activeFactionIds: factionNetwork.activeFactionIds,
    activeAccords: factionNetwork.activeAccords,
    fronts: frontNetwork.fronts,
    frontOpportunities: frontNetwork.frontOpportunities,
    seenSignatureEventIds: [],
    ledger: {
      entries: [],
      discoveredCount: 0,
      consumedCount: 0,
    },
    queuedOrders: [],
    districts: initializeDistricts(),
    rivals,
    recentActivity: [],
    eventLog: [],
    flags: {},
  };

  return applyCampaignModifiersToRun(state, campaignTension);
}

function createRunSettings(mode: RunMode, customSeed: boolean): GameState['run'] {
  return {
    mode,
    dominionTarget:
      mode === 'training' ? 80 : DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory,
    validationStatus:
      mode === 'training' ? 'validated' : customSeed ? 'unvalidated' : 'harness_validated',
    customSeed,
  };
}

type CreateCampaignStateConfig = {
  campaignTensionId: CampaignState['tensionId'];
  cityName: string;
  cityProfile: CampaignState['cityProfile'];
  activeFactionIds: readonly CampaignState['activeContent']['factionIds'][number][];
  activeRivalIds: readonly CampaignState['activeContent']['rivalIds'][number][];
  activeContactIds: readonly CampaignState['activeContent']['contactIds'][number][];
  activeFrontDefinitionIds: readonly CampaignState['activeContent']['frontDefinitionIds'][number][];
  startingOperativeIds: readonly CampaignState['activeContent']['startingOperativeIds'][number][];
};

function createCampaignState(config: CreateCampaignStateConfig): CampaignState {
  return {
    tensionId: config.campaignTensionId,
    cityName: config.cityName,
    cityProfile: config.cityProfile,
    openingBriefingShown: false,
    appliedModifiers: {},
    activeContent: {
      factionIds: [...config.activeFactionIds],
      rivalIds: [...config.activeRivalIds],
      contactIds: [...config.activeContactIds],
      frontDefinitionIds: [...new Set(config.activeFrontDefinitionIds)],
      startingOperativeIds: [...config.startingOperativeIds],
    },
    flags: {},
  };
}

function initializeDistricts(): Record<DistrictId, DistrictState> {
  return Object.fromEntries(
    RIVAL_TERRITORY_DISTRICTS.map((definition) => [
      definition.id,
      {
        id: definition.id,
        control: definition.baseControl,
        heat: definition.baseHeat,
      },
    ]),
  ) as Record<DistrictId, DistrictState>;
}

function initializeRivals(): Record<RivalId, RivalState> {
  return Object.fromEntries(
    RIVAL_TERRITORY_RIVALS.map((definition) => [
      definition.id,
      {
        id: definition.id,
        pressure: 0,
        disposition: definition.baseDisposition,
        active: true,
      },
    ]),
  ) as Record<RivalId, RivalState>;
}
