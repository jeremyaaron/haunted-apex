import type { ActionId, RivalPressureTier } from '../model';

const RIVAL_PRESSURE_BY_ACTION: Record<ActionId, number> = {
  gather_intel: 4,
  run_small_job: 8,
  bribe_official: 5,
  recruit_operative: 3,
  expand_influence: 12,
  lay_low: 0,
};

export function calculateRivalPressureGain(actionId: ActionId): number {
  return RIVAL_PRESSURE_BY_ACTION[actionId];
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
