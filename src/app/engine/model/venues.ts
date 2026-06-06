import type { DistrictId } from './districts';
import type { RivalId } from './rivals';

export type VenueId =
  | 'venue_pale_circuit'
  | 'venue_glass_saint'
  | 'venue_zero_mercy'
  | 'venue_black_halo_exchange';

export type VenueArchetype =
  | 'failing_lounge'
  | 'memory_lounge'
  | 'fight_club'
  | 'secret_auction';

export type VenueDefinition = {
  id: VenueId;
  name: string;
  archetype: VenueArchetype;
  districtId: DistrictId;
  wealthMod: number;
  intelMod: number;
  dominionMod: number;
  heatMod: number;
  loyaltyMod: number;
  ruinMod: number;
  controllingRivalId?: RivalId;
  tags: readonly string[];
};
