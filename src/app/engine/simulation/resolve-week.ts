import type { GameState } from '../model';
import { applyIdleStressRecovery } from './stress';
import { applyWeeklyDrift } from './weekly-drift';
import { applyLocalDistrictCooling } from './district-effects';
import { pruneRecentActivity } from './recent-activity';
import { applyRivalPassiveEffects } from './rival-effects';
import { resolveQueuedOrder } from './resolve-action';
import { selectWeeklyEvent, type EventSelection } from './select-weekly-event';

export type AdvanceWeekResult =
  | {
      ok: true;
      state: GameState;
      eventSelection: EventSelection;
    }
  | {
      ok: false;
      state: GameState;
      error: 'no_queued_orders' | 'not_command_phase';
    };

export function advanceWeek(state: GameState): AdvanceWeekResult {
  if (state.phase !== 'COMMAND') {
    return {
      ok: false,
      state,
      error: 'not_command_phase',
    };
  }

  if (state.queuedOrders.length === 0) {
    return {
      ok: false,
      state,
      error: 'no_queued_orders',
    };
  }

  let next: GameState = {
    ...state,
    phase: 'RESOLVING_ACTIONS',
  };

  for (const order of state.queuedOrders) {
    next = resolveQueuedOrder(next, order).state;
  }

  next = applyIdleStressRecovery(next, state.queuedOrders);
  next = applyWeeklyDrift(next);
  next = applyLocalDistrictCooling(next);
  next = applyRivalPassiveEffects(next);
  next = pruneRecentActivity(next);

  const selectedEvent = selectWeeklyEvent(next);
  next = {
    ...next,
    rngCursor: selectedEvent.rng.cursor,
    queuedOrders: [],
    pendingEvent: selectedEvent.event,
    phase: 'EVENT_CHOICE',
    eventLog: [
      ...next.eventLog,
      {
        id: `log_${next.week}_${next.eventLog.length + 1}_event_presented`,
        week: next.week,
        type: 'event_presented',
        title: selectedEvent.definition.title,
        body: selectedEvent.definition.text,
        tags: selectedEvent.definition.tags,
      },
    ],
  };

  return {
    ok: true,
    state: next,
    eventSelection: selectedEvent,
  };
}
