import { computed, inject, Injectable, signal } from '@angular/core';
import {
  advanceWeek,
  buildRunSummary,
  getActionPreview,
  getContactDefinition,
  getCommandPointsRemaining,
  getEventDefinition,
  getEventChoiceAvailability,
  getEventChoicePreview,
  getFrontDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getTraitDefinition,
  getOrderAvailability,
  newGame,
  queueOrder,
  removeQueuedOrder,
  resolveEventChoice,
  selectActionCards,
  selectActiveContacts,
  selectAssignmentOptions,
  selectActionTargetOptions,
  selectFrontPanelView,
  selectLedgerPanelView,
  selectDistrictTerritoryViews,
  selectHirePoolViews,
  selectOperativeDetail,
  selectQueuedOrderViews,
  selectRivalTerritoryViews,
  selectRosterViews,
  type ActionId,
  type ActionPreview,
  type ActionTarget,
  type ActionTargetOption,
  type ContactView,
  type EventChoiceAvailability,
  type EventChoicePreview,
  type GameState,
  type LedgerPanelView,
  type NewGameConfig,
  type OrderAvailability,
  type OperativeOptionView,
  type OperativeId,
  type QueueOrderResult,
  type RemoveQueuedOrderResult,
  type ResolveEventChoiceResult,
  type RunSummaryReport,
} from '../engine';
import {
  GameStorageService,
  type LoadCurrentRunResult,
} from './game-storage.service';

export const SAVE_COMPATIBILITY_NOTICE =
  'Detected an older save. v0.6.0 - Fronts changes the game state schema and requires a fresh run.';

@Injectable({
  providedIn: 'root',
})
export class GameFacade {
  private readonly storage = inject(GameStorageService);
  private readonly initialLoadResult = this.storage.loadCurrentRun();
  private readonly stateSignal = signal<GameState>(
    this.initialLoadResult.status === 'loaded'
      ? this.initialLoadResult.state
      : newGame(),
  );
  private readonly selectedOperativeId = signal<OperativeId | undefined>(undefined);

  readonly state = this.stateSignal.asReadonly();
  readonly compatibilityNotice = signal<string | undefined>(
    requiresCompatibilityNotice(this.initialLoadResult)
      ? SAVE_COMPATIBILITY_NOTICE
      : undefined,
  );
  readonly actionCards = computed(() => selectActionCards(this.stateSignal()));
  readonly queuedOrders = computed(() => selectQueuedOrderViews(this.stateSignal()));
  readonly ledgerPanel = computed<LedgerPanelView>(() => selectLedgerPanelView(this.stateSignal()));
  readonly fronts = computed(() => selectFrontPanelView(this.stateSignal()));
  readonly contacts = computed<ContactView[]>(() => selectActiveContacts(this.stateSignal()));
  readonly runSummary = computed<RunSummaryReport | undefined>(() => {
    const state = this.stateSignal();

    return state.gameOver ? buildRunSummary(state) : undefined;
  });
  readonly districts = computed(() => selectDistrictTerritoryViews(this.stateSignal()));
  readonly rivals = computed(() => selectRivalTerritoryViews(this.stateSignal()));
  readonly roster = computed(() => selectRosterViews(this.stateSignal()));
  readonly hirePool = computed(() => selectHirePoolViews(this.stateSignal()));
  readonly selectedOperativeDetail = computed(() => {
    const operativeId = this.selectedOperativeId();
    return operativeId
      ? selectOperativeDetail(this.stateSignal(), operativeId)
      : undefined;
  });
  readonly operatives = computed(() =>
    this.stateSignal().operatives.flatMap((operative) => {
      const definition = getOperativeDefinition(operative.id);

      if (!definition) {
        return [];
      }

      return [
        {
          ...operative,
          name: definition.name,
          archetype: definition.archetype,
          ...definition.baseStats,
          traits: operative.revealedTraits.map(
            (traitId) => getTraitDefinition(traitId)?.name ?? traitId,
          ),
        },
      ];
    }),
  );
  readonly commandPointsRemaining = computed(() => getCommandPointsRemaining(this.stateSignal()));
  readonly pendingEventDefinition = computed(() => {
    const pendingEvent = this.stateSignal().pendingEvent;
    const definition = pendingEvent ? getEventDefinition(pendingEvent.definitionId) : undefined;

    if (!pendingEvent || !definition) {
      return undefined;
    }

    return {
      ...definition,
      title: renderPendingEventText(this.stateSignal(), definition.title),
      text: renderPendingEventText(this.stateSignal(), definition.text),
    };
  });

  constructor() {
    if (requiresCompatibilityNotice(this.initialLoadResult)) {
      this.storage.saveCurrentRun(this.stateSignal());
    }
  }

  startNewGame(config: NewGameConfig = {}): GameState {
    const state = newGame(config);
    this.selectedOperativeId.set(undefined);
    this.setAndSave(state);
    return state;
  }

  loadCurrentRun(): boolean {
    const result = this.storage.loadCurrentRun();

    if (result.status === 'loaded') {
      this.stateSignal.set(result.state);
      this.selectedOperativeId.set(undefined);
      return true;
    }

    if (requiresCompatibilityNotice(result)) {
      const state = newGame();
      this.stateSignal.set(state);
      this.selectedOperativeId.set(undefined);
      this.compatibilityNotice.set(SAVE_COMPATIBILITY_NOTICE);
      this.storage.saveCurrentRun(state);
    }

    if (result.status === 'empty') {
      return false;
    }

    return false;
  }

  resetCurrentRun(config: NewGameConfig = {}): GameState {
    this.storage.clearCurrentRun();
    return this.startNewGame(config);
  }

  clearCurrentRun(): void {
    this.storage.clearCurrentRun();
  }

  dismissCompatibilityNotice(): void {
    this.compatibilityNotice.set(undefined);
  }

  selectOperative(operativeId: OperativeId | undefined): void {
    this.selectedOperativeId.set(
      operativeId && selectOperativeDetail(this.stateSignal(), operativeId)
        ? operativeId
        : undefined,
    );
  }

  getOperativeDetail(operativeId: OperativeId) {
    return selectOperativeDetail(this.stateSignal(), operativeId);
  }

  getTargetOptions(actionId: ActionId): ActionTargetOption[] {
    return selectActionTargetOptions(this.stateSignal(), actionId);
  }

  getAssignmentOptions(actionId: ActionId, target?: ActionTarget): OperativeOptionView[] {
    return selectAssignmentOptions(this.stateSignal(), actionId, target);
  }

  getActionPreview(
    actionId: ActionId,
    assignedOperativeId?: string,
    target?: ActionTarget,
  ): ActionPreview | undefined {
    return getActionPreview(this.stateSignal(), actionId, assignedOperativeId, target);
  }

  getOrderAvailability(
    actionId: ActionId,
    assignedOperativeId?: string,
    target?: ActionTarget,
  ): OrderAvailability {
    return getOrderAvailability(this.stateSignal(), {
      actionId,
      assignedOperativeId,
      target,
    });
  }

  queueOrder(
    actionId: ActionId,
    assignedOperativeId?: string,
    target?: ActionTarget,
  ): QueueOrderResult {
    const result = queueOrder(this.stateSignal(), {
      actionId,
      assignedOperativeId,
      target,
    });

    if (result.ok) {
      this.setAndSave(result.state);
    }

    return result;
  }

  removeQueuedOrder(queuedOrderId: string): RemoveQueuedOrderResult {
    const result = removeQueuedOrder(this.stateSignal(), queuedOrderId);

    if (result.ok) {
      this.setAndSave(result.state);
    }

    return result;
  }

  advanceWeek() {
    const result = advanceWeek(this.stateSignal());

    if (result.ok) {
      this.setAndSave(result.state);
    }

    return result;
  }

  resolveEventChoice(eventId: string, choiceId: string): ResolveEventChoiceResult {
    const result = resolveEventChoice(this.stateSignal(), eventId, choiceId);

    if (result.ok) {
      this.setAndSave(result.state);
    }

    return result;
  }

  getEventChoiceAvailability(eventId: string, choiceId: string): EventChoiceAvailability {
    return getEventChoiceAvailability(this.stateSignal(), eventId, choiceId);
  }

  getEventChoicePreview(eventId: string, choiceId: string): EventChoicePreview | undefined {
    return getEventChoicePreview(this.stateSignal(), eventId, choiceId);
  }

  private setAndSave(state: GameState): void {
    this.stateSignal.set(state);
    this.storage.saveCurrentRun(state);
  }
}

function renderPendingEventText(state: GameState, text: string): string {
  const selectedLedgerEntryId = state.pendingEvent?.selectedLedgerEntryId;
  const selectedLedgerEntry = selectedLedgerEntryId
    ? state.ledger.entries.find((entry) => entry.id === selectedLedgerEntryId)
    : undefined;
  const selectedLedgerDefinition = selectedLedgerEntry
    ? getLedgerEntryDefinition(selectedLedgerEntry.definitionId)
    : undefined;
  const selectedContactDefinition = state.pendingEvent?.selectedContactId
    ? getContactDefinition(state.pendingEvent.selectedContactId)
    : undefined;
  const selectedFront = state.pendingEvent?.selectedFrontId
    ? state.fronts[state.pendingEvent.selectedFrontId]
    : undefined;
  const selectedFrontDefinition = selectedFront
    ? getFrontDefinition(selectedFront.definitionId)
    : undefined;

  return text
    .replaceAll('{ledgerEntryName}', selectedLedgerDefinition?.name ?? 'Ledger Entry')
    .replaceAll('{contactName}', selectedContactDefinition?.name ?? 'Contact')
    .replaceAll('{frontName}', selectedFrontDefinition?.name ?? 'Front');
}

function requiresCompatibilityNotice(result: LoadCurrentRunResult): boolean {
  return result.status === 'incompatible' || result.status === 'invalid';
}
