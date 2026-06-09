import type { VenueDefinition, VenueId } from '../model';

export const RIVAL_TERRITORY_VENUES = [
  {
    id: 'venue_pale_circuit',
    name: 'The Pale Circuit',
    archetype: 'failing_lounge',
    districtId: 'district_violet_ward',
    wealthMod: 0,
    intelMod: 1,
    dominionMod: -2,
    heatMod: -1,
    loyaltyMod: 1,
    ruinMod: 0,
    tags: ['safe', 'nightlife', 'starting'],
  },
  {
    id: 'venue_glass_saint',
    name: 'The Glass Saint',
    archetype: 'memory_lounge',
    districtId: 'district_violet_ward',
    wealthMod: 1,
    intelMod: 4,
    dominionMod: 1,
    heatMod: 4,
    loyaltyMod: 0,
    ruinMod: 3,
    controllingRivalId: 'rival_nyx_ardent',
    tags: ['elite', 'liaison', 'memory', 'seduction'],
  },
  {
    id: 'venue_zero_mercy',
    name: 'Zero Mercy',
    archetype: 'fight_club',
    districtId: 'district_chrome_narrows',
    wealthMod: 3,
    intelMod: -1,
    dominionMod: 2,
    heatMod: 5,
    loyaltyMod: 2,
    ruinMod: 2,
    controllingRivalId: 'rival_knox_marrow',
    tags: ['violence', 'money', 'notoriety'],
  },
  {
    id: 'venue_black_halo_exchange',
    name: 'Black Halo Exchange',
    archetype: 'secret_auction',
    districtId: 'district_ghostline_market',
    wealthMod: 2,
    intelMod: 3,
    dominionMod: 1,
    heatMod: 1,
    loyaltyMod: -1,
    ruinMod: 3,
    tags: ['blackmail', 'auction', 'memory', 'rare'],
  },
] as const satisfies readonly VenueDefinition[];

export function getVenueDefinition(venueId: VenueId): VenueDefinition | undefined {
  return RIVAL_TERRITORY_VENUES.find((venue) => venue.id === venueId);
}
