import type { EventDefinition } from '../model';

export const DISTRICT_ZERO_EVENTS: readonly EventDefinition[] = [
  {
    kind: 'city',
    id: 'corp_patrol_sweep',
    title: 'Corp Patrol Sweep',
    text: 'Private security floods the lower avenues, checking faces against a list they insist does not exist.',
    tags: ['HEAT', 'CORP'],
    baseWeight: 6,
    weightRules: [
      { pressure: 'heat', min: 40, addWeight: 8 },
      { pressure: 'heat', min: 65, addWeight: 14 },
    ],
    choices: [
      {
        id: 'pay_for_clean_passage',
        label: 'Pay for clean passage',
        cost: { resources: 1000 },
        effects: { heat: -10 },
      },
      {
        id: 'feed_them_a_rival_name',
        label: 'Feed them a rival name',
        cost: { intel: 6 },
        effects: { heat: -5, dominion: 2, ruin: 2 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_patrol_schedule',
          },
        ],
      },
      {
        id: 'let_the_sweep_pass',
        label: 'Let the sweep pass',
        effects: { heat: 7, loyalty: -3 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'rival_tests_border',
    title: 'Rival Tests Your Border',
    text: 'A rival crew starts collecting protection money two blocks from your safehouse.',
    tags: ['RIVAL', 'HEAT'],
    baseWeight: 10,
    weightRules: [{ pressure: 'dominion', max: 34, addWeight: 8 }],
    choices: [
      {
        id: 'answer_publicly',
        label: 'Answer publicly',
        effects: { dominion: 5, heat: 11, loyalty: 2, ruin: 1 },
      },
      {
        id: 'handle_it_quietly',
        label: 'Handle it quietly',
        cost: { intel: 4 },
        effects: { dominion: 3, heat: 2 },
      },
      {
        id: 'ignore_it_for_now',
        label: 'Ignore it for now',
        effects: { dominion: -5, loyalty: -4 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'liaison_favor',
    title: 'A Favor in Violet Light',
    text: 'A dangerous liaison offers access to an elite room where people trade secrets like perfume.',
    tags: ['LIAISON', 'OPPORTUNITY', 'INTEL'],
    baseWeight: 5,
    weightRules: [{ pressure: 'intel', min: 12, addWeight: 8 }],
    choices: [
      {
        id: 'accept_the_favor',
        label: 'Accept the favor',
        effects: { intel: 10, dominion: 3, ruin: 2 },
        flags: ['owes_liaison'],
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'debt_owes_liaison',
          },
        ],
      },
      {
        id: 'pay_instead_of_owing',
        label: 'Pay instead of owing',
        cost: { resources: 1300 },
        effects: { intel: 7 },
      },
      {
        id: 'decline_gracefully',
        label: 'Decline gracefully',
        effects: { loyalty: 2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'operative_wants_more',
    title: 'Someone Wants More',
    text: 'One of your people has noticed the city getting richer around you and asks why their cut still feels symbolic.',
    tags: ['LOYALTY', 'RESOURCE'],
    baseWeight: 6,
    weightRules: [
      { pressure: 'loyalty', max: 54, addWeight: 8 },
      { pressure: 'resources', min: 3000, addWeight: 4 },
    ],
    choices: [
      {
        id: 'pay_them',
        label: 'Pay them',
        cost: { resources: 900 },
        effects: { loyalty: 8 },
        ledgerEffects: [
          {
            type: 'resolve',
            entrySelector: {
              type: 'definition',
              definitionId: 'debt_unfunded_promise',
            },
            optional: true,
          },
        ],
      },
      {
        id: 'promise_future_rewards',
        label: 'Promise future rewards',
        effects: { loyalty: 3, heat: 1 },
        flags: ['made_unfunded_promise'],
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'debt_unfunded_promise',
          },
        ],
      },
      {
        id: 'remind_them_who_built_this',
        label: 'Remind them who built this',
        effects: { loyalty: -8, dominion: 3, ruin: 2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'blackmail_lead',
    title: 'A Name Behind the Glass',
    text: 'Your surveillance finds a corporate magistrate entering a room that officially does not exist.',
    tags: ['BLACKMAIL', 'INTEL', 'OPPORTUNITY'],
    baseWeight: 3,
    weightRules: [{ pressure: 'intel', min: 15, addWeight: 12 }],
    choices: [
      {
        id: 'exploit_immediately',
        label: 'Exploit immediately',
        effects: { dominion: 6, resources: 700, heat: 8, ruin: 3 },
      },
      {
        id: 'save_it_for_later',
        label: 'Save it for later',
        effects: { intel: 5 },
        flags: ['stored_blackmail'],
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_magistrate_glass_room',
          },
        ],
      },
      {
        id: 'trade_it_quietly',
        label: 'Trade it quietly',
        effects: { resources: 1200, intel: -4 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'job_goes_loud',
    title: 'The Job Goes Loud',
    text: 'Someone fires when they were supposed to smile. The street remembers the sound.',
    tags: ['VIOLENCE', 'HEAT', 'LOYALTY'],
    baseWeight: 4,
    weightRules: [
      { pressure: 'heat', min: 50, addWeight: 10 },
      { flag: 'ran_small_job_this_week', addWeight: 16 },
    ],
    choices: [
      {
        id: 'extract_your_people_first',
        label: 'Extract your people first',
        effects: { loyalty: 5, heat: 12, resources: -700 },
      },
      {
        id: 'erase_the_witnesses',
        label: 'Erase the witnesses',
        effects: { heat: -3, loyalty: -5, ruin: 8 },
      },
      {
        id: 'abandon_the_exposed_asset',
        label: 'Abandon the exposed asset',
        effects: { heat: -9, loyalty: -12, ruin: 6 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'heat_cools',
    title: 'A Bigger Fire Elsewhere',
    text: 'For once, the city looks away. Someone more theatrical has made themselves useful.',
    tags: ['HEAT', 'OPPORTUNITY'],
    baseWeight: 5,
    weightRules: [
      { pressure: 'heat', max: 44, addWeight: 6 },
      { flag: 'laid_low_this_week', addWeight: 8 },
    ],
    choices: [
      {
        id: 'use_the_quiet_to_expand',
        label: 'Use the quiet to expand',
        effects: { dominion: 5, heat: 3 },
      },
      {
        id: 'use_the_quiet_to_recover',
        label: 'Use the quiet to recover',
        effects: { heat: -8, loyalty: 3 },
      },
      {
        id: 'use_the_quiet_to_listen',
        label: 'Use the quiet to listen',
        effects: { intel: 8 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'safehouse_compromised',
    title: 'The Safehouse Is No Longer Safe',
    text: 'The lock is untouched. The camera is untouched. The ash on the table is arranged in your private signal.',
    tags: ['SAFEHOUSE', 'HEAT'],
    baseWeight: 2,
    weightRules: [
      { pressure: 'heat', min: 60, addWeight: 14 },
      { flag: 'bribe_exposed', addWeight: 10 },
    ],
    choices: [
      {
        id: 'move_immediately',
        label: 'Move immediately',
        cost: { resources: 1500 },
        effects: { heat: -12, loyalty: 2 },
      },
      {
        id: 'set_a_trap',
        label: 'Set a trap',
        cost: { intel: 6 },
        effects: { dominion: 4, heat: 6 },
      },
      {
        id: 'stay_and_project_strength',
        label: 'Stay and project strength',
        effects: { dominion: 3, loyalty: -8, heat: 8 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'unexpected_windfall',
    title: 'Money From a Dead Channel',
    text: 'An old account lights up. No message. No signature. Just money and the sense that someone is watching.',
    tags: ['RESOURCE', 'RUIN', 'OPPORTUNITY'],
    baseWeight: 3,
    weightRules: [
      { pressure: 'resources', max: 1500, addWeight: 12 },
      { flag: 'stored_blackmail', addWeight: 8 },
    ],
    choices: [
      {
        id: 'take_it',
        label: 'Take it',
        effects: { resources: 1800, ruin: 2 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'debt_contaminated_money',
          },
        ],
      },
      {
        id: 'trace_it_first',
        label: 'Trace it first',
        cost: { intel: 4 },
        effects: { resources: 1200, intel: 3 },
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'secret_dead_channel_trace',
          },
        ],
      },
      {
        id: 'refuse_contaminated_money',
        label: 'Refuse contaminated money',
        effects: { loyalty: 4 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'rival_sends_flowers',
    title: 'The Rival Sends Flowers',
    text: 'Black orchids arrive at your lounge, each stem wired with a listening device delicate enough to be art.',
    tags: ['RIVAL', 'INTEL'],
    baseWeight: 4,
    weightRules: [{ pressure: 'dominion', min: 35, addWeight: 10 }],
    choices: [
      {
        id: 'send_them_back_burning',
        label: 'Send them back burning',
        effects: { dominion: 4, heat: 7, ruin: 1 },
      },
      {
        id: 'keep_the_device_and_reverse_it',
        label: 'Keep the device and reverse it',
        cost: { type: 'tech_or_intel', amount: 6 },
        effects: { intel: 8, heat: 2 },
      },
      {
        id: 'display_them',
        label: 'Display them',
        effects: { loyalty: 3, ruin: 1 },
        flags: ['accepted_rival_gesture'],
        ledgerEffects: [
          {
            type: 'create',
            definitionId: 'favor_checkpoint_captain',
          },
        ],
      },
    ],
  },
  {
    kind: 'city',
    id: 'ledger_debt_comes_due',
    title: 'Debt Comes Due: {ledgerEntryName}',
    text: 'The Ledger lights up around {ledgerEntryName}. Whoever holds the claim has stopped waiting politely.',
    tags: ['LEDGER', 'RESOURCE', 'LOYALTY'],
    baseWeight: 0,
    choices: [
      {
        id: 'pay_what_is_owed',
        label: 'Pay what is owed',
        cost: { resources: 950 },
        effects: { loyalty: 3, ruin: -1 },
        ledgerEffects: [
          {
            type: 'resolve',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
      {
        id: 'offer_information_instead',
        label: 'Offer information instead',
        cost: { intel: 5 },
        effects: { heat: -3 },
        ledgerEffects: [
          {
            type: 'resolve',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
      {
        id: 'refuse_the_claim',
        label: 'Refuse the claim',
        effects: { loyalty: -5, heat: 4, ruin: 2 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'ledger_leverage_window',
    title: 'Leverage Window: {ledgerEntryName}',
    text: '{ledgerEntryName} is suddenly worth more than it was yesterday. The city has given you a narrow opening.',
    tags: ['LEDGER', 'OPPORTUNITY', 'RUIN'],
    baseWeight: 0,
    choices: [
      {
        id: 'use_the_leverage',
        label: 'Use the leverage',
        effects: { dominion: 6, heat: -4, ruin: 2 },
        ledgerEffects: [
          {
            type: 'consume',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
      {
        id: 'hold_it',
        label: 'Hold it',
        effects: { intel: 3 },
      },
      {
        id: 'sell_it_quietly',
        label: 'Sell it quietly',
        cost: { intel: 3 },
        effects: { resources: 1200, ruin: 1 },
        ledgerEffects: [
          {
            type: 'consume',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
    ],
  },
  {
    kind: 'city',
    id: 'ledger_favor_returned',
    title: 'Favor Returned: {ledgerEntryName}',
    text: '{ledgerEntryName} is ready to answer, but favors hate being held under bright lights.',
    tags: ['LEDGER', 'OPPORTUNITY', 'HEAT'],
    baseWeight: 0,
    choices: [
      {
        id: 'call_it_in_now',
        label: 'Call it in now',
        effects: { heat: -8, loyalty: 3 },
        ledgerEffects: [
          {
            type: 'consume',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
      {
        id: 'ask_for_money',
        label: 'Ask for money',
        effects: { resources: 1000 },
        ledgerEffects: [
          {
            type: 'consume',
            entrySelector: { type: 'selected_entry' },
          },
        ],
      },
      {
        id: 'save_the_favor',
        label: 'Save the favor',
        effects: { intel: 2 },
      },
    ],
  },
] as const;
