import type { ContactId } from './contacts';
import type { DistrictId } from './districts';
import type { EventId } from './events';
import type { FrontRoleTag } from './fronts';
import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type FactionId =
  | 'faction_ashline_bureau'
  | 'faction_helix_meridian'
  | 'faction_velvet_house'
  | 'faction_chrome_maw'
  | 'faction_ghostline_communion';

export type FactionStatus =
  | 'hostile'
  | 'cold'
  | 'neutral'
  | 'favorable'
  | 'watching'
  | 'indebted'
  | 'entangled';

export type FactionArchetype =
  | 'security_bureau'
  | 'megacorp'
  | 'nightlife_house'
  | 'industrial_syndicate'
  | 'ghost_market'
  | 'memory_cult';

export type FactionRoleTag =
  | 'heat_control'
  | 'resources'
  | 'intel'
  | 'dominion'
  | 'fronts'
  | 'ledger'
  | 'rival_pressure'
  | 'security'
  | 'nightlife'
  | 'industrial'
  | 'weird'
  | 'ruin'
  | 'stability'
  | 'social';

export type FactionMetricDelta = {
  standing?: number;
  suspicion?: number;
  obligation?: number;
};

export type FactionInteraction = {
  week: number;
  sourceType: 'accord' | 'event' | 'action' | 'front' | 'contact' | 'ledger';
  sourceId: string;
  standingDelta?: number;
  suspicionDelta?: number;
  obligationDelta?: number;
};

export type FactionState = {
  id: FactionId;
  standing: number;
  suspicion: number;
  obligation: number;
  usedAccordIds: string[];
  activeAccordIds: string[];
  flags: Record<string, boolean | number | string>;
  recentInteractions: FactionInteraction[];
};

export type FactionDefinition = {
  id: FactionId;
  name: string;
  archetype: FactionArchetype;
  roleTags: readonly FactionRoleTag[];
  baseStanding: number;
  baseSuspicion: number;
  baseObligation: number;
  associatedDistrictIds?: readonly DistrictId[];
  associatedVenueIds?: readonly VenueId[];
  associatedRivalIds?: readonly RivalId[];
  associatedContactIds?: readonly ContactId[];
  associatedFrontTags?: readonly FrontRoleTag[];
  eventIds: readonly EventId[];
  flavor: {
    dossier: string;
    visualTags?: readonly string[];
  };
};
