import type { QueuedOrder } from './actions';
import type { RecentActivityEntry } from './activity';
import type { DistrictId, DistrictState } from './districts';
import type { EventId, GameEventInstance } from './events';
import type { OperativeId, OperativeState } from './operatives';
import type { PressureDelta, Pressures } from './pressures';
import type { RivalId, RivalState } from './rivals';

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
  | 'rival_effect'
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
  schemaVersion: 3;
  id: string;
  seed: string;
  rngCursor: number;
  week: number;
  maxWeeks: number;
  phase: TurnPhase;
  commandPointsPerWeek: number;
  pressures: Pressures;
  operatives: OperativeState[];
  hirePool: OperativeId[];
  seenSignatureEventIds: EventId[];
  queuedOrders: QueuedOrder[];
  districts: Record<DistrictId, DistrictState>;
  rivals: Record<RivalId, RivalState>;
  recentActivity: RecentActivityEntry[];
  pendingEvent?: GameEventInstance;
  eventLog: GameLogEntry[];
  flags: Record<string, boolean | number | string>;
  gameOver?: GameOverState;
};
