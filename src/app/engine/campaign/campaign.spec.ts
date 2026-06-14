import {
  CAMPAIGN_TENSION_DEFINITIONS,
  createRng,
  generateCityIdentity,
  nextInt,
  selectCampaignTension,
} from '../index';
import type { CampaignTensionDefinition } from '../model';

describe('Campaign helpers', () => {
  const definitions: readonly CampaignTensionDefinition[] = CAMPAIGN_TENSION_DEFINITIONS;

  it('selects Campaign Tension deterministically from a seed', () => {
    const first = selectCampaignTension('VIOLET-ASH-1047');
    const second = selectCampaignTension('VIOLET-ASH-1047');

    expect(first).toBe(second);
    expect(definitions).toContain(first);
  });

  it('varies Campaign Tension across seed space', () => {
    const selectedIds = new Set(
      Array.from({ length: 30 }, (_, index) => selectCampaignTension(`CITY-WAKES-${index}`).id),
    );

    expect(selectedIds.size).toBeGreaterThan(1);
  });

  it('generates deterministic city identity for the same seed and tension', () => {
    const tension = definitions[0];
    const first = generateCityIdentity('VIOLET-ASH-1047', tension);
    const second = generateCityIdentity('VIOLET-ASH-1047', tension);

    expect(first).toEqual(second);
    expect(tension.cityProfileOptions).toContain(first.profile);
    expect(first.name.trim()).not.toBe('');
  });

  it('allows the same seed to produce different city profiles for explicit tensions', () => {
    const profiles = new Set(
      CAMPAIGN_TENSION_DEFINITIONS.map(
        (definition) => generateCityIdentity('PROFILE-CHECK', definition).profile,
      ),
    );

    expect(profiles.size).toBeGreaterThan(1);
  });

  it('does not consume the caller RNG cursor when selecting tension or city identity', () => {
    const seed = 'CURSOR-CHECK';
    const rng = createRng(seed);
    const expected = nextInt(rng, 1, 100);

    const tension = selectCampaignTension(seed);
    generateCityIdentity(seed, tension);

    expect(nextInt(rng, 1, 100)).toEqual(expected);
  });
});
