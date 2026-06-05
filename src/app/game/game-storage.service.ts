import { Injectable } from '@angular/core';
import type { GameState, Pressures, TurnPhase } from '../engine';

export const CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0:current-run';

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
    Array.isArray(value['queuedOrders']) &&
    Array.isArray(value['eventLog']) &&
    isRecord(value['flags'])
  );
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

