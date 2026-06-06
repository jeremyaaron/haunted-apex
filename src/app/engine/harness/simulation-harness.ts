import { DISTRICT_ZERO_ACTIONS, getEventDefinition } from '../content';
import type {
  ActionId,
  EventChoiceDefinition,
  GameOverReason,
  GameState,
  PressureId,
  Pressures,
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
  eventChoiceUsage: Record<string, number>;
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
  eventChoiceUsage: Record<string, number>;
};

export type HarnessBatchReport = {
  runsPerAgent: number;
  totalRuns: number;
  summaries: AgentBatchSummary[];
};

const MAX_HARNESS_STEPS = 64;

export function simulateRun(options: HarnessRunOptions): HarnessRunResult {
  let state = newGame({ seed: options.seed });
  const actionUsage = createEmptyActionUsage();
  const eventChoiceUsage: Record<string, number> = {};
  const trace: HarnessTraceEntry[] = [];
  const context = createAgentDecisionContext(`${state.seed}:${options.agent.id}`);
  let stalled = false;

  for (let step = 0; step < MAX_HARNESS_STEPS && !state.gameOver && !stalled; step += 1) {
    if (state.phase === 'COMMAND') {
      state = queueAgentOrders(state, options.agent, context, actionUsage, trace, options.collectTrace);

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
    eventChoiceUsage,
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
  const eventChoiceUsage: Record<string, number> = {};
  const lossReasons: Partial<Record<GameOverReason | 'agent_stalled', number>> = {};
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

    for (const action of DISTRICT_ZERO_ACTIONS) {
      actionUsage[action.id] += run.actionUsage[action.id];
    }

    for (const [choiceId, count] of Object.entries(run.eventChoiceUsage)) {
      eventChoiceUsage[choiceId] = (eventChoiceUsage[choiceId] ?? 0) + count;
    }
  }

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
    eventChoiceUsage,
  };
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
