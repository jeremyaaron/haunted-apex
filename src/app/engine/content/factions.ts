import type { FactionDefinition, FactionId } from '../model';

const GENERIC_FACTION_EVENT_IDS = [
  'faction_demand',
  'faction_scrutiny',
  'accord_terms_shift',
  'market_access',
  'proxy_conflict',
  'institutional_blind_spot',
] as const;

export const FACTION_DEFINITIONS = [
  {
    id: 'faction_ashline_bureau',
    name: 'Ashline Bureau',
    archetype: 'security_bureau',
    roleTags: ['heat_control', 'security', 'ledger', 'fronts'],
    baseStanding: 45,
    baseSuspicion: 35,
    baseObligation: 0,
    accordIds: ['accord_ashline_clean_corridor', 'accord_ashline_inspection_delay'],
    associatedDistrictIds: ['district_chrome_narrows'],
    associatedVenueIds: ['venue_pale_circuit'],
    associatedContactIds: ['contact_captain_hollis'],
    associatedFrontTags: ['heat_control', 'security', 'stability'],
    eventIds: GENERIC_FACTION_EVENT_IDS,
    flavor: {
      dossier: 'Ashline Bureau does not prevent crime. It prices visibility.',
      visualTags: ['security', 'patrols', 'compliance', 'files'],
    },
  },
  {
    id: 'faction_helix_meridian',
    name: 'Helix Meridian',
    archetype: 'megacorp',
    roleTags: ['resources', 'fronts', 'security', 'dominion'],
    baseStanding: 40,
    baseSuspicion: 25,
    baseObligation: 0,
    accordIds: ['accord_helix_quiet_capital', 'accord_helix_permit_shell'],
    associatedDistrictIds: ['district_violet_ward', 'district_chrome_narrows'],
    associatedFrontTags: ['resources', 'security', 'heat_control', 'social'],
    eventIds: GENERIC_FACTION_EVENT_IDS,
    flavor: {
      dossier:
        'Helix Meridian owns buildings, arteries, boardrooms, and several versions of the truth.',
      visualTags: ['megacorp', 'permits', 'capital', 'contracts'],
    },
  },
  {
    id: 'faction_velvet_house',
    name: 'Velvet House',
    archetype: 'nightlife_house',
    roleTags: ['nightlife', 'intel', 'dominion', 'ledger', 'rival_pressure', 'social'],
    baseStanding: 48,
    baseSuspicion: 20,
    baseObligation: 0,
    accordIds: ['accord_velvet_guest_list', 'accord_velvet_silence'],
    associatedDistrictIds: ['district_violet_ward'],
    associatedVenueIds: ['venue_glass_saint', 'venue_pale_circuit'],
    associatedRivalIds: ['rival_nyx_ardent'],
    associatedContactIds: ['contact_veyra_lux', 'contact_mina_glass'],
    associatedFrontTags: ['nightlife', 'social', 'loyalty'],
    eventIds: GENERIC_FACTION_EVENT_IDS,
    flavor: {
      dossier: 'Velvet House does not own the nightlife. It owns the invitations.',
      visualTags: ['nightlife', 'invitations', 'guest_lists', 'velvet'],
    },
  },
  {
    id: 'faction_chrome_maw',
    name: 'Chrome Maw',
    archetype: 'industrial_syndicate',
    roleTags: ['resources', 'dominion', 'industrial', 'rival_pressure'],
    baseStanding: 38,
    baseSuspicion: 30,
    baseObligation: 0,
    accordIds: ['accord_chrome_dockside_tithe', 'accord_chrome_muscle_retainer'],
    associatedDistrictIds: ['district_chrome_narrows'],
    associatedVenueIds: ['venue_zero_mercy'],
    associatedRivalIds: ['rival_knox_marrow'],
    associatedFrontTags: ['resources', 'dominion', 'rival_pressure', 'security'],
    eventIds: GENERIC_FACTION_EVENT_IDS,
    flavor: {
      dossier: 'Chrome Maw moves steel, bodies, fuel, and blame through the same loading doors.',
      visualTags: ['industrial', 'shipments', 'muscle', 'chrome'],
    },
  },
  {
    id: 'faction_ghostline_communion',
    name: 'Ghostline Communion',
    archetype: 'ghost_market',
    roleTags: ['intel', 'ledger', 'weird', 'ruin'],
    baseStanding: 42,
    baseSuspicion: 15,
    baseObligation: 0,
    accordIds: ['accord_ghostline_dead_channel', 'accord_ghostline_mercy_static'],
    associatedDistrictIds: ['district_ghostline_market'],
    associatedVenueIds: ['venue_black_halo_exchange'],
    associatedContactIds: ['contact_ciro_moth', 'contact_father_static'],
    associatedFrontTags: ['intel', 'weird', 'ruin'],
    eventIds: GENERIC_FACTION_EVENT_IDS,
    flavor: {
      dossier:
        'Ghostline Communion calls itself a market because the word cult attracts regulators.',
      visualTags: ['dead_channels', 'signals', 'strange_markets', 'memory'],
    },
  },
] as const satisfies readonly FactionDefinition[];

export function getFactionDefinition(factionId: FactionId): FactionDefinition | undefined {
  return FACTION_DEFINITIONS.find((faction) => faction.id === factionId);
}
