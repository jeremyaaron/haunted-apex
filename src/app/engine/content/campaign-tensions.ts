import type { CampaignTensionDefinition, CampaignTensionId } from '../model';

export const CAMPAIGN_TENSION_DEFINITIONS = [
  {
    id: 'campaign_corp_crackdown',
    name: 'Corp Crackdown',
    subtitle: 'Visibility has a price and Ashline is collecting.',
    roleTags: ['heat', 'factions', 'fronts'],
    description:
      'Ashline Bureau has turned the lower city into a compliance experiment with weapons. Patrols have names, cameras have budgets, and every safe route now has a price.',
    openingBriefing:
      'Ashline has made the city legible. Every door, courier route, and front window reflects a badge back at you.',
    cityProfileOptions: ['corporate_spire', 'rain_noir'],
    startingPressureDelta: { heat: 12, intel: -2 },
    factionModifiers: {
      faction_ashline_bureau: { suspicion: 12 },
    },
    generationBias: {
      requiredFactionIds: ['faction_ashline_bureau'],
      weightedContactIds: { contact_captain_hollis: 30 },
      weightedOperativeTags: { heat_control: 20, intel: 10 },
      weightedFrontTags: { heat_control: 20, security: 10 },
      weightedEventTags: { HEAT: 8, CORP: 15, FRONT: 6, FACTION: 6 },
    },
    eventWeightModifiers: [
      { eventId: 'corp_patrol_sweep', weightDelta: 15 },
      { eventId: 'front_inspection', weightDelta: 12 },
      { eventId: 'faction_scrutiny', weightDelta: 10 },
      { eventId: 'safehouse_compromised', weightDelta: 8 },
    ],
    briefing: {
      pressurePattern: [
        'Heat starts high.',
        'Intel starts thin.',
        'Ashline scrutiny is already elevated.',
      ],
      activeLabels: ['Ashline Bureau'],
      favoredLabels: ['Captain Rafe Hollis', 'Heat-control operatives', 'Security fronts'],
    },
    runSummaryFlavor: {
      victoryLine: 'You made a priced city miscalculate your value.',
      lossLine: 'Ashline found the shape of you and filed it correctly.',
      epitaphTemplates: [
        '{cityName} learned your routes before it learned your name.',
        'The crackdown did not end. It simply moved into your books.',
      ],
    },
  },
  {
    id: 'campaign_nightlife_war',
    name: 'Nightlife War',
    subtitle: 'Every invitation is a threat with better lighting.',
    roleTags: ['nightlife', 'contacts', 'rivals'],
    description:
      "The private rooms have started choosing sides. Every guest list is a weapon, every invitation is a threat, and the city's prettiest doors now open onto blood.",
    openingBriefing:
      'The houses are smiling with knives behind their teeth. Nyx is watching the guest list and your name keeps appearing.',
    cityProfileOptions: ['violet_nightlife'],
    startingPressureDelta: { dominion: 3, loyalty: -4, heat: 4 },
    rivalPressureModifiers: {
      rival_nyx_ardent: 15,
    },
    generationBias: {
      requiredFactionIds: ['faction_velvet_house'],
      featuredRivalIds: ['rival_nyx_ardent'],
      weightedContactIds: { contact_veyra_lux: 35, contact_mina_glass: 25 },
      weightedOperativeTags: { social: 20, intel: 15 },
      weightedFrontTags: { nightlife: 25, social: 15 },
      weightedEventTags: { LIAISON: 12, CONTACT: 8, RIVAL: 8, LOYALTY: 6 },
    },
    eventWeightModifiers: [
      { eventId: 'liaison_favor', weightDelta: 15 },
      { eventId: 'event_veyra_room', weightDelta: 12 },
      { eventId: 'rival_sends_flowers', weightDelta: 10 },
      { eventId: 'contact_wants_assurance', weightDelta: 8 },
      { eventId: 'operative_wants_more', weightDelta: 6 },
    ],
    briefing: {
      pressurePattern: [
        'Dominion starts slightly ahead.',
        'Loyalty is already strained.',
        'Nyx pressure starts elevated.',
      ],
      activeLabels: ['Velvet House', 'Nyx Ardent'],
      favoredLabels: ['Veyra Lux', 'Mina Glass', 'Nightlife fronts', 'Social operatives'],
    },
    runSummaryFlavor: {
      victoryLine: 'You left the private room with the city still applauding.',
      lossLine: 'The guest list closed around you.',
      epitaphTemplates: [
        '{cityName} made every beautiful door expensive.',
        'Nightlife won because everyone came dressed as an ally.',
      ],
    },
  },
  {
    id: 'campaign_ghostline_signal',
    name: 'Ghostline Signal',
    subtitle: 'The city is transmitting something that remembers you.',
    roleTags: ['ghostline', 'ledger', 'ruin'],
    description:
      'A dead channel has started naming routes before they exist. The signal brings secrets, static, and the sense that every answer has a mouth.',
    openingBriefing:
      'The Ghostline is awake. It knows enough to help and enough to charge interest in memories.',
    cityProfileOptions: ['ghost_market'],
    startingPressureDelta: { intel: 6, ruin: 8 },
    factionModifiers: {
      faction_ghostline_communion: { standing: 5, obligation: 4 },
    },
    generationBias: {
      requiredFactionIds: ['faction_ghostline_communion'],
      weightedContactIds: { contact_ciro_moth: 35, contact_father_static: 35 },
      weightedOperativeIds: {
        op_juno_hex: 25,
        op_echo_saint: 20,
        op_orchid_seven: 15,
      },
      weightedFrontDefinitionIds: {
        front_surveillance_den: 30,
        front_black_clinic: 15,
      },
      weightedEventTags: { LEDGER: 15, RUIN: 15, INTEL: 8 },
    },
    eventWeightModifiers: [
      { eventId: 'ledger_leverage_window', weightDelta: 10 },
      { eventId: 'blackmail_lead', weightDelta: 10 },
      { eventId: 'event_juno_static_in_her_voice', weightDelta: 10 },
      { eventId: 'event_ciro_route_remembers', weightDelta: 10 },
      { eventId: 'event_confession_leak', weightDelta: 10 },
      { eventId: 'front_back_room_ledger', weightDelta: 8 },
    ],
    targetedGatherIntelSecretDiscoveryBonus: 8,
    briefing: {
      pressurePattern: [
        'Intel starts high.',
        'Ruin starts awake.',
        'Targeted Gather Intel can find secrets more easily.',
      ],
      activeLabels: ['Ghostline Communion'],
      favoredLabels: ['Ciro Moth', 'Father Static', 'Juno Hex', 'Echo Saint', 'Surveillance Den'],
    },
    runSummaryFlavor: {
      victoryLine: "The signal gave you the city's true name. You used it.",
      lossLine: 'The signal kept speaking after you stopped answering.',
      epitaphTemplates: [
        '{cityName} remembered the wrong version of you.',
        'Every secret had a voice, and all of them wanted payment.',
      ],
    },
  },
  {
    id: 'campaign_industrial_cut',
    name: 'Industrial Cut',
    subtitle: 'Money moves fast through loading doors and louder through bones.',
    roleTags: ['industrial', 'resources', 'rivals'],
    description:
      'Chrome Maw is moving steel, bodies, and blame through the same industrial arteries. The money is immediate. So is the noise.',
    openingBriefing:
      'The docks are open, the crews are hungry, and Knox Marrow already hears the machines starting.',
    cityProfileOptions: ['industrial_chrome'],
    startingPressureDelta: { resources: 800, heat: 6, loyalty: -2 },
    rivalPressureModifiers: {
      rival_knox_marrow: 12,
    },
    generationBias: {
      requiredFactionIds: ['faction_chrome_maw'],
      featuredRivalIds: ['rival_knox_marrow'],
      weightedOperativeTags: { violence: 25, money: 20, stability: 8 },
      weightedFrontDefinitionIds: {
        front_zero_mercy_cut: 35,
        front_courier_line: 25,
      },
      weightedFrontTags: { resources: 25, dominion: 15 },
      weightedEventTags: { VIOLENCE: 12, RIVAL: 8, RESOURCE: 8, HEAT: 6 },
    },
    eventWeightModifiers: [
      { eventId: 'job_goes_loud', weightDelta: 15 },
      { eventId: 'rival_tests_border', weightDelta: 12 },
      { eventId: 'front_rival_leans_on_your_front', weightDelta: 10 },
      { eventId: 'front_clean_money_dirty_hands', weightDelta: 10 },
      { eventId: 'faction_demand', weightDelta: 8 },
    ],
    briefing: {
      pressurePattern: [
        'Resources start higher.',
        'Heat starts higher.',
        'Knox pressure starts elevated.',
      ],
      activeLabels: ['Chrome Maw', 'Knox Marrow'],
      favoredLabels: ['Zero Mercy Cut', 'Courier Line', 'Violence operatives', 'Money operatives'],
    },
    runSummaryFlavor: {
      victoryLine: 'You turned the industrial artery into a throne route.',
      lossLine: 'The machines kept running after the crew ran out.',
      epitaphTemplates: [
        '{cityName} paid quickly and collected loudly.',
        'The cut was real. The invoice was bigger.',
      ],
    },
  },
  {
    id: 'campaign_dirty_capital',
    name: 'Dirty Capital',
    subtitle: 'The money arrives clean enough to ruin you later.',
    roleTags: ['capital', 'resources', 'ledger', 'fronts'],
    description:
      'Helix Meridian has opened quiet accounts and dirtier doors. You can grow faster if you accept that every clean channel has a lockbox behind it.',
    openingBriefing:
      'Helix money is already in motion. It looks useful because it is. It looks harmless because that is how hooks work.',
    cityProfileOptions: ['corporate_spire'],
    startingPressureDelta: { resources: 1200, intel: -2 },
    factionModifiers: {
      faction_helix_meridian: { standing: 6, suspicion: 4, obligation: 12 },
    },
    generationBias: {
      requiredFactionIds: ['faction_helix_meridian'],
      weightedFrontTags: { resources: 25, heat_control: 10 },
      weightedContactIds: { contact_mina_glass: 15, contact_captain_hollis: 10 },
      weightedOperativeTags: { money: 15, social: 10 },
      weightedEventTags: { FACTION: 12, ACCORD: 8, RESOURCE: 8, FRONT: 6, LEDGER: 6 },
    },
    eventWeightModifiers: [
      { eventId: 'faction_demand', weightDelta: 12 },
      { eventId: 'accord_terms_shift', weightDelta: 10 },
      { eventId: 'front_clean_money_dirty_hands', weightDelta: 12 },
      { eventId: 'ledger_debt_comes_due', weightDelta: 10 },
      { eventId: 'front_inspection', weightDelta: 6 },
    ],
    briefing: {
      pressurePattern: [
        'Resources start high.',
        'Intel starts thin.',
        'Helix obligation starts elevated.',
      ],
      activeLabels: ['Helix Meridian'],
      favoredLabels: ['Resource fronts', 'Mina Glass', 'Captain Rafe Hollis', 'Money operatives'],
    },
    runSummaryFlavor: {
      victoryLine: "You spent the city's clean money before it could spend you.",
      lossLine: 'The ledger made the capital honest at exactly the wrong time.',
      epitaphTemplates: [
        '{cityName} never gave you money. It rented you momentum.',
        'Every clean channel had a dirty owner.',
      ],
    },
  },
] as const satisfies readonly CampaignTensionDefinition[];

export function getCampaignTensionDefinition(
  campaignTensionId: CampaignTensionId,
): CampaignTensionDefinition | undefined {
  return CAMPAIGN_TENSION_DEFINITIONS.find((tension) => tension.id === campaignTensionId);
}
