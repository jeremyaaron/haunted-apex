import type { AccordId, ActiveAccordId, FactionState } from '../model';

export const ACTIVE_ACCORD_CAP = 2;
export const FACTION_ACTIVE_ACCORD_CAP = 1;

export function createActiveAccordId(accordId: AccordId, sequence: number): ActiveAccordId {
  return `active_${accordId}_${sequence}`;
}

export function isAccordUsed(
  faction: Pick<FactionState, 'usedAccordIds'>,
  accordId: AccordId,
): boolean {
  return faction.usedAccordIds.includes(accordId);
}

export function hasTotalAccordCapacity(activeAccordCount: number): boolean {
  return activeAccordCount < ACTIVE_ACCORD_CAP;
}

export function hasFactionAccordCapacity(faction: Pick<FactionState, 'activeAccordIds'>): boolean {
  return faction.activeAccordIds.length < FACTION_ACTIVE_ACCORD_CAP;
}
