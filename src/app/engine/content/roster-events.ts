import type { OperativeEventDefinition } from '../model';

export const ROSTER_EVENTS: readonly OperativeEventDefinition[] = [
  {
    kind: 'operative',
    id: 'event_mara_ghost_debt',
    operativeId: 'op_mara_voss',
    title: 'Ghost Debt',
    text: 'Mara arrives late, coat wet, eyes too calm. Someone from her old life has found the edge of your network and is asking whether you intend to pay what she owes.',
    tags: ['OPERATIVE', 'RESOURCE', 'HEAT'],
    baseWeight: 22,
    severeAtBreaking: true,
    trigger: {
      mode: 'any',
      predicates: [
        { type: 'operative_stress_at_least', amount: 60 },
        {
          mode: 'all',
          predicates: [
            { type: 'global_pressure_at_least', pressure: 'ruin', amount: 25 },
            { type: 'operative_assigned_within_weeks', weeks: 2 },
          ],
        },
      ],
    },
    choices: [
      {
        id: 'pay_the_debt_quietly',
        label: 'Pay the debt quietly',
        cost: { resources: 1200 },
        effects: { loyalty: 6, heat: -2 },
      },
      {
        id: 'turn_the_creditor_into_leverage',
        label: 'Turn the creditor into leverage',
        cost: { intel: 6 },
        effects: { dominion: 5, ruin: 3, loyalty: -2 },
      },
      {
        id: 'tell_mara_it_is_her_problem',
        label: 'Tell Mara it is her problem',
        effects: { loyalty: -10, heat: 3, ruin: 2 },
      },
    ],
  },
  {
    kind: 'operative',
    id: 'event_juno_static_in_her_voice',
    operativeId: 'op_juno_hex',
    title: 'Static in Her Voice',
    text: 'Juno keeps repeating part of a sentence you never said. The channel logs show no intrusion, but the waveform has a second heartbeat.',
    tags: ['OPERATIVE', 'INTEL', 'RUIN'],
    baseWeight: 22,
    severeAtBreaking: true,
    trigger: {
      mode: 'all',
      predicates: [
        { type: 'operative_stress_at_least', amount: 60 },
        {
          mode: 'any',
          predicates: [
            { type: 'recent_assignment_tag', tag: 'memory' },
            { type: 'recent_assignment_tag', tag: 'weird' },
            { type: 'recent_assignment_tag', tag: 'intel' },
          ],
        },
      ],
    },
    choices: [
      {
        id: 'ground_her_for_a_week',
        label: 'Ground her for a week',
        effects: { loyalty: 3, intel: -3 },
        operativeEffects: { stress: -12 },
      },
      {
        id: 'push_deeper',
        label: 'Push deeper',
        effects: { intel: 12, ruin: 6, heat: 3 },
        operativeEffects: { stress: 8 },
      },
      {
        id: 'isolate_the_signal',
        label: 'Isolate the signal',
        cost: { resources: 800 },
        effects: { intel: 5, ruin: -2 },
        operativeEffects: { stress: -4 },
      },
    ],
  },
  {
    kind: 'operative',
    id: 'event_saint_lie_comes_due',
    operativeId: 'op_saint_calder',
    title: 'The Lie Comes Due',
    text: 'Saint finally tells you the person he has been paying was not an official. Not exactly. Not anymore.',
    tags: ['OPERATIVE', 'RESOURCE', 'INTEL'],
    baseWeight: 22,
    trigger: {
      mode: 'any',
      predicates: [
        { type: 'global_pressure_at_most', pressure: 'resources', amount: 1200 },
        {
          type: 'operative_assignment_count',
          count: 2,
          actionId: 'bribe_official',
        },
      ],
    },
    choices: [
      {
        id: 'cover_him',
        label: 'Cover him',
        cost: { resources: 1000 },
        effects: { loyalty: 8, heat: -4 },
      },
      {
        id: 'use_the_lie',
        label: 'Use the lie',
        effects: { intel: 8, dominion: 4, ruin: 3 },
        operativeEffects: { loyalty: -4 },
      },
      {
        id: 'expose_him_to_the_crew',
        label: 'Expose him to the crew',
        effects: { loyalty: -6, dominion: 3, heat: 2 },
      },
    ],
  },
  {
    kind: 'operative',
    id: 'event_knox_blood_applause',
    operativeId: 'op_knox_riven',
    title: 'Blood Applause',
    text: "The crowd chants Knox's name before the job is done. That is the problem.",
    tags: ['OPERATIVE', 'VIOLENCE', 'HEAT'],
    baseWeight: 22,
    severeAtBreaking: true,
    trigger: {
      mode: 'any',
      predicates: [
        { type: 'operative_stress_at_least', amount: 60 },
        { type: 'recent_assignment_tag', tag: 'violence', count: 2 },
      ],
    },
    choices: [
      {
        id: 'let_him_become_a_symbol',
        label: 'Let him become a symbol',
        effects: { dominion: 8, heat: 8, loyalty: 3 },
      },
      {
        id: 'pull_him_back',
        label: 'Pull him back',
        effects: { heat: -3 },
        operativeEffects: { stress: -8, loyalty: -3 },
      },
      {
        id: 'sell_the_spectacle',
        label: 'Sell the spectacle',
        effects: { resources: 1400, heat: 6, ruin: 2 },
      },
    ],
  },
  {
    kind: 'operative',
    id: 'event_iris_velvet_access',
    operativeId: 'op_iris_vale',
    title: 'Velvet Access',
    text: 'Iris can get you into a room Nyx believes is hers. The invitation is real. That is what makes it dangerous.',
    tags: ['OPERATIVE', 'LIAISON', 'RIVAL'],
    baseWeight: 22,
    trigger: {
      mode: 'all',
      predicates: [
        {
          mode: 'any',
          predicates: [
            { type: 'recent_assignment_tag', tag: 'nightlife' },
            { type: 'recent_assignment_tag', tag: 'social' },
          ],
        },
        {
          type: 'rival_pressure_at_least',
          rivalId: 'rival_nyx_ardent',
          amount: 40,
        },
      ],
    },
    choices: [
      {
        id: 'take_the_room',
        label: 'Take the room',
        effects: { intel: 8, dominion: 4 },
        rivalPressure: { rival_nyx_ardent: 10 },
      },
      {
        id: 'use_it_as_misdirection',
        label: 'Use it as misdirection',
        cost: { intel: 4 },
        effects: { heat: -8 },
      },
      {
        id: 'decline_the_invitation',
        label: 'Decline the invitation',
        effects: { loyalty: 2 },
        rivalPressure: { rival_nyx_ardent: -4 },
      },
    ],
  },
  {
    kind: 'operative',
    id: 'event_orchid_route_memory',
    operativeId: 'op_orchid_seven',
    title: 'Route Memory',
    text: 'Orchid knows a route that is not on any map you own. When asked who taught it to them, they say your name.',
    tags: ['OPERATIVE', 'RESOURCE', 'INTEL'],
    baseWeight: 22,
    trigger: {
      mode: 'any',
      predicates: [
        { type: 'recent_assignment_tag', tag: 'black_market', count: 2 },
        { type: 'recent_assignment_tag', tag: 'smuggling', count: 2 },
      ],
    },
    choices: [
      {
        id: 'run_the_route',
        label: 'Run the route',
        effects: { resources: 1600, intel: 4, ruin: 3 },
      },
      {
        id: 'map_it_first',
        label: 'Map it first',
        cost: { intel: 5 },
        effects: { resources: 900, heat: -3 },
      },
      {
        id: 'seal_it',
        label: 'Seal it',
        effects: { loyalty: 5, ruin: -2 },
      },
    ],
  },
] as const;
