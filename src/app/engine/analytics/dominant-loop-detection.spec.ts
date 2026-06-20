import { buildLoopWarningReports } from './dominant-loop-detection';
import type { CommandPairReport } from './command-pair-report';
import type { CommandUsageReport } from './command-usage-report';
import type { SystemEngagementReport } from './system-engagement-report';

describe('dominant loop detection', () => {
  it('flags dominant command pairs and top-two command share above threshold', () => {
    const warnings = buildLoopWarningReports({
      commandUsageReports: [
        commandUsage('expand_influence', 'Expand Influence', 7, 0.42),
        commandUsage('lay_low', 'Lay Low', 4, 0.25),
        commandUsage('manage_contact', 'Manage Contact', 5, 0.33),
      ],
      commandPairReports: [
        commandPair('expand_influence', 'lay_low', 'Expand Influence + Lay Low', 4, 0.4),
      ],
      systemEngagementReports: [systemEngagement({ wins: 0 })],
    });

    expect(warnings.map((warning) => warning.warningType)).toEqual([
      'dominant_pair',
      'top_two_command_share',
    ]);
    expect(warnings[0]).toEqual(
      jasmine.objectContaining({
        value: 0.4,
        threshold: 0.35,
        message: 'Expand Influence + Lay Low appears in 40.0% of resolved weeks.',
      }),
    );
    expect(warnings[1]).toEqual(
      jasmine.objectContaining({
        value: 0.75,
        threshold: 0.6,
        message: 'Top two commands account for 75.0% of command usage.',
      }),
    );
  });

  it('does not flag values equal to thresholds', () => {
    const warnings = buildLoopWarningReports({
      commandUsageReports: [
        commandUsage('expand_influence', 'Expand Influence', 6, 0.35),
        commandUsage('lay_low', 'Lay Low', 5, 0.25),
        commandUsage('manage_contact', 'Manage Contact', 4, 0.24),
      ],
      commandPairReports: [
        commandPair('expand_influence', 'lay_low', 'Expand Influence + Lay Low', 3, 0.35),
      ],
      systemEngagementReports: [
        systemEngagement({
          wins: 4,
          winsWithNoFronts: 3,
          winsWithNoAccords: 3,
          winsWithNoLedger: 3,
          winsWithNoContacts: 3,
        }),
      ],
    });

    expect(warnings).toEqual([]);
  });

  it('flags wins without strategic systems above threshold', () => {
    const warnings = buildLoopWarningReports({
      commandUsageReports: [],
      commandPairReports: [],
      systemEngagementReports: [
        systemEngagement({
          wins: 4,
          winsWithNoFronts: 4,
          winsWithNoAccords: 4,
          winsWithNoLedger: 4,
          winsWithNoContacts: 4,
        }),
      ],
    });

    expect(
      warnings.map((warning) => ({
        warningType: warning.warningType,
        value: warning.value,
        threshold: warning.threshold,
      })),
    ).toEqual([
      {
        warningType: 'wins_without_fronts',
        value: 1,
        threshold: 0.75,
      },
      {
        warningType: 'wins_without_accords',
        value: 1,
        threshold: 0.75,
      },
      {
        warningType: 'wins_without_ledger',
        value: 1,
        threshold: 0.75,
      },
      {
        warningType: 'wins_without_contacts',
        value: 1,
        threshold: 0.75,
      },
    ]);
    expect(warnings[0].message).toBe('100.0% of wins used no Fronts.');
  });
});

function commandUsage(
  actionId: CommandUsageReport['actionId'],
  actionLabel: string,
  count: number,
  percentage: number,
): CommandUsageReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId: 'all',
    campaignName: 'All Campaigns',
    actionId,
    actionLabel,
    count,
    percentage,
  };
}

function commandPair(
  actionA: CommandPairReport['actionA'],
  actionB: CommandPairReport['actionB'],
  pairLabel: string,
  count: number,
  percentageOfWeeks: number,
): CommandPairReport {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId: 'all',
    campaignName: 'All Campaigns',
    actionA,
    actionB,
    actionALabel: actionA,
    actionBLabel: actionB,
    pairLabel,
    count,
    percentageOfWeeks,
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
    runs: 4,
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
