import type { DistrictId } from './districts';
import type { PressureDelta } from './pressures';
import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type FrontDefinitionId =
  | 'front_pale_circuit'
  | 'front_black_clinic'
  | 'front_courier_line'
  | 'front_zero_mercy_cut'
  | 'front_shell_gallery'
  | 'front_surveillance_den';

export type FrontId = FrontDefinitionId;

export type FrontOpportunityId = `front_opportunity_${FrontDefinitionId}`;

export type FrontOptionId = 'establish' | 'upgrade';

export type FrontStatus = 'quiet' | 'noticed' | 'hot' | 'compromised';

export type FrontArchetype =
  | 'lounge'
  | 'clinic'
  | 'courier_line'
  | 'fight_pit'
  | 'shell_gallery'
  | 'surveillance_den'
  | 'data_chapel';

export type FrontRoleTag =
  | 'resources'
  | 'loyalty'
  | 'intel'
  | 'heat_control'
  | 'dominion'
  | 'ruin'
  | 'stability'
  | 'rival_pressure'
  | 'nightlife'
  | 'security'
  | 'weird'
  | 'social';

export type FrontDefinition = {
  id: FrontDefinitionId;
  name: string;
  archetype: FrontArchetype;
  roleTags: readonly FrontRoleTag[];
  allowedDistrictTags?: readonly string[];
  preferredDistrictIds?: readonly DistrictId[];
  preferredVenueIds?: readonly VenueId[];
  setupCost: number;
  upgradeCost: number;
  maxLevel: 2;
  baseWeeklyYield: PressureDelta;
  level2BonusYield: PressureDelta;
  establishEffects: PressureDelta;
  upgradeEffects: PressureDelta;
  exposureOnEstablish: number;
  exposureOnUpgrade: number;
  exposurePerWeek: number;
  districtControlYield?: number;
  rivalPressureOnEstablish?: number;
  rivalPressurePerWeek?: number;
  eventIds: readonly string[];
  flavor: {
    dossier: string;
    visualTags?: readonly string[];
  };
};

export type FrontYieldHistoryEntry = {
  week: number;
  effects: PressureDelta;
  exposureDelta: number;
};

export type FrontState = {
  id: FrontId;
  definitionId: FrontDefinitionId;
  districtId: DistrictId;
  venueId?: VenueId;
  relatedRivalId?: RivalId;
  level: 1 | 2;
  exposure: number;
  establishedWeek: number;
  compromised: boolean;
  active: boolean;
  flags: Record<string, boolean | number | string>;
  yieldHistory: FrontYieldHistoryEntry[];
};

export type FrontOpportunity = {
  id: FrontOpportunityId;
  definitionId: FrontDefinitionId;
  districtId: DistrictId;
  venueId?: VenueId;
  relatedRivalId?: RivalId;
};
