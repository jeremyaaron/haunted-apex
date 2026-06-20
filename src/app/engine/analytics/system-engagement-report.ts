import {
  ALL_CAMPAIGNS_ID,
  ALL_CAMPAIGNS_NAME,
  type AnalyticsCampaignId,
  type AnalyticsRunReportInput,
} from './report-input';
import type { StrategicSystemId } from './telemetry-types';

export type SystemEngagementReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  runs: number;
  wins: number;
  runsWithFrontInvestment: number;
  runsWithFrontUpgrade: number;
  runsWithAccordBrokered: number;
  runsWithLedgerUse: number;
  runsWithContactService: number;
  runsWithBribe: number;
  runsWithLayLow: number;
  winsWithNoFronts: number;
  winsWithNoAccords: number;
  winsWithNoLedger: number;
  winsWithNoContacts: number;
};

type SystemEngagementAccumulator = SystemEngagementReport;

export function buildSystemEngagementReports(
  runs: readonly AnalyticsRunReportInput[],
): SystemEngagementReport[] {
  const groups = new Map<string, SystemEngagementAccumulator>();

  for (const run of runs) {
    addRunToSystemEngagementGroup(groups, run, ALL_CAMPAIGNS_ID, ALL_CAMPAIGNS_NAME);
    addRunToSystemEngagementGroup(groups, run, run.campaignId, run.campaignName);
  }

  return [...groups.values()].sort(compareSystemEngagementReports);
}

function addRunToSystemEngagementGroup(
  groups: Map<string, SystemEngagementAccumulator>,
  run: AnalyticsRunReportInput,
  campaignId: AnalyticsCampaignId,
  campaignName: string,
): void {
  const key = getGroupKey(run.agentId, campaignId);
  const group =
    groups.get(key) ?? createAccumulator(run.agentId, run.agentLabel, campaignId, campaignName);
  const systems = collectEngagedSystems(run);
  const won = run.outcome === 'victory';
  const usedFronts = systems.has('front') || systems.has('front_upgrade');

  group.runs += 1;

  if (won) {
    group.wins += 1;
  }

  if (systems.has('front')) {
    group.runsWithFrontInvestment += 1;
  }

  if (systems.has('front_upgrade')) {
    group.runsWithFrontUpgrade += 1;
  }

  if (systems.has('accord')) {
    group.runsWithAccordBrokered += 1;
  }

  if (systems.has('ledger')) {
    group.runsWithLedgerUse += 1;
  }

  if (systems.has('contact')) {
    group.runsWithContactService += 1;
  }

  if (systems.has('bribe')) {
    group.runsWithBribe += 1;
  }

  if (systems.has('lay_low')) {
    group.runsWithLayLow += 1;
  }

  if (won && !usedFronts) {
    group.winsWithNoFronts += 1;
  }

  if (won && !systems.has('accord')) {
    group.winsWithNoAccords += 1;
  }

  if (won && !systems.has('ledger')) {
    group.winsWithNoLedger += 1;
  }

  if (won && !systems.has('contact')) {
    group.winsWithNoContacts += 1;
  }

  groups.set(key, group);
}

function createAccumulator(
  agentId: string,
  agentLabel: string,
  campaignId: AnalyticsCampaignId,
  campaignName: string,
): SystemEngagementAccumulator {
  return {
    agentId,
    agentLabel,
    campaignId,
    campaignName,
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
  };
}

function collectEngagedSystems(run: AnalyticsRunReportInput): Set<StrategicSystemId> {
  const systems = new Set<StrategicSystemId>();

  for (const entry of run.telemetry.entries) {
    if (entry.kind === 'system_engaged') {
      systems.add(entry.system);
    }
  }

  return systems;
}

function getGroupKey(agentId: string, campaignId: AnalyticsCampaignId): string {
  return `${agentId}:${campaignId}`;
}

function compareSystemEngagementReports(
  left: SystemEngagementReport,
  right: SystemEngagementReport,
): number {
  return (
    left.agentId.localeCompare(right.agentId) ||
    compareCampaignIds(left.campaignId, right.campaignId)
  );
}

function compareCampaignIds(left: AnalyticsCampaignId, right: AnalyticsCampaignId): number {
  if (left === right) {
    return 0;
  }

  if (left === ALL_CAMPAIGNS_ID) {
    return -1;
  }

  if (right === ALL_CAMPAIGNS_ID) {
    return 1;
  }

  return left.localeCompare(right);
}
