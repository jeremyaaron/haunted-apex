import type { PressureId } from '../model';
import {
  ALL_CAMPAIGNS_ID,
  ALL_CAMPAIGNS_NAME,
  type AnalyticsCampaignId,
  type AnalyticsRunReportInput,
} from './report-input';
import type { PressureChangeSourceKind } from './telemetry-types';

export type SourceBreakdownReport = {
  agentId: string;
  agentLabel: string;
  campaignId: AnalyticsCampaignId;
  campaignName: string;
  pressure: PressureId;
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
  totalDelta: number;
  positiveDelta: number;
  negativeDelta: number;
};

type SourceBreakdownAccumulator = SourceBreakdownReport;

export function buildSourceBreakdownReports(
  runs: readonly AnalyticsRunReportInput[],
): SourceBreakdownReport[] {
  const groups = new Map<string, SourceBreakdownAccumulator>();

  for (const run of runs) {
    addRunToSourceBreakdownGroup(groups, run, ALL_CAMPAIGNS_ID, ALL_CAMPAIGNS_NAME);
    addRunToSourceBreakdownGroup(groups, run, run.campaignId, run.campaignName);
  }

  return [...groups.values()].sort(compareSourceBreakdownReports);
}

function addRunToSourceBreakdownGroup(
  groups: Map<string, SourceBreakdownAccumulator>,
  run: AnalyticsRunReportInput,
  campaignId: AnalyticsCampaignId,
  campaignName: string,
): void {
  for (const entry of run.telemetry.entries) {
    if (entry.kind !== 'pressure_delta') {
      continue;
    }

    const key = getGroupKey(
      run.agentId,
      campaignId,
      entry.pressure,
      entry.sourceKind,
      entry.sourceId,
    );
    const current = groups.get(key) ?? {
      agentId: run.agentId,
      agentLabel: run.agentLabel,
      campaignId,
      campaignName,
      pressure: entry.pressure,
      sourceKind: entry.sourceKind,
      sourceId: entry.sourceId,
      sourceLabel: entry.sourceLabel,
      totalDelta: 0,
      positiveDelta: 0,
      negativeDelta: 0,
    };

    current.totalDelta += entry.delta;

    if (entry.delta > 0) {
      current.positiveDelta += entry.delta;
    } else {
      current.negativeDelta += entry.delta;
    }

    groups.set(key, current);
  }
}

function getGroupKey(
  agentId: string,
  campaignId: AnalyticsCampaignId,
  pressure: PressureId,
  sourceKind: PressureChangeSourceKind,
  sourceId: string,
): string {
  return [agentId, campaignId, pressure, sourceKind, sourceId].join(':');
}

function compareSourceBreakdownReports(
  left: SourceBreakdownReport,
  right: SourceBreakdownReport,
): number {
  return (
    left.agentId.localeCompare(right.agentId) ||
    compareCampaignIds(left.campaignId, right.campaignId) ||
    left.pressure.localeCompare(right.pressure) ||
    Math.abs(right.totalDelta) - Math.abs(left.totalDelta) ||
    left.sourceKind.localeCompare(right.sourceKind) ||
    left.sourceId.localeCompare(right.sourceId)
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
