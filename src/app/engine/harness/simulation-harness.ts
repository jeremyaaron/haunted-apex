import {
  DISTRICT_ZERO_ACTIONS,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  getDistrictDefinition,
  getEventDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionId,
  ActionTarget,
  DistrictId,
  EventChoiceDefinition,
  GameOverReason,
  GameState,
  OperativeId,
  PressureId,
  Pressures,
  RivalId,
  VenueId,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { createRng, nextInt } from '../rng';
import {
  getActionPreview,
  getCommandPointsRemaining,
  getOrderAvailability,
  selectActionTargetOptions,
  type QueueOrderRequest,
} from '../selectors';
import {
  advanceWeek,
  getEventChoiceAvailability,
  newGame,
  queueOrder,
  resolveEventChoice,
  type EventSelection,
  type OrderResolutionDiagnostic,
} from '../simulation';
import {
  createEmptyActionUsage,
  type AgentDecisionContext,
  type LegalEventChoiceOption,
  type LegalOrderOption,
  type StrategyAgent,
} from './agents';

export type HarnessRunOptions = {
  seed: string;
  agent: StrategyAgent;
  collectTrace?: boolean;
};

export type HarnessTraceEntry = {
  week: number;
  phase: GameState['phase'];
  message: string;
};

export type HarnessRunResult = {
  agentId: string;
  agentLabel: string;
  seed: string;
  finalState: GameState;
  outcome: 'victory' | 'loss' | 'incomplete';
  reason?: GameOverReason | 'agent_stalled';
  weeksPlayed: number;
  actionUsage: Record<ActionId, number>;
  targetUsage: Record<string, TargetRunStats>;
  eventChoiceUsage: Record<string, number>;
  contextualEvents: ContextualEventCounts;
  trace: HarnessTraceEntry[];
};

export type HarnessBatchOptions = {
  agents: readonly StrategyAgent[];
  runsPerAgent: number;
  seedPrefix?: string;
};

export type AgentBatchSummary = {
  agentId: string;
  agentLabel: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageFinalPressures: Pressures;
  lossReasons: Partial<Record<GameOverReason | 'agent_stalled', number>>;
  actionUsage: Record<ActionId, number>;
  targetReports: TargetReport[];
  mostSelectedTarget?: TargetReport;
  mostDangerousTarget?: TargetReport;
  eventChoiceUsage: Record<string, number>;
  averageFinalRivalPressures: Record<RivalId, number>;
  averageFinalDistricts: Record<DistrictId, DistrictAverage>;
  contextualEvents: ContextualEventCounts;
};

export type HarnessBatchReport = {
  runsPerAgent: number;
  totalRuns: number;
  summaries: AgentBatchSummary[];
};

export type TargetRunStats = {
  targetType: ActionTarget['type'];
  targetId: string;
  selections: number;
  complications: number;
};

export type TargetReport = TargetRunStats & {
  targetLabel: string;
  complicationRate: number;
  wins: number;
  losses: number;
};

export type DistrictAverage = {
  control: number;
  heat: number;
};

export type ContextualEventCounts = {
  influencedSelections: number;
  targetTagInfluenced: number;
  rivalPressureInfluenced: number;
  localHeatInfluenced: number;
};

const MAX_HARNESS_STEPS = 64;
const DANGEROUS_TARGET_MINIMUM_SELECTIONS = 5;
const TARGET_TAG_MODIFIERS = new Set([
  'recent_nightlife',
  'recent_violence',
  'recent_memory',
]);
const RIVAL_PRESSURE_MODIFIERS = new Set(['nyx_pressure', 'knox_pressure']);

export function simulateRun(options: HarnessRunOptions): HarnessRunResult {
  let state = newGame({ seed: options.seed });
  const actionUsage = createEmptyActionUsage();
  const targetUsage: Record<string, TargetRunStats> = {};
  const eventChoiceUsage: Record<string, number> = {};
  const contextualEvents = createEmptyContextualEventCounts();
  const trace: HarnessTraceEntry[] = [];
  const context = createAgentDecisionContext(`${state.seed}:${options.agent.id}`);
  let stalled = false;

  for (let step = 0; step < MAX_HARNESS_STEPS && !state.gameOver && !stalled; step += 1) {
    if (state.phase === 'COMMAND') {
      state = queueAgentOrders(
        state,
        options.agent,
        context,
        actionUsage,
        targetUsage,
        trace,
        options.collectTrace,
      );

      if (state.queuedOrders.length === 0) {
        stalled = true;
        appendTrace(trace, options.collectTrace, state, 'Agent stalled with no queued orders.');
        break;
      }

      const advanced = advanceWeek(state);

      if (!advanced.ok) {
        stalled = true;
        appendTrace(trace, options.collectTrace, state, `Advance failed: ${advanced.error}.`);
        break;
      }

      recordOrderComplications(targetUsage, advanced.orderResolutions);
      recordContextualEvent(contextualEvents, advanced.eventSelection);
      state = advanced.state;
      appendTrace(trace, options.collectTrace, state, 'Advanced week and presented event.');
    }

    if (state.phase === 'EVENT_CHOICE') {
      const optionsForEvent = getLegalEventChoiceOptions(state);
      const choice = options.agent.chooseEventChoice(state, optionsForEvent, context);

      if (!choice) {
        stalled = true;
        appendTrace(trace, options.collectTrace, state, 'Agent stalled with no event choice.');
        break;
      }

      const resolved = resolveEventChoice(state, choice.eventId, choice.choice.id);

      if (!resolved.ok) {
        stalled = true;
        appendTrace(trace, options.collectTrace, state, `Event choice failed: ${resolved.error}.`);
        break;
      }

      eventChoiceUsage[choice.choice.id] = (eventChoiceUsage[choice.choice.id] ?? 0) + 1;
      state = resolved.state;
      appendTrace(trace, options.collectTrace, state, `Chose event option: ${choice.choice.label}.`);
    }
  }

  return {
    agentId: options.agent.id,
    agentLabel: options.agent.label,
    seed: state.seed,
    finalState: state,
    outcome: state.gameOver?.result ?? (stalled ? 'incomplete' : 'incomplete'),
    reason: state.gameOver?.reason ?? (stalled ? 'agent_stalled' : undefined),
    weeksPlayed: state.week,
    actionUsage,
    targetUsage,
    eventChoiceUsage,
    contextualEvents,
    trace,
  };
}

export function simulateBatch(options: HarnessBatchOptions): HarnessBatchReport {
  const seedPrefix = options.seedPrefix ?? 'HARNESS';
  const summaries = options.agents.map((agent) => {
    const runs: HarnessRunResult[] = [];

    for (let index = 0; index < options.runsPerAgent; index += 1) {
      runs.push(
        simulateRun({
          agent,
          seed: `${seedPrefix}-${agent.id}-${index + 1}`,
        }),
      );
    }

    return summarizeAgentRuns(agent, runs);
  });

  return {
    runsPerAgent: options.runsPerAgent,
    totalRuns: options.runsPerAgent * options.agents.length,
    summaries,
  };
}

export function formatBatchReport(report: HarnessBatchReport): string {
  const lines = [
    `runsPerAgent,totalRuns`,
    `${report.runsPerAgent},${report.totalRuns}`,
    '',
    'agent,runs,wins,losses,incomplete,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin',
  ];

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.runs,
        summary.wins,
        summary.losses,
        summary.incomplete,
        summary.winRate.toFixed(3),
        summary.averageWeeksPlayed.toFixed(2),
        summary.averageFinalPressures.dominion.toFixed(2),
        summary.averageFinalPressures.heat.toFixed(2),
        summary.averageFinalPressures.loyalty.toFixed(2),
        summary.averageFinalPressures.resources.toFixed(2),
        summary.averageFinalPressures.intel.toFixed(2),
        summary.averageFinalPressures.ruin.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'target_highlights',
    'agent,agentLabel,mostSelectedTarget,selections,mostDangerousTarget,complicationRate',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.agentLabel,
        summary.mostSelectedTarget?.targetLabel ?? '',
        summary.mostSelectedTarget?.selections ?? 0,
        summary.mostDangerousTarget?.targetLabel ?? '',
        summary.mostDangerousTarget?.complicationRate.toFixed(3) ?? '',
      ].join(','),
    );
  }

  lines.push(
    '',
    'target_details',
    'agent,targetType,targetId,targetLabel,selections,complications,complicationRate,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const target of summary.targetReports) {
      lines.push(
        [
          summary.agentId,
          target.targetType,
          target.targetId,
          target.targetLabel,
          target.selections,
          target.complications,
          target.complicationRate.toFixed(3),
          target.wins,
          target.losses,
        ].join(','),
      );
    }
  }

  lines.push('', 'rival_pressure', 'agent,rivalId,rivalName,averageFinalPressure');

  for (const summary of report.summaries) {
    for (const rival of RIVAL_TERRITORY_RIVALS) {
      lines.push(
        [
          summary.agentId,
          rival.id,
          rival.name,
          summary.averageFinalRivalPressures[rival.id].toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push('', 'district_state', 'agent,districtId,districtName,averageControl,averageHeat');

  for (const summary of report.summaries) {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      const average = summary.averageFinalDistricts[district.id];
      lines.push(
        [
          summary.agentId,
          district.id,
          district.name,
          average.control.toFixed(2),
          average.heat.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push('', 'loss_causes', 'agent,cause,count');

  for (const summary of report.summaries) {
    const entries = Object.entries(summary.lossReasons);

    if (entries.length === 0) {
      lines.push([summary.agentId, 'none', 0].join(','));
      continue;
    }

    for (const [reason, count] of entries) {
      lines.push([summary.agentId, reason, count].join(','));
    }
  }

  lines.push(
    '',
    'contextual_events',
    'agent,influencedSelections,targetTagInfluenced,rivalPressureInfluenced,localHeatInfluenced',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.contextualEvents.influencedSelections,
        summary.contextualEvents.targetTagInfluenced,
        summary.contextualEvents.rivalPressureInfluenced,
        summary.contextualEvents.localHeatInfluenced,
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function getLegalOrderOptions(state: GameState): LegalOrderOption[] {
  if (state.phase !== 'COMMAND' || getCommandPointsRemaining(state) <= 0) {
    return [];
  }

  const queuedActionIds = new Set(state.queuedOrders.map((order) => order.actionId));
  const options: LegalOrderOption[] = [];

  for (const action of DISTRICT_ZERO_ACTIONS) {
    if (queuedActionIds.has(action.id)) {
      continue;
    }

    const requests = getOrderRequestsForAction(state, action.id);

    for (const request of requests) {
      const availability = getOrderAvailability(state, request);
      const preview = getActionPreview(
        state,
        request.actionId,
        request.assignedOperativeId,
        request.target,
      );

      if (availability.available && preview) {
        options.push({
          ...request,
          preview,
        });
      }
    }
  }

  return options;
}

export function getLegalEventChoiceOptions(state: GameState): LegalEventChoiceOption[] {
  const pendingEvent = state.pendingEvent;

  if (state.phase !== 'EVENT_CHOICE' || !pendingEvent) {
    return [];
  }

  const definition = getEventDefinition(pendingEvent.definitionId);

  if (!definition) {
    return [];
  }

  return definition.choices.flatMap((choice) =>
    getEventChoiceAvailability(state, pendingEvent.id, choice.id).available
      ? [
          {
            eventId: pendingEvent.id,
            choice,
          },
        ]
      : [],
  );
}

function queueAgentOrders(
  state: GameState,
  agent: StrategyAgent,
  context: AgentDecisionContext,
  actionUsage: Record<ActionId, number>,
  targetUsage: Record<string, TargetRunStats>,
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
): GameState {
  let next = state;

  while (getCommandPointsRemaining(next) > 0) {
    const legalOptions = getLegalOrderOptions(next);
    const decision = agent.chooseOrder(next, legalOptions, context);

    if (!decision) {
      return next;
    }

    const queued = queueOrder(next, {
      actionId: decision.actionId,
      assignedOperativeId: decision.assignedOperativeId,
      target: decision.target,
    });

    if (!queued.ok) {
      appendTrace(trace, collectTrace, next, `Queue failed: ${queued.error}.`);
      return next;
    }

    next = queued.state;
    actionUsage[decision.actionId] += 1;
    recordTargetSelection(targetUsage, decision.target);
    appendTrace(trace, collectTrace, next, `Queued order: ${decision.preview.label}.`);
  }

  return next;
}

function getOrderRequestsForAction(state: GameState, actionId: ActionId): QueueOrderRequest[] {
  const action = DISTRICT_ZERO_ACTIONS.find((candidate) => candidate.id === actionId);

  if (!action) {
    return [];
  }

  if (action.assignment === 'none') {
    return withLegalTargets(state, actionId, [{ actionId }]);
  }

  const operativeRequests = state.operatives.map((operative) => ({
    actionId,
    assignedOperativeId: operative.id,
  }));

  const assignmentRequests =
    action.assignment === 'required' ? operativeRequests : [{ actionId }, ...operativeRequests];

  return withLegalTargets(state, actionId, assignmentRequests);
}

function withLegalTargets(
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

function summarizeAgentRuns(agent: StrategyAgent, runs: readonly HarnessRunResult[]): AgentBatchSummary {
  const pressureTotals = PRESSURE_IDS.reduce(
    (totals, pressure) => ({
      ...totals,
      [pressure]: 0,
    }),
    {} as Pressures,
  );
  const actionUsage = createEmptyActionUsage();
  const targetReportsByKey = new Map<string, TargetReport>();
  const eventChoiceUsage: Record<string, number> = {};
  const lossReasons: Partial<Record<GameOverReason | 'agent_stalled', number>> = {};
  const rivalPressureTotals = createEmptyRivalPressureTotals();
  const districtTotals = createEmptyDistrictTotals();
  const contextualEvents = createEmptyContextualEventCounts();
  let weeksTotal = 0;
  let wins = 0;
  let losses = 0;
  let incomplete = 0;

  for (const run of runs) {
    weeksTotal += run.weeksPlayed;

    if (run.outcome === 'victory') {
      wins += 1;
    } else if (run.outcome === 'loss') {
      losses += 1;
    } else {
      incomplete += 1;
    }

    if (run.reason && run.outcome !== 'victory') {
      lossReasons[run.reason] = (lossReasons[run.reason] ?? 0) + 1;
    }

    for (const pressure of PRESSURE_IDS) {
      pressureTotals[pressure] += run.finalState.pressures[pressure];
    }

    for (const rival of RIVAL_TERRITORY_RIVALS) {
      rivalPressureTotals[rival.id] += run.finalState.rivals[rival.id].pressure;
    }

    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      districtTotals[district.id].control += run.finalState.districts[district.id].control;
      districtTotals[district.id].heat += run.finalState.districts[district.id].heat;
    }

    for (const action of DISTRICT_ZERO_ACTIONS) {
      actionUsage[action.id] += run.actionUsage[action.id];
    }

    for (const [key, target] of Object.entries(run.targetUsage)) {
      const current = targetReportsByKey.get(key) ?? {
        targetType: target.targetType,
        targetId: target.targetId,
        selections: 0,
        complications: 0,
        targetLabel: getTargetReportLabel(target),
        complicationRate: 0,
        wins: 0,
        losses: 0,
      };
      current.selections += target.selections;
      current.complications += target.complications;

      if (run.outcome === 'victory') {
        current.wins += 1;
      } else if (run.outcome === 'loss') {
        current.losses += 1;
      }

      targetReportsByKey.set(key, current);
    }

    for (const [choiceId, count] of Object.entries(run.eventChoiceUsage)) {
      eventChoiceUsage[choiceId] = (eventChoiceUsage[choiceId] ?? 0) + count;
    }

    addContextualEventCounts(contextualEvents, run.contextualEvents);
  }

  const targetReports = [...targetReportsByKey.values()]
    .map((target) => ({
      ...target,
      complicationRate:
        target.selections > 0 ? target.complications / target.selections : 0,
    }))
    .sort((left, right) => left.targetLabel.localeCompare(right.targetLabel));

  return {
    agentId: agent.id,
    agentLabel: agent.label,
    runs: runs.length,
    wins,
    losses,
    incomplete,
    winRate: runs.length > 0 ? wins / runs.length : 0,
    averageWeeksPlayed: runs.length > 0 ? weeksTotal / runs.length : 0,
    averageFinalPressures: averagePressures(pressureTotals, runs.length),
    lossReasons,
    actionUsage,
    targetReports,
    mostSelectedTarget: selectMostSelectedTarget(targetReports),
    mostDangerousTarget: selectMostDangerousTarget(targetReports),
    eventChoiceUsage,
    averageFinalRivalPressures: averageRivalPressures(rivalPressureTotals, runs.length),
    averageFinalDistricts: averageDistricts(districtTotals, runs.length),
    contextualEvents,
  };
}

function recordTargetSelection(
  targetUsage: Record<string, TargetRunStats>,
  target: ActionTarget | undefined,
): void {
  if (!target) {
    return;
  }

  const key = getTargetKey(target);
  const current = targetUsage[key] ?? {
    targetType: target.type,
    targetId: target.id,
    selections: 0,
    complications: 0,
  };
  current.selections += 1;
  targetUsage[key] = current;
}

function recordOrderComplications(
  targetUsage: Record<string, TargetRunStats>,
  resolutions: readonly OrderResolutionDiagnostic[],
): void {
  for (const resolution of resolutions) {
    const target = resolution.order.target;

    if (!target || !resolution.complication) {
      continue;
    }

    const usage = targetUsage[getTargetKey(target)];

    if (usage) {
      usage.complications += 1;
    }
  }
}

function recordContextualEvent(
  counts: ContextualEventCounts,
  selection: EventSelection,
): void {
  const modifierIds = new Set(
    selection.diagnostics.contextModifiers.map((modifier) => modifier.id),
  );

  if (modifierIds.size > 0) {
    counts.influencedSelections += 1;
  }

  if ([...modifierIds].some((id) => TARGET_TAG_MODIFIERS.has(id))) {
    counts.targetTagInfluenced += 1;
  }

  if ([...modifierIds].some((id) => RIVAL_PRESSURE_MODIFIERS.has(id))) {
    counts.rivalPressureInfluenced += 1;
  }

  if (modifierIds.has('recent_high_local_heat')) {
    counts.localHeatInfluenced += 1;
  }
}

function getTargetKey(target: ActionTarget): string {
  return `${target.type}:${target.id}`;
}

function getTargetReportLabel(target: TargetRunStats): string {
  switch (target.targetType) {
    case 'district':
      return getDistrictDefinition(target.targetId as DistrictId)?.name ?? target.targetId;
    case 'venue':
      return getVenueDefinition(target.targetId as VenueId)?.name ?? target.targetId;
    case 'rival':
      return getRivalDefinition(target.targetId as RivalId)?.name ?? target.targetId;
    case 'recruit':
      return getOperativeDefinition(target.targetId as OperativeId)?.name ?? target.targetId;
  }
}

function selectMostSelectedTarget(targets: readonly TargetReport[]): TargetReport | undefined {
  return [...targets].sort(
    (left, right) =>
      right.selections - left.selections || left.targetLabel.localeCompare(right.targetLabel),
  )[0];
}

function selectMostDangerousTarget(targets: readonly TargetReport[]): TargetReport | undefined {
  return [...targets]
    .filter((target) => target.selections >= DANGEROUS_TARGET_MINIMUM_SELECTIONS)
    .sort(
      (left, right) =>
        right.complicationRate - left.complicationRate ||
        right.selections - left.selections ||
        left.targetLabel.localeCompare(right.targetLabel),
    )[0];
}

function createEmptyRivalPressureTotals(): Record<RivalId, number> {
  return RIVAL_TERRITORY_RIVALS.reduce(
    (totals, rival) => ({
      ...totals,
      [rival.id]: 0,
    }),
    {} as Record<RivalId, number>,
  );
}

function createEmptyDistrictTotals(): Record<DistrictId, DistrictAverage> {
  return RIVAL_TERRITORY_DISTRICTS.reduce(
    (totals, district) => ({
      ...totals,
      [district.id]: {
        control: 0,
        heat: 0,
      },
    }),
    {} as Record<DistrictId, DistrictAverage>,
  );
}

function createEmptyContextualEventCounts(): ContextualEventCounts {
  return {
    influencedSelections: 0,
    targetTagInfluenced: 0,
    rivalPressureInfluenced: 0,
    localHeatInfluenced: 0,
  };
}

function addContextualEventCounts(
  totals: ContextualEventCounts,
  counts: ContextualEventCounts,
): void {
  totals.influencedSelections += counts.influencedSelections;
  totals.targetTagInfluenced += counts.targetTagInfluenced;
  totals.rivalPressureInfluenced += counts.rivalPressureInfluenced;
  totals.localHeatInfluenced += counts.localHeatInfluenced;
}

function averageRivalPressures(
  totals: Record<RivalId, number>,
  runs: number,
): Record<RivalId, number> {
  return RIVAL_TERRITORY_RIVALS.reduce(
    (averages, rival) => ({
      ...averages,
      [rival.id]: runs > 0 ? totals[rival.id] / runs : 0,
    }),
    {} as Record<RivalId, number>,
  );
}

function averageDistricts(
  totals: Record<DistrictId, DistrictAverage>,
  runs: number,
): Record<DistrictId, DistrictAverage> {
  return RIVAL_TERRITORY_DISTRICTS.reduce(
    (averages, district) => ({
      ...averages,
      [district.id]: {
        control: runs > 0 ? totals[district.id].control / runs : 0,
        heat: runs > 0 ? totals[district.id].heat / runs : 0,
      },
    }),
    {} as Record<DistrictId, DistrictAverage>,
  );
}

function averagePressures(totals: Pressures, runs: number): Pressures {
  if (runs === 0) {
    return { ...totals };
  }

  return PRESSURE_IDS.reduce(
    (average, pressure) => ({
      ...average,
      [pressure]: totals[pressure] / runs,
    }),
    {} as Pressures,
  );
}

function createAgentDecisionContext(seed: string): AgentDecisionContext {
  let rng = createRng(seed);

  return {
    nextInt: (minInclusive, maxInclusive) => {
      const roll = nextInt(rng, minInclusive, maxInclusive);
      rng = roll.rng;
      return roll.value;
    },
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty list.');
      }

      const index = nextInt(rng, 0, items.length - 1);
      rng = index.rng;
      return items[index.value];
    },
  };
}

function appendTrace(
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
  state: GameState,
  message: string,
): void {
  if (!collectTrace) {
    return;
  }

  trace.push({
    week: state.week,
    phase: state.phase,
    message,
  });
}
