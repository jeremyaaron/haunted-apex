import { CAMPAIGN_TENSION_DEFINITIONS } from '../content';
import type {
  CampaignTensionId,
  GameOverReason,
  GameState,
  Pressures,
  RunMode,
} from '../model';
import {
  chooseHandlerEventChoice,
  chooseHandlerOrder,
  type HandlerAgentEventDecision,
  type HandlerAgentOrderDecision,
} from './agents';
import {
  selectLegalEventChoiceOptions,
  selectLegalOrderOptions,
  STANDARD_VALIDATION_SEEDS,
  STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN,
  STANDARD_VALIDATION_TOTAL_RUNS,
} from '../advisor';
import type { HandlerValidationResult, HandlerValidationStatus } from '../advisor';
import {
  advanceWeek,
  newGame,
  queueOrder,
  resolveEventChoice,
  TRAINING_RUN_CONFIG,
} from '../simulation';
import { getCommandPointsRemaining } from '../selectors';
import type { HarnessFailureReason, HarnessTraceEntry } from './simulation-harness';

export type HandlerValidationKind = 'training' | 'standard';

export type HandlerValidationFailure = {
  kind: HandlerValidationKind;
  seed: string;
  campaignTensionId: CampaignTensionId;
  runMode: RunMode;
  status: HandlerValidationStatus;
  outcome: HandlerValidationRunResult['outcome'];
  lossCause: HandlerValidationLossCause;
  invalidRecommendationCount: number;
  finalPressures: Pressures;
  resultWeek?: number;
  trace: readonly string[];
};

export type HandlerValidationLossCause =
  | GameOverReason
  | 'agent_stalled'
  | 'invalid_recommendation'
  | 'softlock'
  | 'handler_loss'
  | 'none';

export type HandlerValidationReport = {
  kind: HandlerValidationKind;
  passed: boolean;
  expectedRuns: number;
  totalRuns: number;
  wins: number;
  losses: number;
  invalidStates: number;
  invalidRecommendations: number;
  softlocks: number;
  stalls: number;
  failures: HandlerValidationFailure[];
  results: HandlerValidationResult[];
};

export type HandlerValidationGateReport = {
  passed: boolean;
  training: HandlerValidationReport;
  standard: HandlerValidationReport;
  failures: HandlerValidationFailure[];
};

export type HandlerStandardValidationOptions = {
  seedSet?: Partial<Record<CampaignTensionId, readonly string[]>>;
  collectFailureTrace?: boolean;
};

export type HandlerTrainingValidationOptions = {
  collectFailureTrace?: boolean;
};

type HandlerValidationRunOptions = {
  seed: string;
  campaignTensionId?: CampaignTensionId;
  runMode?: RunMode;
  collectTrace?: boolean;
};

type HandlerValidationRunStats = {
  invalidRecommendationCount: number;
  decisionCount: number;
  softlockCount: number;
  confidenceCounts: {
    high: number;
    medium: number;
    low: number;
  };
};

type HandlerValidationRunResult = {
  seed: string;
  finalState: GameState;
  outcome: 'victory' | 'loss' | 'incomplete';
  reason?: HarnessFailureReason;
  weeksPlayed: number;
  handlerStats?: HandlerValidationRunStats;
  trace: HarnessTraceEntry[];
};

export function runHandlerValidationGate(
  options: HandlerStandardValidationOptions & HandlerTrainingValidationOptions = {},
): HandlerValidationGateReport {
  const training = runHandlerTrainingValidation(options);
  const standard = runHandlerStandardValidation(options);

  return {
    passed: training.passed && standard.passed,
    training,
    standard,
    failures: [...training.failures, ...standard.failures],
  };
}

export function runHandlerTrainingValidation(
  options: HandlerTrainingValidationOptions = {},
): HandlerValidationReport {
  const run = simulateHandlerValidationRun({
    seed: TRAINING_RUN_CONFIG.seed,
    campaignTensionId: TRAINING_RUN_CONFIG.campaignTensionId,
    runMode: TRAINING_RUN_CONFIG.runMode,
    collectTrace: options.collectFailureTrace,
  });

  return summarizeHandlerValidationRuns('training', 1, [run]);
}

export function runHandlerStandardValidation(
  options: HandlerStandardValidationOptions = {},
): HandlerValidationReport {
  const seedSet = options.seedSet ?? STANDARD_VALIDATION_SEEDS;
  const runs: HandlerValidationRunResult[] = [];

  for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
    for (const seed of seedSet[campaign.id] ?? []) {
      runs.push(
        simulateHandlerValidationRun({
          seed,
          campaignTensionId: campaign.id,
          runMode: 'standard',
          collectTrace: options.collectFailureTrace,
        }),
      );
    }
  }

  return summarizeHandlerValidationRuns(
    'standard',
    expectedStandardRunCount(seedSet),
    runs,
  );
}

export function summarizeHandlerValidationRuns(
  kind: HandlerValidationKind,
  expectedRuns: number,
  runs: readonly HandlerValidationRunResult[],
): HandlerValidationReport {
  const results = runs.map(createHandlerValidationResultFromRun);
  const failures = runs.flatMap((run, index) =>
    isPassingHandlerValidationResult(results[index] as HandlerValidationResult)
      ? []
      : [createHandlerValidationFailure(kind, run, results[index] as HandlerValidationResult)],
  );
  const invalidRecommendations = runs.reduce(
    (total, run) => total + (run.handlerStats?.invalidRecommendationCount ?? 0),
    0,
  );
  const wins = results.filter((result) => result.status === 'handler_win').length;
  const losses = results.filter((result) => result.status === 'handler_loss').length;
  const invalidStates = results.filter((result) => result.status === 'invalid_state').length;
  const softlocks = results.filter((result) => result.lossCause === 'softlock').length;
  const stalls = results.filter((result) => result.lossCause === 'agent_stalled').length;

  return {
    kind,
    passed:
      runs.length === expectedRuns &&
      failures.length === 0 &&
      invalidRecommendations === 0,
    expectedRuns,
    totalRuns: runs.length,
    wins,
    losses,
    invalidStates,
    invalidRecommendations,
    softlocks,
    stalls,
    failures,
    results,
  };
}

export function isPassingHandlerValidationResult(
  result: HandlerValidationResult,
): boolean {
  return (
    result.status === 'handler_win' &&
    result.invalidRecommendationCount === 0 &&
    !result.lossCause
  );
}

export function validateStandardValidationSeedSet(
  seedSet: Partial<Record<CampaignTensionId, readonly string[]>> = STANDARD_VALIDATION_SEEDS,
): HandlerSeedSetValidation {
  const campaignReports = CAMPAIGN_TENSION_DEFINITIONS.map((campaign) => {
    const seeds = seedSet[campaign.id] ?? [];
    const uniqueSeeds = new Set(seeds);

    return {
      campaignTensionId: campaign.id,
      seedCount: seeds.length,
      uniqueSeedCount: uniqueSeeds.size,
      valid:
        seeds.length === STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN &&
        uniqueSeeds.size === seeds.length,
    };
  });
  const allSeeds = campaignReports.flatMap(
    (report) => seedSet[report.campaignTensionId] ?? [],
  );
  const uniqueSeeds = new Set(allSeeds);

  return {
    valid:
      campaignReports.every((report) => report.valid) &&
      allSeeds.length === STANDARD_VALIDATION_TOTAL_RUNS &&
      uniqueSeeds.size === allSeeds.length,
    expectedTotalRuns: STANDARD_VALIDATION_TOTAL_RUNS,
    totalRuns: allSeeds.length,
    uniqueSeeds: uniqueSeeds.size,
    campaignReports,
  };
}

export function formatHandlerValidationGateReport(
  report: HandlerValidationGateReport,
): string {
  const lines = [
    'handler_validation_gate',
    'passed,trainingPassed,standardPassed,totalRuns,standardRuns,trainingRuns,failures',
    [
      report.passed,
      report.training.passed,
      report.standard.passed,
      report.training.totalRuns + report.standard.totalRuns,
      report.standard.totalRuns,
      report.training.totalRuns,
      report.failures.length,
    ].join(','),
    '',
    'handler_validation_summary',
    'kind,passed,expectedRuns,totalRuns,wins,losses,invalidStates,invalidRecommendations,softlocks,stalls,failures',
  ];

  for (const summary of [report.training, report.standard]) {
    lines.push(
      [
        summary.kind,
        summary.passed,
        summary.expectedRuns,
        summary.totalRuns,
        summary.wins,
        summary.losses,
        summary.invalidStates,
        summary.invalidRecommendations,
        summary.softlocks,
        summary.stalls,
        summary.failures.length,
      ].join(','),
    );
  }

  lines.push(
    '',
    'handler_validation_failures',
    'kind,seed,campaignId,runMode,status,outcome,lossCause,invalidRecommendations,resultWeek,dominion,heat,loyalty,resources,intel,ruin,trace',
  );

  for (const failure of report.failures) {
    lines.push(
      [
        failure.kind,
        failure.seed,
        failure.campaignTensionId,
        failure.runMode,
        failure.status,
        failure.outcome,
        failure.lossCause,
        failure.invalidRecommendationCount,
        failure.resultWeek ?? '',
        failure.finalPressures.dominion,
        failure.finalPressures.heat,
        failure.finalPressures.loyalty,
        failure.finalPressures.resources,
        failure.finalPressures.intel,
        failure.finalPressures.ruin,
        csvCell(failure.trace.join(' | ')),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export type HandlerSeedSetValidation = {
  valid: boolean;
  expectedTotalRuns: number;
  totalRuns: number;
  uniqueSeeds: number;
  campaignReports: HandlerSeedSetCampaignValidation[];
};

export type HandlerSeedSetCampaignValidation = {
  campaignTensionId: CampaignTensionId;
  seedCount: number;
  uniqueSeedCount: number;
  valid: boolean;
};

function createHandlerValidationResultFromRun(
  run: HandlerValidationRunResult,
): HandlerValidationResult {
  const invalidRecommendationCount = run.handlerStats?.invalidRecommendationCount ?? 0;
  const lossCause = selectValidationLossCause(run, invalidRecommendationCount);

  return {
    status: selectValidationStatus(run, invalidRecommendationCount),
    seed: run.seed,
    campaignTensionId: run.finalState.campaign.tensionId,
    runMode: run.finalState.run.mode,
    ...(run.finalState.gameOver ? { resultWeek: run.weeksPlayed } : {}),
    finalPressures: run.finalState.pressures,
    ...(lossCause !== 'none' ? { lossCause } : {}),
    invalidRecommendationCount,
    decisionTrace: [],
  };
}

function createHandlerValidationFailure(
  kind: HandlerValidationKind,
  run: HandlerValidationRunResult,
  result: HandlerValidationResult,
): HandlerValidationFailure {
  const lossCause = result.lossCause ?? 'handler_loss';

  return {
    kind,
    seed: run.seed,
    campaignTensionId: run.finalState.campaign.tensionId,
    runMode: run.finalState.run.mode,
    status: result.status,
    outcome: run.outcome,
    lossCause,
    invalidRecommendationCount: result.invalidRecommendationCount,
    finalPressures: run.finalState.pressures,
    ...(run.finalState.gameOver ? { resultWeek: run.weeksPlayed } : {}),
    trace: run.trace.map((entry) => entry.message),
  };
}

function selectValidationStatus(
  run: HandlerValidationRunResult,
  invalidRecommendationCount: number,
): HandlerValidationStatus {
  if (invalidRecommendationCount > 0 || run.reason === 'invalid_recommendation') {
    return 'invalid_state';
  }

  return run.outcome === 'victory' ? 'handler_win' : 'handler_loss';
}

function selectValidationLossCause(
  run: HandlerValidationRunResult,
  invalidRecommendationCount: number,
): HandlerValidationResult['lossCause'] | 'none' {
  if (invalidRecommendationCount > 0 || run.reason === 'invalid_recommendation') {
    return 'invalid_recommendation';
  }

  if (run.outcome === 'victory') {
    return 'none';
  }

  if (run.reason) {
    return run.reason;
  }

  return 'softlock';
}

const MAX_HANDLER_VALIDATION_STEPS = 64;

function simulateHandlerValidationRun(
  options: HandlerValidationRunOptions,
): HandlerValidationRunResult {
  let state = newGame({
    seed: options.seed,
    campaignTensionId: options.campaignTensionId,
    runMode: options.runMode,
  });
  const handlerStats = createHandlerValidationRunStats();
  const trace: HarnessTraceEntry[] = [];
  let stalled = false;
  let failureReason: HarnessFailureReason | undefined;

  for (
    let step = 0;
    step < MAX_HANDLER_VALIDATION_STEPS && !state.gameOver && !stalled;
    step += 1
  ) {
    if (state.phase === 'COMMAND') {
      const queued = queueHandlerValidationOrders(
        state,
        handlerStats,
        trace,
        options.collectTrace,
      );
      state = queued.state;

      if (queued.failureReason) {
        stalled = true;
        failureReason = queued.failureReason;
        break;
      }

      if (state.queuedOrders.length === 0) {
        stalled = true;
        failureReason = 'agent_stalled';
        appendValidationTrace(
          trace,
          options.collectTrace,
          state,
          'Handler stalled with no queued orders.',
        );
        break;
      }

      const advanced = advanceWeek(state);

      if (!advanced.ok) {
        stalled = true;
        failureReason = 'agent_stalled';
        appendValidationTrace(
          trace,
          options.collectTrace,
          state,
          `Advance failed: ${advanced.error}.`,
        );
        break;
      }

      state = advanced.state;
      appendValidationTrace(trace, options.collectTrace, state, 'Advanced week.');
    }

    if (state.phase === 'EVENT_CHOICE') {
      const legalOptions = selectLegalEventChoiceOptions(state);
      const decision = chooseHandlerEventChoice(state, legalOptions);
      recordHandlerValidationRecommendation(handlerStats, decision);

      if (decision.invalidRecommendationCount > 0 || !decision.eventChoice) {
        stalled = true;
        failureReason = 'invalid_recommendation';
        appendValidationTrace(
          trace,
          options.collectTrace,
          state,
          createInvalidEventTraceMessage(decision),
        );
        break;
      }

      const resolved = resolveEventChoice(
        state,
        decision.eventChoice.eventId,
        decision.eventChoice.choice.id,
      );

      if (!resolved.ok) {
        stalled = true;
        failureReason = 'invalid_recommendation';
        appendValidationTrace(
          trace,
          options.collectTrace,
          state,
          `Event choice failed: ${resolved.error}.`,
        );
        break;
      }

      state = resolved.state;
      appendValidationTrace(
        trace,
        options.collectTrace,
        state,
        `Chose event option: ${decision.eventChoice.choice.label}.`,
      );
    }
  }

  if (!state.gameOver && !failureReason && !stalled) {
    failureReason = 'softlock';
    handlerStats.softlockCount += 1;
    appendValidationTrace(
      trace,
      options.collectTrace,
      state,
      'Handler validation reached max steps without terminal state.',
    );
  }

  return {
    seed: state.seed,
    finalState: state,
    outcome: state.gameOver?.result ?? 'incomplete',
    reason: state.gameOver?.reason ?? failureReason,
    weeksPlayed: state.week,
    handlerStats,
    trace,
  };
}

type QueueHandlerValidationOrdersResult = {
  state: GameState;
  failureReason?: HarnessFailureReason;
};

function queueHandlerValidationOrders(
  state: GameState,
  handlerStats: HandlerValidationRunStats,
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
): QueueHandlerValidationOrdersResult {
  let next = state;

  while (getCommandPointsRemaining(next) > 0) {
    const legalOptions = selectLegalOrderOptions(next);
    const decision = chooseHandlerOrder(next, legalOptions);
    recordHandlerValidationRecommendation(handlerStats, decision);

    if (decision.invalidRecommendationCount > 0 || !decision.order) {
      appendValidationTrace(
        trace,
        collectTrace,
        next,
        createInvalidOrderTraceMessage(decision),
      );
      return {
        state: next,
        failureReason: 'invalid_recommendation',
      };
    }

    const queued = queueOrder(next, {
      actionId: decision.order.actionId,
      assignedOperativeId: decision.order.assignedOperativeId,
      target: decision.order.target,
    });

    if (!queued.ok) {
      appendValidationTrace(trace, collectTrace, next, `Queue failed: ${queued.error}.`);
      return {
        state: next,
        failureReason: 'invalid_recommendation',
      };
    }

    next = queued.state;
    appendValidationTrace(
      trace,
      collectTrace,
      next,
      `Queued order: ${decision.order.preview.label}.`,
    );
  }

  return { state: next };
}

function createHandlerValidationRunStats(): HandlerValidationRunStats {
  return {
    invalidRecommendationCount: 0,
    decisionCount: 0,
    softlockCount: 0,
    confidenceCounts: {
      high: 0,
      medium: 0,
      low: 0,
    },
  };
}

function recordHandlerValidationRecommendation(
  handlerStats: HandlerValidationRunStats,
  decision: HandlerAgentOrderDecision | HandlerAgentEventDecision,
): void {
  handlerStats.decisionCount += 1;
  handlerStats.confidenceCounts[decision.recommendation.confidence] += 1;
  handlerStats.invalidRecommendationCount += decision.invalidRecommendationCount;
}

function createInvalidOrderTraceMessage(decision: HandlerAgentOrderDecision): string {
  const invalidReasons = decision.recommendation.invalidRecommendations
    .map((invalid) => invalid.reason)
    .join('; ');

  return `Handler command recommendation could not be applied${
    invalidReasons ? `: ${invalidReasons}` : '.'
  }`;
}

function createInvalidEventTraceMessage(decision: HandlerAgentEventDecision): string {
  const invalidReasons = decision.recommendation.invalidRecommendations
    .map((invalid) => invalid.reason)
    .join('; ');

  return `Handler event recommendation could not be applied${
    invalidReasons ? `: ${invalidReasons}` : '.'
  }`;
}

function appendValidationTrace(
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

function expectedStandardRunCount(
  seedSet: Partial<Record<CampaignTensionId, readonly string[]>>,
): number {
  return CAMPAIGN_TENSION_DEFINITIONS.reduce(
    (total, campaign) => total + (seedSet[campaign.id]?.length ?? 0),
    0,
  );
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
