import type { DistrictDefinition, DistrictId } from '../model';

export const RIVAL_TERRITORY_DISTRICTS = [
  {
    id: 'district_violet_ward',
    name: 'Violet Ward',
    archetype: 'pleasure_district',
    baseControl: 12,
    baseHeat: 20,
    wealth: 65,
    secrecy: 70,
    volatility: 55,
    rivalId: 'rival_nyx_ardent',
    venueIds: ['venue_pale_circuit', 'venue_glass_saint'],
    tags: ['nightlife', 'liaison', 'social'],
  },
  {
    id: 'district_chrome_narrows',
    name: 'Chrome Narrows',
    archetype: 'industrial_corridor',
    baseControl: 8,
    baseHeat: 28,
    wealth: 50,
    secrecy: 35,
    volatility: 70,
    rivalId: 'rival_knox_marrow',
    venueIds: ['venue_zero_mercy'],
    tags: ['violence', 'smuggling', 'industrial'],
  },
  {
    id: 'district_ghostline_market',
    name: 'Ghostline Market',
    archetype: 'black_market',
    baseControl: 5,
    baseHeat: 14,
    wealth: 45,
    secrecy: 85,
    volatility: 75,
    venueIds: ['venue_black_halo_exchange'],
    tags: ['intel', 'memory', 'weird', 'black_market'],
  },
] as const satisfies readonly DistrictDefinition[];

export function getDistrictDefinition(districtId: DistrictId): DistrictDefinition | undefined {
  return RIVAL_TERRITORY_DISTRICTS.find((district) => district.id === districtId);
}
