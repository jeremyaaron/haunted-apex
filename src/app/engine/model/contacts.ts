import type { DistrictId } from './districts';
import type { LedgerEntryDefinitionId } from './ledger';
import type { PressureDelta, Pressures } from './pressures';
import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type ContactId =
  | 'contact_veyra_lux'
  | 'contact_captain_hollis'
  | 'contact_dr_mercy_iram'
  | 'contact_ciro_moth'
  | 'contact_mina_glass'
  | 'contact_father_static';

export type ContactStatus =
  | 'cold'
  | 'useful'
  | 'trusted'
  | 'pressured'
  | 'entangled'
  | 'volatile'
  | 'burned';

export type ContactArchetype =
  | 'liaison'
  | 'official'
  | 'surgeon'
  | 'broker'
  | 'club_heir'
  | 'confessor'
  | 'informant'
  | 'patron';

export type ContactRoleTag =
  | 'heat_control'
  | 'intel'
  | 'loyalty'
  | 'resources'
  | 'ruin'
  | 'ledger'
  | 'rival_pressure'
  | 'nightlife'
  | 'security'
  | 'weird'
  | 'social'
  | 'stability';

export type ContactGenerationTag =
  | ContactRoleTag
  | 'high_risk'
  | 'low_exposure'
  | 'rival_linked'
  | 'clinic'
  | 'official_channel';

export type ContactOptionKind = 'cultivate' | 'pressure' | 'request_service';
export type ContactOptionId = string;
export type ContactServiceId = string;

export type ContactMetricDelta = {
  trust?: number;
  leverage?: number;
  volatility?: number;
  exposure?: number;
};

export type ContactInteraction = {
  week: number;
  optionId: ContactOptionId;
  kind: ContactOptionKind;
  label: string;
  effectsSummary: ContactMetricDelta;
};

export type ContactState = {
  id: ContactId;
  trust: number;
  leverage: number;
  volatility: number;
  exposure: number;
  burned: boolean;
  recentInteractions: ContactInteraction[];
  flags: Record<string, boolean | number | string>;
};

export type ContactServiceCost = Partial<
  Pick<Pressures, 'resources' | 'intel'> & Pick<ContactState, 'trust' | 'leverage'>
>;

export type ContactServiceRequirement =
  | {
      type: 'min_trust';
      value: number;
    }
  | {
      type: 'min_leverage';
      value: number;
    }
  | {
      type: 'operative_stress_available';
    };

export type ContactLedgerEffectDefinition = {
  type: 'create_entry';
  definitionId: LedgerEntryDefinitionId;
  relatedContact: true;
};

export type ContactServiceDefinition = {
  id: ContactServiceId;
  label: string;
  description: string;
  requirements?: readonly ContactServiceRequirement[];
  cost?: ContactServiceCost;
  effects: PressureDelta;
  contactEffects?: ContactMetricDelta;
  ledgerEffects?: readonly ContactLedgerEffectDefinition[];
  rivalPressureEffects?: Partial<Record<RivalId, number>>;
  riskModifier?: number;
  specialEffect?: 'quiet_treatment';
};

export type UniversalContactOptionDefinition = {
  id: ContactOptionId;
  kind: Exclude<ContactOptionKind, 'request_service'>;
  label: string;
  description: string;
  cost?: ContactServiceCost;
  effects: PressureDelta;
  contactEffects: ContactMetricDelta;
};

export type ContactDefinition = {
  id: ContactId;
  name: string;
  archetype: ContactArchetype;
  roleTags: readonly ContactRoleTag[];
  associatedDistrictId?: DistrictId;
  associatedVenueId?: VenueId;
  associatedRivalId?: RivalId;
  baseTrust: number;
  baseLeverage: number;
  baseVolatility: number;
  baseExposure: number;
  services: readonly ContactServiceDefinition[];
  eventIds: readonly string[];
  generationTags: readonly ContactGenerationTag[];
  flavor: {
    dossier: string;
    quote?: string;
    visualTags?: readonly string[];
  };
};
