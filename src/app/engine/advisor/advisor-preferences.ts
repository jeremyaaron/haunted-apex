import type { RunMode } from '../model';
import type { AdvisorMode } from './advisor-types';

export const USER_PREFERENCES_STORAGE_KEY = 'haunted-apex:user-preferences:v1';

export type UserPreferences = {
  advisorMode?: AdvisorMode;
  hasSeenTrainingPrompt?: boolean;
};

export function getDefaultAdvisorMode(
  runMode: RunMode,
  savedPreference: AdvisorMode | undefined,
): AdvisorMode {
  if (runMode === 'training') {
    return 'handler';
  }

  return savedPreference ?? 'coach';
}

export function isAdvisorMode(value: unknown): value is AdvisorMode {
  return value === 'off' || value === 'hints' || value === 'coach' || value === 'handler';
}

export function loadUserPreferences(storage = getBrowserStorage()): UserPreferences {
  if (!storage) {
    return {};
  }

  const raw = storage.getItem(USER_PREFERENCES_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (!isRecord(value)) {
      return {};
    }

    return {
      ...(isAdvisorMode(value['advisorMode']) ? { advisorMode: value['advisorMode'] } : {}),
      ...(typeof value['hasSeenTrainingPrompt'] === 'boolean'
        ? { hasSeenTrainingPrompt: value['hasSeenTrainingPrompt'] }
        : {}),
    };
  } catch {
    return {};
  }
}

export function saveUserPreferences(
  preferences: UserPreferences,
  storage = getBrowserStorage(),
): void {
  if (!storage) {
    return;
  }

  storage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function getBrowserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
