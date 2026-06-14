import {
  CAMPAIGN_TENSION_DEFINITIONS,
  getOperativeDefinition,
  ROSTER_OPERATIVES,
} from '../content';
import type { OperativeDefinition } from '../model';
import {
  DEFAULT_ROSTER_GENERATION_CONFIG,
  generateRoster,
  isValidStartingRoster,
} from './generate-roster';

describe('roster generation', () => {
  it('creates disjoint three-operative and four-candidate pools', () => {
    const roster = generateRoster('ROSTER-SHAPE');
    const allIds = [...roster.startingOperativeIds, ...roster.hirePoolIds];

    expect(roster.startingOperativeIds.length).toBe(3);
    expect(roster.hirePoolIds.length).toBe(4);
    expect(new Set(allIds).size).toBe(7);
    expect(roster.rngCursor).toBe(ROSTER_OPERATIVES.length);
  });

  it('creates only valid starting rosters', () => {
    for (let index = 1; index <= 250; index += 1) {
      const roster = generateRoster(`ROSTER-VALID-${index}`);
      const definitions = roster.startingOperativeIds.map(requireOperative);

      expect(isValidStartingRoster(definitions))
        .withContext(`invalid roster for seed ROSTER-VALID-${index}`)
        .toBeTrue();
      expect(definitions.filter((definition) => definition.rarity === 'rare').length)
        .toBeLessThanOrEqual(DEFAULT_ROSTER_GENERATION_CONFIG.maxStartingRares);
    }
  });

  it('is deterministic for the same seed and varies across seeds', () => {
    const first = generateRoster('ROSTER-DETERMINISTIC');
    const second = generateRoster('roster-deterministic');
    const compositions = new Set(
      Array.from({ length: 100 }, (_, index) =>
        generateRoster(`ROSTER-VARIETY-${index + 1}`).startingOperativeIds.join('|'),
      ),
    );

    expect(first).toEqual(second);
    expect(compositions.size).toBeGreaterThan(10);
  });

  it('allows rare operatives in the hire pool', () => {
    const rareCandidateFound = Array.from({ length: 250 }, (_, index) =>
      generateRoster(`ROSTER-RARE-HIRE-${index + 1}`),
    ).some((roster) =>
      roster.hirePoolIds.some((operativeId) => requireOperative(operativeId).rarity === 'rare'),
    );

    expect(rareCandidateFound).toBeTrue();
  });

  it('selects common operatives more often than rares across a large sample', () => {
    const appearances = {
      common: 0,
      uncommon: 0,
      rare: 0,
    };

    for (let index = 1; index <= 2000; index += 1) {
      const roster = generateRoster(`ROSTER-DISTRIBUTION-${index}`);

      for (const operativeId of roster.startingOperativeIds) {
        appearances[requireOperative(operativeId).rarity] += 1;
      }
    }

    const commonPerOperative = appearances.common / 4;
    const rarePerOperative = appearances.rare / 2;

    expect(commonPerOperative).toBeGreaterThan(rarePerOperative);
  });

  it('throws a descriptive error when the registry cannot satisfy coverage', () => {
    const invalidDefinitions: OperativeDefinition[] = ROSTER_OPERATIVES.map((definition) => ({
      ...definition,
      roleTags: ['intel'],
      affinities: [],
    }));

    expect(() => generateRoster('ROSTER-INVALID', invalidDefinitions)).toThrowError(
      /no valid starting roster satisfies role, Intel, Heat-control, and rarity requirements/,
    );
  });

  it('preserves roster validity when Campaign bias is applied', () => {
    for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
      const roster = generateRoster(
        `ROSTER-CAMPAIGN-${campaign.id}`,
        ROSTER_OPERATIVES,
        DEFAULT_ROSTER_GENERATION_CONFIG,
        campaign.generationBias,
      );
      const startingDefinitions = roster.startingOperativeIds.map(requireOperative);
      const allIds = [...roster.startingOperativeIds, ...roster.hirePoolIds];

      expect(roster.startingOperativeIds.length)
        .withContext(campaign.id)
        .toBe(DEFAULT_ROSTER_GENERATION_CONFIG.startingRosterSize);
      expect(roster.hirePoolIds.length)
        .withContext(campaign.id)
        .toBe(DEFAULT_ROSTER_GENERATION_CONFIG.hirePoolSize);
      expect(new Set(allIds).size).withContext(campaign.id).toBe(allIds.length);
      expect(isValidStartingRoster(startingDefinitions))
        .withContext(campaign.id)
        .toBeTrue();
    }
  });

  it('makes weighted Campaign operatives more likely across seeded runs', () => {
    const ghostline = CAMPAIGN_TENSION_DEFINITIONS.find(
      (campaign) => campaign.id === 'campaign_ghostline_signal',
    )!;
    const weightedIds = ['op_juno_hex', 'op_echo_saint', 'op_orchid_seven'] as const;
    const baseline = countStartingRosterSelections();
    const biased = countStartingRosterSelections(ghostline.generationBias);
    const baselineWeightedSelections = weightedIds.reduce(
      (total, operativeId) => total + baseline[operativeId],
      0,
    );
    const biasedWeightedSelections = weightedIds.reduce(
      (total, operativeId) => total + biased[operativeId],
      0,
    );

    expect(biasedWeightedSelections).toBeGreaterThan(baselineWeightedSelections);
  });
});

function requireOperative(
  operativeId: (typeof ROSTER_OPERATIVES)[number]['id'],
): OperativeDefinition {
  const definition = getOperativeDefinition(operativeId);

  if (!definition) {
    throw new Error(`Missing operative ${operativeId}`);
  }

  return definition;
}

function countStartingRosterSelections(
  bias: Parameters<typeof generateRoster>[3] = {},
): Record<(typeof ROSTER_OPERATIVES)[number]['id'], number> {
  const appearances = Object.fromEntries(
    ROSTER_OPERATIVES.map((definition) => [definition.id, 0]),
  ) as Record<(typeof ROSTER_OPERATIVES)[number]['id'], number>;

  for (let index = 1; index <= 300; index += 1) {
    const roster = generateRoster(
      `ROSTER-BIAS-${index}`,
      ROSTER_OPERATIVES,
      DEFAULT_ROSTER_GENERATION_CONFIG,
      bias,
    );

    for (const operativeId of roster.startingOperativeIds) {
      appearances[operativeId] += 1;
    }
  }

  return appearances;
}
