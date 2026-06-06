import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type DistrictId =
  | 'district_violet_ward'
  | 'district_chrome_narrows'
  | 'district_ghostline_market';

export type DistrictArchetype =
  | 'pleasure_district'
  | 'industrial_corridor'
  | 'black_market';

export type DistrictDefinition = {
  id: DistrictId;
  name: string;
  archetype: DistrictArchetype;
  baseControl: number;
  baseHeat: number;
  wealth: number;
  secrecy: number;
  volatility: number;
  rivalId?: RivalId;
  venueIds: readonly VenueId[];
  tags: readonly string[];
};

export type DistrictState = {
  id: DistrictId;
  control: number;
  heat: number;
};
