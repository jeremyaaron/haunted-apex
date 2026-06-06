import type { PressureDelta, PressureId } from './pressures';

export type EventId =
  | 'corp_patrol_sweep'
  | 'rival_tests_border'
  | 'liaison_favor'
  | 'operative_wants_more'
  | 'blackmail_lead'
  | 'job_goes_loud'
  | 'heat_cools'
  | 'safehouse_compromised'
  | 'unexpected_windfall'
  | 'rival_sends_flowers'
  | 'event_mara_ghost_debt'
  | 'event_juno_static_in_her_voice'
  | 'event_saint_lie_comes_due'
  | 'event_knox_blood_applause'
  | 'event_iris_velvet_access'
  | 'event_orchid_route_memory';

export type EventTag =
  | 'HEAT'
  | 'LOYALTY'
  | 'RESOURCE'
  | 'RIVAL'
  | 'LIAISON'
  | 'OPPORTUNITY'
  | 'VIOLENCE'
  | 'SAFEHOUSE'
  | 'RUIN'
  | 'INTEL'
  | 'CORP'
  | 'BLACKMAIL';

export type EventWeightRule = {
  pressure?: PressureId;
  flag?: string;
  min?: number;
  max?: number;
  addWeight: number;
};

export type SpecialCost = {
  type: 'tech_or_intel';
  amount: number;
};

export type EventChoiceDefinition = {
  id: string;
  label: string;
  cost?: PressureDelta | SpecialCost;
  effects: PressureDelta;
  flags?: string[];
};

export type EventDefinition = {
  id: EventId;
  title: string;
  text: string;
  tags: EventTag[];
  baseWeight: number;
  weightRules?: EventWeightRule[];
  choices: EventChoiceDefinition[];
};

export type GameEventInstance = {
  id: string;
  definitionId: EventId;
  week: number;
};
