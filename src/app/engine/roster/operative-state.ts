import { getOperativeDefinition } from '../content';
import type { OperativeId, OperativeState } from '../model';

export function materializeOperativeState(operativeId: OperativeId): OperativeState {
  const definition = getOperativeDefinition(operativeId);

  if (!definition) {
    throw new Error(`Roster content error: missing operative definition for ${operativeId}.`);
  }

  return {
    id: operativeId,
    loyalty: definition.startingLoyalty,
    stress: definition.startingStress,
    status: 'available',
    revealedTraits: [
      definition.signatureTraitId,
      ...(definition.liabilityTraitId ? [definition.liabilityTraitId] : []),
    ],
    hiddenFlags: {},
    weeksAssigned: 0,
    recentAssignments: [],
  };
}
