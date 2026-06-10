import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import { generateContacts } from '../contacts';
import type {
  DistrictId,
  DistrictState,
  GameState,
  NewGameConfig,
  RivalId,
  RivalState,
} from '../model';
import { createDefaultSeed, createRunId, normalizeSeed } from '../rng';
import { generateRoster, materializeOperativeState } from '../roster';

export function newGame(config: NewGameConfig = {}): GameState {
  const seed = normalizeSeed(config.seed ?? createDefaultSeed());
  const roster = generateRoster(seed);
  const contactNetwork = generateContacts(seed);

  return {
    schemaVersion: 5,
    id: createRunId(seed),
    seed,
    rngCursor: roster.rngCursor,
    week: 1,
    maxWeeks: DISTRICT_ZERO_MAX_WEEKS,
    phase: 'COMMAND',
    commandPointsPerWeek: DISTRICT_ZERO_COMMAND_POINTS,
    pressures: { ...DISTRICT_ZERO_INITIAL_PRESSURES },
    operatives: roster.startingOperativeIds.map(materializeOperativeState),
    hirePool: [...roster.hirePoolIds],
    contacts: contactNetwork.contacts,
    activeContactIds: contactNetwork.activeContactIds,
    seenSignatureEventIds: [],
    ledger: {
      entries: [],
      discoveredCount: 0,
      consumedCount: 0,
    },
    queuedOrders: [],
    districts: initializeDistricts(),
    rivals: initializeRivals(),
    recentActivity: [],
    eventLog: [],
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
