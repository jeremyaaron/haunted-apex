import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  DISTRICT_ZERO_RECRUIT_POOL,
  DISTRICT_ZERO_STARTING_OPERATIVES,
} from '../content';
import type { GameState, NewGameConfig, Operative, RecruitCandidate } from '../model';
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
    eventLog: [],
    flags: {},
  };
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

