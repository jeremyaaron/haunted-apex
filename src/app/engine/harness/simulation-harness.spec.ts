import {
  AGGRESSIVE_BOT,
  STRATEGY_AGENTS,
  formatBatchReport,
  simulateBatch,
  simulateRun,
} from './index';

describe('simulation harness', () => {
  it('simulates a deterministic agent run without the Angular UI', () => {
    const first = simulateRun({
      agent: AGGRESSIVE_BOT,
      seed: 'HARNESS-SINGLE-1',
      collectTrace: true,
    });
    const second = simulateRun({
      agent: AGGRESSIVE_BOT,
      seed: 'HARNESS-SINGLE-1',
      collectTrace: true,
    });

    expect(first.outcome).not.toBe('incomplete');
    expect(first.finalState.pressures).toEqual(second.finalState.pressures);
    expect(first.actionUsage).toEqual(second.actionUsage);
    expect(first.trace.length).toBeGreaterThan(0);
  });

  it('runs 100 simulations per simple strategy and summarizes balance signals', () => {
    const report = simulateBatch({
      agents: STRATEGY_AGENTS,
      runsPerAgent: 100,
      seedPrefix: 'HARNESS-SPEC',
    });
    const output = formatBatchReport(report);

    expect(report.totalRuns).toBe(400);
    expect(report.summaries.length).toBe(4);
    expect(output).toContain('agent,runs,wins,losses,incomplete,winRate');

    for (const summary of report.summaries) {
      const actionCount = Object.values(summary.actionUsage).reduce((total, count) => total + count, 0);

      expect(summary.runs).toBe(100);
      expect(summary.wins + summary.losses + summary.incomplete).toBe(100);
      expect(summary.incomplete).toBe(0);
      expect(summary.averageWeeksPlayed).toBeGreaterThan(0);
      expect(summary.averageFinalPressures.dominion).toBeGreaterThanOrEqual(0);
      expect(actionCount).toBeGreaterThan(0);
    }
  });
});
