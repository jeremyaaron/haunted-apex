import type {
  ContactDefinition,
  ContactId,
  UniversalContactOptionDefinition,
} from '../model';

export const UNIVERSAL_CONTACT_OPTIONS = [
  {
    id: 'cultivate',
    kind: 'cultivate',
    label: 'Cultivate',
    description: 'Spend time and money to make the relationship safer and more cooperative.',
    cost: {
      resources: 600,
    },
    effects: {},
    contactEffects: {
      trust: 10,
      volatility: -6,
      exposure: 2,
    },
  },
  {
    id: 'pressure',
    kind: 'pressure',
    label: 'Pressure',
    description: 'Extract immediate value by making the relationship more coercive and unstable.',
    effects: {
      intel: 4,
      ruin: 2,
    },
    contactEffects: {
      leverage: 10,
      trust: -6,
      volatility: 8,
    },
  },
] as const satisfies readonly UniversalContactOptionDefinition[];

export const CONTACT_DEFINITIONS = [
  {
    id: 'contact_veyra_lux',
    name: 'Veyra Lux',
    archetype: 'liaison',
    roleTags: ['nightlife', 'intel', 'ledger', 'rival_pressure', 'social'],
    associatedDistrictId: 'district_violet_ward',
    associatedVenueId: 'venue_glass_saint',
    associatedRivalId: 'rival_nyx_ardent',
    baseTrust: 42,
    baseLeverage: 18,
    baseVolatility: 55,
    baseExposure: 48,
    services: [
      {
        id: 'private_room_access',
        label: 'Private Room Access',
        description:
          'Open elite nightlife channels for Intel and Dominion while giving Nyx a longer shadow.',
        effects: {
          intel: 8,
          dominion: 3,
        },
        contactEffects: {
          trust: -6,
          volatility: 8,
        },
        ledgerEffects: [
          {
            type: 'create_entry',
            definitionId: 'debt_owes_liaison',
            relatedContact: true,
          },
        ],
        rivalPressureEffects: {
          rival_nyx_ardent: 6,
        },
      },
      {
        id: 'soothe_the_room',
        label: 'Soothe the Room',
        description: 'Turn Veyra loose on the room before panic becomes testimony.',
        cost: {
          resources: 700,
        },
        effects: {
          loyalty: 4,
          heat: -3,
        },
        contactEffects: {
          trust: 2,
        },
      },
    ],
    eventIds: ['event_veyra_room'],
    generationTags: ['nightlife', 'intel', 'ledger', 'rival_pressure', 'social', 'rival_linked'],
    flavor: {
      dossier:
        'Veyra Lux knows which rooms are real, which rooms are theater, and which rooms only exist because someone powerful needs to sin privately.',
      visualTags: ['velvet', 'glass', 'private_rooms'],
    },
  },
  {
    id: 'contact_captain_hollis',
    name: 'Captain Rafe Hollis',
    archetype: 'official',
    roleTags: ['heat_control', 'security', 'ledger', 'stability'],
    associatedDistrictId: 'district_chrome_narrows',
    baseTrust: 35,
    baseLeverage: 30,
    baseVolatility: 35,
    baseExposure: 60,
    services: [
      {
        id: 'clean_passage',
        label: 'Clean Passage',
        description: 'Move through checkpoint pressure before it becomes a public operation.',
        cost: {
          resources: 800,
        },
        effects: {
          heat: -10,
        },
        contactEffects: {
          exposure: 4,
        },
      },
      {
        id: 'lose_the_file',
        label: 'Lose the File',
        description: 'Make a file disappear by reminding Hollis why you have his number.',
        requirements: [
          {
            type: 'min_leverage',
            value: 30,
          },
        ],
        effects: {
          heat: -6,
          intel: -2,
        },
        contactEffects: {
          trust: -4,
          volatility: 5,
        },
      },
    ],
    eventIds: ['event_hollis_watched'],
    generationTags: ['heat_control', 'security', 'ledger', 'stability', 'official_channel'],
    flavor: {
      dossier:
        'Hollis wears a uniform he no longer believes in and still cashes every part of the salary.',
      visualTags: ['checkpoint', 'badge', 'rain'],
    },
  },
  {
    id: 'contact_dr_mercy_iram',
    name: 'Dr. Mercy Iram',
    archetype: 'surgeon',
    roleTags: ['loyalty', 'stability', 'ruin'],
    associatedDistrictId: 'district_ghostline_market',
    baseTrust: 48,
    baseLeverage: 12,
    baseVolatility: 30,
    baseExposure: 25,
    services: [
      {
        id: 'patch_the_crew',
        label: 'Patch the Crew',
        description: 'Buy clean hands, clean tools, and no questions after the job.',
        cost: {
          resources: 900,
        },
        effects: {
          loyalty: 8,
        },
        contactEffects: {
          trust: 2,
        },
      },
      {
        id: 'quiet_treatment',
        label: 'Quiet Treatment',
        description: 'Stabilize the crew member closest to breaking without creating a scene.',
        requirements: [
          {
            type: 'operative_stress_available',
          },
        ],
        cost: {
          resources: 1100,
        },
        effects: {
          heat: -4,
        },
        contactEffects: {
          exposure: 3,
        },
        specialEffect: 'quiet_treatment',
      },
    ],
    eventIds: ['event_mercy_bill'],
    generationTags: ['loyalty', 'stability', 'ruin', 'clinic', 'low_exposure'],
    flavor: {
      dossier: 'Dr. Mercy asks no questions because she already knows worse answers.',
      visualTags: ['clinic', 'black_glass', 'sterile_light'],
    },
  },
  {
    id: 'contact_ciro_moth',
    name: 'Ciro Moth',
    archetype: 'broker',
    roleTags: ['intel', 'weird', 'ruin', 'ledger'],
    associatedDistrictId: 'district_ghostline_market',
    associatedVenueId: 'venue_black_halo_exchange',
    baseTrust: 28,
    baseLeverage: 22,
    baseVolatility: 65,
    baseExposure: 20,
    services: [
      {
        id: 'sell_a_whisper',
        label: 'Sell a Whisper',
        description: 'Buy a name, route, or memory from someone who insists those differ.',
        cost: {
          resources: 500,
        },
        effects: {
          intel: 10,
          ruin: 2,
        },
        contactEffects: {
          volatility: 5,
        },
      },
      {
        id: 'hidden_route',
        label: 'Hidden Route',
        description: 'Take a route that pays because it remembers where the cameras were.',
        effects: {
          resources: 900,
          heat: -4,
          ruin: 2,
        },
        contactEffects: {
          trust: -4,
          volatility: 6,
        },
        ledgerEffects: [
          {
            type: 'create_entry',
            definitionId: 'secret_dead_channel_trace',
            relatedContact: true,
          },
        ],
      },
    ],
    eventIds: ['event_ciro_route_remembers'],
    generationTags: ['intel', 'weird', 'ruin', 'ledger', 'high_risk', 'low_exposure'],
    flavor: {
      dossier:
        'Ciro Moth sells routes, names, and occasionally memories. He insists the routes remember you first.',
      visualTags: ['ghostline', 'auction', 'memory_static'],
    },
  },
  {
    id: 'contact_mina_glass',
    name: 'Mina Glass',
    archetype: 'club_heir',
    roleTags: ['nightlife', 'social', 'resources', 'intel'],
    associatedDistrictId: 'district_violet_ward',
    baseTrust: 52,
    baseLeverage: 10,
    baseVolatility: 45,
    baseExposure: 40,
    services: [
      {
        id: 'open_the_guest_list',
        label: 'Open the Guest List',
        description: 'Turn a private guest list into soft power and names worth keeping.',
        cost: {
          trust: 5,
        },
        effects: {
          intel: 6,
          dominion: 4,
        },
        contactEffects: {
          exposure: 5,
        },
      },
      {
        id: 'quiet_investor',
        label: 'Quiet Investor',
        description: 'Bring in money from someone who expects the books to stay dark.',
        effects: {
          resources: 1200,
        },
        contactEffects: {
          trust: -8,
          volatility: 6,
        },
        ledgerEffects: [
          {
            type: 'create_entry',
            definitionId: 'debt_contaminated_money',
            relatedContact: true,
          },
        ],
      },
    ],
    eventIds: [],
    generationTags: ['nightlife', 'social', 'resources', 'intel'],
    flavor: {
      dossier: 'Mina inherited a club, three enemies, and a guest list that could collapse a ministry.',
      visualTags: ['guest_list', 'club_heir', 'ministry_money'],
    },
  },
  {
    id: 'contact_father_static',
    name: 'Father Static',
    archetype: 'confessor',
    roleTags: ['ruin', 'weird', 'ledger', 'intel'],
    associatedDistrictId: 'district_ghostline_market',
    baseTrust: 40,
    baseLeverage: 18,
    baseVolatility: 70,
    baseExposure: 15,
    services: [
      {
        id: 'absolution_protocol',
        label: 'Absolution Protocol',
        description: 'Scrub a confession from the signal and lose useful names with it.',
        cost: {
          resources: 700,
        },
        effects: {
          ruin: -4,
          intel: -3,
        },
        contactEffects: {
          volatility: 3,
        },
      },
      {
        id: 'confession_leak',
        label: 'Confession Leak',
        description: 'Turn someone else\'s confession into usable leverage before it turns back.',
        requirements: [
          {
            type: 'min_leverage',
            value: 25,
          },
        ],
        effects: {
          intel: 7,
          dominion: 3,
          ruin: 3,
        },
        contactEffects: {
          trust: -5,
          volatility: 8,
        },
      },
    ],
    eventIds: ['event_confession_leak'],
    generationTags: ['ruin', 'weird', 'ledger', 'intel', 'high_risk', 'low_exposure'],
    flavor: {
      dossier:
        'Father Static hears confessions through dead channels and never explains who forgives whom.',
      visualTags: ['dead_channel', 'confessional', 'signal'],
    },
  },
] as const satisfies readonly ContactDefinition[];

export function getContactDefinition(contactId: ContactId): ContactDefinition | undefined {
  return CONTACT_DEFINITIONS.find((contact) => contact.id === contactId);
}
