import { DISTRICT_ZERO_WIN_LOSS_THRESHOLDS } from '../content';
import type { GameOverState, GameState } from '../model';

export function getGameOverState(state: GameState): GameOverState | undefined {
  if (state.pressures.heat >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss) {
    return {
      result: 'loss',
      reason: 'heat_lockdown',
    };
  }

  if (state.pressures.loyalty <= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss) {
    return {
      result: 'loss',
      reason: 'loyalty_collapse',
    };
  }

  if (state.pressures.resources < DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss) {
    return {
      result: 'loss',
      reason: 'bankrupt',
    };
  }

  if (state.pressures.dominion >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory) {
    return {
      result: 'victory',
      reason: 'dominion_victory',
    };
  }

  if (state.week >= state.maxWeeks) {
    return {
      result: 'loss',
      reason: 'out_of_time',
    };
  }

  return undefined;
}

export function applyWinLoss(state: GameState): GameState {
  const gameOver = getGameOverState(state);

  if (!gameOver) {
    return state;
  }

  return {
    ...state,
    phase: 'GAME_OVER',
    gameOver,
  };
}
