import { buildStrategicFingerprintReports } from './strategic-fingerprint-report';
import type { CommandPairReport } from './command-pair-report';
import type { CommandUsageReport } from './command-usage-report';
import type { LoopWarningReport } from './dominant-loop-detection';
import type { SourceBreakdownReport } from './source-breakdown-report';
import type { SystemEngagementReport } from './system-engagement-report';

describe('strategic fingerprint reports', () => {
  it('selects top commands, pairs, sources, and warnings for each campaign group', () => {
    const reports = buildStrategicFingerprintReports({
      systemEngagementReports: [
        systemEngagement({
          campaignId: 'all',
          campaignName: 'All Campaigns',
          runs: 5,
          wins: 4,
        }),
        systemEngagement({
          campaignId: 'campaign_dirty_capital',
          campaignName: 'Dirty Capital',
          runs: 2,
          wins: 1,
        }),
      ],
      commandUsageReports: [
        commandUsage('all', 'expand_influence', 'Expand Influence', 6, 0.4),
        commandUsage('all', 'lay_low', 'Lay Low', 7, 0.47),
        commandUsage('campaign_dirty_capital', 'manage_contact', 'Manage Contact', 3, 0.75),
      ],
      commandPairReports: [
        commandPair('all', 'expand_influence', 'lay_low', 'Expand Influence + Lay Low', 3, 0.33),
        commandPair('all', 'lay_low', 'manage_contact', 'Lay Low + Manage Contact', 4, 0.28),
        commandPair(
          'campaign_dirty_capital',
          'expand_influence',
          'manage_contact',
          'Expand Influence + Manage Contact',
          2,
          0.5,
        ),
      ],
      sourceBreakdownReports: [
        sourceBreakdown('all', 'dominion', 'action', 'expand_influence', 'Expand Influence', 12, 12, 0),
        sourceBreakdown('all', 'dominion', 'contact', 'veyra', 'Veyra Lux', 16, 16, 0),
        sourceBreakdown('all', 'heat', 'action', 'lay_low', 'Lay Low', -11, 2, -13),
        sourceBreakdown('all', 'heat', 'drift', 'weekly_drift', 'Weekly Fallout', -8, 0, -8),
        sourceBreakdown(
          'campaign_dirty_capital',
          'dominion',
          'action',
          'manage_contact',
          'Manage Contact',
          5,
          5,
          0,
        ),
      ],
      loopWarnings: [
        loopWarning('all', 'dominant_pair', 0.42, 0.35),
        loopWarning('all', 'wins_without_fronts', 1, 0.75),
        loopWarning('campaign_dirty_capital', 'top_two_command_share', 0.8, 0.6),
      ],
    });

    expect(reports.map((report) => [report.campaignId, report.runs, report.wins])).toEqual([
      ['all', 5, 4],
      ['campaign_dirty_capital', 2, 1],
    ]);

    expect(reports[0]).toEqual(
      jasmine.objectContaining({
        winRate: 0.8,
        totalCommands: 13,
        averageCommandsUsed: 13 / 5,
        topCommand: jasmine.objectContaining({
          actionId: 'lay_low',
          count: 7,
        }),
        topPair: jasmine.objectContaining({
          pairLabel: 'Lay Low + Manage Contact',
          count: 4,
        }),
        topDominionSource: jasmine.objectContaining({
          sourceKind: 'contact',
          sourceId: 'veyra',
          positiveDelta: 16,
        }),
        topHeatReliefSource: jasmine.objectContaining({
          sourceKind: 'action',
          sourceId: 'lay_low',
          negativeDelta: -13,
        }),
        dominantLoopWarning: jasmine.objectContaining({
          warningType: 'wins_without_fronts',
        }),
      }),
    );

    expect(reports[1]).toEqual(
      jasmine.objectContaining({
        winRate: 0.5,
        totalCommands: 3,
        averageCommandsUsed: 1.5,
        topCommand: jasmine.objectContaining({
          actionId: 'manage_contact',
        }),
        topPair: jasmine.objectContaining({
          pairLabel: 'Expand Influence + Manage Contact',
        }),
        topDominionSource: jasmine.objectContaining({
          sourceId: 'manage_contact',
        }),
        topHeatReliefSource: undefined,
        dominantLoopWarning: jasmine.objectContaining({
          warningType: 'top_two_command_share',
        }),
      }),
    );
  });

  it('handles groups with no supporting command, pair, source, or warning reports', () => {
    const reports = buildStrategicFingerprintReports({
      systemEngagementReports: [
        systemEngagement({
          campaignId: 'all',
          campaignName: 'All Campaigns',
          runs: 0,
          wins: 0,
        }),
      ],
      commandUsageReports: [],
      commandPairReports: [],
      sourceBreakdownReports: [],
      loopWarnings: [],
    });

    expect(reports).toEqual([
      jasmine.objectContaining({
        runs: 0,
        wins: 0,
        winRate: 0,
        totalCommands: 0,
        averageCommandsUsed: 0,
        topCommand: undefined,
        topPair: undefined,
        topDominionSource: undefined,
        topHeatReliefSource: undefined,
        dominantLoopWarning: undefined,
      }),
    ]);
  });
});

function commandUsage(
  campaignId: CommandUsageReport['campaignId'],
  actionId: CommandUsageReport['actionId'],
  actionLabel: string,
  count: number,
  percentage: number,
): CommandUsageReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    campaignName: campaignId === 'all' ? 'All Campaigns' : 'Dirty Capital',
    actionId,
    actionLabel,
    count,
    percentage,
  };
}

function commandPair(
  campaignId: CommandPairReport['campaignId'],
  actionA: CommandPairReport['actionA'],
  actionB: CommandPairReport['actionB'],
  pairLabel: string,
  count: number,
  percentageOfWeeks: number,
): CommandPairReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    campaignName: campaignId === 'all' ? 'All Campaigns' : 'Dirty Capital',
    actionA,
    actionB,
    actionALabel: actionA,
    actionBLabel: actionB,
    pairLabel,
    count,
    percentageOfWeeks,
  };
}

function sourceBreakdown(
  campaignId: SourceBreakdownReport['campaignId'],
  pressure: SourceBreakdownReport['pressure'],
  sourceKind: SourceBreakdownReport['sourceKind'],
  sourceId: string,
  sourceLabel: string,
  totalDelta: number,
  positiveDelta: number,
  negativeDelta: number,
): SourceBreakdownReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    campaignName: campaignId === 'all' ? 'All Campaigns' : 'Dirty Capital',
    pressure,
    sourceKind,
    sourceId,
    sourceLabel,
    totalDelta,
    positiveDelta,
    negativeDelta,
  };
}

function systemEngagement(
  overrides: Partial<SystemEngagementReport>,
): SystemEngagementReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId: 'all',
    campaignName: 'All Campaigns',
    runs: 0,
    wins: 0,
    runsWithFrontInvestment: 0,
    runsWithFrontUpgrade: 0,
    runsWithAccordBrokered: 0,
    runsWithLedgerUse: 0,
    runsWithContactService: 0,
    runsWithBribe: 0,
    runsWithLayLow: 0,
    winsWithNoFronts: 0,
    winsWithNoAccords: 0,
    winsWithNoLedger: 0,
    winsWithNoContacts: 0,
    ...overrides,
  };
}

function loopWarning(
  campaignId: LoopWarningReport['campaignId'],
  warningType: LoopWarningReport['warningType'],
  value: number,
  threshold: number,
): LoopWarningReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    warningType,
    value,
    threshold,
    message: warningType,
  };
}
