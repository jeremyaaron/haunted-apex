import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  DISTRICT_ZERO_RECRUIT_POOL,
  DISTRICT_ZERO_STARTING_OPERATIVES,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import type {
  DistrictId,
  DistrictState,
  GameState,
  NewGameConfig,
  Operative,
  RecruitCandidate,
  RivalId,
  RivalState,
} from '../model';
import { createDefaultSeed, createRunId, normalizeSeed } from '../rng';

export function newGame(config: NewGameConfig = {}): GameState {
  const seed = normalizeSeed(config.seed ?? createDefaultSeed());

  return {
    id: createRunId(seed),
    seed,
    rngCursor: 0,
    week: 1,
    maxWeeks: DISTRICT_ZERO_MAX_WEEKS,
    phase: 'COMMAND',
    commandPointsPerWeek: DISTRICT_ZERO_COMMAND_POINTS,
    pressures: { ...DISTRICT_ZERO_INITIAL_PRESSURES },
    operatives: cloneOperatives(DISTRICT_ZERO_STARTING_OPERATIVES),
    recruitPool: cloneRecruitPool(DISTRICT_ZERO_RECRUIT_POOL),
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

function cloneOperatives(operatives: readonly Operative[]): Operative[] {
  return operatives.map((operative) => ({
    ...operative,
    traitIds: [...operative.traitIds],
  }));
}

function cloneRecruitPool(recruitPool: readonly RecruitCandidate[]): RecruitCandidate[] {
  return recruitPool.map((candidate) => ({
    ...candidate,
    traitIds: [...candidate.traitIds],
  }));
}
