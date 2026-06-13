import { CAMPAIGN_TENSION_DEFINITIONS } from '../content';
import type { CampaignTensionDefinition, CampaignTensionId } from '../model';
import { createRng, nextInt } from '../rng';

export function selectCampaignTension(seed: string): CampaignTensionDefinition {
  const rng = createRng(`${seed}:campaign-tension`);
  const result = nextInt(rng, 0, CAMPAIGN_TENSION_DEFINITIONS.length - 1);

  return CAMPAIGN_TENSION_DEFINITIONS[result.value];
}

export function getCampaignTensionDefinitionOrThrow(
  campaignTensionId: CampaignTensionId,
): CampaignTensionDefinition {
  const definition = CAMPAIGN_TENSION_DEFINITIONS.find(
    (tension) => tension.id === campaignTensionId,
  );

  if (!definition) {
    throw new Error(`Unknown Campaign Tension: ${campaignTensionId}`);
  }

  return definition;
}
