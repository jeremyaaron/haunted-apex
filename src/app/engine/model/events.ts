import type { PressureDelta, PressureId } from './pressures';

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
  id: string;
  title: string;
  text: string;
  tags: EventTag[];
  baseWeight: number;
  weightRules?: EventWeightRule[];
  choices: EventChoiceDefinition[];
};

export type GameEventInstance = {
  id: string;
  definitionId: string;
  week: number;
};
