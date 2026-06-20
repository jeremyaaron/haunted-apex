import type { CampaignTensionId } from '../model';
import type { RunTelemetry } from './telemetry-types';

export type AnalyticsCampaignId = CampaignTensionId | 'all';

export type AnalyticsRunReportInput = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId;
  campaignName: string;
  telemetry: RunTelemetry;
};

export const ALL_CAMPAIGNS_ID: AnalyticsCampaignId = 'all';
export const ALL_CAMPAIGNS_NAME = 'All Campaigns';
