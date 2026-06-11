import type { ActionId, ActionTarget } from './actions';
import type { ContactId, ContactMetricDelta } from './contacts';
import type {
  LedgerEntryDefinitionId,
  LedgerEntryId,
  LedgerEntryKind,
  LedgerPotency,
} from './ledger';
import type { OperativeId, OperativeStateDelta } from './operatives';
import type { PressureDelta, PressureId } from './pressures';
import type { RivalId } from './rivals';

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
  | 'event_orchid_route_memory'
  | 'ledger_debt_comes_due'
  | 'ledger_leverage_window'
  | 'ledger_favor_returned'
  | 'contact_wants_assurance'
  | 'event_veyra_room'
  | 'event_hollis_watched'
  | 'event_mercy_bill'
  | 'event_ciro_route_remembers'
  | 'event_confession_leak';

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
  | 'BLACKMAIL'
  | 'OPERATIVE'
  | 'LEDGER'
  | 'CONTACT';

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

export type LedgerEntrySelector =
  | { type: 'selected_entry' }
  | { type: 'kind'; kind: LedgerEntryKind }
  | { type: 'definition'; definitionId: LedgerEntryDefinitionId }
  | { type: 'entry'; entryId: LedgerEntryId };

export type EventChoiceLedgerEffect =
  | {
      type: 'create';
      definitionId: LedgerEntryDefinitionId;
      potency?: LedgerPotency;
      relatedTarget?: ActionTarget;
      relatedOperativeId?: OperativeId;
      relatedRivalId?: RivalId;
      relatedContactId?: ContactId;
    }
  | {
      type: 'consume' | 'resolve';
      entrySelector: LedgerEntrySelector;
      optional?: boolean;
    };

export type EventChoiceDefinition = {
  id: string;
  label: string;
  cost?: PressureDelta | SpecialCost;
  effects: PressureDelta;
  flags?: string[];
  operativeEffects?: OperativeStateDelta;
  contactId?: ContactId;
  contactEffects?: ContactMetricDelta;
  rivalPressure?: Partial<Record<RivalId, number>>;
  ledgerEffects?: readonly EventChoiceLedgerEffect[];
};

export type ContactEventDefinition = {
  contactId?: ContactId;
  signature?: boolean;
  generic?: boolean;
  minTrust?: number;
  maxTrust?: number;
  minLeverage?: number;
  minVolatility?: number;
  minExposure?: number;
  recentInteractionWithinWeeks?: number;
};

export type OperativeEventPredicate =
  | { type: 'operative_stress_at_least'; amount: number }
  | { type: 'operative_loyalty_at_most'; amount: number }
  | { type: 'operative_assigned_within_weeks'; weeks: number }
  | { type: 'operative_assignment_count'; count: number; actionId?: ActionId }
  | { type: 'recent_assignment_tag'; tag: string; count?: number }
  | { type: 'global_pressure_at_least'; pressure: PressureId; amount: number }
  | { type: 'global_pressure_at_most'; pressure: PressureId; amount: number }
  | { type: 'rival_pressure_at_least'; rivalId: RivalId; amount: number };

export type OperativeEventTriggerCondition =
  | OperativeEventPredicate
  | {
      mode: 'all' | 'any';
      predicates: OperativeEventTriggerCondition[];
    };

export type OperativeEventTrigger = {
  mode: 'all' | 'any';
  predicates: OperativeEventTriggerCondition[];
};

type BaseEventDefinition = {
  id: EventId;
  title: string;
  text: string;
  tags: EventTag[];
  baseWeight: number;
  weightRules?: EventWeightRule[];
  contact?: ContactEventDefinition;
  choices: EventChoiceDefinition[];
};

export type CityEventDefinition = BaseEventDefinition & {
  kind: 'city';
};

export type OperativeEventDefinition = BaseEventDefinition & {
  kind: 'operative';
  operativeId: OperativeId;
  trigger: OperativeEventTrigger;
  severeAtBreaking?: boolean;
};

export type EventDefinition = CityEventDefinition | OperativeEventDefinition;

export type GameEventInstance = {
  id: string;
  definitionId: EventId;
  week: number;
  selectedLedgerEntryId?: LedgerEntryId;
  selectedContactId?: ContactId;
};
