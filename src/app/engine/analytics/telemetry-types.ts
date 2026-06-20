import type {
  ActionId,
  CampaignTensionId,
  OperativeId,
  PressureId,
} from '../model';

export type TelemetryActorType = 'bot' | 'player';

export type PressureChangeSourceKind =
  | 'action'
  | 'event'
  | 'contact'
  | 'ledger'
  | 'front'
  | 'faction'
  | 'accord'
  | 'campaign'
  | 'drift'
  | 'rival'
  | 'system';

export type TelemetryEntryKind =
  | 'command_used'
  | 'event_choice_used'
  | 'pressure_delta'
  | 'system_engaged'
  | 'operative_assigned';

export type StrategicSystemId =
  | 'front'
  | 'front_upgrade'
  | 'accord'
  | 'ledger'
  | 'contact'
  | 'bribe'
  | 'lay_low';

export type PressureAttributionEntry = {
  kind: 'pressure_delta';
  week: number;
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
  pressure: PressureId;
  delta: number;
};

export type CommandUsedTelemetryEntry = {
  kind: 'command_used';
  week: number;
  actionId: ActionId;
  actionLabel: string;
  targetKey?: string;
  assignedOperativeId?: OperativeId;
};

export type EventChoiceUsedTelemetryEntry = {
  kind: 'event_choice_used';
  week: number;
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceLabel: string;
};

export type SystemEngagedTelemetryEntry = {
  kind: 'system_engaged';
  week: number;
  system: StrategicSystemId;
  sourceId: string;
};

export type OperativeAssignedTelemetryEntry = {
  kind: 'operative_assigned';
  week: number;
  operativeId: OperativeId;
  actionId: ActionId;
};

export type TelemetryEntry =
  | CommandUsedTelemetryEntry
  | EventChoiceUsedTelemetryEntry
  | PressureAttributionEntry
  | SystemEngagedTelemetryEntry
  | OperativeAssignedTelemetryEntry;

export type RunTelemetry = {
  runId: string;
  actorType: TelemetryActorType;
  botId?: string;
  campaignTensionId: CampaignTensionId;
  seed: string;
  entries: TelemetryEntry[];
};
