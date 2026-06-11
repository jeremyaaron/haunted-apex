import type { CityEventDefinition } from '../model';

export const CONTACT_EVENTS: readonly CityEventDefinition[] = [
  {
    kind: 'city',
    id: 'contact_wants_assurance',
    title: '{contactName} Wants Assurance',
    text: '{contactName} has heard too many versions of your future and wants to know which one keeps them alive.',
    tags: ['CONTACT', 'LOYALTY'],
    baseWeight: 4,
    contact: {
      generic: true,
    },
    choices: [
      {
        id: 'reassure_them',
        label: 'Reassure them',
        cost: { resources: 500 },
        effects: { loyalty: 2 },
        contactEffects: { trust: 6, volatility: -4 },
      },
      {
        id: 'lean_on_the_relationship',
        label: 'Lean on the relationship',
        effects: { intel: 3, ruin: 1 },
        contactEffects: { leverage: 5, trust: -4, volatility: 5 },
      },
      {
        id: 'keep_distance',
        label: 'Keep distance',
        effects: { heat: -2 },
        contactEffects: { trust: -3, exposure: -2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'event_veyra_room',
    title: "Veyra's Room",
    text: 'Veyra Lux offers a private room where the cameras are decorative and the people are not.',
    tags: ['CONTACT', 'LIAISON', 'INTEL', 'OPPORTUNITY'],
    baseWeight: 4,
    contact: {
      contactId: 'contact_veyra_lux',
      signature: true,
      minTrust: 30,
    },
    choices: [
      {
        id: 'take_the_private_room',
        label: 'Take the private room',
        effects: { intel: 7, dominion: 3, ruin: 2 },
        contactEffects: { trust: -4, volatility: 5 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'debt_owes_liaison',
            relatedContactId: 'contact_veyra_lux',
          },
        ],
      },
      {
        id: 'pay_for_the_room',
        label: 'Pay for the room',
        cost: { resources: 800 },
        effects: { intel: 4 },
        contactEffects: { trust: 2, exposure: 2 },
      },
      {
        id: 'walk_away_smiling',
        label: 'Walk away smiling',
        effects: { loyalty: 2 },
        contactEffects: { trust: -2, volatility: -2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'event_hollis_watched',
    title: 'Hollis Is Being Watched',
    text: 'Captain Rafe Hollis sends one line: the checkpoint cameras are pointed at him now.',
    tags: ['CONTACT', 'HEAT', 'CORP'],
    baseWeight: 4,
    contact: {
      contactId: 'contact_captain_hollis',
      signature: true,
      minExposure: 45,
    },
    choices: [
      {
        id: 'burn_the_channel',
        label: 'Burn the channel',
        cost: { intel: 4 },
        effects: { heat: -8 },
        contactEffects: { trust: -3, exposure: -8 },
      },
      {
        id: 'cover_hollis',
        label: 'Cover Hollis',
        cost: { resources: 700 },
        effects: { heat: -4 },
        contactEffects: { trust: 5, exposure: -4 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'favor_checkpoint_captain',
            relatedContactId: 'contact_captain_hollis',
          },
        ],
      },
      {
        id: 'use_the_file',
        label: 'Use the file',
        effects: { dominion: 3, heat: 2 },
        contactEffects: { leverage: 5, trust: -4 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'event_mercy_bill',
    title: "Mercy's Bill",
    text: 'Dr. Mercy Iram sends an invoice with no header and a blood type written where the total should be.',
    tags: ['CONTACT', 'LOYALTY', 'RESOURCE'],
    baseWeight: 4,
    contact: {
      contactId: 'contact_dr_mercy_iram',
      signature: true,
      minTrust: 35,
    },
    choices: [
      {
        id: 'pay_the_bill',
        label: 'Pay the bill',
        cost: { resources: 900 },
        effects: { loyalty: 5 },
        contactEffects: { trust: 4, exposure: -2 },
      },
      {
        id: 'ask_for_credit',
        label: 'Ask for credit',
        effects: { loyalty: 2 },
        contactEffects: { trust: -4, volatility: 5 },
      },
      {
        id: 'send_someone_else',
        label: 'Send someone else',
        effects: { heat: 2, ruin: -2 },
        contactEffects: { trust: -2, leverage: 2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'event_ciro_route_remembers',
    title: "Ciro's Route Remembers",
    text: 'Ciro Moth says a route has started remembering the wrong version of you.',
    tags: ['CONTACT', 'INTEL', 'RUIN', 'OPPORTUNITY'],
    baseWeight: 4,
    contact: {
      contactId: 'contact_ciro_moth',
      signature: true,
      minVolatility: 50,
    },
    choices: [
      {
        id: 'follow_the_route',
        label: 'Follow the route',
        effects: { resources: 900, heat: -3, ruin: 2 },
        contactEffects: { trust: -3, volatility: 5 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_dead_channel_trace',
            relatedContactId: 'contact_ciro_moth',
          },
        ],
      },
      {
        id: 'cut_the_route',
        label: 'Cut the route',
        cost: { intel: 4 },
        effects: { heat: -6 },
        contactEffects: { leverage: -2, volatility: -4 },
      },
      {
        id: 'sell_the_memory',
        label: 'Sell the memory',
        effects: { intel: 7, ruin: 3 },
        contactEffects: { leverage: 3, volatility: 8 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'event_confession_leak',
    title: 'Confession Leak',
    text: 'Father Static offers a confession that has already started leaking through dead channels.',
    tags: ['CONTACT', 'INTEL', 'RUIN'],
    baseWeight: 4,
    contact: {
      contactId: 'contact_father_static',
      signature: true,
      minLeverage: 20,
    },
    choices: [
      {
        id: 'bury_the_confession',
        label: 'Bury the confession',
        cost: { intel: 3 },
        effects: { ruin: -3 },
        contactEffects: { trust: 4, exposure: 2 },
      },
      {
        id: 'broadcast_the_confession',
        label: 'Broadcast the confession',
        effects: { dominion: 5, intel: 4, ruin: 4 },
        contactEffects: { leverage: 3, trust: -5, volatility: 7 },
      },
      {
        id: 'turn_it_into_a_secret',
        label: 'Turn it into a Secret',
        effects: { intel: 3 },
        contactEffects: { leverage: 2, volatility: 2 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_dead_channel_trace',
            relatedContactId: 'contact_father_static',
          },
        ],
      },
    ],
  },
];
