import type { ActionId } from '../model';
import type { AnalyticsRunReportInput } from './report-input';
import { buildCommandUsageReports } from './command-usage-report';

describe('command usage reports', () => {
  it('counts commands by action for all campaigns and each Campaign Tension', () => {
    const reports = buildCommandUsageReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        commands: ['expand_influence', 'lay_low', 'expand_influence'],
      }),
      reportRun({
        runId: 'run_2',
        campaignId: 'campaign_ghostline_signal',
        campaignName: 'Ghostline Signal',
        commands: ['manage_contact'],
      }),
    ]);

    expect(
      reports.map((report) => ({
        campaignId: report.campaignId,
        actionId: report.actionId,
        count: report.count,
        percentage: report.percentage,
        label: report.actionLabel,
      })),
    ).toEqual([
      {
        campaignId: 'all',
        actionId: 'expand_influence',
        count: 2,
        percentage: 0.5,
        label: 'Expand Influence',
      },
      {
        campaignId: 'all',
        actionId: 'lay_low',
        count: 1,
        percentage: 0.25,
        label: 'Lay Low',
      },
      {
        campaignId: 'all',
        actionId: 'manage_contact',
        count: 1,
        percentage: 0.25,
        label: 'Manage Contact',
      },
      {
        campaignId: 'campaign_dirty_capital',
        actionId: 'expand_influence',
        count: 2,
        percentage: 2 / 3,
        label: 'Expand Influence',
      },
      {
        campaignId: 'campaign_dirty_capital',
        actionId: 'lay_low',
        count: 1,
        percentage: 1 / 3,
        label: 'Lay Low',
      },
      {
        campaignId: 'campaign_ghostline_signal',
        actionId: 'manage_contact',
        count: 1,
        percentage: 1,
        label: 'Manage Contact',
      },
    ]);
  });

  it('omits groups with no command usage', () => {
    const reports = buildCommandUsageReports([
      {
        agentId: 'handler',
        agentLabel: 'Handler',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        telemetry: {
          runId: 'empty',
          actorType: 'bot',
          botId: 'handler',
          campaignTensionId: 'campaign_dirty_capital',
          seed: 'EMPTY',
          entries: [],
        },
      },
    ]);

    expect(reports).toEqual([]);
  });
});

function reportRun({
  runId,
  campaignId,
  campaignName,
  commands,
}: {
  runId: string;
  campaignId: AnalyticsRunReportInput['campaignId'];
  campaignName: string;
  commands: readonly ActionId[];
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
      entries: commands.map((actionId, index) => ({
        kind: 'command_used',
        week: index + 1,
        actionId,
        actionLabel: actionId,
      })),
    },
  };
}
