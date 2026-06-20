import type { CampaignTensionId, PressureId } from '../model';
import { buildSourceBreakdownReports } from './source-breakdown-report';
import type { AnalyticsRunReportInput } from './report-input';
import type { PressureChangeSourceKind } from './telemetry-types';

describe('source breakdown reports', () => {
  it('aggregates positive and negative pressure deltas by source for all campaigns and each Campaign Tension', () => {
    const reports = buildSourceBreakdownReports([
      reportRun({
        runId: 'run_1',
        campaignId: 'campaign_dirty_capital',
        campaignName: 'Dirty Capital',
        deltas: [
          pressureDelta('dominion', 'action', 'expand_influence', 'Expand Influence', 8),
          pressureDelta('dominion', 'action', 'expand_influence', 'Expand Influence', 5),
          pressureDelta('heat', 'action', 'lay_low', 'Lay Low', -12),
          pressureDelta('heat', 'action', 'lay_low', 'Lay Low', 3),
        ],
      }),
      reportRun({
        runId: 'run_2',
        campaignId: 'campaign_ghostline_signal',
        campaignName: 'Ghostline Signal',
        deltas: [
          pressureDelta('dominion', 'contact', 'contact:veyra:private_room', 'Veyra Lux', 4),
          pressureDelta('heat', 'action', 'lay_low', 'Lay Low', -5),
        ],
      }),
    ]);

    expect(
      reports
        .filter((report) => report.pressure === 'dominion')
        .map((report) => ({
          campaignId: report.campaignId,
          sourceKind: report.sourceKind,
          sourceId: report.sourceId,
          sourceLabel: report.sourceLabel,
          totalDelta: report.totalDelta,
          positiveDelta: report.positiveDelta,
          negativeDelta: report.negativeDelta,
        })),
    ).toEqual([
      {
        campaignId: 'all',
        sourceKind: 'action',
        sourceId: 'expand_influence',
        sourceLabel: 'Expand Influence',
        totalDelta: 13,
        positiveDelta: 13,
        negativeDelta: 0,
      },
      {
        campaignId: 'all',
        sourceKind: 'contact',
        sourceId: 'contact:veyra:private_room',
        sourceLabel: 'Veyra Lux',
        totalDelta: 4,
        positiveDelta: 4,
        negativeDelta: 0,
      },
      {
        campaignId: 'campaign_dirty_capital',
        sourceKind: 'action',
        sourceId: 'expand_influence',
        sourceLabel: 'Expand Influence',
        totalDelta: 13,
        positiveDelta: 13,
        negativeDelta: 0,
      },
      {
        campaignId: 'campaign_ghostline_signal',
        sourceKind: 'contact',
        sourceId: 'contact:veyra:private_room',
        sourceLabel: 'Veyra Lux',
        totalDelta: 4,
        positiveDelta: 4,
        negativeDelta: 0,
      },
    ]);

    expect(
      reports
        .filter((report) => report.pressure === 'heat' && report.sourceId === 'lay_low')
        .map((report) => ({
          campaignId: report.campaignId,
          totalDelta: report.totalDelta,
          positiveDelta: report.positiveDelta,
          negativeDelta: report.negativeDelta,
        })),
    ).toEqual([
      {
        campaignId: 'all',
        totalDelta: -14,
        positiveDelta: 3,
        negativeDelta: -17,
      },
      {
        campaignId: 'campaign_dirty_capital',
        totalDelta: -9,
        positiveDelta: 3,
        negativeDelta: -12,
      },
      {
        campaignId: 'campaign_ghostline_signal',
        totalDelta: -5,
        positiveDelta: 0,
        negativeDelta: -5,
      },
    ]);
  });

  it('omits telemetry without pressure delta entries', () => {
    const reports = buildSourceBreakdownReports([
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
          entries: [
            {
              kind: 'system_engaged',
              week: 1,
              system: 'lay_low',
              sourceId: 'lay_low',
            },
          ],
        },
      },
    ]);

    expect(reports).toEqual([]);
  });
});

function pressureDelta(
  pressure: PressureId,
  sourceKind: PressureChangeSourceKind,
  sourceId: string,
  sourceLabel: string,
  delta: number,
): AnalyticsRunReportInput['telemetry']['entries'][number] {
  return {
    kind: 'pressure_delta',
    week: 1,
    pressure,
    sourceKind,
    sourceId,
    sourceLabel,
    delta,
  };
}

function reportRun({
  runId,
  campaignId,
  campaignName,
  deltas,
}: {
  runId: string;
  campaignId: CampaignTensionId;
  campaignName: string;
  deltas: readonly AnalyticsRunReportInput['telemetry']['entries'][number][];
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
      entries: [...deltas],
    },
  };
}
