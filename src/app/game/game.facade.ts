import { computed, inject, Injectable, signal } from '@angular/core';
import {
  advanceWeek,
  getActionPreview,
  getCommandPointsRemaining,
  getEventDefinition,
  getEventChoiceAvailability,
  getOperativeDefinition,
  getTraitDefinition,
  getOrderAvailability,
  newGame,
  queueOrder,
  removeQueuedOrder,
  resolveEventChoice,
  selectActionCards,
  selectActionTargetOptions,
  selectDistrictTerritoryViews,
  selectQueuedOrderViews,
  selectRivalTerritoryViews,
  type ActionId,
  type ActionPreview,
  type ActionTarget,
  type ActionTargetOption,
  type EventChoiceAvailability,
  type GameState,
  type NewGameConfig,
  type OrderAvailability,
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
  readonly districts = computed(() => selectDistrictTerritoryViews(this.stateSignal()));
  readonly rivals = computed(() => selectRivalTerritoryViews(this.stateSignal()));
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

  getTargetOptions(actionId: ActionId): ActionTargetOption[] {
    return selectActionTargetOptions(this.stateSignal(), actionId);
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

  private setAndSave(state: GameState): void {
    this.stateSignal.set(state);
    this.storage.saveCurrentRun(state);
  }
}
