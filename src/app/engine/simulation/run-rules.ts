import { DISTRICT_ZERO_WIN_LOSS_THRESHOLDS } from '../content';
import type { GameState } from '../model';

export type RunRules = {
  dominionTarget: number;
  heatLoss: number;
  loyaltyLoss: number;
  resourceLoss: number;
  maxWeeks: number;
};

export function getRunRules(state: GameState): RunRules {
  return {
    dominionTarget: state.run.dominionTarget,
    heatLoss: DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss,
    loyaltyLoss: DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss,
    resourceLoss: DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss,
    maxWeeks: state.maxWeeks,
  };
}
