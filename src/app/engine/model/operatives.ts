import type { ActionId, ActionTarget } from './actions';
import type { DistrictId } from './districts';
import type { EventId } from './events';
import type { PressureDelta } from './pressures';
import type { RivalId } from './rivals';
import type { TraitId } from './traits';

export type OperativeSkill = 'violence' | 'charm' | 'tech' | 'subtlety';

export type OperativeStatus = 'available' | 'assigned' | 'idle' | 'injured' | 'compromised';

export type OperativeId =
  | 'op_mara_voss'
  | 'op_juno_hex'
  | 'op_saint_calder'
  | 'op_iris_vale'
  | 'op_knox_riven'
  | 'op_orchid_seven'
  | 'op_vant_black'
  | 'op_echo_saint'
  | 'op_rook_vale'
  | 'op_mother_neon';

export type OperativeRarity = 'common' | 'uncommon' | 'rare';

export type OperativeRoleTag =
  | 'intel'
  | 'social'
  | 'violence'
  | 'tech'
  | 'heat_control'
  | 'money'
  | 'ruin'
  | 'stability'
  | 'rival_pressure'
  | 'recruitment';

export type OperativeStats = {
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
};

export type StressTier = 'stable' | 'strained' | 'unstable' | 'breaking';

export type StressProfile = {
  stressGainModifier: number;
  breakingEventIds: readonly EventId[];
};

export type OperativeAffinity = {
  id: string;
  actionId?: ActionId;
  targetTag?: string;
  districtId?: DistrictId;
  districtTag?: string;
  rivalId?: RivalId;
  effects?: PressureDelta;
  riskModifier?: number;
  stressModifier?: number;
  rivalPressureModifier?: number;
};

export type OperativeDefinition = {
  id: OperativeId;
  name: string;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: readonly OperativeRoleTag[];
  baseStats: OperativeStats;
  startingLoyalty: number;
  startingStress: number;
  signatureTraitId: TraitId;
  liabilityTraitId?: TraitId;
  affinities: readonly OperativeAffinity[];
  stressProfile: StressProfile;
  eventIds: readonly EventId[];
  flavor: {
    dossier: string;
    quote?: string;
    visualTags?: readonly string[];
  };
};

export type RecentAssignment = {
  id: string;
  week: number;
  actionId: ActionId;
  target?: ActionTarget;
  targetTags: string[];
  complication: boolean;
  stressDelta: number;
};

export type OperativeState = {
  id: OperativeId;
  loyalty: number;
  stress: number;
  status: OperativeStatus;
  revealedTraits: TraitId[];
  hiddenFlags: Record<string, boolean | number | string>;
  weeksAssigned: number;
  recentAssignments: RecentAssignment[];
};

// Compatibility models retained until Phase 2 replaces fixed roster initialization.
export type Operative = {
  id: string;
  name: string;
  archetype: string;
  loyalty: number;
  stress: number;
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
  traitIds: string[];
  status: OperativeStatus;
};

export type RecruitCandidate = {
  id: string;
  name: string;
  archetype: string;
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
  traitIds: string[];
};
