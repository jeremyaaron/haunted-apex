import type { ActionId, RivalPressureTier } from '../model';

const RIVAL_PRESSURE_BY_ACTION: Record<ActionId, number> = {
  gather_intel: 4,
  run_small_job: 10,
  bribe_official: 5,
  recruit_operative: 3,
  expand_influence: 14,
  lay_low: 0,
};

export function calculateRivalPressureGain(
  actionId: ActionId,
  operativeModifier = 0,
): number {
  return Math.max(0, RIVAL_PRESSURE_BY_ACTION[actionId] + operativeModifier);
}

export function getRivalPressureTier(pressure: number): RivalPressureTier {
  if (pressure < 25) {
    return 'watching';
  }

  if (pressure < 50) {
    return 'interested';
  }

  if (pressure < 75) {
    return 'provoked';
  }

  return 'retaliating';
}
