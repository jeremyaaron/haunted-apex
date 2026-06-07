import type { OperativeId, OperativeSkill } from './operatives';
import type { PressureDelta } from './pressures';
import type { DistrictId } from './districts';
import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type ActionId =
  | 'gather_intel'
  | 'run_small_job'
  | 'bribe_official'
  | 'recruit_operative'
  | 'expand_influence'
  | 'lay_low';

export type ActionStressType = 'normal' | 'dangerous' | 'recovery' | 'none';

export type ActionAssignmentRule = 'optional' | 'required' | 'none';

export type ActionTarget =
  | { type: 'district'; id: DistrictId }
  | { type: 'venue'; id: VenueId }
  | { type: 'rival'; id: RivalId }
  | { type: 'recruit'; id: OperativeId };

export type ActionDefinition = {
  id: ActionId;
  label: string;
  commandCost: number;
  resourceCost: number;
  effects: PressureDelta;
  operativeSkill?: OperativeSkill;
  baseRisk: number;
  stressType: ActionStressType;
  assignment: ActionAssignmentRule;
  requiresTarget: boolean;
  allowedTargetTypes: readonly ActionTarget['type'][];
};

export type QueuedOrder = {
  id: string;
  actionId: ActionId;
  assignedOperativeId?: string;
  target?: ActionTarget;
};
