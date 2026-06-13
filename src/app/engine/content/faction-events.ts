import type { CityEventDefinition } from '../model';

export const FACTION_EVENTS = [
  {
    kind: 'city',
    id: 'faction_demand',
    title: 'Faction Demand: {factionName}',
    text:
      '{factionName} remembers the shape of your hand around theirs. The account is no longer abstract.',
    tags: ['FACTION', 'LEDGER'],
    baseWeight: 3,
    faction: { kind: 'demand' },
    choices: [
      {
        id: 'pay_what_they_ask',
        label: 'Pay what they ask',
        cost: { resources: 1000 },
        effects: {},
        factionEffects: { obligation: -15, standing: 4 },
      },
      {
        id: 'offer_information_instead',
        label: 'Offer information instead',
        cost: { intel: 6 },
        effects: {},
        factionEffects: { obligation: -10, suspicion: 4 },
      },
      {
        id: 'delay_them',
        label: 'Delay them',
        effects: { heat: 4 },
        factionEffects: { obligation: 8, standing: -6, suspicion: 6 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'faction_scrutiny',
    title: 'Faction Scrutiny: {factionName}',
    text:
      '{factionName} has started comparing your visible shape to the one you promised them.',
    tags: ['FACTION', 'HEAT'],
    baseWeight: 3,
    faction: { kind: 'scrutiny' },
    choices: [
      {
        id: 'clean_the_channel',
        label: 'Clean the channel',
        cost: { resources: 800 },
        effects: { heat: -3 },
        factionEffects: { suspicion: -10 },
      },
      {
        id: 'feed_them_a_false_pattern',
        label: 'Feed them a false pattern',
        cost: { intel: 5 },
        effects: { dominion: 2, ruin: 2 },
        factionEffects: { suspicion: -6, obligation: 4 },
      },
      {
        id: 'let_them_watch',
        label: 'Let them watch',
        effects: { heat: 6 },
        factionEffects: { suspicion: 6 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'accord_terms_shift',
    title: 'Accord Terms Shift: {factionName}',
    text:
      'The terms beneath your accord with {factionName} move quietly, like text under wet glass.',
    tags: ['FACTION', 'ACCORD'],
    baseWeight: 3,
    faction: { kind: 'accord_terms_shift' },
    choices: [
      {
        id: 'accept_revised_terms',
        label: 'Accept revised terms',
        effects: { resources: 400 },
        factionEffects: { obligation: 8, standing: 2 },
      },
      {
        id: 'renegotiate',
        label: 'Renegotiate',
        cost: { intel: 4 },
        effects: {},
        factionEffects: { obligation: -4, suspicion: 4 },
      },
      {
        id: 'break_the_spirit_keep_the_letter',
        label: 'Break the spirit, keep the letter',
        effects: { dominion: 3, ruin: 2 },
        factionEffects: { standing: -8, suspicion: 8 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'market_access',
    title: 'Market Access: {factionName}',
    text:
      '{factionName} opens a corridor of buyers, permits, rooms, or routes that was not visible yesterday.',
    tags: ['FACTION', 'OPPORTUNITY', 'RESOURCE'],
    baseWeight: 3,
    faction: { kind: 'market_access' },
    choices: [
      {
        id: 'take_the_opening',
        label: 'Take the opening',
        effects: { resources: 1000, dominion: 2 },
        factionEffects: { obligation: 6 },
      },
      {
        id: 'convert_it_into_information',
        label: 'Convert it into information',
        effects: { intel: 8 },
        factionEffects: { standing: -2, obligation: 3 },
      },
      {
        id: 'decline_the_favor',
        label: 'Decline the favor',
        effects: { loyalty: 2 },
        factionEffects: { standing: -3, obligation: -3 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'proxy_conflict',
    title: 'Proxy Conflict: {factionName}',
    text:
      '{factionName} wants a message delivered through someone else’s territory, where deniability still has a pulse.',
    tags: ['FACTION', 'RIVAL'],
    baseWeight: 3,
    faction: { kind: 'proxy_conflict' },
    choices: [
      {
        id: 'act_through_intermediaries',
        label: 'Act through intermediaries',
        cost: { intel: 5 },
        effects: { dominion: 4 },
        factionEffects: { standing: 4, obligation: -4 },
        rivalPressure: { selected_faction_rival: 6 },
      },
      {
        id: 'refuse_the_proxy_game',
        label: 'Refuse the proxy game',
        effects: { loyalty: 2 },
        factionEffects: { standing: -5 },
      },
      {
        id: 'sell_the_request_to_the_rival',
        label: 'Sell the request to the rival',
        effects: { resources: 1000, ruin: 3 },
        factionEffects: { standing: -10, suspicion: 6 },
        rivalPressure: { selected_faction_rival: -4 },
      },
    ],
  },
  {
    kind: 'city',
    id: 'institutional_blind_spot',
    title: 'Institutional Blind Spot: {factionName}',
    text:
      'For a few hours, {factionName} sees around you instead of through you. The gap is useful because it is temporary.',
    tags: ['FACTION', 'OPPORTUNITY'],
    baseWeight: 3,
    faction: { kind: 'institutional_blind_spot' },
    choices: [
      {
        id: 'move_while_they_look_away',
        label: 'Move while they look away',
        effects: { dominion: 5, heat: 3 },
        factionEffects: { suspicion: 4 },
      },
      {
        id: 'move_quietly',
        label: 'Move quietly',
        effects: { intel: 5, heat: -2 },
        factionEffects: { suspicion: 2 },
      },
      {
        id: 'do_nothing_obvious',
        label: 'Do nothing obvious',
        effects: { loyalty: 2 },
        factionEffects: { standing: 2 },
      },
    ],
  },
] as const satisfies readonly CityEventDefinition[];
