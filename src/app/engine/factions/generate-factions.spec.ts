import { CAMPAIGN_TENSION_DEFINITIONS, FACTION_DEFINITIONS } from '../content';
import {
  ACTIVE_FACTION_COUNT,
  ALWAYS_ACTIVE_FACTION_ID,
  generateFactions,
  materializeFactionState,
} from './generate-factions';

describe('generateFactions', () => {
  it('always includes Ashline Bureau and selects three optional factions', () => {
    const network = generateFactions('VIOLET-ASH-1047');

    expect(network.activeFactionIds.length).toBe(ACTIVE_FACTION_COUNT);
    expect(new Set(network.activeFactionIds).size).toBe(ACTIVE_FACTION_COUNT);
    expect(network.activeFactionIds).toContain(ALWAYS_ACTIVE_FACTION_ID);
    expect(Object.keys(network.factions).sort()).toEqual([...network.activeFactionIds].sort());
    expect(network.activeAccords).toEqual({});
  });

  it('selects a deterministic active faction set by seed', () => {
    const first = generateFactions('VIOLET-ASH-1047');
    const second = generateFactions('violet-ash-1047');

    expect(first.activeFactionIds).toEqual(second.activeFactionIds);
  });

  it('initializes active faction states from base metrics', () => {
    const network = generateFactions('FACTION-BASELINES');

    for (const factionId of network.activeFactionIds) {
      const definition = FACTION_DEFINITIONS.find((candidate) => candidate.id === factionId);

      expect(definition).toBeDefined();
      expect(network.factions[factionId]).toEqual(materializeFactionState(definition!));
    }
  });

  it('does not materialize inactive faction state', () => {
    const network = generateFactions('INACTIVE-FACTION');
    const inactiveFactionIds = FACTION_DEFINITIONS
      .map((definition) => definition.id)
      .filter((factionId) => !network.activeFactionIds.includes(factionId));

    expect(inactiveFactionIds.length).toBe(FACTION_DEFINITIONS.length - ACTIVE_FACTION_COUNT);

    for (const factionId of inactiveFactionIds) {
      expect(network.factions[factionId]).toBeUndefined();
    }
  });

  it('includes required Campaign factions while preserving active count', () => {
    for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
      const network = generateFactions('CAMPAIGN-FACTIONS', FACTION_DEFINITIONS, campaign.generationBias);

      expect(network.activeFactionIds.length).withContext(campaign.id).toBe(ACTIVE_FACTION_COUNT);
      expect(new Set(network.activeFactionIds).size).withContext(campaign.id).toBe(
        ACTIVE_FACTION_COUNT,
      );
      expect(network.activeFactionIds).withContext(campaign.id).toContain(
        ALWAYS_ACTIVE_FACTION_ID,
      );

      for (const factionId of campaign.generationBias.requiredFactionIds ?? []) {
        expect(network.activeFactionIds).withContext(campaign.id).toContain(factionId);
      }
    }
  });

  it('uses weighted seeded selection for non-required Campaign factions', () => {
    const baseline = countFactionSelections();
    const biased = countFactionSelections({
      weightedFactionIds: {
        faction_chrome_maw: 30,
      },
    });

    expect(biased['faction_chrome_maw']).toBeGreaterThan(baseline['faction_chrome_maw']);
  });
});

function countFactionSelections(
  bias: Parameters<typeof generateFactions>[2] = {},
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (let index = 1; index <= 120; index += 1) {
    const network = generateFactions(`FACTION-BIAS-${index}`, FACTION_DEFINITIONS, bias);

    for (const factionId of network.activeFactionIds) {
      counts[factionId] = (counts[factionId] ?? 0) + 1;
    }
  }

  return counts;
}
