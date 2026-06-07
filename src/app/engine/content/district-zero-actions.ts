import type { ActionDefinition, ActionId, PressureDelta } from '../model';

export type OperativeActionModifier = {
  effects?: PressureDelta;
  resourceCost?: number;
  stress?: number;
  chanceRelationshipLead?: number;
};

export type OperativeActionModifierMap = Partial<Record<ActionId, OperativeActionModifier>>;

export const DISTRICT_ZERO_ACTIONS: readonly ActionDefinition[] = [
  {
    id: 'gather_intel',
    label: 'Gather Intel',
    commandCost: 1,
    resourceCost: 400,
    effects: {
      intel: 10,
      heat: 2,
    },
    operativeSkill: 'subtlety',
    baseRisk: 10,
    stressType: 'normal',
    assignment: 'optional',
    requiresTarget: false,
    allowedTargetTypes: ['district', 'venue', 'rival'],
  },
  {
    id: 'run_small_job',
    label: 'Run a Small Job',
    commandCost: 1,
    resourceCost: 0,
    effects: {
      resources: 1500,
      dominion: 4,
      heat: 9,
      loyalty: -3,
    },
    operativeSkill: 'violence',
    baseRisk: 22,
    stressType: 'dangerous',
    assignment: 'optional',
    requiresTarget: true,
    allowedTargetTypes: ['district', 'venue'],
  },
  {
    id: 'bribe_official',
    label: 'Bribe an Official',
    commandCost: 1,
    resourceCost: 1200,
    effects: {
      heat: -12,
      intel: 2,
      ruin: 2,
    },
    operativeSkill: 'charm',
    baseRisk: 14,
    stressType: 'normal',
    assignment: 'optional',
    requiresTarget: false,
    allowedTargetTypes: ['district', 'rival'],
  },
  {
    id: 'recruit_operative',
    label: 'Recruit an Operative',
    commandCost: 1,
    resourceCost: 1600,
    effects: {
      loyalty: -4,
      dominion: 3,
    },
    baseRisk: 12,
    stressType: 'none',
    assignment: 'none',
    requiresTarget: true,
    allowedTargetTypes: ['recruit'],
  },
  {
    id: 'expand_influence',
    label: 'Expand Influence',
    commandCost: 1,
    resourceCost: 850,
    effects: {
      dominion: 9,
      heat: 8,
      loyalty: -3,
      ruin: 1,
    },
    operativeSkill: 'charm',
    baseRisk: 18,
    stressType: 'normal',
    assignment: 'optional',
    requiresTarget: true,
    allowedTargetTypes: ['district', 'venue'],
  },
  {
    id: 'lay_low',
    label: 'Lay Low',
    commandCost: 1,
    resourceCost: 100,
    effects: {
      heat: -12,
      loyalty: 5,
      dominion: -1,
    },
    baseRisk: 4,
    stressType: 'recovery',
    assignment: 'optional',
    requiresTarget: false,
    allowedTargetTypes: ['district', 'venue'],
  },
] as const;

export const DISTRICT_ZERO_OPERATIVE_ACTION_MODIFIERS: Record<string, OperativeActionModifierMap> = {
  op_mara_voss: {
    gather_intel: {
      effects: {
        heat: -1,
      },
    },
    expand_influence: {
      effects: {
        heat: -2,
      },
    },
    run_small_job: {
      effects: {
        resources: -400,
        heat: -2,
      },
    },
  },
  op_juno_hex: {
    gather_intel: {
      effects: {
        intel: 3,
        ruin: 1,
      },
      stress: 5,
    },
    run_small_job: {
      effects: {
        intel: 2,
        ruin: 1,
      },
    },
    expand_influence: {
      effects: {
        intel: 2,
        ruin: 1,
      },
    },
  },
  op_saint_calder: {
    bribe_official: {
      resourceCost: -300,
    },
    expand_influence: {
      effects: {
        dominion: 3,
      },
    },
    gather_intel: {
      chanceRelationshipLead: 0.1,
    },
  },
};

export function getActionDefinition(actionId: ActionId): ActionDefinition | undefined {
  return DISTRICT_ZERO_ACTIONS.find((action) => action.id === actionId);
}

export function getOperativeActionModifier(
  operativeId: string | undefined,
  actionId: ActionId,
): OperativeActionModifier | undefined {
  if (!operativeId) {
    return undefined;
  }

  return DISTRICT_ZERO_OPERATIVE_ACTION_MODIFIERS[operativeId]?.[actionId];
}
