import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  getActionPreview,
  getOrderAvailability,
  PRESSURE_IDS,
  STRATEGY_AGENTS,
  formatBatchReport,
  pressureDeltaToView,
  simulateBatch,
  type ActionCardView,
  type ActionId,
  type EventChoiceDefinition,
  type PressureDelta,
  type PressureDeltaView,
  type PressureId,
  type SpecialCost,
} from './engine';
import { GameFacade } from './game';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly game = inject(GameFacade);
  protected readonly selectedOperatives = signal<Partial<Record<ActionId, string>>>({});
  protected readonly harnessOutput = signal('');
  protected seedInput = 'VIOLET-ASH-1047';

  protected readonly actionViews = computed(() =>
    this.game.actionCards().map((card) => this.withSelectedOperative(card)),
  );
  protected readonly pressureViews = computed(() =>
    PRESSURE_IDS.map((id) => ({
      id,
      label: this.pressureLabel(id),
      value: this.game.state().pressures[id],
      displayValue: this.formatPressureValue(id, this.game.state().pressures[id]),
      meterValue: this.getPressureMeterValue(id, this.game.state().pressures[id]),
      status: this.getPressureStatus(id, this.game.state().pressures[id]),
      targetLabel: this.getPressureTargetLabel(id),
    })),
  );
  protected readonly debugView = computed(() => {
    const state = this.game.state();
    const recentEventTags = state.eventLog
      .slice(-5)
      .flatMap((entry) => entry.tags ?? [])
      .filter((tag, index, tags) => tags.indexOf(tag) === index);

    return {
      seed: state.seed,
      rngCursor: state.rngCursor,
      phase: state.phase,
      pendingEventId: state.pendingEvent?.definitionId ?? 'None',
      pressuresJson: JSON.stringify(state.pressures, null, 2),
      flagsJson: JSON.stringify(state.flags, null, 2),
      queuedOrdersJson: JSON.stringify(state.queuedOrders, null, 2),
      recentEventTags: recentEventTags.length > 0 ? recentEventTags.join(', ') : 'None',
      riskRows: this.actionViews().map((action) => ({
        id: action.actionId,
        label: action.label,
        riskChance: action.riskChance,
        riskLabel: action.riskLabel,
      })),
    };
  });

  protected startNewRun(): void {
    this.selectedOperatives.set({});
    this.game.startNewGame(this.seedInput.trim() ? { seed: this.seedInput } : {});
  }

  protected resetRun(): void {
    this.selectedOperatives.set({});
    this.game.resetCurrentRun(this.seedInput.trim() ? { seed: this.seedInput } : {});
  }

  protected setSelectedOperative(actionId: ActionId, operativeId: string): void {
    this.selectedOperatives.update((selected) => ({
      ...selected,
      [actionId]: operativeId || undefined,
    }));
  }

  protected selectedOperative(actionId: ActionId): string {
    return this.selectedOperatives()[actionId] ?? '';
  }

  protected queueAction(actionId: ActionId): void {
    const assignedOperativeId = this.selectedOperatives()[actionId];
    const result = this.game.queueOrder(actionId, assignedOperativeId);

    if (result.ok) {
      this.setSelectedOperative(actionId, '');
    }
  }

  protected removeOrder(orderId: string): void {
    this.game.removeQueuedOrder(orderId);
  }

  protected advanceWeek(): void {
    this.selectedOperatives.set({});
    this.game.advanceWeek();
  }

  protected chooseEvent(choiceId: string): void {
    const pendingEvent = this.game.state().pendingEvent;

    if (!pendingEvent) {
      return;
    }

    this.game.resolveEventChoice(pendingEvent.id, choiceId);
  }

  protected runHarnessBatch(): void {
    const report = simulateBatch({
      agents: STRATEGY_AGENTS,
      runsPerAgent: 100,
      seedPrefix: `UI-${this.game.state().seed}`,
    });

    this.harnessOutput.set(formatBatchReport(report));
  }

  protected isAdvanceEnabled(): boolean {
    const state = this.game.state();
    return state.phase === 'COMMAND' && state.queuedOrders.length > 0;
  }

  protected canChoose(choiceId: string): boolean {
    const pendingEvent = this.game.state().pendingEvent;

    if (!pendingEvent) {
      return false;
    }

    return this.game.getEventChoiceAvailability(pendingEvent.id, choiceId).available;
  }

  protected deltaRows(delta: PressureDelta): PressureDeltaView[] {
    return pressureDeltaToView(delta);
  }

  protected formatCost(cost: EventChoiceDefinition['cost']): string {
    if (!cost) {
      return 'No cost';
    }

    if (this.isSpecialCost(cost)) {
      return `${cost.amount} Intel`;
    }

    const rows = pressureDeltaToView(cost);
    return rows.length > 0
      ? rows.map((row) => `${Math.abs(row.value)} ${this.pressureLabel(row.id)}`).join(', ')
      : 'No cost';
  }

  protected pressureLabel(id: PressureId): string {
    switch (id) {
      case 'dominion':
        return 'Dominion';
      case 'heat':
        return 'Heat';
      case 'loyalty':
        return 'Loyalty';
      case 'resources':
        return 'Resources';
      case 'intel':
        return 'Intel';
      case 'ruin':
        return 'Ruin';
    }
  }

  protected signed(value: number): string {
    return value > 0 ? `+${value}` : `${value}`;
  }

  protected trackById<T extends { id: string }>(_index: number, item: T): string {
    return item.id;
  }

  private withSelectedOperative(card: ActionCardView): ActionCardView {
    const assignedOperativeId = this.selectedOperatives()[card.actionId];
    const state = this.game.state();
    const preview = getActionPreview(state, card.actionId, assignedOperativeId) ?? card;
    const availability = getOrderAvailability(state, {
      actionId: card.actionId,
      assignedOperativeId,
    });
    const queued = state.queuedOrders.some((order) => order.actionId === card.actionId);

    return {
      ...card,
      ...preview,
      state: queued ? 'queued' : availability.available ? 'available' : 'unavailable',
      unavailableReason: availability.reason,
    };
  }

  private formatPressureValue(id: PressureId, value: number): string {
    return id === 'resources' ? value.toLocaleString('en-US') : `${value}`;
  }

  private getPressureMeterValue(id: PressureId, value: number): number {
    if (id === 'dominion') {
      return Math.max(0, Math.min(100, Math.round((value / 60) * 100)));
    }

    if (id === 'resources') {
      return Math.max(0, Math.min(100, Math.round((value / 5000) * 100)));
    }

    if (id === 'ruin') {
      return Math.max(0, Math.min(100, Math.round((value / 25) * 100)));
    }

    return Math.max(0, Math.min(100, value));
  }

  private getPressureStatus(id: PressureId, value: number): 'stable' | 'warning' | 'critical' {
    if (id === 'dominion') {
      return value >= 60 ? 'critical' : value >= 45 ? 'warning' : 'stable';
    }

    if (id === 'heat') {
      return value >= 80 ? 'critical' : value >= 60 ? 'warning' : 'stable';
    }

    if (id === 'loyalty') {
      return value <= 25 ? 'critical' : value <= 40 ? 'warning' : 'stable';
    }

    if (id === 'resources') {
      return value <= 750 ? 'critical' : value <= 1500 ? 'warning' : 'stable';
    }

    if (id === 'ruin') {
      return value >= 50 ? 'critical' : value >= 25 ? 'warning' : 'stable';
    }

    return 'stable';
  }

  private getPressureTargetLabel(id: PressureId): string {
    switch (id) {
      case 'dominion':
        return 'Win at 60';
      case 'heat':
        return 'Lose at 100';
      case 'loyalty':
        return 'Lose at 0';
      case 'resources':
        return 'Lose below 0';
      case 'intel':
        return 'Unlocks options';
      case 'ruin':
        return 'Warning at 25';
    }
  }

  private isSpecialCost(cost: EventChoiceDefinition['cost']): cost is SpecialCost {
    return typeof cost === 'object' && cost !== null && 'type' in cost;
  }
}
