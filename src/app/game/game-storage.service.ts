import { Injectable } from '@angular/core';
import {
  ACTIVE_CONTACT_COUNT,
  CONTACT_DEFINITIONS,
  getActionDefinition,
  getContactDefinition,
  getDistrictDefinition,
  getEventDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getTraitDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  type ActionId,
  type ActionTarget,
  type ContactId,
  type ContactMetricDelta,
  type ContactOptionKind,
  type DistrictId,
  type GameState,
  type LedgerEntryDefinitionId,
  type LedgerEntryKind,
  type LedgerPotency,
  type OperativeId,
  type Pressures,
  type RivalId,
  type TraitId,
  type TurnPhase,
  type VenueId,
} from '../engine';

export const CURRENT_SAVE_SCHEMA_VERSION = 5;
export const CURRENT_GAME_VERSION = '0.5.0';
export const CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.5:current-run';
export const LEGACY_V04_STORAGE_KEY = 'haunted-apex:v0.4:current-run';
export const LEGACY_V03_STORAGE_KEY = 'haunted-apex:v0.3:current-run';
export const LEGACY_V02_STORAGE_KEY = 'haunted-apex:v0.2:current-run';

export type StoredRunEnvelope = {
  schemaVersion: typeof CURRENT_SAVE_SCHEMA_VERSION;
  gameVersion: typeof CURRENT_GAME_VERSION;
  savedAt: string;
  state: GameState;
};

export type LoadCurrentRunResult =
  | { status: 'loaded'; state: GameState }
  | { status: 'empty' }
  | { status: 'incompatible'; foundVersion?: number }
  | { status: 'invalid' };

export interface GameStorage {
  saveCurrentRun(state: GameState): void;
  loadCurrentRun(): LoadCurrentRunResult;
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

    const envelope: StoredRunEnvelope = {
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      gameVersion: CURRENT_GAME_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };

    storage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(envelope));
  }

  loadCurrentRun(): LoadCurrentRunResult {
    const storage = getLocalStorage();

    if (!storage) {
      return { status: 'empty' };
    }

    const serialized = storage.getItem(CURRENT_RUN_STORAGE_KEY);

    if (serialized) {
      storage.removeItem(LEGACY_V04_STORAGE_KEY);
      storage.removeItem(LEGACY_V03_STORAGE_KEY);
      storage.removeItem(LEGACY_V02_STORAGE_KEY);

      try {
        const parsed: unknown = JSON.parse(serialized);

        if (isRecord(parsed) && typeof parsed['schemaVersion'] === 'number') {
          if (parsed['schemaVersion'] !== CURRENT_SAVE_SCHEMA_VERSION) {
            storage.removeItem(CURRENT_RUN_STORAGE_KEY);
            return {
              status: 'incompatible',
              foundVersion: parsed['schemaVersion'],
            };
          }
        }

        if (!isStoredRunEnvelope(parsed)) {
          storage.removeItem(CURRENT_RUN_STORAGE_KEY);
          return { status: 'invalid' };
        }

        return {
          status: 'loaded',
          state: parsed.state,
        };
      } catch {
        storage.removeItem(CURRENT_RUN_STORAGE_KEY);
        return { status: 'invalid' };
      }
    }

    if (storage.getItem(LEGACY_V04_STORAGE_KEY) !== null) {
      storage.removeItem(LEGACY_V04_STORAGE_KEY);
      storage.removeItem(LEGACY_V03_STORAGE_KEY);
      storage.removeItem(LEGACY_V02_STORAGE_KEY);
      return {
        status: 'incompatible',
        foundVersion: 4,
      };
    }

    if (storage.getItem(LEGACY_V03_STORAGE_KEY) !== null) {
      storage.removeItem(LEGACY_V03_STORAGE_KEY);
      storage.removeItem(LEGACY_V02_STORAGE_KEY);
      return {
        status: 'incompatible',
        foundVersion: 3,
      };
    }

    if (storage.getItem(LEGACY_V02_STORAGE_KEY) !== null) {
      storage.removeItem(LEGACY_V02_STORAGE_KEY);
      return {
        status: 'incompatible',
        foundVersion: 2,
      };
    }

    return { status: 'empty' };
  }

  clearCurrentRun(): void {
    const storage = getLocalStorage();
    storage?.removeItem(CURRENT_RUN_STORAGE_KEY);
    storage?.removeItem(LEGACY_V04_STORAGE_KEY);
    storage?.removeItem(LEGACY_V03_STORAGE_KEY);
    storage?.removeItem(LEGACY_V02_STORAGE_KEY);
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
    value['schemaVersion'] === 5 &&
    typeof value['id'] === 'string' &&
    typeof value['seed'] === 'string' &&
    isNonNegativeInteger(value['rngCursor']) &&
    isPositiveInteger(value['week']) &&
    isPositiveInteger(value['maxWeeks']) &&
    isTurnPhase(value['phase']) &&
    isPositiveInteger(value['commandPointsPerWeek']) &&
    isPressures(value['pressures']) &&
    isOperatives(value['operatives']) &&
    isHirePool(value['hirePool'], value['operatives']) &&
    isContactNetwork(value['contacts'], value['activeContactIds']) &&
    isSeenSignatureEventIds(value['seenSignatureEventIds']) &&
    isLedgerState(value['ledger']) &&
    isQueuedOrders(value['queuedOrders'], value['operatives'], value['hirePool']) &&
    isDistrictOverlays(value['districts']) &&
    isRivalOverlays(value['rivals']) &&
    isRecentActivity(value['recentActivity']) &&
    isPendingEvent(value['pendingEvent']) &&
    isEventLog(value['eventLog']) &&
    isFlags(value['flags']) &&
    isGameOver(value['gameOver'])
  );
}

function isStoredRunEnvelope(value: unknown): value is StoredRunEnvelope {
  return (
    isRecord(value) &&
    value['schemaVersion'] === CURRENT_SAVE_SCHEMA_VERSION &&
    value['gameVersion'] === CURRENT_GAME_VERSION &&
    typeof value['savedAt'] === 'string' &&
    !Number.isNaN(Date.parse(value['savedAt'])) &&
    isGameState(value['state']) &&
    value['state'].schemaVersion === value['schemaVersion']
  );
}

function isOperatives(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) {
    return false;
  }

  const ids = new Set<string>();

  return value.every((operative) => {
    if (
      !isRecord(operative) ||
      typeof operative['id'] !== 'string' ||
      !getOperativeDefinition(operative['id'] as OperativeId) ||
      ids.has(operative['id']) ||
      !isFiniteNumber(operative['loyalty']) ||
      operative['loyalty'] < 0 ||
      operative['loyalty'] > 100 ||
      !isFiniteNumber(operative['stress']) ||
      operative['stress'] < 0 ||
      operative['stress'] > 100 ||
      !isOperativeStatus(operative['status']) ||
      !isRevealedTraits(operative['revealedTraits']) ||
      !isFlags(operative['hiddenFlags']) ||
      !isNonNegativeInteger(operative['weeksAssigned']) ||
      !isRecentAssignments(operative['recentAssignments'])
    ) {
      return false;
    }

    ids.add(operative['id']);
    return true;
  });
}

function isOperativeStatus(value: unknown): boolean {
  return value === 'available' || value === 'assigned' || value === 'idle' || value === 'injured';
}

function isRevealedTraits(value: unknown): boolean {
  if (!isStringArray(value) || new Set(value).size !== value.length) {
    return false;
  }

  return value.every((traitId) => getTraitDefinition(traitId as TraitId) !== undefined);
}

function isRecentAssignments(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();

  return value.every((assignment) => {
    if (
      !isRecord(assignment) ||
      typeof assignment['id'] !== 'string' ||
      ids.has(assignment['id']) ||
      !isPositiveInteger(assignment['week']) ||
      typeof assignment['actionId'] !== 'string' ||
      !getActionDefinition(assignment['actionId'] as ActionId) ||
      !isStringArray(assignment['targetTags']) ||
      typeof assignment['complication'] !== 'boolean' ||
      !isFiniteNumber(assignment['stressDelta'])
    ) {
      return false;
    }

    const action = getActionDefinition(assignment['actionId'] as ActionId);
    const target = parseActionTarget(assignment['target']);

    if (
      assignment['target'] !== undefined &&
      (!target || !action?.allowedTargetTypes.includes(target.type))
    ) {
      return false;
    }

    ids.add(assignment['id']);
    return true;
  });
}

function isHirePool(value: unknown, operatives: unknown): boolean {
  if (!Array.isArray(value) || value.length > 4 || !Array.isArray(operatives)) {
    return false;
  }

  const activeIds = new Set(
    operatives.flatMap((operative) =>
      isRecord(operative) && typeof operative['id'] === 'string' ? [operative['id']] : [],
    ),
  );
  const hireIds = value.filter((id): id is string => typeof id === 'string');

  return (
    hireIds.length === value.length &&
    new Set(hireIds).size === hireIds.length &&
    hireIds.every(
      (id) => getOperativeDefinition(id as OperativeId) !== undefined && !activeIds.has(id),
    )
  );
}

function isContactNetwork(contacts: unknown, activeContactIds: unknown): boolean {
  if (
    !isRecord(contacts) ||
    !isStringArray(activeContactIds) ||
    activeContactIds.length !== ACTIVE_CONTACT_COUNT ||
    new Set(activeContactIds).size !== activeContactIds.length
  ) {
    return false;
  }

  const contactIds = CONTACT_DEFINITIONS.map((definition) => definition.id);
  const activeIdSet = new Set(activeContactIds);

  if (
    Object.keys(contacts).length !== contactIds.length ||
    activeContactIds.some((contactId) => !getContactDefinition(contactId as ContactId))
  ) {
    return false;
  }

  return contactIds.every((contactId) => {
    const contact = contacts[contactId];

    if (
      !isRecord(contact) ||
      contact['id'] !== contactId ||
      !isContactMetric(contact['trust']) ||
      !isContactMetric(contact['leverage']) ||
      !isContactMetric(contact['volatility']) ||
      !isContactMetric(contact['exposure']) ||
      typeof contact['burned'] !== 'boolean' ||
      !isRecentContactInteractions(contact['recentInteractions']) ||
      !isFlags(contact['flags'])
    ) {
      return false;
    }

    return !activeIdSet.has(contactId) || getContactDefinition(contactId) !== undefined;
  });
}

function isContactMetric(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isRecentContactInteractions(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (interaction) =>
      isRecord(interaction) &&
      isPositiveInteger(interaction['week']) &&
      typeof interaction['optionId'] === 'string' &&
      isContactOptionKind(interaction['kind']) &&
      typeof interaction['label'] === 'string' &&
      isContactMetricDelta(interaction['effectsSummary']),
  );
}

function isContactOptionKind(value: unknown): value is ContactOptionKind {
  return value === 'cultivate' || value === 'pressure' || value === 'request_service';
}

function isContactMetricDelta(value: unknown): value is ContactMetricDelta {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([metric, amount]) =>
      ['trust', 'leverage', 'volatility', 'exposure'].includes(metric) &&
      isFiniteNumber(amount),
  );
}

function isQueuedOrders(value: unknown, operatives: unknown, hirePool: unknown): boolean {
  if (!Array.isArray(value) || !Array.isArray(operatives) || !Array.isArray(hirePool)) {
    return false;
  }

  const operativeIds = new Set(
    operatives.flatMap((operative) =>
      isRecord(operative) && typeof operative['id'] === 'string' ? [operative['id']] : [],
    ),
  );

  const hireIds = new Set(hirePool.filter((id): id is string => typeof id === 'string'));
  const orderIds = new Set<string>();
  const assignedOperativeIds = new Set<string>();
  const queuedRecruitIds = new Set<string>();
  let queuedRecruitCount = 0;

  const validOrders = value.every((order) => {
    if (
      !isRecord(order) ||
      typeof order['id'] !== 'string' ||
      orderIds.has(order['id']) ||
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
        !operativeIds.has(order['assignedOperativeId']) ||
        assignedOperativeIds.has(order['assignedOperativeId']))
    ) {
      return false;
    }

    if (
      (action.assignment === 'none' && order['assignedOperativeId'] !== undefined) ||
      (action.assignment === 'required' && order['assignedOperativeId'] === undefined)
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

    if (action.id === 'recruit_operative') {
      if (
        target?.type !== 'recruit' ||
        !hireIds.has(target.id) ||
        queuedRecruitIds.has(target.id)
      ) {
        return false;
      }

      queuedRecruitIds.add(target.id);
      queuedRecruitCount += 1;
    }

    orderIds.add(order['id']);

    if (typeof order['assignedOperativeId'] === 'string') {
      assignedOperativeIds.add(order['assignedOperativeId']);
    }

    return !target || action.allowedTargetTypes.includes(target.type);
  });

  return validOrders && operativeIds.size + queuedRecruitCount <= 5;
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
      isFiniteNumber(district['control']) &&
      isFiniteNumber(district['heat'])
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
      isFiniteNumber(rival['pressure']) &&
      isFiniteNumber(rival['disposition']) &&
      typeof rival['active'] === 'boolean'
    );
  });
}

function isRecentActivity(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();

  return value.every((activity) => {
    if (
      !isRecord(activity) ||
      typeof activity['id'] !== 'string' ||
      ids.has(activity['id']) ||
      !isPositiveInteger(activity['week']) ||
      typeof activity['actionId'] !== 'string' ||
      !getActionDefinition(activity['actionId'] as ActionId) ||
      !Array.isArray(activity['targetTags']) ||
      !activity['targetTags'].every((tag) => typeof tag === 'string') ||
      !isFiniteNumber(activity['heatDelta']) ||
      !isFiniteNumber(activity['dominionDelta'])
    ) {
      return false;
    }

    if (activity['target'] !== undefined && !parseActionTarget(activity['target'])) {
      return false;
    }

    const validRival =
      activity['rivalId'] === undefined ||
      (typeof activity['rivalId'] === 'string' &&
        getRivalDefinition(activity['rivalId'] as RivalId) !== undefined);

    if (validRival) {
      ids.add(activity['id']);
    }

    return validRival;
  });
}

function isSeenSignatureEventIds(value: unknown): boolean {
  if (!isStringArray(value) || new Set(value).size !== value.length) {
    return false;
  }

  return value.every((eventId) => getEventDefinition(eventId)?.kind === 'operative');
}

function isLedgerState(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !Array.isArray(value['entries']) ||
    !isNonNegativeInteger(value['discoveredCount']) ||
    !isNonNegativeInteger(value['consumedCount'])
  ) {
    return false;
  }

  const ids = new Set<string>();
  let consumedCount = 0;

  const entriesValid = value['entries'].every((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry['id'] !== 'string' ||
      ids.has(entry['id']) ||
      typeof entry['definitionId'] !== 'string' ||
      typeof entry['kind'] !== 'string' ||
      !isPositiveInteger(entry['createdWeek']) ||
      !isLedgerSource(entry['source']) ||
      !isLedgerPotency(entry['potency']) ||
      typeof entry['revealed'] !== 'boolean' ||
      typeof entry['consumed'] !== 'boolean' ||
      (entry['consumedWeek'] !== undefined && !isPositiveInteger(entry['consumedWeek'])) ||
      (entry['consumedBy'] !== undefined && !isLedgerConsumptionSource(entry['consumedBy'])) ||
      (entry['relatedTarget'] !== undefined && !parseActionTarget(entry['relatedTarget'])) ||
      (entry['relatedOperativeId'] !== undefined &&
        (typeof entry['relatedOperativeId'] !== 'string' ||
          !getOperativeDefinition(entry['relatedOperativeId'] as OperativeId))) ||
      (entry['relatedRivalId'] !== undefined &&
        (typeof entry['relatedRivalId'] !== 'string' ||
          !getRivalDefinition(entry['relatedRivalId'] as RivalId))) ||
      (entry['flags'] !== undefined && !isFlags(entry['flags']))
    ) {
      return false;
    }

    const definition = getLedgerEntryDefinition(
      entry['definitionId'] as LedgerEntryDefinitionId,
    );

    if (!definition || definition.kind !== entry['kind']) {
      return false;
    }

    if (!isLedgerEntryKind(entry['kind'])) {
      return false;
    }

    if (entry['consumed']) {
      consumedCount += 1;
    }

    ids.add(entry['id']);
    return true;
  });

  return (
    entriesValid &&
    value['discoveredCount'] === value['entries'].length &&
    value['consumedCount'] === consumedCount
  );
}

function isLedgerSource(value: unknown): boolean {
  if (!isRecord(value) || typeof value['type'] !== 'string') {
    return false;
  }

  switch (value['type']) {
    case 'event':
      return (
        typeof value['eventId'] === 'string' &&
        getEventDefinition(value['eventId']) !== undefined &&
        typeof value['choiceId'] === 'string'
      );
    case 'action':
      return (
        typeof value['actionId'] === 'string' &&
        getActionDefinition(value['actionId'] as ActionId) !== undefined &&
        (value['target'] === undefined || parseActionTarget(value['target']) !== undefined)
      );
    case 'operative_event':
      return (
        typeof value['operativeId'] === 'string' &&
        getOperativeDefinition(value['operativeId'] as OperativeId) !== undefined &&
        typeof value['eventId'] === 'string' &&
        getEventDefinition(value['eventId'])?.kind === 'operative'
      );
    default:
      return false;
  }
}

function isLedgerConsumptionSource(value: unknown): boolean {
  if (!isRecord(value) || typeof value['type'] !== 'string') {
    return false;
  }

  switch (value['type']) {
    case 'action':
      return (
        value['actionId'] === 'work_the_ledger' &&
        typeof value['useOptionId'] === 'string' &&
        value['useOptionId'].length > 0
      );
    case 'event':
      return (
        typeof value['eventId'] === 'string' &&
        getEventDefinition(value['eventId']) !== undefined &&
        typeof value['choiceId'] === 'string'
      );
    default:
      return false;
  }
}

function isLedgerEntryKind(value: unknown): value is LedgerEntryKind {
  return value === 'secret' || value === 'debt' || value === 'favor';
}

function isLedgerPotency(value: unknown): value is LedgerPotency {
  return value === 1 || value === 2 || value === 3;
}

function isPendingEvent(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['definitionId'] === 'string' &&
    getEventDefinition(value['definitionId']) !== undefined &&
    isPositiveInteger(value['week']) &&
    (value['selectedLedgerEntryId'] === undefined ||
      typeof value['selectedLedgerEntryId'] === 'string')
  );
}

function isEventLog(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set<string>();

  return value.every((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry['id'] !== 'string' ||
      ids.has(entry['id']) ||
      !isPositiveInteger(entry['week']) ||
      !isGameLogEntryType(entry['type']) ||
      typeof entry['title'] !== 'string' ||
      (entry['body'] !== undefined && typeof entry['body'] !== 'string') ||
      (entry['tags'] !== undefined && !isStringArray(entry['tags'])) ||
      (entry['pressureDelta'] !== undefined && !isPressureDelta(entry['pressureDelta']))
    ) {
      return false;
    }

    ids.add(entry['id']);
    return true;
  });
}

function isGameLogEntryType(value: unknown): boolean {
  return (
    value === 'order_queued' ||
    value === 'order_resolved' ||
    value === 'ledger' ||
    value === 'operative_condition' ||
    value === 'complication' ||
    value === 'drift' ||
    value === 'rival_effect' ||
    value === 'event_presented' ||
    value === 'event_choice' ||
    value === 'win_loss'
  );
}

function isGameOver(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    isRecord(value) &&
    (value['result'] === 'victory' || value['result'] === 'loss') &&
    (value['reason'] === 'dominion_victory' ||
      value['reason'] === 'heat_lockdown' ||
      value['reason'] === 'loyalty_collapse' ||
      value['reason'] === 'bankrupt' ||
      value['reason'] === 'out_of_time')
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function parseActionTarget(value: unknown): ActionTarget | undefined {
  if (!isRecord(value) || typeof value['type'] !== 'string') {
    return undefined;
  }

  if (value['type'] === 'ledger') {
    return typeof value['entryId'] === 'string' && typeof value['useOptionId'] === 'string'
      ? {
          type: 'ledger',
          entryId: value['entryId'],
          useOptionId: value['useOptionId'],
        }
      : undefined;
  }

  if (typeof value['id'] !== 'string') {
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
    case 'recruit':
      return getOperativeDefinition(id as OperativeId)
        ? {
            type: 'recruit',
            id: id as OperativeId,
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
    isFiniteNumber(value['dominion']) &&
    isFiniteNumber(value['heat']) &&
    isFiniteNumber(value['loyalty']) &&
    isFiniteNumber(value['resources']) &&
    isFiniteNumber(value['intel']) &&
    isFiniteNumber(value['ruin'])
  );
}

function isPressureDelta(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([pressure, amount]) =>
      ['dominion', 'heat', 'loyalty', 'resources', 'intel', 'ruin'].includes(pressure) &&
      isFiniteNumber(amount),
  );
}

function isFlags(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        typeof entry === 'boolean' ||
        typeof entry === 'string' ||
        isFiniteNumber(entry),
    )
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
