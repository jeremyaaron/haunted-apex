import { getActionDefinition } from '../content';
import type { ActionId } from '../model';
import {
  ALL_CAMPAIGNS_ID,
  ALL_CAMPAIGNS_NAME,
  type AnalyticsCampaignId,
  type AnalyticsRunReportInput,
} from './report-input';
import type { CommandUsedTelemetryEntry } from './telemetry-types';

export type CommandPairReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  actionA: ActionId;
  actionB: ActionId;
  actionALabel: string;
  actionBLabel: string;
  pairLabel: string;
  count: number;
  percentageOfWeeks: number;
};

type CommandPairAccumulator = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  weeksWithPairs: number;
  counts: Record<string, CommandPairCount>;
};

type CommandPairCount = {
  actionA: ActionId;
  actionB: ActionId;
  count: number;
};

export function buildCommandPairReports(
  runs: readonly AnalyticsRunReportInput[],
): CommandPairReport[] {
  const groups = new Map<string, CommandPairAccumulator>();

  for (const run of runs) {
    addRunToCommandPairGroup(groups, run, ALL_CAMPAIGNS_ID, ALL_CAMPAIGNS_NAME);
    addRunToCommandPairGroup(groups, run, run.campaignId, run.campaignName);
  }

  return [...groups.values()]
    .flatMap((group) => {
      if (group.weeksWithPairs === 0) {
        return [];
      }

      return Object.values(group.counts).map((pair) => {
        const actionALabel = getActionDefinition(pair.actionA)?.label ?? pair.actionA;
        const actionBLabel = getActionDefinition(pair.actionB)?.label ?? pair.actionB;

        return {
          agentId: group.agentId,
          agentLabel: group.agentLabel,
          campaignId: group.campaignId,
          campaignName: group.campaignName,
          actionA: pair.actionA,
          actionB: pair.actionB,
          actionALabel,
          actionBLabel,
          pairLabel: `${actionALabel} + ${actionBLabel}`,
          count: pair.count,
          percentageOfWeeks: pair.count / group.weeksWithPairs,
        };
      });
    })
    .sort(compareCommandPairReports);
}

function addRunToCommandPairGroup(
  groups: Map<string, CommandPairAccumulator>,
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
    weeksWithPairs: 0,
    counts: {},
  };
  const commandsByWeek = groupCommandsByWeek(
    run.telemetry.entries.filter((entry): entry is CommandUsedTelemetryEntry => {
      return entry.kind === 'command_used';
    }),
  );

  for (const commands of commandsByWeek.values()) {
    if (commands.length < 2) {
      continue;
    }

    group.weeksWithPairs += 1;

    for (const pair of getUnorderedPairs(commands)) {
      const pairKey = `${pair.actionA}:${pair.actionB}`;
      const current = group.counts[pairKey] ?? {
        ...pair,
        count: 0,
      };
      current.count += 1;
      group.counts[pairKey] = current;
    }
  }

  groups.set(key, group);
}

function groupCommandsByWeek(
  commands: readonly CommandUsedTelemetryEntry[],
): Map<number, CommandUsedTelemetryEntry[]> {
  const byWeek = new Map<number, CommandUsedTelemetryEntry[]>();

  for (const command of commands) {
    const entries = byWeek.get(command.week) ?? [];
    entries.push(command);
    byWeek.set(command.week, entries);
  }

  return byWeek;
}

function getUnorderedPairs(
  commands: readonly CommandUsedTelemetryEntry[],
): { actionA: ActionId; actionB: ActionId }[] {
  const pairs: { actionA: ActionId; actionB: ActionId }[] = [];

  for (let left = 0; left < commands.length - 1; left += 1) {
    for (let right = left + 1; right < commands.length; right += 1) {
      const [actionA, actionB] = [commands[left].actionId, commands[right].actionId].sort() as [
        ActionId,
        ActionId,
      ];
      pairs.push({ actionA, actionB });
    }
  }

  return pairs;
}

function compareCommandPairReports(left: CommandPairReport, right: CommandPairReport): number {
  return (
    left.agentId.localeCompare(right.agentId) ||
    compareCampaignIds(left.campaignId, right.campaignId) ||
    right.count - left.count ||
    left.actionA.localeCompare(right.actionA) ||
    left.actionB.localeCompare(right.actionB)
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
