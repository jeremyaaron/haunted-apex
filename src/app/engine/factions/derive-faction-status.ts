import type { FactionState, FactionStatus } from '../model';

export function deriveFactionStatus(
  faction: Pick<FactionState, 'standing' | 'suspicion' | 'obligation'>,
): FactionStatus {
  if (faction.standing <= 20) {
    return 'hostile';
  }

  if (faction.obligation >= 70 && faction.suspicion >= 60) {
    return 'entangled';
  }

  if (faction.obligation >= 70) {
    return 'indebted';
  }

  if (faction.suspicion >= 70) {
    return 'watching';
  }

  if (faction.standing >= 70) {
    return 'favorable';
  }

  if (faction.standing <= 40) {
    return 'cold';
  }

  return 'neutral';
}
