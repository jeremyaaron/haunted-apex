import type { ActionId } from '../model';
import { buildCommandPairReports } from './command-pair-report';
import type { AnalyticsRunReportInput } from './report-input';

describe('command pair reports', () => {
  it('counts unordered same-week command pairs by campaign and all campaigns', () => {
    const reports = buildCommandPairReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        weeks: [
          ['expand_influence', 'lay_low'],
          ['expand_influence', 'lay_low'],
          ['manage_contact'],
        ],
      }),
      reportRun({
        runId: 'run_2',
        campaignId: 'campaign_ghostline_signal',
        campaignName: 'Ghostline Signal',
        weeks: [['lay_low', 'manage_contact']],
      }),
    ]);

    expect(
      reports.map((report) => ({
        campaignId: report.campaignId,
        actionA: report.actionA,
        actionB: report.actionB,
        pairLabel: report.pairLabel,
        count: report.count,
        percentageOfWeeks: report.percentageOfWeeks,
      })),
    ).toEqual([
      {
        campaignId: 'all',
        actionA: 'expand_influence',
        actionB: 'lay_low',
        pairLabel: 'Expand Influence + Lay Low',
        count: 2,
        percentageOfWeeks: 2 / 3,
      },
      {
        campaignId: 'all',
        actionA: 'lay_low',
        actionB: 'manage_contact',
        pairLabel: 'Lay Low + Manage Contact',
        count: 1,
        percentageOfWeeks: 1 / 3,
      },
      {
        campaignId: 'campaign_dirty_capital',
        actionA: 'expand_influence',
        actionB: 'lay_low',
        pairLabel: 'Expand Influence + Lay Low',
        count: 2,
        percentageOfWeeks: 1,
      },
      {
        campaignId: 'campaign_ghostline_signal',
        actionA: 'lay_low',
        actionB: 'manage_contact',
        pairLabel: 'Lay Low + Manage Contact',
        count: 1,
        percentageOfWeeks: 1,
      },
    ]);
  });

  it('counts all unordered combinations in future three-command weeks', () => {
    const reports = buildCommandPairReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        weeks: [['gather_intel', 'expand_influence', 'lay_low']],
      }),
    ]).filter((report) => report.campaignId === 'campaign_dirty_capital');

    expect(
      reports.map((report) => [report.actionA, report.actionB, report.count]),
    ).toEqual([
      ['expand_influence', 'gather_intel', 1],
      ['expand_influence', 'lay_low', 1],
      ['gather_intel', 'lay_low', 1],
    ]);
    expect(reports.every((report) => report.percentageOfWeeks === 1)).toBeTrue();
  });

  it('omits weeks with fewer than two commands', () => {
    const reports = buildCommandPairReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        weeks: [['gather_intel'], []],
      }),
    ]);

    expect(reports).toEqual([]);
  });
});

function reportRun({
  runId,
  campaignId,
  campaignName,
  weeks,
}: {
  runId: string;
  campaignId: AnalyticsRunReportInput['campaignId'];
  campaignName: string;
  weeks: readonly (readonly ActionId[])[];
}): AnalyticsRunReportInput {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    campaignName,
    telemetry: {
      runId,
      actorType: 'bot',
      botId: 'handler',
      campaignTensionId: campaignId,
      seed: runId,
      entries: weeks.flatMap((commands, weekIndex) =>
        commands.map((actionId) => ({
          kind: 'command_used',
          week: weekIndex + 1,
          actionId,
          actionLabel: actionId,
        })),
      ),
    },
  };
}
