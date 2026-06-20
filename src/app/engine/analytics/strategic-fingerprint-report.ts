import {
  ALL_CAMPAIGNS_ID,
  type AnalyticsCampaignId,
} from './report-input';
import type { CommandPairReport } from './command-pair-report';
import type { CommandUsageReport } from './command-usage-report';
import type { LoopWarningReport } from './dominant-loop-detection';
import type { SourceBreakdownReport } from './source-breakdown-report';
import type { SystemEngagementReport } from './system-engagement-report';

export type StrategicFingerprintReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  runs: number;
  wins: number;
  winRate: number;
  totalCommands: number;
  averageCommandsUsed: number;
  topCommand?: CommandUsageReport;
  topPair?: CommandPairReport;
  topDominionSource?: SourceBreakdownReport;
  topHeatReliefSource?: SourceBreakdownReport;
  dominantLoopWarning?: LoopWarningReport;
};

export type StrategicFingerprintReportInput = {
  commandUsageReports: readonly CommandUsageReport[];
  commandPairReports: readonly CommandPairReport[];
  sourceBreakdownReports: readonly SourceBreakdownReport[];
  systemEngagementReports: readonly SystemEngagementReport[];
  loopWarnings: readonly LoopWarningReport[];
};

export function buildStrategicFingerprintReports(
  input: StrategicFingerprintReportInput,
): StrategicFingerprintReport[] {
  return input.systemEngagementReports.map((systemEngagement) => {
    const groupKey = getGroupKey(systemEngagement.agentId, systemEngagement.campaignId);
    const commandUsage = filterByGroup(input.commandUsageReports, groupKey);
    const totalCommands = commandUsage.reduce((total, report) => total + report.count, 0);

    return {
      agentId: systemEngagement.agentId,
      agentLabel: systemEngagement.agentLabel,
      campaignId: systemEngagement.campaignId,
      campaignName: systemEngagement.campaignName,
      runs: systemEngagement.runs,
      wins: systemEngagement.wins,
      winRate: systemEngagement.runs === 0 ? 0 : systemEngagement.wins / systemEngagement.runs,
      totalCommands,
      averageCommandsUsed:
        systemEngagement.runs === 0 ? 0 : totalCommands / systemEngagement.runs,
      topCommand: selectTopCommand(commandUsage),
      topPair: selectTopPair(filterByGroup(input.commandPairReports, groupKey)),
      topDominionSource: selectTopDominionSource(
        filterByGroup(input.sourceBreakdownReports, groupKey),
      ),
      topHeatReliefSource: selectTopHeatReliefSource(
        filterByGroup(input.sourceBreakdownReports, groupKey),
      ),
      dominantLoopWarning: selectDominantLoopWarning(filterByGroup(input.loopWarnings, groupKey)),
    };
  }).sort(compareStrategicFingerprintReports);
}

function selectTopCommand(reports: readonly CommandUsageReport[]): CommandUsageReport | undefined {
  return [...reports].sort(
    (left, right) => right.count - left.count || left.actionId.localeCompare(right.actionId),
  )[0];
}

function selectTopPair(reports: readonly CommandPairReport[]): CommandPairReport | undefined {
  return [...reports].sort(
    (left, right) =>
      right.count - left.count ||
      right.percentageOfWeeks - left.percentageOfWeeks ||
      left.actionA.localeCompare(right.actionA) ||
      left.actionB.localeCompare(right.actionB),
  )[0];
}

function selectTopDominionSource(
  reports: readonly SourceBreakdownReport[],
): SourceBreakdownReport | undefined {
  return reports
    .filter((report) => report.pressure === 'dominion' && report.positiveDelta > 0)
    .sort(
      (left, right) =>
        right.positiveDelta - left.positiveDelta ||
        left.sourceKind.localeCompare(right.sourceKind) ||
        left.sourceId.localeCompare(right.sourceId),
    )[0];
}

function selectTopHeatReliefSource(
  reports: readonly SourceBreakdownReport[],
): SourceBreakdownReport | undefined {
  return reports
    .filter((report) => report.pressure === 'heat' && report.negativeDelta < 0)
    .sort(
      (left, right) =>
        Math.abs(right.negativeDelta) - Math.abs(left.negativeDelta) ||
        left.sourceKind.localeCompare(right.sourceKind) ||
        left.sourceId.localeCompare(right.sourceId),
    )[0];
}

function selectDominantLoopWarning(
  reports: readonly LoopWarningReport[],
): LoopWarningReport | undefined {
  return [...reports].sort(
    (left, right) =>
      warningOverage(right) - warningOverage(left) ||
      left.warningType.localeCompare(right.warningType),
  )[0];
}

function warningOverage(report: LoopWarningReport): number {
  return report.threshold === 0 ? report.value : report.value / report.threshold;
}

function filterByGroup<T extends { agentId: string; campaignId: AnalyticsCampaignId }>(
  reports: readonly T[],
  groupKey: string,
): T[] {
  return reports.filter((report) => getGroupKey(report.agentId, report.campaignId) === groupKey);
}

function getGroupKey(agentId: string, campaignId: AnalyticsCampaignId): string {
  return `${agentId}:${campaignId}`;
}

function compareStrategicFingerprintReports(
  left: StrategicFingerprintReport,
  right: StrategicFingerprintReport,
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
