import { computed, inject, Injectable, signal } from '@angular/core';
import {
  advanceWeek,
  getCommandPointsRemaining,
  getEventDefinition,
  getEventChoiceAvailability,
  newGame,
  queueOrder,
  removeQueuedOrder,
  resolveEventChoice,
  selectActionCards,
  selectQueuedOrderViews,
  type ActionId,
  type EventChoiceAvailability,
  type GameState,
  type NewGameConfig,
  type QueueOrderResult,
  type RemoveQueuedOrderResult,
  type ResolveEventChoiceResult,
} from '../engine';
import { GameStorageService } from './game-storage.service';

@Injectable({
  providedIn: 'root',
})
export class GameFacade {
  private readonly storage = inject(GameStorageService);
  private readonly stateSignal = signal<GameState>(this.storage.loadCurrentRun() ?? newGame());

  readonly state = this.stateSignal.asReadonly();
  readonly actionCards = computed(() => selectActionCards(this.stateSignal()));
  readonly queuedOrders = computed(() => selectQueuedOrderViews(this.stateSignal()));
  readonly commandPointsRemaining = computed(() => getCommandPointsRemaining(this.stateSignal()));
  readonly pendingEventDefinition = computed(() => {
    const pendingEvent = this.stateSignal().pendingEvent;
    return pendingEvent ? getEventDefinition(pendingEvent.definitionId) : undefined;
  });

  startNewGame(config: NewGameConfig = {}): GameState {
    const state = newGame(config);
    this.setAndSave(state);
    return state;
  }

  loadCurrentRun(): boolean {
    const loaded = this.storage.loadCurrentRun();

    if (!loaded) {
      return false;
    }

    this.stateSignal.set(loaded);
    return true;
  }

  resetCurrentRun(config: NewGameConfig = {}): GameState {
    this.storage.clearCurrentRun();
    return this.startNewGame(config);
  }

  clearCurrentRun(): void {
    this.storage.clearCurrentRun();
  }

  queueOrder(actionId: ActionId, assignedOperativeId?: string): QueueOrderResult {
    const result = queueOrder(this.stateSignal(), {
      actionId,
      assignedOperativeId,
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

  private setAndSave(state: GameState): void {
    this.stateSignal.set(state);
    this.storage.saveCurrentRun(state);
  }
}

