import { DISTRICT_ZERO_INITIAL_PRESSURES } from '../content';
import type { GameState } from '../model';
import { getRunRules } from '../simulation';

export type DominionPaceStatus = 'ahead' | 'on_pace' | 'behind' | 'critical';

export type DominionPaceView = {
  target: number;
  current: number;
  dominionNeeded: number;
  weeksRemaining: number;
  requiredPerWeek: number;
  actualPerWeek: number;
  status: DominionPaceStatus;
  summary: string;
};

export function selectDominionPace(state: GameState): DominionPaceView {
  const rules = getRunRules(state);
  const current = state.pressures.dominion;
  const target = rules.dominionTarget;
  const dominionNeeded = Math.max(0, target - current);
  const weeksRemaining = Math.max(1, rules.maxWeeks - state.week + 1);
  const requiredPerWeek = roundTenth(dominionNeeded / weeksRemaining);
  const actualWeeksElapsed = Math.max(1, state.week - 1);
  const actualPerWeek = roundTenth(
    Math.max(0, current - DISTRICT_ZERO_INITIAL_PRESSURES.dominion) / actualWeeksElapsed,
  );
  const status = getDominionPaceStatus({
    current,
    target,
    requiredPerWeek,
    actualPerWeek,
    week: state.week,
    maxWeeks: rules.maxWeeks,
  });

  return {
    target,
    current,
    dominionNeeded,
    weeksRemaining,
    requiredPerWeek,
    actualPerWeek,
    status,
    summary: getDominionPaceSummary(status, requiredPerWeek),
  };
}

function getDominionPaceStatus(config: {
  current: number;
  target: number;
  requiredPerWeek: number;
  actualPerWeek: number;
  week: number;
  maxWeeks: number;
}): DominionPaceStatus {
  if (config.current >= config.target) {
    return 'ahead';
  }

  const remainingRatio = (config.maxWeeks - config.week + 1) / config.maxWeeks;

  if (config.requiredPerWeek <= 7 && config.actualPerWeek >= 9) {
    return 'ahead';
  }

  if (config.requiredPerWeek <= 10) {
    return 'on_pace';
  }

  if (config.requiredPerWeek <= 14 || remainingRatio > 0.45) {
    return 'behind';
  }

  return 'critical';
}

function getDominionPaceSummary(status: DominionPaceStatus, requiredPerWeek: number): string {
  switch (status) {
    case 'ahead':
      return 'Dominion Pace: You are ahead of pace. Stabilize Heat, Loyalty, or Resources before pushing again.';
    case 'on_pace':
      return `Dominion Pace: You need about ${formatNumber(requiredPerWeek)} Dominion per week to win.`;
    case 'behind':
      return `Dominion Pace: You need about ${formatNumber(requiredPerWeek)} Dominion per week. Push Dominion soon.`;
    case 'critical':
      return `Dominion Pace: You need about ${formatNumber(requiredPerWeek)} Dominion per week. This run needs urgent Dominion gains.`;
  }
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}
