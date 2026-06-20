import { CAMPAIGN_TENSION_DEFINITIONS } from '../content';
import type { CampaignTensionId, Pressures, RunMode } from '../model';
import {
  STANDARD_VALIDATION_SEEDS,
  STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN,
  STANDARD_VALIDATION_TOTAL_RUNS,
} from '../advisor';
import type { HarnessRunResult } from './simulation-harness';
import {
  formatHandlerValidationGateReport,
  isPassingHandlerValidationResult,
  runHandlerTrainingValidation,
  summarizeHandlerValidationRuns,
  validateStandardValidationSeedSet,
} from './handler-validation-runner';

describe('handler validation runner', () => {
  it('defines exactly 100 deterministic Standard validation seeds per Campaign Tension', () => {
    const validation = validateStandardValidationSeedSet();
    const allSeeds = CAMPAIGN_TENSION_DEFINITIONS.flatMap(
      (campaign) => STANDARD_VALIDATION_SEEDS[campaign.id],
    );

    expect(validation.valid).toBeTrue();
    expect(validation.totalRuns).toBe(STANDARD_VALIDATION_TOTAL_RUNS);
    expect(validation.uniqueSeeds).toBe(STANDARD_VALIDATION_TOTAL_RUNS);
    expect(validation.campaignReports.length).toBe(CAMPAIGN_TENSION_DEFINITIONS.length);

    for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
      expect(STANDARD_VALIDATION_SEEDS[campaign.id].length).toBe(
        STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN,
      );
    }

    expect(new Set(allSeeds).size).toBe(allSeeds.length);
  });

  it('rejects incomplete, duplicate, or undersized Standard validation seed sets', () => {
    const campaignId = CAMPAIGN_TENSION_DEFINITIONS[0]?.id as CampaignTensionId;
    const validation = validateStandardValidationSeedSet({
      [campaignId]: ['DUPLICATE-SEED', 'DUPLICATE-SEED'],
    });

    expect(validation.valid).toBeFalse();
    expect(validation.totalRuns).toBe(2);
    expect(validation.uniqueSeeds).toBe(1);
    expect(validation.campaignReports.find((report) => report.campaignTensionId === campaignId)?.valid).toBeFalse();
  });

  it('summarizes Handler validation failures for losses, invalid recommendations, stalls, and softlocks', () => {
    const report = summarizeHandlerValidationRuns('standard', 5, [
      createRun({ seed: 'WIN', outcome: 'victory', reason: 'dominion_victory' }),
      createRun({ seed: 'LOSS', outcome: 'loss', reason: 'heat_lockdown' }),
      createRun({
        seed: 'INVALID',
        outcome: 'incomplete',
        reason: 'invalid_recommendation',
        invalidRecommendations: 1,
      }),
      createRun({ seed: 'STALL', outcome: 'incomplete', reason: 'agent_stalled' }),
      createRun({ seed: 'SOFTLOCK', outcome: 'incomplete', reason: 'softlock' }),
    ]);

    expect(report.passed).toBeFalse();
    expect(report.totalRuns).toBe(5);
    expect(report.wins).toBe(1);
    expect(report.losses).toBe(3);
    expect(report.invalidStates).toBe(1);
    expect(report.invalidRecommendations).toBe(1);
    expect(report.stalls).toBe(1);
    expect(report.softlocks).toBe(1);
    expect(report.failures.map((failure) => failure.seed)).toEqual([
      'LOSS',
      'INVALID',
      'STALL',
      'SOFTLOCK',
    ]);
  });

  it('only treats clean Handler wins as passing validation results', () => {
    const clean = summarizeHandlerValidationRuns('training', 1, [
      createRun({ seed: 'TRAINING-WIN', outcome: 'victory', reason: 'dominion_victory' }),
    ]).results[0];
    const invalid = summarizeHandlerValidationRuns('training', 1, [
      createRun({
        seed: 'TRAINING-INVALID',
        outcome: 'incomplete',
        reason: 'invalid_recommendation',
        invalidRecommendations: 1,
      }),
    ]).results[0];

    expect(isPassingHandlerValidationResult(clean)).toBeTrue();
    expect(isPassingHandlerValidationResult(invalid)).toBeFalse();
  });

  it('formats validation gate failures for investigation', () => {
    const training = summarizeHandlerValidationRuns('training', 1, [
      createRun({ seed: 'TRAINING-WIN', outcome: 'victory', reason: 'dominion_victory' }),
    ]);
    const standard = summarizeHandlerValidationRuns('standard', 1, [
      createRun({ seed: 'STANDARD-LOSS', outcome: 'loss', reason: 'bankrupt' }),
    ]);
    const output = formatHandlerValidationGateReport({
      passed: false,
      training,
      standard,
      failures: [...training.failures, ...standard.failures],
    });

    expect(output).toContain('handler_validation_gate');
    expect(output).toContain('handler_validation_failures');
    expect(output).toContain('STANDARD-LOSS');
    expect(output).toContain('bankrupt');
  });

  it('wins the fixed Training validation run with HandlerBot', () => {
    const report = runHandlerTrainingValidation({ collectFailureTrace: true });

    expect(report.expectedRuns).toBe(1);
    expect(report.totalRuns).toBe(1);
    expect(report.passed).withContext(JSON.stringify(report.failures)).toBeTrue();
    expect(report.wins).toBe(1);
    expect(report.invalidRecommendations).toBe(0);
    expect(report.failures).toEqual([]);
  });
});

type FakeRunConfig = {
  seed: string;
  outcome: HarnessRunResult['outcome'];
  reason?: HarnessRunResult['reason'];
  invalidRecommendations?: number;
  campaignTensionId?: CampaignTensionId;
  runMode?: RunMode;
};

function createRun(config: FakeRunConfig): HarnessRunResult {
  const campaignTensionId =
    config.campaignTensionId ?? (CAMPAIGN_TENSION_DEFINITIONS[0]?.id as CampaignTensionId);
  const finalState = {
    seed: config.seed,
    week: config.outcome === 'victory' ? 6 : 8,
    phase: 'GAME_OVER',
    campaign: {
      tensionId: campaignTensionId,
    },
    run: {
      mode: config.runMode ?? 'standard',
    },
    pressures: createPressures(config.outcome === 'victory' ? 90 : 40),
    ...(config.outcome !== 'incomplete' && config.reason
      ? {
          gameOver: {
            result: config.outcome,
            reason: config.reason,
          },
        }
      : {}),
  };

  return {
    agentId: 'handler',
    agentLabel: 'HandlerBot',
    seed: config.seed,
    finalState,
    outcome: config.outcome,
    reason: config.reason,
    weeksPlayed: finalState.week,
    actionUsage: {},
    targetUsage: {},
    eventChoiceUsage: {},
    contextualEvents: {
      influencedSelections: 0,
      targetTagInfluenced: 0,
      rivalPressureInfluenced: 0,
      localHeatInfluenced: 0,
    },
    startingRosterIds: [],
    initialHirePoolIds: [],
    operativeStats: {},
    operativeEventStats: {},
    ledgerStats: {} as never,
    contactStats: {} as never,
    frontStats: {} as never,
    factionStats: {} as never,
    handlerStats: {
      invalidRecommendationCount: config.invalidRecommendations ?? 0,
      decisionCount: 1,
      softlockCount: config.reason === 'softlock' ? 1 : 0,
      confidenceCounts: {
        high: 1,
        medium: 0,
        low: 0,
      },
    },
    trace: [{ week: 1, phase: 'COMMAND', message: `trace-${config.seed}` }],
  } as unknown as HarnessRunResult;
}

function createPressures(dominion: number): Pressures {
  return {
    dominion,
    heat: 20,
    loyalty: 60,
    resources: 3000,
    intel: 20,
    ruin: 0,
  };
}
