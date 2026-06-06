import { getOperativeDefinition, ROSTER_OPERATIVES } from '../content';
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
