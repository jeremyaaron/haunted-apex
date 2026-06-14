import { CITY_PREFIXES, CITY_SUFFIXES } from '../content';
import type { CampaignTensionDefinition, CityIdentity } from '../model';
import { createRng, nextInt } from '../rng';

export function generateCityIdentity(
  seed: string,
  campaignTension: CampaignTensionDefinition,
): CityIdentity {
  let rng = createRng(`${seed}:city-identity:${campaignTension.id}`);
  const profileResult = nextInt(rng, 0, campaignTension.cityProfileOptions.length - 1);
  rng = profileResult.rng;
  const prefixResult = nextInt(rng, 0, CITY_PREFIXES.length - 1);
  rng = prefixResult.rng;
  const suffixResult = nextInt(rng, 0, CITY_SUFFIXES.length - 1);

  return {
    name: `${CITY_PREFIXES[prefixResult.value]} ${CITY_SUFFIXES[suffixResult.value]}`,
    profile: campaignTension.cityProfileOptions[profileResult.value],
  };
}
