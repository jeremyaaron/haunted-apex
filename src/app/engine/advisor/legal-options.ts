import { DISTRICT_ZERO_ACTIONS, getEventDefinition } from '../content';
import type { ActionId, ActionTarget, EventChoiceDefinition, GameState } from '../model';
import {
  getActionPreview,
  getCommandPointsRemaining,
  getOrderAvailability,
  selectActionTargetOptions,
  type ActionPreview,
  type OrderAvailability,
  type QueueOrderRequest,
} from '../selectors';
import {
  getEventChoiceAvailability,
  getEventChoicePreview,
  type EventChoiceAvailability,
  type EventChoicePreview,
} from '../simulation';

export type LegalOptionKey = string;

export type OrderCandidateOption = QueueOrderRequest & {
  key: LegalOptionKey;
  actionLabel: string;
  targetKey?: LegalOptionKey;
  targetLabel?: string;
  assignmentKey: LegalOptionKey;
  assignedOperativeId?: string;
  assignmentLabel: string;
  preview?: ActionPreview;
  commandCost: number;
  cost: number;
  risk: number;
  availability: OrderAvailability;
};

export type LegalOrderOption = OrderCandidateOption & {
  preview: ActionPreview;
  availability: { available: true };
};

export type EventChoiceCandidateOption = {
  key: LegalOptionKey;
  eventId: string;
  choice: EventChoiceDefinition;
  choiceId: string;
  choiceLabel: string;
  preview?: EventChoicePreview;
  availability: EventChoiceAvailability;
};

export type LegalEventChoiceOption = EventChoiceCandidateOption & {
  preview: EventChoicePreview;
  availability: { available: true };
};

export function selectOrderCandidateOptions(state: GameState): OrderCandidateOption[] {
  if (state.phase !== 'COMMAND') {
    return [];
  }

  const queuedActionIds = new Set(state.queuedOrders.map((order) => order.actionId));
  const options: OrderCandidateOption[] = [];

  for (const action of DISTRICT_ZERO_ACTIONS) {
    if (queuedActionIds.has(action.id)) {
      continue;
    }

    for (const request of getOrderRequestsForAction(state, action.id)) {
      const preview = getActionPreview(
        state,
        request.actionId,
        request.assignedOperativeId,
        request.target,
      );
      const availability = getOrderAvailability(state, request);
      const targetKey = request.target ? getActionTargetKey(request.target) : undefined;

      options.push({
        ...request,
        key: getOrderOptionKey(request),
        actionLabel: preview?.label ?? action.label,
        targetKey,
        targetLabel: preview?.targetLabel,
        assignmentKey: getAssignmentKey(request.assignedOperativeId),
        assignmentLabel: request.assignedOperativeId ?? 'No operative',
        preview,
        commandCost: action.commandCost,
        cost: preview?.adjustedResourceCost ?? action.resourceCost,
        risk: preview?.riskChance ?? action.baseRisk,
        availability,
      });
    }
  }

  return options;
}

export function selectLegalOrderOptions(state: GameState): LegalOrderOption[] {
  if (state.phase !== 'COMMAND' || getCommandPointsRemaining(state) <= 0) {
    return [];
  }

  const queuedActionIds = new Set(state.queuedOrders.map((order) => order.actionId));
  const options: LegalOrderOption[] = [];

  for (const action of DISTRICT_ZERO_ACTIONS) {
    if (queuedActionIds.has(action.id)) {
      continue;
    }

    for (const request of getOrderRequestsForAction(state, action.id)) {
      const availability = getOrderAvailability(state, request);

      if (!availability.available) {
        continue;
      }

      const preview = getActionPreview(
        state,
        request.actionId,
        request.assignedOperativeId,
        request.target,
      );

      if (!preview) {
        continue;
      }

      const targetKey = request.target ? getActionTargetKey(request.target) : undefined;

      options.push({
        ...request,
        key: getOrderOptionKey(request),
        actionLabel: preview.label,
        targetKey,
        targetLabel: preview.targetLabel,
        assignmentKey: getAssignmentKey(request.assignedOperativeId),
        assignmentLabel: request.assignedOperativeId ?? 'No operative',
        preview,
        commandCost: action.commandCost,
        cost: preview.adjustedResourceCost,
        risk: preview.riskChance,
        availability: { available: true },
      });
    }
  }

  return options;
}

export function selectEventChoiceCandidateOptions(state: GameState): EventChoiceCandidateOption[] {
  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return [];
  }

  const definition = getEventDefinition(pendingEvent.definitionId);

  if (!definition) {
    return [];
  }

  return definition.choices.map((choice) => {
    const availability = getEventChoiceAvailability(state, pendingEvent.id, choice.id);
    const preview = getEventChoicePreview(state, pendingEvent.id, choice.id);

    return {
      key: getEventChoiceKey(pendingEvent.id, choice.id),
      eventId: pendingEvent.id,
      choice,
      choiceId: choice.id,
      choiceLabel: choice.label,
      preview,
      availability,
    };
  });
}

export function selectLegalEventChoiceOptions(state: GameState): LegalEventChoiceOption[] {
  return selectEventChoiceCandidateOptions(state).flatMap((option) =>
    option.availability.available && option.preview
      ? [
          {
            ...option,
            preview: option.preview,
            availability: { available: true as const },
          },
        ]
      : [],
  );
}

export function getOrderOptionKey(request: QueueOrderRequest): LegalOptionKey {
  return [
    `action:${request.actionId}`,
    request.target ? `target:${getActionTargetKey(request.target)}` : 'target:none',
    `assignment:${getAssignmentKey(request.assignedOperativeId)}`,
  ].join('|');
}

export function getActionTargetKey(target: ActionTarget): LegalOptionKey {
  switch (target.type) {
    case 'district':
    case 'venue':
    case 'rival':
    case 'recruit':
    case 'front_opportunity':
    case 'front':
      return `${target.type}:${target.id}`;
    case 'ledger':
      return `ledger:${target.entryId}:${target.useOptionId}`;
    case 'contact':
      return `contact:${target.contactId}:${target.optionId}`;
    case 'faction':
      return `faction:${target.factionId}:${target.accordId}`;
  }
}

export function getAssignmentKey(assignedOperativeId?: string): LegalOptionKey {
  return assignedOperativeId ? `operative:${assignedOperativeId}` : 'operative:none';
}

export function getEventChoiceKey(eventId: string, choiceId: string): LegalOptionKey {
  return `event:${eventId}|choice:${choiceId}`;
}

function getOrderRequestsForAction(state: GameState, actionId: ActionId): QueueOrderRequest[] {
  const action = DISTRICT_ZERO_ACTIONS.find((candidate) => candidate.id === actionId);

  if (!action) {
    return [];
  }

  if (action.assignment === 'none') {
    return withTargets(state, actionId, [{ actionId }]);
  }

  const operativeRequests = state.operatives.map((operative) => ({
    actionId,
    assignedOperativeId: operative.id,
  }));
  const requests =
    action.assignment === 'required' ? operativeRequests : [{ actionId }, ...operativeRequests];

  return withTargets(state, actionId, requests);
}

function withTargets(
  state: GameState,
  actionId: ActionId,
  requests: QueueOrderRequest[],
): QueueOrderRequest[] {
  const action = DISTRICT_ZERO_ACTIONS.find((candidate) => candidate.id === actionId);

  if (!action) {
    return [];
  }

  const targetedRequests = selectActionTargetOptions(state, actionId).flatMap((option) =>
    requests.map((request) => ({
      ...request,
      target: option.target,
    })),
  );

  return action.requiresTarget ? targetedRequests : [...requests, ...targetedRequests];
}
