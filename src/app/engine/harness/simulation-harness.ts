import {
  DISTRICT_ZERO_ACTIONS,
  ROSTER_OPERATIVES,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  getDistrictDefinition,
  getEventDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import type {
  ActionId,
  ActionTarget,
  DistrictId,
  EventChoiceDefinition,
  EventId,
  GameOverReason,
  GameState,
  LedgerEntryDefinitionId,
  LedgerEntryKind,
  OperativeId,
  PressureId,
  Pressures,
  RivalId,
  StressTier,
  VenueId,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { createRng, nextInt } from '../rng';
import { getStressTier } from '../roster';
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
  type WeightedEvent,
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
  startingRosterIds: OperativeId[];
  initialHirePoolIds: OperativeId[];
  operativeStats: Record<OperativeId, OperativeRunStats>;
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>;
  ledgerStats: LedgerRunStats;
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
  rosterCompositionReports: RosterCompositionReport[];
  operativePresenceReports: OperativePresenceReport[];
  operativeRecruitmentReports: OperativeRecruitmentReport[];
  operativeUsageReports: OperativeUsageReport[];
  operativeStressReports: OperativeStressReport[];
  operativeDangerReports: OperativeDangerReport[];
  operativeEventReports: OperativeEventReport[];
  hirePoolSelectionReports: HirePoolSelectionReport[];
  ledgerSummary: LedgerSummaryReport;
  ledgerUsageReports: LedgerUsageReport[];
  ledgerOutcomeReports: LedgerOutcomeReport[];
  secretDiscoveryReport: SecretDiscoveryReport;
  ledgerEventReports: LedgerEventReport[];
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

export type OperativeRunStats = {
  operativeId: OperativeId;
  started: boolean;
  recruited: boolean;
  hirePoolPresent: boolean;
  assignments: number;
  complications: number;
  finalStress?: number;
  highestStress?: number;
  finalStressTier?: StressTier;
  heatContribution: number;
  ruinContribution: number;
  eventEligibleCount: number;
  eventSelectedCount: number;
};

export type OperativeEventRunStats = {
  eventId: EventId;
  operativeId: OperativeId;
  eligibleCount: number;
  selectedCount: number;
};

export type RosterCompositionReport = {
  rosterKey: string;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWeeksPlayed: number;
};

export type OperativePresenceReport = {
  operativeId: OperativeId;
  operativeName: string;
  presentRuns: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type OperativeRecruitmentReport = {
  operativeId: OperativeId;
  operativeName: string;
  availableRuns: number;
  recruitedRuns: number;
  recruitmentRate: number;
  wins: number;
  losses: number;
};

export type OperativeUsageReport = {
  operativeId: OperativeId;
  operativeName: string;
  assignments: number;
  complications: number;
  complicationRate: number;
  averageAssignments: number;
};

export type OperativeStressReport = {
  operativeId: OperativeId;
  operativeName: string;
  averageFinalStress: number;
  averageHighestStress: number;
  strainedRuns: number;
  unstableRuns: number;
  breakingRuns: number;
};

export type OperativeDangerReport = {
  operativeId: OperativeId;
  operativeName: string;
  averageHeatContribution: number;
  averageRuinContribution: number;
};

export type OperativeEventReport = {
  operativeId: OperativeId;
  operativeName: string;
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type HirePoolSelectionReport = {
  operativeId: OperativeId;
  operativeName: string;
  poolAppearances: number;
  recruits: number;
  selectionRate: number;
};

export type LedgerRunStats = {
  entriesCreated: number;
  secretsCreated: number;
  debtsCreated: number;
  favorsCreated: number;
  entriesConsumed: number;
  unresolvedDebts: number;
  targetedGatherIntelOrders: number;
  secretDiscoveries: number;
  secretDefinitionsCreated: Partial<Record<LedgerEntryDefinitionId, number>>;
  usage: Record<string, LedgerUsageRunStats>;
  ledgerEventEligibility: Partial<Record<EventId, number>>;
  ledgerEventSelections: Partial<Record<EventId, number>>;
};

export type LedgerUsageRunStats = {
  kind: LedgerEntryKind;
  definitionId: LedgerEntryDefinitionId;
  name: string;
  created: number;
  consumed: number;
  activeAtEnd: number;
};

export type LedgerSummaryReport = {
  averageEntriesCreated: number;
  averageSecretsCreated: number;
  averageDebtsCreated: number;
  averageFavorsCreated: number;
  averageEntriesConsumed: number;
  averageUnresolvedDebts: number;
};

export type LedgerUsageReport = LedgerUsageRunStats & {
  wins: number;
  losses: number;
};

export type LedgerOutcomeReport = {
  debtCount: number;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageFinalPressures: Pick<Pressures, 'dominion' | 'heat' | 'loyalty' | 'ruin'>;
};

export type SecretDiscoveryReport = {
  targetedGatherIntelOrders: number;
  discoveries: number;
  discoveryRate: number;
  mostCommonSecret: string;
};

export type LedgerEventReport = {
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
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
  const startingRosterIds = state.operatives.map((operative) => operative.id);
  const initialHirePoolIds = [...state.hirePool];
  const operativeStats = createInitialOperativeStats(startingRosterIds, initialHirePoolIds);
  const operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>> = {};
  updateOperativeStressSnapshots(operativeStats, state);
  const actionUsage = createEmptyActionUsage();
  const targetUsage: Record<string, TargetRunStats> = {};
  const eventChoiceUsage: Record<string, number> = {};
  const contextualEvents = createEmptyContextualEventCounts();
  const ledgerStats = createEmptyLedgerRunStats();
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
        ledgerStats,
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
      recordOperativeOrderStats(operativeStats, advanced.orderResolutions, advanced.state);
      recordOperativeEventEligibility(
        operativeStats,
        operativeEventStats,
        advanced.eventCandidates,
      );
      recordOperativeEventSelection(
        operativeStats,
        operativeEventStats,
        advanced.eventSelection,
      );
      recordLedgerEventStats(
        ledgerStats,
        advanced.eventCandidates,
        advanced.eventSelection,
      );
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
      recordOperativeEventChoiceContribution(operativeStats, state, choice.choice);
      state = resolved.state;
      appendTrace(trace, options.collectTrace, state, `Chose event option: ${choice.choice.label}.`);
    }
  }

  finalizeOperativeStats(operativeStats, state);
  finalizeLedgerRunStats(ledgerStats, state);

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
    startingRosterIds,
    initialHirePoolIds,
    operativeStats,
    operativeEventStats,
    ledgerStats,
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

  lines.push(
    '',
    'ledger_summary',
    'agent,avgEntriesCreated,avgSecretsCreated,avgDebtsCreated,avgFavorsCreated,avgEntriesConsumed,avgUnresolvedDebts',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.ledgerSummary.averageEntriesCreated.toFixed(2),
        summary.ledgerSummary.averageSecretsCreated.toFixed(2),
        summary.ledgerSummary.averageDebtsCreated.toFixed(2),
        summary.ledgerSummary.averageFavorsCreated.toFixed(2),
        summary.ledgerSummary.averageEntriesConsumed.toFixed(2),
        summary.ledgerSummary.averageUnresolvedDebts.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'ledger_usage',
    'agent,kind,definitionId,name,created,consumed,activeAtEnd,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const ledger of summary.ledgerUsageReports) {
      lines.push(
        [
          summary.agentId,
          ledger.kind,
          ledger.definitionId,
          csvCell(ledger.name),
          ledger.created,
          ledger.consumed,
          ledger.activeAtEnd,
          ledger.wins,
          ledger.losses,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'ledger_outcomes',
    'agent,debtCount,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgRuin',
  );

  for (const summary of report.summaries) {
    for (const outcome of summary.ledgerOutcomeReports) {
      lines.push(
        [
          summary.agentId,
          outcome.debtCount,
          outcome.winRate.toFixed(3),
          outcome.averageWeeksPlayed.toFixed(2),
          outcome.averageFinalPressures.dominion.toFixed(2),
          outcome.averageFinalPressures.heat.toFixed(2),
          outcome.averageFinalPressures.loyalty.toFixed(2),
          outcome.averageFinalPressures.ruin.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'secret_discovery',
    'agent,targetedGatherIntelOrders,discoveries,discoveryRate,mostCommonSecret',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.secretDiscoveryReport.targetedGatherIntelOrders,
        summary.secretDiscoveryReport.discoveries,
        summary.secretDiscoveryReport.discoveryRate.toFixed(3),
        csvCell(summary.secretDiscoveryReport.mostCommonSecret),
      ].join(','),
    );
  }

  lines.push(
    '',
    'ledger_events',
    'agent,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.ledgerEventReports) {
      lines.push(
        [
          summary.agentId,
          event.eventId,
          csvCell(event.eventTitle),
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'roster_compositions',
    'agent,rosterKey,runs,wins,losses,winRate,avgWeeks',
  );

  for (const summary of report.summaries) {
    for (const roster of summary.rosterCompositionReports) {
      lines.push(
        [
          summary.agentId,
          roster.rosterKey,
          roster.runs,
          roster.wins,
          roster.losses,
          roster.winRate.toFixed(3),
          roster.averageWeeksPlayed.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_presence',
    'agent,operativeId,operativeName,presentRuns,wins,losses,winRate',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativePresenceReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.presentRuns,
          operative.wins,
          operative.losses,
          operative.winRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_recruitment',
    'agent,operativeId,operativeName,availableRuns,recruitedRuns,recruitmentRate,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeRecruitmentReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.availableRuns,
          operative.recruitedRuns,
          operative.recruitmentRate.toFixed(3),
          operative.wins,
          operative.losses,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_usage',
    'agent,operativeId,operativeName,assignments,complications,complicationRate,avgAssignments',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeUsageReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.assignments,
          operative.complications,
          operative.complicationRate.toFixed(3),
          operative.averageAssignments.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_stress',
    'agent,operativeId,operativeName,avgFinalStress,avgHighestStress,strainedRuns,unstableRuns,breakingRuns',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeStressReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.averageFinalStress.toFixed(2),
          operative.averageHighestStress.toFixed(2),
          operative.strainedRuns,
          operative.unstableRuns,
          operative.breakingRuns,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_danger',
    'agent,operativeId,operativeName,avgHeatContribution,avgRuinContribution',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeDangerReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.averageHeatContribution.toFixed(2),
          operative.averageRuinContribution.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_events',
    'agent,operativeId,operativeName,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.operativeEventReports) {
      lines.push(
        [
          summary.agentId,
          event.operativeId,
          event.operativeName,
          event.eventId,
          event.eventTitle,
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'hire_pool_selection',
    'agent,operativeId,operativeName,poolAppearances,recruits,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.hirePoolSelectionReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.poolAppearances,
          operative.recruits,
          operative.selectionRate.toFixed(3),
        ].join(','),
      );
    }
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
  ledgerStats: LedgerRunStats,
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
    recordLedgerOrderStats(ledgerStats, decision);
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
  const rosterCompositionReports = new Map<string, RosterCompositionReport>();
  const operativePresenceReports = new Map<OperativeId, OperativePresenceReport>();
  const operativeRecruitmentReports = new Map<OperativeId, OperativeRecruitmentReport>();
  const operativeUsageReports = new Map<OperativeId, OperativeUsageReport>();
  const operativeStressTotals = new Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >();
  const operativeDangerReports = new Map<OperativeId, OperativeDangerReport>();
  const operativeEventReports = new Map<string, OperativeEventReport>();
  const hirePoolSelectionReports = new Map<OperativeId, HirePoolSelectionReport>();
  const ledgerSummaryTotals = createEmptyLedgerSummaryTotals();
  const ledgerUsageReports = new Map<LedgerEntryDefinitionId, LedgerUsageReport>();
  const ledgerOutcomeReports = new Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>();
  const secretDiscoveryTotals = createEmptySecretDiscoveryTotals();
  const ledgerEventReports = new Map<EventId, LedgerEventReport>();
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
    addRosterCompositionReport(rosterCompositionReports, run);
    addOperativePresenceReports(operativePresenceReports, run);
    addOperativeRecruitmentReports(operativeRecruitmentReports, run);
    addOperativeUsageReports(operativeUsageReports, run, runs.length);
    addOperativeStressReports(operativeStressTotals, run);
    addOperativeDangerReports(operativeDangerReports, run, runs.length);
    addOperativeEventReports(operativeEventReports, run);
    addHirePoolSelectionReports(hirePoolSelectionReports, run);
    addLedgerSummaryTotals(ledgerSummaryTotals, run.ledgerStats);
    addLedgerUsageReports(ledgerUsageReports, run);
    addLedgerOutcomeReports(ledgerOutcomeReports, run);
    addSecretDiscoveryTotals(secretDiscoveryTotals, run.ledgerStats);
    addLedgerEventReports(ledgerEventReports, run.ledgerStats);
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
    rosterCompositionReports: finalizeRosterCompositionReports(rosterCompositionReports),
    operativePresenceReports: sortByOperativeName([...operativePresenceReports.values()]),
    operativeRecruitmentReports: sortByOperativeName([...operativeRecruitmentReports.values()]),
    operativeUsageReports: sortByOperativeName([...operativeUsageReports.values()]),
    operativeStressReports: finalizeOperativeStressReports(operativeStressTotals),
    operativeDangerReports: sortByOperativeName([...operativeDangerReports.values()]),
    operativeEventReports: sortOperativeEventReports([...operativeEventReports.values()]),
    hirePoolSelectionReports: sortByOperativeName([...hirePoolSelectionReports.values()]),
    ledgerSummary: finalizeLedgerSummaryReport(ledgerSummaryTotals, runs.length),
    ledgerUsageReports: sortLedgerUsageReports([...ledgerUsageReports.values()]),
    ledgerOutcomeReports: finalizeLedgerOutcomeReports(ledgerOutcomeReports),
    secretDiscoveryReport: finalizeSecretDiscoveryReport(secretDiscoveryTotals),
    ledgerEventReports: sortLedgerEventReports([...ledgerEventReports.values()]),
  };
}

export function getRosterCompositionKey(operativeIds: readonly OperativeId[]): string {
  return [...operativeIds].sort().join('+');
}

function createInitialOperativeStats(
  startingRosterIds: readonly OperativeId[],
  initialHirePoolIds: readonly OperativeId[],
): Record<OperativeId, OperativeRunStats> {
  const startingIds = new Set(startingRosterIds);
  const hirePoolIds = new Set(initialHirePoolIds);

  return ROSTER_OPERATIVES.reduce(
    (stats, operative) => ({
      ...stats,
      [operative.id]: {
        operativeId: operative.id,
        started: startingIds.has(operative.id),
        recruited: false,
        hirePoolPresent: hirePoolIds.has(operative.id),
        assignments: 0,
        complications: 0,
        heatContribution: 0,
        ruinContribution: 0,
        eventEligibleCount: 0,
        eventSelectedCount: 0,
      },
    }),
    {} as Record<OperativeId, OperativeRunStats>,
  );
}

function recordOperativeOrderStats(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  resolutions: readonly OrderResolutionDiagnostic[],
  state: GameState,
): void {
  for (const resolution of resolutions) {
    if (
      resolution.order.actionId === 'recruit_operative' &&
      resolution.order.target?.type === 'recruit'
    ) {
      const recruitedId = resolution.order.target.id;

      if (state.operatives.some((operative) => operative.id === recruitedId)) {
        operativeStats[recruitedId as OperativeId].recruited = true;
      }
    }

    const operativeId = resolution.order.assignedOperativeId;

    if (!operativeId) {
      continue;
    }

    const stats = operativeStats[operativeId as OperativeId];
    stats.assignments += 1;
    stats.complications += resolution.complication ? 1 : 0;
    stats.heatContribution += resolution.resolvedDelta.heat ?? 0;
    stats.ruinContribution += resolution.resolvedDelta.ruin ?? 0;
  }

  updateOperativeStressSnapshots(operativeStats, state);
}

function recordOperativeEventEligibility(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  candidates: readonly WeightedEvent[],
): void {
  for (const candidate of candidates) {
    if (candidate.event.kind !== 'operative') {
      continue;
    }

    operativeStats[candidate.event.operativeId].eventEligibleCount += 1;
    getOperativeEventRunStats(
      operativeEventStats,
      candidate.event.id,
      candidate.event.operativeId,
    ).eligibleCount += 1;
  }
}

function recordOperativeEventSelection(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  selection: EventSelection,
): void {
  if (selection.definition.kind !== 'operative') {
    return;
  }

  operativeStats[selection.definition.operativeId].eventSelectedCount += 1;
  getOperativeEventRunStats(
    operativeEventStats,
    selection.definition.id,
    selection.definition.operativeId,
  ).selectedCount += 1;
}

function recordOperativeEventChoiceContribution(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
  choice: EventChoiceDefinition,
): void {
  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return;
  }

  const definition = getEventDefinition(pendingEvent.definitionId);

  if (definition?.kind !== 'operative') {
    return;
  }

  const delta = getEventChoicePressureDelta(choice);
  const stats = operativeStats[definition.operativeId];
  stats.heatContribution += delta.heat ?? 0;
  stats.ruinContribution += delta.ruin ?? 0;
}

function finalizeOperativeStats(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
): void {
  updateOperativeStressSnapshots(operativeStats, state);

  for (const operative of state.operatives) {
    const stats = operativeStats[operative.id];
    stats.finalStress = operative.stress;
    stats.finalStressTier = getStressTier(operative.stress);
  }
}

function updateOperativeStressSnapshots(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
): void {
  for (const operative of state.operatives) {
    const stats = operativeStats[operative.id];
    stats.highestStress = Math.max(stats.highestStress ?? operative.stress, operative.stress);
  }
}

function getOperativeEventRunStats(
  eventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  eventId: EventId,
  operativeId: OperativeId,
): OperativeEventRunStats {
  eventStats[eventId] ??= {
    eventId,
    operativeId,
    eligibleCount: 0,
    selectedCount: 0,
  };

  return eventStats[eventId];
}

function getEventChoicePressureDelta(choice: EventChoiceDefinition): Partial<Pressures> {
  const delta: Partial<Pressures> = { ...choice.effects };

  if (choice.cost && !('type' in choice.cost)) {
    for (const pressure of PRESSURE_IDS) {
      const amount = choice.cost[pressure];

      if (amount !== undefined) {
        delta[pressure] = (delta[pressure] ?? 0) - amount;
      }
    }
  }

  return delta;
}

function createEmptyLedgerRunStats(): LedgerRunStats {
  return {
    entriesCreated: 0,
    secretsCreated: 0,
    debtsCreated: 0,
    favorsCreated: 0,
    entriesConsumed: 0,
    unresolvedDebts: 0,
    targetedGatherIntelOrders: 0,
    secretDiscoveries: 0,
    secretDefinitionsCreated: {},
    usage: {},
    ledgerEventEligibility: {},
    ledgerEventSelections: {},
  };
}

function recordLedgerOrderStats(stats: LedgerRunStats, decision: LegalOrderOption): void {
  if (
    decision.actionId === 'gather_intel' &&
    decision.target &&
    decision.target.type !== 'ledger' &&
    decision.target.type !== 'recruit'
  ) {
    stats.targetedGatherIntelOrders += 1;
  }
}

function recordLedgerEventStats(
  stats: LedgerRunStats,
  candidates: readonly WeightedEvent[],
  selection: EventSelection,
): void {
  for (const candidate of candidates) {
    if (!candidate.event.tags.includes('LEDGER')) {
      continue;
    }

    stats.ledgerEventEligibility[candidate.event.id] =
      (stats.ledgerEventEligibility[candidate.event.id] ?? 0) + 1;
  }

  if (selection.definition.tags.includes('LEDGER')) {
    stats.ledgerEventSelections[selection.definition.id] =
      (stats.ledgerEventSelections[selection.definition.id] ?? 0) + 1;
  }
}

function finalizeLedgerRunStats(stats: LedgerRunStats, state: GameState): void {
  for (const entry of state.ledger.entries) {
    const definition = getLedgerEntryDefinition(entry.definitionId);

    if (!definition) {
      continue;
    }

    stats.entriesCreated += 1;
    stats.entriesConsumed += entry.consumed ? 1 : 0;
    stats.unresolvedDebts += entry.kind === 'debt' && !entry.consumed ? 1 : 0;

    if (entry.kind === 'secret') {
      stats.secretsCreated += 1;
      stats.secretDefinitionsCreated[entry.definitionId] =
        (stats.secretDefinitionsCreated[entry.definitionId] ?? 0) + 1;

      if (entry.source.type === 'action' && entry.source.actionId === 'gather_intel') {
        stats.secretDiscoveries += 1;
      }
    } else if (entry.kind === 'debt') {
      stats.debtsCreated += 1;
    } else {
      stats.favorsCreated += 1;
    }

    const usage = stats.usage[entry.definitionId] ?? {
      kind: entry.kind,
      definitionId: entry.definitionId,
      name: definition.name,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
    };
    usage.created += 1;
    usage.consumed += entry.consumed ? 1 : 0;
    usage.activeAtEnd += entry.consumed ? 0 : 1;
    stats.usage[entry.definitionId] = usage;
  }
}

function createEmptyLedgerSummaryTotals(): LedgerSummaryReport {
  return {
    averageEntriesCreated: 0,
    averageSecretsCreated: 0,
    averageDebtsCreated: 0,
    averageFavorsCreated: 0,
    averageEntriesConsumed: 0,
    averageUnresolvedDebts: 0,
  };
}

function addLedgerSummaryTotals(totals: LedgerSummaryReport, stats: LedgerRunStats): void {
  totals.averageEntriesCreated += stats.entriesCreated;
  totals.averageSecretsCreated += stats.secretsCreated;
  totals.averageDebtsCreated += stats.debtsCreated;
  totals.averageFavorsCreated += stats.favorsCreated;
  totals.averageEntriesConsumed += stats.entriesConsumed;
  totals.averageUnresolvedDebts += stats.unresolvedDebts;
}

function finalizeLedgerSummaryReport(
  totals: LedgerSummaryReport,
  runs: number,
): LedgerSummaryReport {
  if (runs === 0) {
    return totals;
  }

  return {
    averageEntriesCreated: totals.averageEntriesCreated / runs,
    averageSecretsCreated: totals.averageSecretsCreated / runs,
    averageDebtsCreated: totals.averageDebtsCreated / runs,
    averageFavorsCreated: totals.averageFavorsCreated / runs,
    averageEntriesConsumed: totals.averageEntriesConsumed / runs,
    averageUnresolvedDebts: totals.averageUnresolvedDebts / runs,
  };
}

function addLedgerUsageReports(
  reports: Map<LedgerEntryDefinitionId, LedgerUsageReport>,
  run: HarnessRunResult,
): void {
  for (const usage of Object.values(run.ledgerStats.usage)) {
    const report = reports.get(usage.definitionId) ?? {
      ...usage,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
      wins: 0,
      losses: 0,
    };
    report.created += usage.created;
    report.consumed += usage.consumed;
    report.activeAtEnd += usage.activeAtEnd;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(usage.definitionId, report);
  }
}

function addLedgerOutcomeReports(
  reports: Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>,
  run: HarnessRunResult,
): void {
  const debtCount = run.ledgerStats.unresolvedDebts;
  const report = reports.get(debtCount) ?? {
    debtCount,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageWeeksPlayed: 0,
    averageFinalPressures: {
      dominion: 0,
      heat: 0,
      loyalty: 0,
      ruin: 0,
    },
    pressureTotals: createEmptyPressureTotals(),
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.averageWeeksPlayed += run.weeksPlayed;

  for (const pressure of PRESSURE_IDS) {
    report.pressureTotals[pressure] += run.finalState.pressures[pressure];
  }

  reports.set(debtCount, report);
}

function finalizeLedgerOutcomeReports(
  reports: Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>,
): LedgerOutcomeReport[] {
  return [...reports.values()]
    .map((report) => ({
      debtCount: report.debtCount,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageWeeksPlayed: report.runs > 0 ? report.averageWeeksPlayed / report.runs : 0,
      averageFinalPressures: {
        dominion: report.runs > 0 ? report.pressureTotals.dominion / report.runs : 0,
        heat: report.runs > 0 ? report.pressureTotals.heat / report.runs : 0,
        loyalty: report.runs > 0 ? report.pressureTotals.loyalty / report.runs : 0,
        ruin: report.runs > 0 ? report.pressureTotals.ruin / report.runs : 0,
      },
    }))
    .sort((left, right) => left.debtCount - right.debtCount);
}

function createEmptySecretDiscoveryTotals(): SecretDiscoveryReport & {
  secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
} {
  return {
    targetedGatherIntelOrders: 0,
    discoveries: 0,
    discoveryRate: 0,
    mostCommonSecret: '',
    secretCounts: {},
  };
}

function addSecretDiscoveryTotals(
  totals: SecretDiscoveryReport & {
    secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
  },
  stats: LedgerRunStats,
): void {
  totals.targetedGatherIntelOrders += stats.targetedGatherIntelOrders;
  totals.discoveries += stats.secretDiscoveries;

  for (const [definitionId, count] of Object.entries(stats.secretDefinitionsCreated)) {
    const id = definitionId as LedgerEntryDefinitionId;
    totals.secretCounts[id] = (totals.secretCounts[id] ?? 0) + count;
  }
}

function finalizeSecretDiscoveryReport(
  totals: SecretDiscoveryReport & {
    secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
  },
): SecretDiscoveryReport {
  const mostCommonSecretId = Object.entries(totals.secretCounts).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0] as LedgerEntryDefinitionId | undefined;

  return {
    targetedGatherIntelOrders: totals.targetedGatherIntelOrders,
    discoveries: totals.discoveries,
    discoveryRate:
      totals.targetedGatherIntelOrders > 0
        ? totals.discoveries / totals.targetedGatherIntelOrders
        : 0,
    mostCommonSecret: mostCommonSecretId
      ? getLedgerEntryDefinition(mostCommonSecretId)?.name ?? mostCommonSecretId
      : '',
  };
}

function addLedgerEventReports(
  reports: Map<EventId, LedgerEventReport>,
  stats: LedgerRunStats,
): void {
  const eventIds = new Set<EventId>([
    ...Object.keys(stats.ledgerEventEligibility),
    ...Object.keys(stats.ledgerEventSelections),
  ] as EventId[]);

  for (const eventId of eventIds) {
    const report = reports.get(eventId) ?? {
      eventId,
      eventTitle: getEventTitle(eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.ledgerEventEligibility[eventId] ?? 0;
    report.selections += stats.ledgerEventSelections[eventId] ?? 0;
    reports.set(eventId, report);
  }
}

function sortLedgerUsageReports(reports: LedgerUsageReport[]): LedgerUsageReport[] {
  return reports.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name) ||
      left.definitionId.localeCompare(right.definitionId),
  );
}

function sortLedgerEventReports(reports: LedgerEventReport[]): LedgerEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle));
}

function addRosterCompositionReport(
  reports: Map<string, RosterCompositionReport>,
  run: HarnessRunResult,
): void {
  const rosterKey = getRosterCompositionKey(run.startingRosterIds);
  const report = reports.get(rosterKey) ?? {
    rosterKey,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageWeeksPlayed: 0,
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.averageWeeksPlayed += run.weeksPlayed;
  reports.set(rosterKey, report);
}

function addOperativePresenceReports(
  reports: Map<OperativeId, OperativePresenceReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.started && !stats.recruited) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      presentRuns: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
    report.presentRuns += 1;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(stats.operativeId, report);
  }
}

function addOperativeRecruitmentReports(
  reports: Map<OperativeId, OperativeRecruitmentReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.hirePoolPresent) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      availableRuns: 0,
      recruitedRuns: 0,
      recruitmentRate: 0,
      wins: 0,
      losses: 0,
    };
    report.availableRuns += 1;
    report.recruitedRuns += stats.recruited ? 1 : 0;

    if (stats.recruited) {
      report.wins += run.outcome === 'victory' ? 1 : 0;
      report.losses += run.outcome === 'loss' ? 1 : 0;
    }

    reports.set(stats.operativeId, report);
  }
}

function addOperativeUsageReports(
  reports: Map<OperativeId, OperativeUsageReport>,
  run: HarnessRunResult,
  totalRuns: number,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.assignments === 0 && stats.complications === 0) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      assignments: 0,
      complications: 0,
      complicationRate: 0,
      averageAssignments: 0,
    };
    report.assignments += stats.assignments;
    report.complications += stats.complications;
    report.averageAssignments += stats.assignments / Math.max(1, totalRuns);
    reports.set(stats.operativeId, report);
  }
}

function addOperativeStressReports(
  reports: Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.finalStress === undefined && stats.highestStress === undefined) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      averageFinalStress: 0,
      averageHighestStress: 0,
      strainedRuns: 0,
      unstableRuns: 0,
      breakingRuns: 0,
      finalStressSamples: 0,
      highestStressSamples: 0,
    };

    if (stats.finalStress !== undefined) {
      report.averageFinalStress += stats.finalStress;
      report.finalStressSamples += 1;
    }

    if (stats.highestStress !== undefined) {
      report.averageHighestStress += stats.highestStress;
      report.highestStressSamples += 1;
      const highestTier = getStressTier(stats.highestStress);
      report.strainedRuns += stressTierRank(highestTier) >= stressTierRank('strained') ? 1 : 0;
      report.unstableRuns += stressTierRank(highestTier) >= stressTierRank('unstable') ? 1 : 0;
      report.breakingRuns += stressTierRank(highestTier) >= stressTierRank('breaking') ? 1 : 0;
    }

    reports.set(stats.operativeId, report);
  }
}

function addOperativeDangerReports(
  reports: Map<OperativeId, OperativeDangerReport>,
  run: HarnessRunResult,
  totalRuns: number,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.heatContribution === 0 && stats.ruinContribution === 0) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      averageHeatContribution: 0,
      averageRuinContribution: 0,
    };
    report.averageHeatContribution += stats.heatContribution / Math.max(1, totalRuns);
    report.averageRuinContribution += stats.ruinContribution / Math.max(1, totalRuns);
    reports.set(stats.operativeId, report);
  }
}

function addOperativeEventReports(
  reports: Map<string, OperativeEventReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeEventStats)) {
    const key = `${stats.operativeId}:${stats.eventId}`;
    const report = reports.get(key) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      eventId: stats.eventId,
      eventTitle: getEventTitle(stats.eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.eligibleCount;
    report.selections += stats.selectedCount;
    reports.set(key, report);
  }
}

function addHirePoolSelectionReports(
  reports: Map<OperativeId, HirePoolSelectionReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.hirePoolPresent) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      poolAppearances: 0,
      recruits: 0,
      selectionRate: 0,
    };
    report.poolAppearances += 1;
    report.recruits += stats.recruited ? 1 : 0;
    reports.set(stats.operativeId, report);
  }
}

function finalizeRosterCompositionReports(
  reports: Map<string, RosterCompositionReport>,
): RosterCompositionReport[] {
  return [...reports.values()]
    .map((report) => ({
      ...report,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageWeeksPlayed: report.runs > 0 ? report.averageWeeksPlayed / report.runs : 0,
    }))
    .sort((left, right) => left.rosterKey.localeCompare(right.rosterKey));
}

function finalizeOperativeStressReports(
  reports: Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >,
): OperativeStressReport[] {
  return sortByOperativeName(
    [...reports.values()].map((report) => ({
      operativeId: report.operativeId,
      operativeName: report.operativeName,
      averageFinalStress:
        report.finalStressSamples > 0 ? report.averageFinalStress / report.finalStressSamples : 0,
      averageHighestStress:
        report.highestStressSamples > 0
          ? report.averageHighestStress / report.highestStressSamples
          : 0,
      strainedRuns: report.strainedRuns,
      unstableRuns: report.unstableRuns,
      breakingRuns: report.breakingRuns,
    })),
  );
}

function sortByOperativeName<T extends { operativeName: string }>(reports: T[]): T[] {
  return reports
    .map((report) => finalizeReportRates(report))
    .sort((left, right) => left.operativeName.localeCompare(right.operativeName)) as T[];
}

function sortOperativeEventReports(reports: OperativeEventReport[]): OperativeEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort(
      (left, right) =>
        left.operativeName.localeCompare(right.operativeName) ||
        left.eventTitle.localeCompare(right.eventTitle),
    );
}

function finalizeReportRates<T extends object>(report: T): T {
  if ('presentRuns' in report && 'wins' in report && 'winRate' in report) {
    const presenceReport = report as unknown as OperativePresenceReport;
    presenceReport.winRate =
      presenceReport.presentRuns > 0 ? presenceReport.wins / presenceReport.presentRuns : 0;
  }

  if ('availableRuns' in report && 'recruitedRuns' in report && 'recruitmentRate' in report) {
    const recruitmentReport = report as unknown as OperativeRecruitmentReport;
    recruitmentReport.recruitmentRate =
      recruitmentReport.availableRuns > 0
        ? recruitmentReport.recruitedRuns / recruitmentReport.availableRuns
        : 0;
  }

  if ('assignments' in report && 'complications' in report && 'complicationRate' in report) {
    const usageReport = report as unknown as OperativeUsageReport;
    usageReport.complicationRate =
      usageReport.assignments > 0 ? usageReport.complications / usageReport.assignments : 0;
  }

  if ('poolAppearances' in report && 'recruits' in report && 'selectionRate' in report) {
    const hireReport = report as unknown as HirePoolSelectionReport;
    hireReport.selectionRate =
      hireReport.poolAppearances > 0 ? hireReport.recruits / hireReport.poolAppearances : 0;
  }

  return report;
}

function getOperativeName(operativeId: OperativeId): string {
  return getOperativeDefinition(operativeId)?.name ?? operativeId;
}

function getEventTitle(eventId: EventId): string {
  return getEventDefinition(eventId)?.title ?? eventId;
}

function stressTierRank(tier: StressTier): number {
  switch (tier) {
    case 'stable':
      return 0;
    case 'strained':
      return 1;
    case 'unstable':
      return 2;
    case 'breaking':
      return 3;
  }
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
    targetId: getTargetReportId(target),
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
  if (target.type === 'ledger') {
    return `ledger:${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `contact:${target.contactId}:${target.optionId}`;
  }

  return `${target.type}:${target.id}`;
}

function getTargetReportId(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `${target.contactId}:${target.optionId}`;
  }

  return target.id;
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
    case 'ledger':
      return target.targetId;
    case 'contact':
      return target.targetId;
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

function createEmptyPressureTotals(): Pressures {
  return PRESSURE_IDS.reduce(
    (totals, pressure) => ({
      ...totals,
      [pressure]: 0,
    }),
    {} as Pressures,
  );
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

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
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
