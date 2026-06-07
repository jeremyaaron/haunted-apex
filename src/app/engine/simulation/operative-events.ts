import type {
  GameState,
  OperativeEventDefinition,
  OperativeEventPredicate,
  OperativeEventTriggerCondition,
  OperativeState,
} from '../model';

export type OperativeEventEligibilityDiagnostics = {
  activeRosterMember: boolean;
  unseen: boolean;
  triggerMatched: boolean;
  eligible: boolean;
};

export function isOperativeEventEligible(
  state: GameState,
  event: OperativeEventDefinition,
): boolean {
  return getOperativeEventEligibility(state, event).eligible;
}

export function getOperativeEventEligibility(
  state: GameState,
  event: OperativeEventDefinition,
): OperativeEventEligibilityDiagnostics {
  const operative = state.operatives.find((candidate) => candidate.id === event.operativeId);
  const activeRosterMember = operative !== undefined;
  const unseen = !state.seenSignatureEventIds.includes(event.id);
  const triggerMatched = operative
    ? evaluateOperativeEventTrigger(state, operative, event.trigger)
    : false;

  return {
    activeRosterMember,
    unseen,
    triggerMatched,
    eligible: activeRosterMember && unseen && triggerMatched,
  };
}

export function evaluateOperativeEventTrigger(
  state: GameState,
  operative: OperativeState,
  trigger: OperativeEventDefinition['trigger'],
): boolean {
  return evaluateCondition(state, operative, trigger);
}

export function evaluateOperativeEventPredicate(
  state: GameState,
  operative: OperativeState,
  predicate: OperativeEventPredicate,
): boolean {
  switch (predicate.type) {
    case 'operative_stress_at_least':
      return operative.stress >= predicate.amount;
    case 'operative_loyalty_at_most':
      return operative.loyalty <= predicate.amount;
    case 'operative_assigned_within_weeks':
      return operative.recentAssignments.some(
        (assignment) => assignment.week >= state.week - predicate.weeks,
      );
    case 'operative_assignment_count':
      return (
        operative.recentAssignments.filter(
          (assignment) =>
            predicate.actionId === undefined || assignment.actionId === predicate.actionId,
        ).length >= predicate.count
      );
    case 'recent_assignment_tag':
      return (
        operative.recentAssignments.filter((assignment) =>
          assignment.targetTags.includes(predicate.tag),
        ).length >= (predicate.count ?? 1)
      );
    case 'global_pressure_at_least':
      return state.pressures[predicate.pressure] >= predicate.amount;
    case 'global_pressure_at_most':
      return state.pressures[predicate.pressure] <= predicate.amount;
    case 'rival_pressure_at_least':
      return state.rivals[predicate.rivalId].pressure >= predicate.amount;
  }
}

function evaluateCondition(
  state: GameState,
  operative: OperativeState,
  condition: OperativeEventTriggerCondition,
): boolean {
  if ('type' in condition) {
    return evaluateOperativeEventPredicate(state, operative, condition);
  }

  const results = condition.predicates.map((predicate) =>
    evaluateCondition(state, operative, predicate),
  );

  return condition.mode === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}
