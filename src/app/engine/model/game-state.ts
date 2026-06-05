import type { QueuedOrder } from './actions';
import type { GameEventInstance } from './events';
import type { Operative, RecruitCandidate } from './operatives';
import type { PressureDelta, Pressures } from './pressures';

export type Difficulty = 'standard';

export type NewGameConfig = {
  seed?: string;
  difficulty?: Difficulty;
};

export type TurnPhase =
  | 'COMMAND'
  | 'RESOLVING_ACTIONS'
  | 'EVENT_CHOICE'
  | 'WEEK_COMPLETE'
  | 'GAME_OVER';

export type GameOverReason =
  | 'dominion_victory'
  | 'heat_lockdown'
  | 'loyalty_collapse'
  | 'bankrupt'
  | 'out_of_time';

export type GameOverState = {
  result: 'victory' | 'loss';
  reason: GameOverReason;
};

export type GameLogEntryType =
  | 'order_queued'
  | 'order_resolved'
  | 'complication'
  | 'drift'
  | 'event_presented'
  | 'event_choice'
  | 'win_loss';

export type GameLogEntry = {
  id: string;
  week: number;
  type: GameLogEntryType;
  title: string;
  body?: string;
  pressureDelta?: PressureDelta;
  tags?: string[];
};

export type GameState = {
  id: string;
  seed: string;
  rngCursor: number;
  week: number;
  maxWeeks: number;
  phase: TurnPhase;
  commandPointsPerWeek: number;
  pressures: Pressures;
  operatives: Operative[];
  recruitPool: RecruitCandidate[];
  queuedOrders: QueuedOrder[];
  pendingEvent?: GameEventInstance;
  eventLog: GameLogEntry[];
  flags: Record<string, boolean | number | string>;
  gameOver?: GameOverState;
};
