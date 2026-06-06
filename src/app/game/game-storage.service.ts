import { Injectable } from '@angular/core';
import {
  getActionDefinition,
  getDistrictDefinition,
  getRivalDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  type ActionId,
  type ActionTarget,
  type DistrictId,
  type GameState,
  type Pressures,
  type RivalId,
  type TurnPhase,
  type VenueId,
} from '../engine';

export const CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.2:current-run';

export interface GameStorage {
  saveCurrentRun(state: GameState): void;
  loadCurrentRun(): GameState | undefined;
  clearCurrentRun(): void;
}

@Injectable({
  providedIn: 'root',
})
export class GameStorageService implements GameStorage {
  saveCurrentRun(state: GameState): void {
    const storage = getLocalStorage();

    if (!storage) {
      return;
    }

    storage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(state));
  }

  loadCurrentRun(): GameState | undefined {
    const storage = getLocalStorage();
    const serialized = storage?.getItem(CURRENT_RUN_STORAGE_KEY);

    if (!serialized) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      return isGameState(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  clearCurrentRun(): void {
    getLocalStorage()?.removeItem(CURRENT_RUN_STORAGE_KEY);
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['seed'] === 'string' &&
    typeof value['rngCursor'] === 'number' &&
    typeof value['week'] === 'number' &&
    typeof value['maxWeeks'] === 'number' &&
    isTurnPhase(value['phase']) &&
    typeof value['commandPointsPerWeek'] === 'number' &&
    isPressures(value['pressures']) &&
    Array.isArray(value['operatives']) &&
    Array.isArray(value['recruitPool']) &&
    isQueuedOrders(value['queuedOrders'], value['operatives']) &&
    isDistrictOverlays(value['districts']) &&
    isRivalOverlays(value['rivals']) &&
    isRecentActivity(value['recentActivity']) &&
    Array.isArray(value['eventLog']) &&
    isRecord(value['flags'])
  );
}

function isQueuedOrders(value: unknown, operatives: unknown): boolean {
  if (!Array.isArray(value) || !Array.isArray(operatives)) {
    return false;
  }

  const operativeIds = new Set(
    operatives.flatMap((operative) =>
      isRecord(operative) && typeof operative['id'] === 'string' ? [operative['id']] : [],
    ),
  );

  return value.every((order) => {
    if (
      !isRecord(order) ||
      typeof order['id'] !== 'string' ||
      typeof order['actionId'] !== 'string'
    ) {
      return false;
    }

    const action = getActionDefinition(order['actionId'] as ActionId);

    if (!action) {
      return false;
    }

    if (
      order['assignedOperativeId'] !== undefined &&
      (typeof order['assignedOperativeId'] !== 'string' ||
        !operativeIds.has(order['assignedOperativeId']))
    ) {
      return false;
    }

    const target = parseActionTarget(order['target']);

    if (order['target'] !== undefined && !target) {
      return false;
    }

    if (action.requiresTarget && !target) {
      return false;
    }

    return !target || action.allowedTargetTypes.includes(target.type);
  });
}

function isDistrictOverlays(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length !== RIVAL_TERRITORY_DISTRICTS.length) {
    return false;
  }

  return RIVAL_TERRITORY_DISTRICTS.every((definition) => {
    const district = value[definition.id];

    return (
      isRecord(district) &&
      district['id'] === definition.id &&
      typeof district['control'] === 'number' &&
      typeof district['heat'] === 'number'
    );
  });
}

function isRivalOverlays(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length !== RIVAL_TERRITORY_RIVALS.length) {
    return false;
  }

  return RIVAL_TERRITORY_RIVALS.every((definition) => {
    const rival = value[definition.id];

    return (
      isRecord(rival) &&
      rival['id'] === definition.id &&
      typeof rival['pressure'] === 'number' &&
      typeof rival['disposition'] === 'number' &&
      typeof rival['active'] === 'boolean'
    );
  });
}

function isRecentActivity(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((activity) => {
    if (
      !isRecord(activity) ||
      typeof activity['id'] !== 'string' ||
      typeof activity['week'] !== 'number' ||
      typeof activity['actionId'] !== 'string' ||
      !getActionDefinition(activity['actionId'] as ActionId) ||
      !Array.isArray(activity['targetTags']) ||
      !activity['targetTags'].every((tag) => typeof tag === 'string') ||
      typeof activity['heatDelta'] !== 'number' ||
      typeof activity['dominionDelta'] !== 'number'
    ) {
      return false;
    }

    if (activity['target'] !== undefined && !parseActionTarget(activity['target'])) {
      return false;
    }

    return (
      activity['rivalId'] === undefined ||
      (typeof activity['rivalId'] === 'string' &&
        getRivalDefinition(activity['rivalId'] as RivalId) !== undefined)
    );
  });
}

function parseActionTarget(value: unknown): ActionTarget | undefined {
  if (!isRecord(value) || typeof value['type'] !== 'string' || typeof value['id'] !== 'string') {
    return undefined;
  }

  const id = value['id'];

  switch (value['type']) {
    case 'district':
      return getDistrictDefinition(id as DistrictId)
        ? {
            type: 'district',
            id: id as DistrictId,
          }
        : undefined;
    case 'venue':
      return getVenueDefinition(id as VenueId)
        ? {
            type: 'venue',
            id: id as VenueId,
          }
        : undefined;
    case 'rival':
      return getRivalDefinition(id as RivalId)
        ? {
            type: 'rival',
            id: id as RivalId,
          }
        : undefined;
    default:
      return undefined;
  }
}

function isPressures(value: unknown): value is Pressures {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value['dominion'] === 'number' &&
    typeof value['heat'] === 'number' &&
    typeof value['loyalty'] === 'number' &&
    typeof value['resources'] === 'number' &&
    typeof value['intel'] === 'number' &&
    typeof value['ruin'] === 'number'
  );
}

function isTurnPhase(value: unknown): value is TurnPhase {
  return (
    value === 'COMMAND' ||
    value === 'RESOLVING_ACTIONS' ||
    value === 'EVENT_CHOICE' ||
    value === 'WEEK_COMPLETE' ||
    value === 'GAME_OVER'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
