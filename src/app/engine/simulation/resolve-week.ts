import { getContactDefinition, getFrontDefinition, getLedgerEntryDefinition } from '../content';
import type { GameEventInstance, GameState, QueuedOrder } from '../model';
import { applyIdleStressRecovery, pruneRecentAssignments } from './stress';
import { applyWeeklyDrift } from './weekly-drift';
import { applyWeeklyFrontYields } from './front-yields';
import { applyLocalDistrictCooling } from './district-effects';
import { pruneRecentActivity } from './recent-activity';
import { applyRivalPassiveEffects } from './rival-effects';
import { resolveQueuedOrder, type ActionResolution } from './resolve-action';
import { getWeightedEvents, selectWeeklyEvent, type EventSelection, type WeightedEvent } from './select-weekly-event';

export type AdvanceWeekResult =
  | {
      ok: true;
      state: GameState;
      eventSelection: EventSelection;
      eventCandidates: WeightedEvent[];
      orderResolutions: OrderResolutionDiagnostic[];
    }
  | {
      ok: false;
      state: GameState;
      error: 'no_queued_orders' | 'not_command_phase';
    };

export type OrderResolutionDiagnostic = {
  order: QueuedOrder;
  complication: boolean;
  riskChance: number;
  resolvedDelta: ActionResolution['resolvedDelta'];
  stressDelta: number;
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
  const orderResolutions: OrderResolutionDiagnostic[] = [];

  for (const order of state.queuedOrders) {
    const resolution = resolveQueuedOrder(next, order);
    next = resolution.state;
    orderResolutions.push({
      order: {
        ...order,
        ...(order.target ? { target: { ...order.target } } : {}),
      },
      complication: resolution.complication,
      riskChance: resolution.riskChance,
      resolvedDelta: resolution.resolvedDelta,
      stressDelta: resolution.stressDelta,
    });
  }

  next = applyIdleStressRecovery(next, state.queuedOrders);
  next = pruneRecentAssignments(next);
  next = applyWeeklyFrontYields(next);
  next = applyWeeklyDrift(next);
  next = applyLocalDistrictCooling(next);
  next = applyRivalPassiveEffects(next);
  next = pruneRecentActivity(next);

  const eventCandidates = getWeightedEvents(next);
  const selectedEvent = selectWeeklyEvent(next);
  const seenSignatureEventIds =
    selectedEvent.definition.kind === 'operative' || selectedEvent.definition.contact?.signature
      ? [...next.seenSignatureEventIds, selectedEvent.definition.id]
      : next.seenSignatureEventIds;
  next = {
    ...next,
    rngCursor: selectedEvent.rng.cursor,
    seenSignatureEventIds,
    queuedOrders: [],
    pendingEvent: selectedEvent.event,
    phase: 'EVENT_CHOICE',
    eventLog: [
      ...next.eventLog,
      {
        id: `log_${next.week}_${next.eventLog.length + 1}_event_presented`,
        week: next.week,
        type: 'event_presented',
        title: renderSelectedEventText(next, selectedEvent.event, selectedEvent.definition.title),
        body: renderSelectedEventText(next, selectedEvent.event, selectedEvent.definition.text),
        tags: [...selectedEvent.definition.tags, selectedEvent.definition.id],
      },
    ],
  };

  return {
    ok: true,
    state: next,
    eventSelection: selectedEvent,
    eventCandidates,
    orderResolutions,
  };
}

function renderSelectedEventText(
  state: GameState,
  event: GameEventInstance,
  text: string,
): string {
  const selectedLedgerEntry = event.selectedLedgerEntryId
    ? state.ledger.entries.find((entry) => entry.id === event.selectedLedgerEntryId)
    : undefined;
  const selectedLedgerDefinition = selectedLedgerEntry
    ? getLedgerEntryDefinition(selectedLedgerEntry.definitionId)
    : undefined;
  const selectedContactDefinition = event.selectedContactId
    ? getContactDefinition(event.selectedContactId)
    : undefined;
  const selectedFront = event.selectedFrontId ? state.fronts[event.selectedFrontId] : undefined;
  const selectedFrontDefinition = selectedFront
    ? getFrontDefinition(selectedFront.definitionId)
    : undefined;

  return text
    .replaceAll('{ledgerEntryName}', selectedLedgerDefinition?.name ?? 'Ledger Entry')
    .replaceAll('{contactName}', selectedContactDefinition?.name ?? 'Contact')
    .replaceAll('{frontName}', selectedFrontDefinition?.name ?? 'Front');
}
