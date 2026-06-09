import { getActionDefinition } from '../content';
import type { GameState, QueuedOrder } from '../model';
import {
  getOrderAvailability,
  type QueueOrderRequest,
  type QueueOrderUnavailableReason,
} from '../selectors';

export type QueueOrderResult =
  | {
      ok: true;
      state: GameState;
      order: QueuedOrder;
    }
  | {
      ok: false;
      state: GameState;
      error: QueueOrderUnavailableReason;
    };

export type RemoveQueuedOrderResult =
  | {
      ok: true;
      state: GameState;
    }
  | {
      ok: false;
      state: GameState;
      error: 'queued_order_not_found';
    };

export function queueOrder(state: GameState, request: QueueOrderRequest): QueueOrderResult {
  const availability = getOrderAvailability(state, request);

  if (!availability.available) {
    return {
      ok: false,
      state,
      error: availability.reason ?? 'action_not_found',
    };
  }

  const action = getActionDefinition(request.actionId);

  if (!action) {
    return {
      ok: false,
      state,
      error: 'action_not_found',
    };
  }

  const order: QueuedOrder = {
    id: nextOrderId(state),
    actionId: action.id,
    ...(request.assignedOperativeId
      ? { assignedOperativeId: request.assignedOperativeId }
      : {}),
    ...(request.target ? { target: { ...request.target } } : {}),
  };

  return {
    ok: true,
    order,
    state: {
      ...state,
      operatives: request.assignedOperativeId
        ? markOperativeStatus(state, request.assignedOperativeId, 'assigned')
        : state.operatives,
      queuedOrders: [...state.queuedOrders, order],
    },
  };
}

export function removeQueuedOrder(
  state: GameState,
  queuedOrderId: string,
): RemoveQueuedOrderResult {
  const order = state.queuedOrders.find((candidate) => candidate.id === queuedOrderId);

  if (!order) {
    return {
      ok: false,
      state,
      error: 'queued_order_not_found',
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      operatives: order.assignedOperativeId
        ? markOperativeStatus(state, order.assignedOperativeId, 'available')
        : state.operatives,
      queuedOrders: state.queuedOrders.filter((candidate) => candidate.id !== queuedOrderId),
    },
  };
}

function nextOrderId(state: GameState): string {
  const prefix = `order_${state.week}_`;
  const maxExistingId = state.queuedOrders.reduce((max, order) => {
    if (!order.id.startsWith(prefix)) {
      return max;
    }

    const suffix = Number.parseInt(order.id.slice(prefix.length), 10);
    return Number.isNaN(suffix) ? max : Math.max(max, suffix);
  }, 0);

  return `${prefix}${maxExistingId + 1}`;
}

function markOperativeStatus(
  state: GameState,
  operativeId: string,
  status: 'available' | 'assigned',
) {
  return state.operatives.map((operative) =>
    operative.id === operativeId
      ? {
          ...operative,
          status,
        }
      : operative,
  );
}
