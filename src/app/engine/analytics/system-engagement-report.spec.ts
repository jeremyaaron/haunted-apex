import type { CampaignTensionId } from '../model';
import { buildSystemEngagementReports } from './system-engagement-report';
import type { AnalyticsRunOutcome, AnalyticsRunReportInput } from './report-input';
import type { StrategicSystemId } from './telemetry-types';

describe('system engagement reports', () => {
  it('counts run-level system engagement for all campaigns and each Campaign Tension', () => {
    const reports = buildSystemEngagementReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['front', 'front_upgrade', 'accord', 'ledger', 'contact', 'bribe', 'lay_low'],
      }),
      reportRun({
        runId: 'run_2',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'loss',
        systems: ['lay_low', 'lay_low', 'bribe'],
      }),
      reportRun({
        runId: 'run_3',
        campaignId: 'campaign_ghostline_signal',
        campaignName: 'Ghostline Signal',
        outcome: 'victory',
        systems: ['contact', 'lay_low'],
      }),
    ]);

    expect(
      reports.map((report) => ({
        campaignId: report.campaignId,
        runs: report.runs,
        wins: report.wins,
        runsWithFrontInvestment: report.runsWithFrontInvestment,
        runsWithFrontUpgrade: report.runsWithFrontUpgrade,
        runsWithAccordBrokered: report.runsWithAccordBrokered,
        runsWithLedgerUse: report.runsWithLedgerUse,
        runsWithContactService: report.runsWithContactService,
        runsWithBribe: report.runsWithBribe,
        runsWithLayLow: report.runsWithLayLow,
      })),
    ).toEqual([
      {
        campaignId: 'all',
        runs: 3,
        wins: 2,
        runsWithFrontInvestment: 1,
        runsWithFrontUpgrade: 1,
        runsWithAccordBrokered: 1,
        runsWithLedgerUse: 1,
        runsWithContactService: 2,
        runsWithBribe: 2,
        runsWithLayLow: 3,
      },
      {
        campaignId: 'campaign_dirty_capital',
        runs: 2,
        wins: 1,
        runsWithFrontInvestment: 1,
        runsWithFrontUpgrade: 1,
        runsWithAccordBrokered: 1,
        runsWithLedgerUse: 1,
        runsWithContactService: 1,
        runsWithBribe: 2,
        runsWithLayLow: 2,
      },
      {
        campaignId: 'campaign_ghostline_signal',
        runs: 1,
        wins: 1,
        runsWithFrontInvestment: 0,
        runsWithFrontUpgrade: 0,
        runsWithAccordBrokered: 0,
        runsWithLedgerUse: 0,
        runsWithContactService: 1,
        runsWithBribe: 0,
        runsWithLayLow: 1,
      },
    ]);
  });

  it('counts wins without Fronts, Accords, Ledger, and Contacts', () => {
    const reports = buildSystemEngagementReports([
      reportRun({
        runId: 'frontless_win',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['accord', 'ledger', 'contact'],
      }),
      reportRun({
        runId: 'accordless_win',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['front', 'ledger', 'contact'],
      }),
      reportRun({
        runId: 'ledgerless_win',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['front', 'accord', 'contact'],
      }),
      reportRun({
        runId: 'contactless_win',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['front', 'accord', 'ledger'],
      }),
      reportRun({
        runId: 'loss_without_systems',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'loss',
        systems: [],
      }),
    ]);
    const allCampaigns = reports.find((report) => report.campaignId === 'all');

    expect(allCampaigns).toEqual(
      jasmine.objectContaining({
        runs: 5,
        wins: 4,
        winsWithNoFronts: 1,
        winsWithNoAccords: 1,
        winsWithNoLedger: 1,
        winsWithNoContacts: 1,
      }),
    );
  });

  it('counts front upgrade as Front engagement for wins-without-Fronts diagnostics', () => {
    const reports = buildSystemEngagementReports([
      reportRun({
        runId: 'upgrade_only',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        outcome: 'victory',
        systems: ['front_upgrade'],
      }),
    ]);

    expect(reports.find((report) => report.campaignId === 'all')).toEqual(
      jasmine.objectContaining({
        runsWithFrontInvestment: 0,
        runsWithFrontUpgrade: 1,
        winsWithNoFronts: 0,
      }),
    );
  });
});

function reportRun({
  runId,
  campaignId,
  campaignName,
  outcome,
  systems,
}: {
  runId: string;
  campaignId: CampaignTensionId;
  campaignName: string;
  outcome: AnalyticsRunOutcome;
  systems: readonly StrategicSystemId[];
}): AnalyticsRunReportInput {
  return {
    agentId: 'handler',
    agentLabel: 'Handler',
    campaignId,
    campaignName,
    outcome,
    telemetry: {
      runId,
      actorType: 'bot',
      botId: 'handler',
      campaignTensionId: campaignId,
      seed: runId,
      entries: systems.map((system, index) => ({
        kind: 'system_engaged',
        week: index + 1,
        system,
        sourceId: system,
      })),
    },
  };
}
