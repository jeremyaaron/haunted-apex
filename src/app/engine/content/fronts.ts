import type { FrontDefinition, FrontDefinitionId } from '../model';

export const FRONT_DEFINITIONS = [
  {
    id: 'front_pale_circuit',
    name: 'The Pale Circuit',
    archetype: 'lounge',
    roleTags: ['loyalty', 'resources', 'nightlife', 'stability'],
    preferredVenueIds: ['venue_pale_circuit'],
    setupCost: 0,
    upgradeCost: 1200,
    maxLevel: 2,
    baseWeeklyYield: {
      resources: 250,
      loyalty: 1,
    },
    level2BonusYield: {
      resources: 250,
      loyalty: 1,
      dominion: 1,
    },
    establishEffects: {},
    upgradeEffects: {
      dominion: 3,
      heat: 2,
    },
    exposureOnEstablish: 12,
    exposureOnUpgrade: 8,
    exposurePerWeek: 2,
    districtControlYield: 1,
    eventIds: ['front_staff_wants_protection', 'front_back_room_ledger'],
    flavor: {
      dossier:
        'The Pale Circuit is not profitable enough to explain why people keep coming back. That is its first useful quality.',
      visualTags: ['nightlife', 'violet', 'starting', 'lounge'],
    },
  },
  {
    id: 'front_black_clinic',
    name: 'Black Clinic',
    archetype: 'clinic',
    roleTags: ['loyalty', 'stability', 'heat_control'],
    preferredDistrictIds: ['district_ghostline_market'],
    setupCost: 1500,
    upgradeCost: 1300,
    maxLevel: 2,
    baseWeeklyYield: {
      loyalty: 2,
      heat: -1,
    },
    level2BonusYield: {
      loyalty: 1,
      heat: -1,
    },
    establishEffects: {
      loyalty: 3,
    },
    upgradeEffects: {
      loyalty: 2,
      heat: 2,
    },
    exposureOnEstablish: 10,
    exposureOnUpgrade: 8,
    exposurePerWeek: 2,
    districtControlYield: 1,
    eventIds: ['front_inspection', 'front_staff_wants_protection'],
    flavor: {
      dossier:
        'Keeps the crew stable and cools minor Heat, but ties you to bodies, bills, and bad medicine.',
      visualTags: ['clinic', 'black_glass', 'medicine'],
    },
  },
  {
    id: 'front_courier_line',
    name: 'Courier Line',
    archetype: 'courier_line',
    roleTags: ['resources', 'heat_control', 'security'],
    preferredDistrictIds: ['district_chrome_narrows', 'district_ghostline_market'],
    setupCost: 1300,
    upgradeCost: 1200,
    maxLevel: 2,
    baseWeeklyYield: {
      resources: 450,
      heat: -1,
    },
    level2BonusYield: {
      resources: 350,
    },
    establishEffects: {
      intel: 2,
    },
    upgradeEffects: {
      dominion: 2,
    },
    exposureOnEstablish: 14,
    exposureOnUpgrade: 8,
    exposurePerWeek: 3,
    districtControlYield: 1,
    eventIds: ['front_clean_money_dirty_hands', 'front_staff_wants_protection'],
    flavor: {
      dossier:
        'The safest money engine, but routes become patterns and patterns become evidence.',
      visualTags: ['courier', 'routes', 'rain'],
    },
  },
  {
    id: 'front_zero_mercy_cut',
    name: 'Zero Mercy Cut',
    archetype: 'fight_pit',
    roleTags: ['resources', 'dominion', 'rival_pressure'],
    preferredVenueIds: ['venue_zero_mercy'],
    setupCost: 1200,
    upgradeCost: 1400,
    maxLevel: 2,
    baseWeeklyYield: {
      resources: 550,
      dominion: 1,
      heat: 1,
    },
    level2BonusYield: {
      resources: 450,
      dominion: 1,
      heat: 1,
    },
    establishEffects: {
      dominion: 4,
      heat: 4,
    },
    upgradeEffects: {
      dominion: 4,
      heat: 4,
    },
    exposureOnEstablish: 20,
    exposureOnUpgrade: 12,
    exposurePerWeek: 5,
    districtControlYield: 2,
    rivalPressureOnEstablish: 10,
    rivalPressurePerWeek: 2,
    eventIds: ['front_rival_leans_on_your_front', 'front_clean_money_dirty_hands'],
    flavor: {
      dossier: 'Fast money and Dominion. Loud as hell. Knox will notice.',
      visualTags: ['fight_pit', 'chrome', 'blood_sport'],
    },
  },
  {
    id: 'front_shell_gallery',
    name: 'Shell Gallery',
    archetype: 'shell_gallery',
    roleTags: ['heat_control', 'resources', 'social'],
    preferredDistrictIds: ['district_violet_ward'],
    setupCost: 1600,
    upgradeCost: 1000,
    maxLevel: 2,
    baseWeeklyYield: {
      resources: 300,
      heat: -2,
    },
    level2BonusYield: {
      resources: 250,
      heat: -1,
    },
    establishEffects: {
      heat: -3,
    },
    upgradeEffects: {
      dominion: 2,
    },
    exposureOnEstablish: 12,
    exposureOnUpgrade: 7,
    exposurePerWeek: 2,
    districtControlYield: 1,
    eventIds: ['front_inspection', 'front_back_room_ledger'],
    flavor: {
      dossier:
        'Money laundering as culture. Safer than it should be until someone asks who bought the art.',
      visualTags: ['gallery', 'shell_company', 'violet'],
    },
  },
  {
    id: 'front_surveillance_den',
    name: 'Surveillance Den',
    archetype: 'surveillance_den',
    roleTags: ['intel', 'ruin', 'security'],
    preferredDistrictIds: ['district_ghostline_market'],
    setupCost: 1400,
    upgradeCost: 1300,
    maxLevel: 2,
    baseWeeklyYield: {
      intel: 3,
      ruin: 1,
    },
    level2BonusYield: {
      intel: 3,
      ruin: 1,
    },
    establishEffects: {
      intel: 4,
    },
    upgradeEffects: {
      intel: 4,
      heat: 2,
    },
    exposureOnEstablish: 16,
    exposureOnUpgrade: 10,
    exposurePerWeek: 3,
    districtControlYield: 1,
    eventIds: ['front_inspection', 'front_back_room_ledger'],
    flavor: {
      dossier:
        'Information infrastructure. It tells you too much, and eventually something notices you listening.',
      visualTags: ['surveillance', 'ghostline', 'signal'],
    },
  },
] as const satisfies readonly FrontDefinition[];

export function getFrontDefinition(
  frontDefinitionId: FrontDefinitionId,
): FrontDefinition | undefined {
  return FRONT_DEFINITIONS.find((front) => front.id === frontDefinitionId);
}
