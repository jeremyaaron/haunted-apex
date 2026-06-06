import type { OperativeDefinition, OperativeId } from '../model';

export const ROSTER_OPERATIVES = [
  {
    id: 'op_mara_voss',
    name: 'Mara Voss',
    archetype: 'Infiltrator',
    rarity: 'uncommon',
    roleTags: ['intel', 'heat_control', 'stability'],
    baseStats: { violence: 35, charm: 58, tech: 45, subtlety: 82 },
    startingLoyalty: 72,
    startingStress: 18,
    signatureTraitId: 'trait_clean_entry',
    liabilityTraitId: 'trait_ghost_debt',
    affinities: [
      {
        id: 'mara_nightlife',
        targetTag: 'nightlife',
        effects: { intel: 2 },
        riskModifier: -1,
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_mara_ghost_debt'],
    },
    eventIds: ['event_mara_ghost_debt'],
    flavor: {
      dossier:
        'Mara enters rooms as if the locks are embarrassed to exist. Reliable, quiet, and carrying a debt she refuses to name.',
      quote: 'Doors are only honest from the wrong side.',
      visualTags: ['infiltrator', 'rain', 'black-coat', 'violet'],
    },
  },
  {
    id: 'op_juno_hex',
    name: 'Juno Hex',
    archetype: 'Ghost Hacker',
    rarity: 'uncommon',
    roleTags: ['intel', 'tech', 'ruin'],
    baseStats: { violence: 20, charm: 35, tech: 90, subtlety: 55 },
    startingLoyalty: 61,
    startingStress: 32,
    signatureTraitId: 'trait_brilliant_unstable',
    liabilityTraitId: 'trait_ghost_touch',
    affinities: [
      {
        id: 'juno_memory',
        targetTag: 'memory',
        effects: { intel: 4, ruin: 2 },
        stressModifier: 4,
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_juno_static_in_her_voice'],
    },
    eventIds: ['event_juno_static_in_her_voice'],
    flavor: {
      dossier:
        'Juno hears architecture in corrupted signals. Every answer arrives with something else attached.',
      quote: 'There is another voice in the checksum.',
      visualTags: ['ghost-hacker', 'signal-noise', 'memory', 'cyan'],
    },
  },
  {
    id: 'op_saint_calder',
    name: 'Saint Calder',
    archetype: 'Fixer',
    rarity: 'common',
    roleTags: ['social', 'heat_control', 'money'],
    baseStats: { violence: 45, charm: 78, tech: 35, subtlety: 62 },
    startingLoyalty: 66,
    startingStress: 20,
    signatureTraitId: 'trait_silver_tongue',
    liabilityTraitId: 'trait_probably_lying',
    affinities: [],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_saint_lie_comes_due'],
    },
    eventIds: ['event_saint_lie_comes_due'],
    flavor: {
      dossier:
        'Saint can make a threat sound like an invitation. His accounts are less persuasive than he is.',
      quote: 'Nobody pays full price for the truth.',
      visualTags: ['fixer', 'tailored-suit', 'gold', 'smoke'],
    },
  },
  {
    id: 'op_iris_vale',
    name: 'Iris Vale',
    archetype: 'Socialite',
    rarity: 'uncommon',
    roleTags: ['social', 'recruitment', 'rival_pressure'],
    baseStats: { violence: 15, charm: 88, tech: 30, subtlety: 68 },
    startingLoyalty: 58,
    startingStress: 14,
    signatureTraitId: 'trait_velvet_access',
    affinities: [
      {
        id: 'iris_nyx_leverage',
        rivalId: 'rival_nyx_ardent',
        effects: { dominion: 1 },
        rivalPressureModifier: 2,
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_iris_velvet_access'],
    },
    eventIds: ['event_iris_velvet_access'],
    flavor: {
      dossier:
        'Iris belongs in every room that claims she does not. Nyx knows her name and dislikes how often others whisper it.',
      quote: 'Access is just ownership with better lighting.',
      visualTags: ['socialite', 'nightlife', 'glass', 'magenta'],
    },
  },
  {
    id: 'op_knox_riven',
    name: 'Knox Riven',
    archetype: 'Enforcer',
    rarity: 'common',
    roleTags: ['violence', 'money'],
    baseStats: { violence: 86, charm: 25, tech: 20, subtlety: 38 },
    startingLoyalty: 56,
    startingStress: 12,
    signatureTraitId: 'trait_loud_solution',
    affinities: [
      {
        id: 'knox_violence',
        targetTag: 'violence',
        effects: { resources: 300, heat: 2 },
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_knox_blood_applause'],
    },
    eventIds: ['event_knox_blood_applause'],
    flavor: {
      dossier:
        'Knox solves immediate problems so completely that tomorrow becomes a different kind of emergency.',
      quote: 'Quiet is what happens after.',
      visualTags: ['enforcer', 'fight-club', 'chrome', 'red'],
    },
  },
  {
    id: 'op_orchid_seven',
    name: 'Orchid Seven',
    archetype: 'Courier',
    rarity: 'common',
    roleTags: ['intel', 'money', 'stability'],
    baseStats: { violence: 30, charm: 52, tech: 50, subtlety: 78 },
    startingLoyalty: 64,
    startingStress: 16,
    signatureTraitId: 'trait_knows_the_routes',
    affinities: [
      {
        id: 'orchid_ghostline',
        districtId: 'district_ghostline_market',
        effects: { resources: 300, intel: 2, heat: -1 },
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: ['event_orchid_route_memory'],
    },
    eventIds: ['event_orchid_route_memory'],
    flavor: {
      dossier:
        'Orchid remembers routes the city has not built yet and never explains who taught them.',
      quote: 'The map catches up eventually.',
      visualTags: ['courier', 'black-market', 'motorcycle', 'green'],
    },
  },
  {
    id: 'op_vant_black',
    name: 'Vant Black',
    archetype: 'Corp Defector',
    rarity: 'rare',
    roleTags: ['tech', 'heat_control', 'intel'],
    baseStats: { violence: 28, charm: 48, tech: 84, subtlety: 70 },
    startingLoyalty: 54,
    startingStress: 28,
    signatureTraitId: 'trait_corporate_ghost',
    liabilityTraitId: 'trait_marked_asset',
    affinities: [
      {
        id: 'vant_industrial',
        targetTag: 'industrial',
        effects: { heat: -1 },
        riskModifier: -2,
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: [],
    },
    eventIds: [],
    flavor: {
      dossier:
        'Vant left the corporation with clean credentials and a dirty memory. Their former employers still reconcile the loss.',
      quote: 'Security is mostly paperwork that learned to shoot.',
      visualTags: ['corp-defector', 'industrial', 'security', 'white'],
    },
  },
  {
    id: 'op_echo_saint',
    name: 'Echo Saint',
    archetype: 'Memory Surgeon',
    rarity: 'uncommon',
    roleTags: ['ruin', 'tech', 'stability'],
    baseStats: { violence: 12, charm: 64, tech: 76, subtlety: 58 },
    startingLoyalty: 62,
    startingStress: 22,
    signatureTraitId: 'trait_soft_extraction',
    liabilityTraitId: 'trait_unclean_hands',
    affinities: [
      {
        id: 'echo_memory',
        targetTag: 'memory',
        effects: { intel: 2, ruin: -1 },
        stressModifier: -2,
      },
    ],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: [],
    },
    eventIds: [],
    flavor: {
      dossier:
        'Echo removes memories with the bedside manner of a priest and the cleanup habits of a thief.',
      quote: 'You can keep the scar or the reason.',
      visualTags: ['memory-surgeon', 'clinic', 'neon-white', 'surgical'],
    },
  },
  {
    id: 'op_rook_vale',
    name: 'Rook Vale',
    archetype: 'Street Magistrate',
    rarity: 'common',
    roleTags: ['social', 'heat_control', 'stability'],
    baseStats: { violence: 42, charm: 74, tech: 30, subtlety: 52 },
    startingLoyalty: 70,
    startingStress: 14,
    signatureTraitId: 'trait_knows_the_desk',
    liabilityTraitId: 'trait_public_face',
    affinities: [],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: [],
    },
    eventIds: [],
    flavor: {
      dossier:
        'Rook knows which desks move a district and which clerks expect the envelope before the greeting.',
      quote: 'Authority is a queue. I know where it bends.',
      visualTags: ['magistrate', 'municipal', 'street-law', 'amber'],
    },
  },
  {
    id: 'op_mother_neon',
    name: 'Mother Neon',
    archetype: 'Mythic Fixer',
    rarity: 'rare',
    roleTags: ['social', 'stability', 'recruitment'],
    baseStats: { violence: 25, charm: 90, tech: 44, subtlety: 66 },
    startingLoyalty: 78,
    startingStress: 18,
    signatureTraitId: 'trait_everyone_owes_her',
    liabilityTraitId: 'trait_old_debts',
    affinities: [],
    stressProfile: {
      stressGainModifier: 0,
      breakingEventIds: [],
    },
    eventIds: [],
    flavor: {
      dossier:
        'Mother Neon remembers favors nobody admits receiving. Her help is immediate; the accounting is generational.',
      quote: 'Debt is just loyalty with a calendar.',
      visualTags: ['mythic-fixer', 'high-rise', 'neon', 'matriarch'],
    },
  },
] as const satisfies readonly OperativeDefinition[];

export function getOperativeDefinition(
  operativeId: OperativeId,
): OperativeDefinition | undefined {
  return ROSTER_OPERATIVES.find((operative) => operative.id === operativeId);
}
