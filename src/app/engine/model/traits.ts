import type { ActionId } from './actions';
import type { PressureDelta, PressureId } from './pressures';
import type { RivalId } from './rivals';
import type { StressTier } from './operatives';

export type TraitId =
  | 'trait_clean_entry'
  | 'trait_ghost_debt'
  | 'trait_brilliant_unstable'
  | 'trait_ghost_touch'
  | 'trait_silver_tongue'
  | 'trait_probably_lying'
  | 'trait_velvet_access'
  | 'trait_loud_solution'
  | 'trait_knows_the_routes'
  | 'trait_corporate_ghost'
  | 'trait_marked_asset'
  | 'trait_soft_extraction'
  | 'trait_unclean_hands'
  | 'trait_knows_the_desk'
  | 'trait_public_face'
  | 'trait_everyone_owes_her'
  | 'trait_old_debts';

export type TraitKind = 'signature' | 'liability' | 'stress' | 'hidden';

export type ModifierCondition = {
  actionIds?: readonly ActionId[];
  targetTags?: readonly string[];
  rivalIds?: readonly RivalId[];
  minLocalHeat?: number;
  minStressTier?: StressTier;
  maxStressTier?: StressTier;
  minPressure?: Partial<Record<PressureId, number>>;
  maxPressure?: Partial<Record<PressureId, number>>;
};

export type TraitModifier = {
  id: string;
  condition: ModifierCondition;
  effects?: PressureDelta;
  resourceCostModifier?: number;
  riskModifier?: number;
  stressModifier?: number;
  rivalPressureModifier?: number;
  districtControlModifier?: number;
};

export type TraitDefinition = {
  id: TraitId;
  name: string;
  kind: TraitKind;
  description: string;
  modifiers: readonly TraitModifier[];
};
