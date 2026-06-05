import type { OperativeSkill } from './operatives';
import type { PressureDelta } from './pressures';

export type ActionId =
  | 'gather_intel'
  | 'run_small_job'
  | 'bribe_official'
  | 'recruit_operative'
  | 'expand_influence'
  | 'lay_low';

export type ActionStressType = 'normal' | 'dangerous' | 'recovery' | 'none';

export type ActionAssignmentRule = 'optional' | 'required' | 'none';

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
};

export type QueuedOrder = {
  id: string;
  actionId: ActionId;
  assignedOperativeId?: string;
};

