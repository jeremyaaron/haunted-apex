import { CAMPAIGN_TENSION_DEFINITIONS } from '../content';
import type { CampaignTensionId } from '../model';

export const STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN = 100;
export const STANDARD_VALIDATION_SEED_PREFIX = 'STANDARD-HANDLER-V0-9';

export const STANDARD_VALIDATION_SEEDS = Object.fromEntries(
  CAMPAIGN_TENSION_DEFINITIONS.map((campaign) => [
    campaign.id,
    Array.from(
      { length: STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN },
      (_value, index) =>
        `${STANDARD_VALIDATION_SEED_PREFIX}-${campaign.id}-${String(index + 1).padStart(3, '0')}`,
    ),
  ]),
) as unknown as Record<CampaignTensionId, readonly string[]>;

export const STANDARD_VALIDATION_TOTAL_RUNS =
  CAMPAIGN_TENSION_DEFINITIONS.length * STANDARD_VALIDATION_SEEDS_PER_CAMPAIGN;

export function getStandardValidationSeeds(
  campaignTensionId: CampaignTensionId,
): readonly string[] {
  return STANDARD_VALIDATION_SEEDS[campaignTensionId];
}
