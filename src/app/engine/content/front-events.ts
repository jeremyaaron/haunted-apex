import type { CityEventDefinition } from '../model';

export const FRONT_EVENTS = [
  {
    id: 'front_inspection',
    kind: 'city',
    title: 'Front Inspection: {frontName}',
    text:
      '{frontName} draws an official inspection. The forms are theater. The inspectors are looking for who flinches first.',
    tags: ['FRONT', 'HEAT', 'RESOURCE', 'CORP'],
    baseWeight: 2,
    front: {
      minExposure: 60,
    },
    choices: [
      {
        id: 'pay_for_clean_paperwork',
        label: 'Pay for clean paperwork',
        cost: { resources: 900 },
        effects: { heat: -5 },
        frontEffects: { exposure: -12 },
      },
      {
        id: 'burn_the_records',
        label: 'Burn the records',
        effects: { heat: -8, ruin: 3 },
        frontEffects: { exposure: -8 },
      },
      {
        id: 'let_them_look',
        label: 'Let them look',
        effects: { heat: 8 },
        frontEffects: { exposure: 6 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'debt_dirty_books',
          },
        ],
      },
    ],
  },
  {
    id: 'front_staff_wants_protection',
    kind: 'city',
    title: 'Staff Wants Protection: {frontName}',
    text:
      'The people keeping {frontName} open want protection before the street learns how exposed they are.',
    tags: ['FRONT', 'LOYALTY', 'RESOURCE'],
    baseWeight: 2,
    front: {},
    weightRules: [
      {
        pressure: 'heat',
        min: 60,
        addWeight: 3,
      },
      {
        pressure: 'loyalty',
        max: 45,
        addWeight: 3,
      },
    ],
    choices: [
      {
        id: 'pay_for_protection',
        label: 'Pay for protection',
        cost: { resources: 700 },
        effects: { loyalty: 5 },
        frontEffects: { exposure: -4 },
      },
      {
        id: 'make_an_example',
        label: 'Make an example',
        effects: { dominion: 4, loyalty: -5, ruin: 2 },
        frontEffects: { exposure: 4 },
      },
      {
        id: 'ignore_the_complaint',
        label: 'Ignore the complaint',
        effects: { loyalty: -4 },
        frontEffects: { exposure: 6 },
      },
    ],
  },
  {
    id: 'front_rival_leans_on_your_front',
    kind: 'city',
    title: 'Rival Leans on Your Front: {frontName}',
    text:
      '{frontName} sits close enough to rival territory that pressure has become personal. Somebody wants rent for silence.',
    tags: ['FRONT', 'RIVAL', 'RESOURCE'],
    baseWeight: 2,
    front: {
      requiresRelatedRival: true,
      minRelatedRivalPressure: 40,
    },
    choices: [
      {
        id: 'pay_them_off',
        label: 'Pay them off',
        cost: { resources: 1000 },
        effects: {},
        rivalPressure: { selected_front_rival: -8 },
        frontEffects: { exposure: -4 },
      },
      {
        id: 'push_back_quietly',
        label: 'Push back quietly',
        cost: { intel: 5 },
        effects: { dominion: 4 },
        rivalPressure: { selected_front_rival: 5 },
      },
      {
        id: 'make_it_public',
        label: 'Make it public',
        effects: { dominion: 8, heat: 8 },
        rivalPressure: { selected_front_rival: 12 },
        frontEffects: { exposure: 8 },
      },
    ],
  },
  {
    id: 'front_clean_money_dirty_hands',
    kind: 'city',
    title: 'Clean Money, Dirty Hands: {frontName}',
    text:
      '{frontName} can move cash through clean channels tonight. Every clean channel has a dirty lockbox behind it.',
    tags: ['FRONT', 'RESOURCE', 'RUIN'],
    baseWeight: 2,
    front: {
      roleTags: ['resources'],
    },
    weightRules: [
      {
        pressure: 'resources',
        max: 1500,
        addWeight: 3,
      },
    ],
    choices: [
      {
        id: 'take_the_cash',
        label: 'Take the cash',
        effects: { resources: 1600, ruin: 2 },
        frontEffects: { exposure: 6 },
      },
      {
        id: 'launder_it_slowly',
        label: 'Launder it slowly',
        effects: { resources: 900, heat: -3 },
        frontEffects: { exposure: -2 },
      },
      {
        id: 'turn_it_into_a_favor',
        label: 'Turn it into a favor',
        effects: {},
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'favor_hidden_route',
          },
        ],
        frontEffects: { exposure: 2 },
      },
    ],
  },
  {
    id: 'front_back_room_ledger',
    kind: 'city',
    title: 'Back Room Ledger: {frontName}',
    text:
      'A private ledger surfaces inside {frontName}. The names inside are worth something to everyone except the people written down.',
    tags: ['FRONT', 'LEDGER', 'INTEL'],
    baseWeight: 2,
    front: {
      minExposure: 30,
      roleTags: ['intel', 'nightlife'],
    },
    choices: [
      {
        id: 'keep_the_ledger',
        label: 'Keep the ledger',
        effects: { intel: 4 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_back_room_guest_list',
          },
        ],
        frontEffects: { exposure: 3 },
      },
      {
        id: 'sell_the_names',
        label: 'Sell the names',
        effects: { resources: 1200, ruin: 2 },
        frontEffects: { exposure: 5 },
      },
      {
        id: 'destroy_it',
        label: 'Destroy it',
        effects: { heat: -4, loyalty: 2 },
        frontEffects: { exposure: -3 },
      },
    ],
  },
] as const satisfies readonly CityEventDefinition[];
