import type { TraitDefinition, TraitId } from '../model';

export const ROSTER_TRAITS = [
  {
    id: 'trait_clean_entry',
    name: 'Clean Entry',
    kind: 'signature',
    description: 'Reduces Heat and risk while gathering intelligence.',
    modifiers: [
      {
        id: 'clean_entry_gather_intel',
        condition: { actionIds: ['gather_intel'] },
        effects: { heat: -1 },
        riskModifier: -3,
      },
    ],
  },
  {
    id: 'trait_ghost_debt',
    name: 'Ghost Debt',
    kind: 'liability',
    description: 'High Stress or rising Ruin may draw an old creditor into the network.',
    modifiers: [],
  },
  {
    id: 'trait_brilliant_unstable',
    name: 'Brilliant, Unstable',
    kind: 'signature',
    description: 'Gathering intelligence produces more Intel, but also creates Ruin.',
    modifiers: [
      {
        id: 'brilliant_unstable_gather_intel',
        condition: { actionIds: ['gather_intel'] },
        effects: { intel: 3, ruin: 1 },
      },
    ],
  },
  {
    id: 'trait_ghost_touch',
    name: 'Ghost Touch',
    kind: 'liability',
    description: 'Memory and strange signals place additional strain on Juno.',
    modifiers: [],
  },
  {
    id: 'trait_silver_tongue',
    name: 'Silver Tongue',
    kind: 'signature',
    description: 'Bribes cost less and influence operations produce more Dominion.',
    modifiers: [
      {
        id: 'silver_tongue_bribe',
        condition: { actionIds: ['bribe_official'] },
        resourceCostModifier: -300,
      },
      {
        id: 'silver_tongue_influence',
        condition: { actionIds: ['expand_influence'] },
        effects: { dominion: 3 },
      },
    ],
  },
  {
    id: 'trait_probably_lying',
    name: 'Probably Lying',
    kind: 'liability',
    description: 'Low Resources may cause Saint\'s concealed debt to surface.',
    modifiers: [],
  },
  {
    id: 'trait_velvet_access',
    name: 'Velvet Access',
    kind: 'signature',
    description: 'Nightlife and social targets yield more Intel with less risk.',
    modifiers: [
      {
        id: 'velvet_access_social',
        condition: { targetTags: ['nightlife', 'social'] },
        effects: { intel: 2 },
        riskModifier: -2,
      },
    ],
  },
  {
    id: 'trait_loud_solution',
    name: 'Loud Solution',
    kind: 'signature',
    description: 'Small jobs produce more money and Dominion at the cost of additional Heat.',
    modifiers: [
      {
        id: 'loud_solution_small_job',
        condition: { actionIds: ['run_small_job'] },
        effects: { resources: 400, dominion: 2, heat: 3 },
      },
    ],
  },
  {
    id: 'trait_knows_the_routes',
    name: 'Knows the Routes',
    kind: 'signature',
    description: 'Smuggling targets produce more Resources and Intel with less Heat.',
    modifiers: [
      {
        id: 'knows_the_routes_smuggling',
        condition: { targetTags: ['smuggling'] },
        effects: { resources: 300, intel: 2, heat: -1 },
      },
    ],
  },
  {
    id: 'trait_corporate_ghost',
    name: 'Corporate Ghost',
    kind: 'signature',
    description: 'Technical intelligence work is more productive and less risky.',
    modifiers: [
      {
        id: 'corporate_ghost_gather_intel',
        condition: { actionIds: ['gather_intel'] },
        effects: { intel: 3 },
        riskModifier: -2,
      },
    ],
  },
  {
    id: 'trait_marked_asset',
    name: 'Marked Asset',
    kind: 'liability',
    description: 'Corporate attention becomes more dangerous while Vant is under Stress.',
    modifiers: [],
  },
  {
    id: 'trait_soft_extraction',
    name: 'Soft Extraction',
    kind: 'signature',
    description: 'Lay Low removes additional Ruin and Stress.',
    modifiers: [
      {
        id: 'soft_extraction_lay_low',
        condition: { actionIds: ['lay_low'] },
        effects: { ruin: -2 },
        stressModifier: -4,
      },
    ],
  },
  {
    id: 'trait_unclean_hands',
    name: 'Unclean Hands',
    kind: 'liability',
    description: 'Memory recovery leaves a small Heat signature.',
    modifiers: [
      {
        id: 'unclean_hands_memory',
        condition: { targetTags: ['memory'] },
        effects: { heat: 1 },
      },
    ],
  },
  {
    id: 'trait_knows_the_desk',
    name: 'Knows the Desk',
    kind: 'signature',
    description: 'Bribes cost less and influence operations establish more district Control.',
    modifiers: [
      {
        id: 'knows_the_desk_bribe',
        condition: { actionIds: ['bribe_official'] },
        resourceCostModifier: -300,
      },
      {
        id: 'knows_the_desk_influence',
        condition: { actionIds: ['expand_influence'] },
        districtControlModifier: 2,
      },
    ],
  },
  {
    id: 'trait_public_face',
    name: 'Public Face',
    kind: 'liability',
    description: 'Working in districts at 60 or more Local Heat creates extra Heat and risk.',
    modifiers: [
      {
        id: 'public_face_high_local_heat',
        condition: { minLocalHeat: 60 },
        effects: { heat: 2 },
        riskModifier: 3,
      },
    ],
  },
  {
    id: 'trait_everyone_owes_her',
    name: 'Everyone Owes Her',
    kind: 'signature',
    description: 'Recruiting Mother Neon costs less and protects network Loyalty.',
    modifiers: [
      {
        id: 'everyone_owes_her_recruitment',
        condition: { actionIds: ['recruit_operative'] },
        effects: { loyalty: 6 },
        resourceCostModifier: -300,
      },
      {
        id: 'everyone_owes_her_lay_low',
        condition: { actionIds: ['lay_low'] },
        effects: { loyalty: 2 },
        stressModifier: -2,
      },
    ],
  },
  {
    id: 'trait_old_debts',
    name: 'Old Debts',
    kind: 'liability',
    description: 'Bringing Mother Neon into the network creates immediate Ruin.',
    modifiers: [
      {
        id: 'old_debts_recruitment',
        condition: { actionIds: ['recruit_operative'] },
        effects: { ruin: 2 },
      },
    ],
  },
] as const satisfies readonly TraitDefinition[];

export function getTraitDefinition(traitId: TraitId): TraitDefinition | undefined {
  return ROSTER_TRAITS.find((trait) => trait.id === traitId);
}
