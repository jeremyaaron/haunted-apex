import {
  ALL_CAMPAIGNS_ID,
  type AnalyticsCampaignId,
} from './report-input';
import type { CommandPairReport } from './command-pair-report';
import type { CommandUsageReport } from './command-usage-report';
import type { SystemEngagementReport } from './system-engagement-report';

export type LoopWarningType =
  | 'dominant_pair'
  | 'top_two_command_share'
  | 'wins_without_fronts'
  | 'wins_without_accords'
  | 'wins_without_ledger'
  | 'wins_without_contacts';

export type LoopWarningReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  warningType: LoopWarningType;
  value: number;
  threshold: number;
  message: string;
};

export type LoopWarningReportInput = {
  commandUsageReports: readonly CommandUsageReport[];
  commandPairReports: readonly CommandPairReport[];
  systemEngagementReports: readonly SystemEngagementReport[];
};

export const LOOP_WARNING_THRESHOLDS = {
  dominantPair: 0.35,
  topTwoCommandShare: 0.6,
  winsWithoutSystem: 0.75,
} as const;

export function buildLoopWarningReports(input: LoopWarningReportInput): LoopWarningReport[] {
  return [
    ...buildDominantPairWarnings(input.commandPairReports),
    ...buildTopTwoCommandWarnings(input.commandUsageReports),
    ...buildWinsWithoutSystemWarnings(input.systemEngagementReports),
  ].sort(compareLoopWarningReports);
}

function buildDominantPairWarnings(
  commandPairReports: readonly CommandPairReport[],
): LoopWarningReport[] {
  return selectTopByGroup(commandPairReports, (report) => report.percentageOfWeeks).flatMap(
    (pair) => {
      if (pair.percentageOfWeeks <= LOOP_WARNING_THRESHOLDS.dominantPair) {
        return [];
      }

      return [
        {
          agentId: pair.agentId,
          agentLabel: pair.agentLabel,
          campaignId: pair.campaignId,
          warningType: 'dominant_pair',
          value: pair.percentageOfWeeks,
          threshold: LOOP_WARNING_THRESHOLDS.dominantPair,
          message: `${pair.pairLabel} appears in ${formatPercentage(pair.percentageOfWeeks)} of resolved weeks.`,
        },
      ];
    },
  );
}

function buildTopTwoCommandWarnings(
  commandUsageReports: readonly CommandUsageReport[],
): LoopWarningReport[] {
  const byGroup = groupByAgentCampaign(commandUsageReports);

  return [...byGroup.values()].flatMap((reports) => {
    const topTwoShare = reports
      .slice()
      .sort(
        (left, right) =>
          right.percentage - left.percentage || left.actionId.localeCompare(right.actionId),
      )
      .slice(0, 2)
      .reduce((total, report) => total + report.percentage, 0);

    if (reports.length === 0 || topTwoShare <= LOOP_WARNING_THRESHOLDS.topTwoCommandShare) {
      return [];
    }

    const first = reports[0];

    return [
      {
        agentId: first.agentId,
        agentLabel: first.agentLabel,
        campaignId: first.campaignId,
        warningType: 'top_two_command_share',
        value: topTwoShare,
        threshold: LOOP_WARNING_THRESHOLDS.topTwoCommandShare,
        message: `Top two commands account for ${formatPercentage(topTwoShare)} of command usage.`,
      },
    ];
  });
}

function buildWinsWithoutSystemWarnings(
  systemEngagementReports: readonly SystemEngagementReport[],
): LoopWarningReport[] {
  return systemEngagementReports.flatMap((report) => {
    if (report.wins === 0) {
      return [];
    }

    return [
      createWinsWithoutWarning(report, 'wins_without_fronts', report.winsWithNoFronts, 'Fronts'),
      createWinsWithoutWarning(report, 'wins_without_accords', report.winsWithNoAccords, 'Accords'),
      createWinsWithoutWarning(report, 'wins_without_ledger', report.winsWithNoLedger, 'Ledger'),
      createWinsWithoutWarning(
        report,
        'wins_without_contacts',
        report.winsWithNoContacts,
        'Contacts',
      ),
    ].flatMap((warning) => warning ?? []);
  });
}

function createWinsWithoutWarning(
  report: SystemEngagementReport,
  warningType: Extract<
    LoopWarningType,
    | 'wins_without_fronts'
    | 'wins_without_accords'
    | 'wins_without_ledger'
    | 'wins_without_contacts'
  >,
  winsWithoutSystem: number,
  label: string,
): LoopWarningReport | undefined {
  const value = winsWithoutSystem / report.wins;

  if (value <= LOOP_WARNING_THRESHOLDS.winsWithoutSystem) {
    return undefined;
  }

  return {
    agentId: report.agentId,
    agentLabel: report.agentLabel,
    campaignId: report.campaignId,
    warningType,
    value,
    threshold: LOOP_WARNING_THRESHOLDS.winsWithoutSystem,
    message: `${formatPercentage(value)} of wins used no ${label}.`,
  };
}

function selectTopByGroup<T extends { agentId: string; campaignId: AnalyticsCampaignId }>(
  reports: readonly T[],
  getValue: (report: T) => number,
): T[] {
  const topByGroup = new Map<string, T>();

  for (const report of reports) {
    const key = getGroupKey(report.agentId, report.campaignId);
    const current = topByGroup.get(key);

    if (!current || getValue(report) > getValue(current)) {
      topByGroup.set(key, report);
    }
  }

  return [...topByGroup.values()];
}

function groupByAgentCampaign<T extends { agentId: string; campaignId: AnalyticsCampaignId }>(
  reports: readonly T[],
): Map<string, T[]> {
  const byGroup = new Map<string, T[]>();

  for (const report of reports) {
    const key = getGroupKey(report.agentId, report.campaignId);
    const group = byGroup.get(key) ?? [];
    group.push(report);
    byGroup.set(key, group);
  }

  return byGroup;
}

function getGroupKey(agentId: string, campaignId: AnalyticsCampaignId): string {
  return `${agentId}:${campaignId}`;
}

function compareLoopWarningReports(left: LoopWarningReport, right: LoopWarningReport): number {
  return (
    left.agentId.localeCompare(right.agentId) ||
    compareCampaignIds(left.campaignId, right.campaignId) ||
    warningTypeOrder(left.warningType) - warningTypeOrder(right.warningType) ||
    right.value - left.value
  );
}

function warningTypeOrder(warningType: LoopWarningType): number {
  return [
    'dominant_pair',
    'top_two_command_share',
    'wins_without_fronts',
    'wins_without_accords',
    'wins_without_ledger',
    'wins_without_contacts',
  ].indexOf(warningType);
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

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
