import {
  AGGRESSIVE_BOT,
  STRATEGY_AGENTS,
  formatBatchReport,
  getLegalOrderOptions,
  simulateBatch,
  simulateRun,
} from './index';
import { newGame } from '../simulation';

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
    expect(first.targetUsage).toEqual(second.targetUsage);
    expect(first.contextualEvents).toEqual(second.contextualEvents);
    expect(first.trace.length).toBeGreaterThan(0);
  });

  it('provides agents with engine-validated action-operative-target combinations', () => {
    const options = getLegalOrderOptions(newGame({ seed: 'HARNESS-LEGAL-OPTIONS' }));
    const targetedOptions = options.filter((option) => option.target);

    expect(targetedOptions.length).toBeGreaterThan(0);
    expect(
      options
        .filter((option) => option.preview.requiresTarget)
        .every((option) => option.target !== undefined),
    ).toBeTrue();
    expect(
      targetedOptions.every(
        (option) =>
          option.preview.selectedTarget?.type === option.target?.type &&
          option.preview.selectedTarget?.id === option.target?.id,
      ),
    ).toBeTrue();
  });

  it('runs 100 simulations per simple strategy and summarizes balance signals', () => {
    const report = simulateBatch({
      agents: STRATEGY_AGENTS,
      runsPerAgent: 100,
      seedPrefix: 'HARNESS-SPEC',
    });
    const output = formatBatchReport(report);

    expect(report.totalRuns).toBe(500);
    expect(report.summaries.length).toBe(5);
    expect(output).toContain('agent,runs,wins,losses,incomplete,winRate');
    expect(output).toContain('operator,100');
    expect(output).toContain('operator,Operator / Sane');
    expect(output).toContain('target_highlights');
    expect(output).toContain('target_details');
    expect(output).toContain('rival_pressure');
    expect(output).toContain('district_state');
    expect(output).toContain('loss_causes');
    expect(output).toContain('contextual_events');

    for (const summary of report.summaries) {
      const actionCount = Object.values(summary.actionUsage).reduce((total, count) => total + count, 0);
      const targetCount = summary.targetReports.reduce(
        (total, target) => total + target.selections,
        0,
      );

      expect(summary.runs).toBe(100);
      expect(summary.wins + summary.losses + summary.incomplete).toBe(100);
      expect(summary.incomplete).toBe(0);
      expect(summary.averageWeeksPlayed).toBeGreaterThan(0);
      expect(summary.averageFinalPressures.dominion).toBeGreaterThanOrEqual(0);
      expect(actionCount).toBeGreaterThan(0);
      expect(targetCount).toBeGreaterThan(0);
      expect(summary.mostSelectedTarget).toBeDefined();
      expect(summary.averageFinalRivalPressures.rival_nyx_ardent).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalRivalPressures.rival_knox_marrow).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalDistricts.district_violet_ward.control).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalDistricts.district_violet_ward.heat).toBeGreaterThanOrEqual(0);
      expect(summary.contextualEvents.influencedSelections).toBeGreaterThanOrEqual(0);
    }

    expect(
      report.summaries.reduce(
        (total, summary) => total + summary.contextualEvents.targetTagInfluenced,
        0,
      ),
    ).toBeGreaterThan(0);
    expect(
      report.summaries.reduce(
        (total, summary) => total + summary.contextualEvents.rivalPressureInfluenced,
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it('produces identical expanded summaries for the same batch seed prefix', () => {
    const options = {
      agents: STRATEGY_AGENTS,
      runsPerAgent: 10,
      seedPrefix: 'HARNESS-DETERMINISM',
    };

    expect(simulateBatch(options)).toEqual(simulateBatch(options));
  });
});
