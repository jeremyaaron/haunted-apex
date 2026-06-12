import type { RivalDefinition, RivalId } from '../model';

export const RIVAL_TERRITORY_RIVALS = [
  {
    id: 'rival_nyx_ardent',
    name: 'Nyx Ardent',
    archetype: 'velvet_tyrant',
    power: 45,
    aggression: 35,
    subtlety: 80,
    socialControl: 90,
    baseDisposition: -35,
    preferredPressureAttack: 'loyalty',
    associatedFactionId: 'faction_velvet_house',
    controlledDistrictIds: ['district_violet_ward'],
    controlledVenueIds: ['venue_glass_saint'],
    traits: ['weaponizes_liaisons', 'punishes_low_intel'],
  },
  {
    id: 'rival_knox_marrow',
    name: 'Knox Marrow',
    archetype: 'chrome_butcher',
    power: 55,
    aggression: 85,
    subtlety: 25,
    socialControl: 30,
    baseDisposition: -50,
    preferredPressureAttack: 'heat',
    associatedFactionId: 'faction_chrome_maw',
    controlledDistrictIds: ['district_chrome_narrows'],
    controlledVenueIds: ['venue_zero_mercy'],
    traits: ['territory_pressure', 'loud_reprisals'],
  },
] as const satisfies readonly RivalDefinition[];

export function getRivalDefinition(rivalId: RivalId): RivalDefinition | undefined {
  return RIVAL_TERRITORY_RIVALS.find((rival) => rival.id === rivalId);
}
