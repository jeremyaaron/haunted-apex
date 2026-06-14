import type { ContactId, ContactMetricDelta } from './contacts';
import type { EventId, EventTag } from './events';
import type { FactionId, FactionMetricDelta } from './factions';
import type { FrontDefinitionId, FrontRoleTag } from './fronts';
import type { OperativeId, OperativeRoleTag } from './operatives';
import type { PressureDelta } from './pressures';
import type { RivalId } from './rivals';

export type CampaignTensionId =
  | 'campaign_corp_crackdown'
  | 'campaign_nightlife_war'
  | 'campaign_ghostline_signal'
  | 'campaign_industrial_cut'
  | 'campaign_dirty_capital';

export type CampaignRoleTag =
  | 'heat'
  | 'nightlife'
  | 'ghostline'
  | 'industrial'
  | 'capital'
  | 'fronts'
  | 'ledger'
  | 'contacts'
  | 'factions'
  | 'rivals'
  | 'ruin'
  | 'resources'
  | 'dominion';

export type CityProfile =
  | 'rain_noir'
  | 'violet_nightlife'
  | 'ghost_market'
  | 'industrial_chrome'
  | 'corporate_spire';

export type CityIdentity = {
  name: string;
  profile: CityProfile;
};

export type CampaignGenerationBias = {
  requiredFactionIds?: readonly FactionId[];
  weightedFactionIds?: Partial<Record<FactionId, number>>;
  featuredRivalIds?: readonly RivalId[];
  weightedRivalIds?: Partial<Record<RivalId, number>>;
  requiredContactIds?: readonly ContactId[];
  weightedContactIds?: Partial<Record<ContactId, number>>;
  weightedOperativeIds?: Partial<Record<OperativeId, number>>;
  weightedOperativeTags?: Partial<Record<OperativeRoleTag, number>>;
  weightedFrontDefinitionIds?: Partial<Record<FrontDefinitionId, number>>;
  weightedFrontTags?: Partial<Record<FrontRoleTag, number>>;
  weightedEventTags?: Partial<Record<EventTag, number>>;
};

export type CampaignEventWeightModifier = {
  eventId?: EventId;
  eventTag?: EventTag;
  weightDelta: number;
};

export type CampaignTensionDefinition = {
  id: CampaignTensionId;
  name: string;
  subtitle: string;
  roleTags: readonly CampaignRoleTag[];
  description: string;
  openingBriefing: string;
  cityProfileOptions: readonly CityProfile[];
  startingPressureDelta?: PressureDelta;
  factionModifiers?: Partial<Record<FactionId, FactionMetricDelta>>;
  rivalPressureModifiers?: Partial<Record<RivalId, number>>;
  contactMetricModifiers?: Partial<Record<ContactId, ContactMetricDelta>>;
  generationBias: CampaignGenerationBias;
  eventWeightModifiers?: readonly CampaignEventWeightModifier[];
  targetedGatherIntelSecretDiscoveryBonus?: number;
  briefing: {
    pressurePattern: readonly string[];
    activeLabels: readonly string[];
    favoredLabels: readonly string[];
  };
  runSummaryFlavor?: {
    victoryLine?: string;
    lossLine?: string;
    epitaphTemplates?: readonly string[];
  };
};

export type CampaignState = {
  tensionId: CampaignTensionId;
  cityName: string;
  cityProfile: CityProfile;
  openingBriefingShown: boolean;
  appliedModifiers: {
    startingPressureDelta?: PressureDelta;
    factionModifiers?: Partial<Record<FactionId, FactionMetricDelta>>;
    rivalPressureModifiers?: Partial<Record<RivalId, number>>;
    contactMetricModifiers?: Partial<Record<ContactId, ContactMetricDelta>>;
  };
  activeContent: {
    factionIds: readonly FactionId[];
    rivalIds: readonly RivalId[];
    contactIds: readonly ContactId[];
    frontDefinitionIds: readonly FrontDefinitionId[];
    startingOperativeIds: readonly OperativeId[];
  };
  flags: Record<string, boolean | number | string>;
};
