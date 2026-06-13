import type { QueuedOrder } from './actions';
import type { RecentActivityEntry } from './activity';
import type { ActiveAccord, ActiveAccordId } from './accords';
import type { ContactId, ContactState } from './contacts';
import type { DistrictId, DistrictState } from './districts';
import type { EventId, GameEventInstance } from './events';
import type { FactionId, FactionState } from './factions';
import type { FrontId, FrontOpportunity, FrontState } from './fronts';
import type { LedgerState } from './ledger';
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
  | 'ledger'
  | 'operative_condition'
  | 'complication'
  | 'accord'
  | 'front_yield'
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
  schemaVersion: 7;
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
  contacts: Record<ContactId, ContactState>;
  activeContactIds: ContactId[];
  factions: Partial<Record<FactionId, FactionState>>;
  activeFactionIds: FactionId[];
  activeAccords: Record<ActiveAccordId, ActiveAccord>;
  fronts: Partial<Record<FrontId, FrontState>>;
  frontOpportunities: FrontOpportunity[];
  seenSignatureEventIds: EventId[];
  ledger: LedgerState;
  queuedOrders: QueuedOrder[];
  districts: Record<DistrictId, DistrictState>;
  rivals: Record<RivalId, RivalState>;
  recentActivity: RecentActivityEntry[];
  pendingEvent?: GameEventInstance;
  eventLog: GameLogEntry[];
  flags: Record<string, boolean | number | string>;
  gameOver?: GameOverState;
};
