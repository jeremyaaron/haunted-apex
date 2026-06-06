import type {
  ActionId,
  ActionTarget,
  GameState,
  PressureDelta,
  RecentActivityEntry,
} from '../model';
import { getTargetControllerId, getTargetTags } from '../selectors';

export function recordRecentActivity(
  state: GameState,
  actionId: ActionId,
  target: ActionTarget | undefined,
  resolvedDelta: PressureDelta,
): GameState {
  const rivalId = getTargetControllerId(target);
  const entry: RecentActivityEntry = {
    id: nextActivityId(state),
    week: state.week,
    actionId,
    ...(target ? { target: { ...target } } : {}),
    targetTags: getTargetTags(target),
    ...(rivalId ? { rivalId } : {}),
    heatDelta: resolvedDelta.heat ?? 0,
    dominionDelta: resolvedDelta.dominion ?? 0,
  };

  return {
    ...state,
    recentActivity: [...state.recentActivity, entry],
  };
}

export function pruneRecentActivity(state: GameState): GameState {
  const oldestWeek = state.week - 2;

  return {
    ...state,
    recentActivity: state.recentActivity.filter((entry) => entry.week >= oldestWeek),
  };
}

function nextActivityId(state: GameState): string {
  const prefix = `activity_${state.week}_`;
  const maxExistingId = state.recentActivity.reduce((max, entry) => {
    if (!entry.id.startsWith(prefix)) {
      return max;
    }

    const suffix = Number.parseInt(entry.id.slice(prefix.length), 10);
    return Number.isNaN(suffix) ? max : Math.max(max, suffix);
  }, 0);

  return `${prefix}${maxExistingId + 1}`;
}
