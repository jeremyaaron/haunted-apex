import type { Pressures } from '../model';

export const DISTRICT_ZERO_MAX_WEEKS = 8;
export const DISTRICT_ZERO_COMMAND_POINTS = 2;
export const DISTRICT_ZERO_MAX_OPERATIVES = 5;

export const DISTRICT_ZERO_INITIAL_PRESSURES: Pressures = {
  dominion: 12,
  heat: 18,
  loyalty: 68,
  resources: 5000,
  intel: 10,
  ruin: 0,
};

export const DISTRICT_ZERO_SOFT_WARNINGS = {
  heat: 80,
  loyalty: 25,
  resources: 750,
} as const;

export const DISTRICT_ZERO_WIN_LOSS_THRESHOLDS = {
  dominionVictory: 70,
  heatLoss: 100,
  loyaltyLoss: 0,
  resourceLoss: 0,
} as const;
