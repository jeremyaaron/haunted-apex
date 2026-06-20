import { getActionDefinition } from '../content';
import type { ActionId } from '../model';
import {
  ALL_CAMPAIGNS_ID,
  ALL_CAMPAIGNS_NAME,
  type AnalyticsCampaignId,
  type AnalyticsRunReportInput,
} from './report-input';

export type CommandUsageReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  actionId: ActionId;
  actionLabel: string;
  count: number;
  percentage: number;
};

type CommandUsageAccumulator = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  totalCommands: number;
  counts: Partial<Record<ActionId, number>>;
};

export function buildCommandUsageReports(
  runs: readonly AnalyticsRunReportInput[],
): CommandUsageReport[] {
  const groups = new Map<string, CommandUsageAccumulator>();

  for (const run of runs) {
    addRunToCommandUsageGroup(groups, run, ALL_CAMPAIGNS_ID, ALL_CAMPAIGNS_NAME);
    addRunToCommandUsageGroup(groups, run, run.campaignId, run.campaignName);
  }

  return [...groups.values()]
    .flatMap((group) => {
      if (group.totalCommands === 0) {
        return [];
      }

      return Object.entries(group.counts).map(([actionId, count]) => ({
        agentId: group.agentId,
        agentLabel: group.agentLabel,
        campaignId: group.campaignId,
        campaignName: group.campaignName,
        actionId: actionId as ActionId,
        actionLabel: getActionDefinition(actionId as ActionId)?.label ?? actionId,
        count: count ?? 0,
        percentage: (count ?? 0) / group.totalCommands,
      }));
    })
    .sort(compareCommandUsageReports);
}

function addRunToCommandUsageGroup(
  groups: Map<string, CommandUsageAccumulator>,
  run: AnalyticsRunReportInput,
  campaignId: AnalyticsCampaignId,
  campaignName: string,
): void {
  const key = getGroupKey(run.agentId, campaignId);
  const group = groups.get(key) ?? {
    agentId: run.agentId,
    agentLabel: run.agentLabel,
    campaignId,
    campaignName,
    totalCommands: 0,
    counts: {},
  };

  for (const entry of run.telemetry.entries) {
    if (entry.kind !== 'command_used') {
      continue;
    }

    group.totalCommands += 1;
    group.counts[entry.actionId] = (group.counts[entry.actionId] ?? 0) + 1;
  }

  groups.set(key, group);
}

function compareCommandUsageReports(left: CommandUsageReport, right: CommandUsageReport): number {
  return (
    left.agentId.localeCompare(right.agentId) ||
    compareCampaignIds(left.campaignId, right.campaignId) ||
    right.count - left.count ||
    left.actionId.localeCompare(right.actionId)
  );
}

function getGroupKey(agentId: string, campaignId: AnalyticsCampaignId): string {
  return `${agentId}:${campaignId}`;
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
