import type { AccordDefinition, AccordRequirement, FactionState, FrontState } from '../model';

export type AccordRequirementState = {
  fronts: Partial<Record<FrontState['id'], FrontState>>;
};

export function isAccordRequirementMet(
  requirement: AccordRequirement,
  faction: Pick<FactionState, 'standing' | 'suspicion' | 'obligation'>,
  state: AccordRequirementState,
): boolean {
  if ('type' in requirement) {
    return Object.values(state.fronts).some((front) => front?.active);
  }

  const current = faction[requirement.metric];

  if ('gte' in requirement) {
    return current >= requirement.gte;
  }

  return current <= requirement.lte;
}

export function getUnmetAccordRequirements(
  accord: Pick<AccordDefinition, 'requirements'>,
  faction: Pick<FactionState, 'standing' | 'suspicion' | 'obligation'>,
  state: AccordRequirementState,
): AccordRequirement[] {
  return (accord.requirements ?? []).filter(
    (requirement) => !isAccordRequirementMet(requirement, faction, state),
  );
}
