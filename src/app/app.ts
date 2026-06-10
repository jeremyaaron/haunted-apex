import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PRESSURE_IDS,
  STRATEGY_AGENTS,
  DISTRICT_ZERO_WIN_LOSS_THRESHOLDS,
  formatBatchReport,
  generateRoster,
  getWeightedEvents,
  pressureDeltaToView,
  simulateBatch,
  type ActionCardView,
  type ActionId,
  type ActionTarget,
  type ActionTargetOption,
  type AppliedModifierSource,
  type EventChoiceDefinition,
  type EventLedgerEffectPreviewRow,
  type HireCandidateView,
  type LedgerDeltaRow,
  type LedgerEntryView,
  type LedgerUseOptionView,
  type OperativeId,
  type PressureDelta,
  type PressureDeltaView,
  type PressureId,
  type RunSummaryOperative,
  type SpecialCost,
  type StressTier,
} from './engine';
import { CURRENT_SAVE_SCHEMA_VERSION, GameFacade } from './game';

type ActionCardUiView = ActionCardView & {
  targetOptions: ActionTargetOption[];
};

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly game = inject(GameFacade);
  protected readonly selectedOperatives = signal<Partial<Record<ActionId, string>>>({});
  protected readonly selectedTargets = signal<Partial<Record<ActionId, ActionTarget>>>({});
  protected readonly harnessOutput = signal('');
  protected readonly debugVisible = signal(false);
  protected readonly copyReportStatus = signal<'idle' | 'success' | 'failure'>('idle');
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
      statusLabel: this.getPressureStatusLabel(id, this.game.state().pressures[id]),
      targetLabel: this.getPressureTargetLabel(id),
    })),
  );
  protected readonly debugView = computed(() => {
    const state = this.game.state();
    const generatedRoster = generateRoster(state.seed);
    const recentEventTags = state.eventLog
      .slice(-5)
      .flatMap((entry) => entry.tags ?? [])
      .filter((tag, index, tags) => tags.indexOf(tag) === index);
    const operativeEvents = getWeightedEvents(state).flatMap((candidate) => {
      if (candidate.event.kind !== 'operative') {
        return [];
      }

      return [
        {
          eventId: candidate.event.id,
          operativeId: candidate.event.operativeId,
          weight: candidate.weight,
          diagnostics: candidate.diagnostics,
        },
      ];
    });

    return {
      seed: state.seed,
      rngCursor: state.rngCursor,
      phase: state.phase,
      dominionTarget: DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory,
      pendingEventId: state.pendingEvent?.definitionId ?? 'None',
      pressuresJson: JSON.stringify(state.pressures, null, 2),
      flagsJson: JSON.stringify(state.flags, null, 2),
      queuedOrdersJson: JSON.stringify(state.queuedOrders, null, 2),
      districtsJson: JSON.stringify(state.districts, null, 2),
      rivalsJson: JSON.stringify(state.rivals, null, 2),
      recentActivityJson: JSON.stringify(state.recentActivity, null, 2),
      startingRosterIdsJson: JSON.stringify(generatedRoster.startingOperativeIds, null, 2),
      hirePoolIdsJson: JSON.stringify(state.hirePool, null, 2),
      operativeStateJson: JSON.stringify(state.operatives, null, 2),
      recentAssignmentsJson: JSON.stringify(
        state.operatives.map((operative) => ({
          operativeId: operative.id,
          assignments: operative.recentAssignments,
        })),
        null,
        2,
      ),
      matchedSourcesJson: JSON.stringify(
        this.actionViews().map((action) => ({
          actionId: action.actionId,
          target: action.selectedTarget,
          operativeId: action.selectedOperative?.operativeId,
          sources: action.selectedOperative?.appliedSources ?? [],
        })),
        null,
        2,
      ),
      eligibleOperativeEventsJson: JSON.stringify(operativeEvents, null, 2),
      seenSignatureEventsJson: JSON.stringify(state.seenSignatureEventIds, null, 2),
      saveSchemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      targetPreviewsJson: JSON.stringify(
        this.actionViews().map((action) => ({
          actionId: action.actionId,
          target: action.selectedTarget,
          adjustedEffects: action.adjustedEffects,
          riskChance: action.riskChance,
          selectedOperative: action.selectedOperative,
          rivalAttention: action.rivalAttention,
          localImpact: action.localImpact,
        })),
        null,
        2,
      ),
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
    this.clearTransientSelections();
    this.copyReportStatus.set('idle');
    this.game.startNewGame(this.seedInput.trim() ? { seed: this.seedInput } : {});
  }

  protected resetRun(): void {
    this.clearTransientSelections();
    this.copyReportStatus.set('idle');
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

  protected setSelectedTarget(actionId: ActionId, targetKey: string): void {
    const target = this.game
      .getTargetOptions(actionId)
      .find((option) => this.targetKey(option.target) === targetKey)?.target;

    this.selectedTargets.update((selected) => ({
      ...selected,
      [actionId]: target,
    }));
  }

  protected selectedTarget(actionId: ActionId): string {
    const target = this.selectedTargets()[actionId];
    return target ? this.targetKey(target) : '';
  }

  protected targetOptionLabel(option: ActionTargetOption): string {
    if (option.targetType === 'venue' && option.districtName) {
      return `${option.districtName} / ${option.label}`;
    }

    return option.label;
  }

  protected targetOptionValue(option: ActionTargetOption): string {
    return this.targetKey(option.target);
  }

  protected queueAction(actionId: ActionId): void {
    const assignedOperativeId = this.selectedOperatives()[actionId];
    const target = this.selectedTargets()[actionId];
    const result = this.game.queueOrder(actionId, assignedOperativeId, target);

    if (result.ok) {
      this.setSelectedOperative(actionId, '');
      this.setSelectedTarget(actionId, '');
    }
  }

  protected removeOrder(orderId: string): void {
    this.game.removeQueuedOrder(orderId);
  }

  protected advanceWeek(): void {
    this.clearTransientSelections();
    this.game.advanceWeek();
  }

  protected chooseEvent(choiceId: string): void {
    const pendingEvent = this.game.state().pendingEvent;

    if (!pendingEvent) {
      return;
    }

    this.game.resolveEventChoice(pendingEvent.id, choiceId);
  }

  protected async copyRunReport(): Promise<void> {
    const report = this.game.runSummary();

    if (!report) {
      this.copyReportStatus.set('failure');
      return;
    }

    try {
      await this.writeClipboardText(report.text);
      this.copyReportStatus.set('success');
    } catch {
      this.copyReportStatus.set('failure');
    }
  }

  protected runHarnessBatch(): void {
    const report = simulateBatch({
      agents: STRATEGY_AGENTS,
      runsPerAgent: 100,
      seedPrefix: `UI-${this.game.state().seed}`,
    });

    this.harnessOutput.set(formatBatchReport(report));
  }

  @HostListener('window:keydown', ['$event'])
  protected handleKeyboard(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.debugVisible.update((visible) => !visible);
      return;
    }

    if (event.key === 'Escape' && this.game.selectedOperativeDetail()) {
      event.preventDefault();
      this.closeOperativeDetail();
    }
  }

  protected openOperativeDetail(operativeId: OperativeId): void {
    this.game.selectOperative(operativeId);
  }

  protected closeOperativeDetail(): void {
    this.game.selectOperative(undefined);
  }

  protected closeOperativeDetailFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeOperativeDetail();
    }
  }

  protected dismissCompatibilityNotice(): void {
    this.game.dismissCompatibilityNotice();
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

  protected eventLedgerRows(choiceId: string): EventLedgerEffectPreviewRow[] {
    const pendingEvent = this.game.state().pendingEvent;

    if (!pendingEvent) {
      return [];
    }

    return this.game.getEventChoicePreview(pendingEvent.id, choiceId)?.ledgerEffects ?? [];
  }

  protected formatLedgerEventRow(row: EventLedgerEffectPreviewRow): string {
    const kind = this.capitalize(row.kind);

    switch (row.type) {
      case 'create':
        return `Creates ${kind}: ${row.entryName}`;
      case 'consume':
        return `Consumes ${kind}: ${row.entryName}`;
      case 'resolve':
        return `Resolves ${kind}: ${row.entryName}`;
    }

    return row.entryName;
  }

  protected ledgerEntries(): LedgerEntryView[] {
    const panel = this.game.ledgerPanel();
    return [
      ...panel.secrets,
      ...panel.debts,
      ...panel.favors,
      ...panel.consumed,
    ];
  }

  protected ledgerDeltaText(row: LedgerDeltaRow): string {
    return `${this.signed(row.value)} ${this.pressureLabel(row.id)}`;
  }

  protected ledgerCostText(row: LedgerDeltaRow): string {
    return `${this.signed(-Math.abs(row.value))} ${this.pressureLabel(row.id)}`;
  }

  protected ledgerUseSummary(option: LedgerUseOptionView): string {
    const rows = [...option.costRows, ...option.effectRows].map((row) =>
      this.ledgerDeltaText(row),
    );

    if (option.consumesEntry) {
      rows.push('Consumes Entry');
    }

    return rows.length > 0 ? rows.join(' · ') : 'No pressure change';
  }

  protected ledgerUseUnavailableReason(option: LedgerUseOptionView): string {
    switch (option.unavailableReason) {
      case 'insufficient_resources':
        return 'Insufficient Resources';
      case 'insufficient_intel':
        return 'Insufficient Intel';
      case 'entry_consumed':
        return 'Entry already spent';
      default:
        return option.unavailableReason ? this.displayToken(option.unavailableReason) : '';
    }
  }

  protected runOperativeNames(operatives: readonly RunSummaryOperative[]): string {
    return operatives.map((operative) => operative.name).join(', ') || 'None';
  }

  protected actionUnavailableReason(reason: string | undefined): string {
    switch (reason) {
      case 'target_required':
        return 'Select a target to queue this order.';
      case 'not_enough_resources':
        return 'Insufficient Resources for this order.';
      case 'not_enough_intel':
        return 'Insufficient Intel for this Ledger use.';
      case 'ledger_target_required':
        return 'Select a Ledger entry and use option.';
      case 'ledger_entry_unknown':
        return 'That Ledger entry is no longer available.';
      case 'ledger_entry_consumed':
        return 'That Ledger entry has already been spent or resolved.';
      case 'ledger_use_option_not_found':
        return 'That Ledger use option is no longer available.';
      default:
        return reason ? this.displayToken(reason) : '';
    }
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

  private capitalize(value: string): string {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  }

  protected modifierEffects(source: AppliedModifierSource): string[] {
    const effects = source.effects
      ? this.deltaRows(source.effects).map(
          (delta) => `${this.signed(delta.value)} ${this.pressureLabel(delta.id)}`,
        )
      : [];

    return [
      ...effects,
      ...(source.riskModifier ? [`${this.signed(source.riskModifier)}% Risk`] : []),
      ...(source.stressModifier ? [`${this.signed(source.stressModifier)} Stress`] : []),
      ...(source.resourceCostModifier
        ? [`${this.signed(source.resourceCostModifier)} Resource cost`]
        : []),
      ...(source.rivalPressureModifier
        ? [`${this.signed(source.rivalPressureModifier)} Rival Pressure`]
        : []),
      ...(source.districtControlModifier
        ? [`${this.signed(source.districtControlModifier)} Control`]
        : []),
    ];
  }

  protected hireCandidate(operativeId: OperativeId): HireCandidateView | undefined {
    return this.game.hirePool().find((candidate) => candidate.id === operativeId);
  }

  protected projectedRosterCount(): number {
    const queuedRecruits = this.game
      .state()
      .queuedOrders.filter((order) => order.target?.type === 'recruit').length;

    return this.game.state().operatives.length + queuedRecruits + 1;
  }

  protected stressConsequence(tier: StressTier): string {
    switch (tier) {
      case 'stable':
        return 'No Stress risk penalty.';
      case 'strained':
        return 'Adds 2% complication risk.';
      case 'unstable':
        return 'Adds 5% complication risk and invites harder personal fallout.';
      case 'breaking':
        return 'Adds 10% complication risk and severe personal fallout, but remains assignable.';
    }
  }

  protected displayToken(value: string): string {
    return value
      .replace(/^op_/, '')
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected displayTokens(values: readonly string[]): string {
    return values.map((value) => this.displayToken(value)).join(' / ');
  }

  protected unavailableReason(reason: string | undefined): string {
    switch (reason) {
      case 'roster_full':
        return 'Roster full: five active operatives is the current limit.';
      case 'not_enough_resources':
        return 'Insufficient Resources for this candidate.';
      case 'recruit_already_queued':
        return 'This candidate is already queued for recruitment.';
      default:
        return reason ? this.displayToken(reason) : '';
    }
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected trackById<T extends { id: string }>(_index: number, item: T): string {
    return item.id;
  }

  private withSelectedOperative(card: ActionCardView): ActionCardUiView {
    const assignedOperativeId = this.selectedOperatives()[card.actionId];
    const target = this.selectedTargets()[card.actionId];
    const preview = this.game.getActionPreview(card.actionId, assignedOperativeId, target) ?? card;
    const availability = this.game.getOrderAvailability(card.actionId, assignedOperativeId, target);
    const queued = this.game.state().queuedOrders.some((order) => order.actionId === card.actionId);

    return {
      ...card,
      ...preview,
      targetOptions: this.game.getTargetOptions(card.actionId),
      availableOperatives: this.game.getAssignmentOptions(card.actionId, target),
      state: queued ? 'queued' : availability.available ? 'available' : 'unavailable',
      unavailableReason: availability.reason,
    };
  }

  private clearTransientSelections(): void {
    this.selectedOperatives.set({});
    this.selectedTargets.set({});
  }

  private targetKey(target: ActionTarget): string {
    if (target.type === 'ledger') {
      return `${target.type}:${target.entryId}:${target.useOptionId}`;
    }

    if (target.type === 'contact') {
      return `${target.type}:${target.contactId}:${target.optionId}`;
    }

    return `${target.type}:${target.id}`;
  }

  private formatPressureValue(id: PressureId, value: number): string {
    return id === 'resources' ? value.toLocaleString('en-US') : `${value}`;
  }

  private getPressureMeterValue(id: PressureId, value: number): number {
    if (id === 'dominion') {
      return Math.max(
        0,
        Math.min(
          100,
          Math.round((value / DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory) * 100),
        ),
      );
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
      return value >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory
        ? 'critical'
        : value >= 60
          ? 'warning'
          : 'stable';
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
        return `Win at ${DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory}`;
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

  private getPressureStatusLabel(id: PressureId, value: number): string {
    const status = this.getPressureStatus(id, value);

    if (id === 'dominion' && status === 'critical') {
      return 'Target';
    }

    if (id === 'dominion' && status === 'warning') {
      return 'Close';
    }

    if (id === 'intel') {
      return 'Signal';
    }

    switch (status) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'stable':
        return 'Stable';
    }
  }

  private isSpecialCost(cost: EventChoiceDefinition['cost']): cost is SpecialCost {
    return typeof cost === 'object' && cost !== null && 'type' in cost;
  }

  private async writeClipboardText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (!this.fallbackCopyText(text)) {
      throw new Error('Clipboard unavailable');
    }
  }

  private fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
