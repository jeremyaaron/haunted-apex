import {
  DISTRICT_ZERO_RECRUIT_POOL,
  DISTRICT_ZERO_STARTING_OPERATIVES,
  getOperativeDefinition,
  getTraitDefinition,
  ROSTER_OPERATIVES,
  ROSTER_TRAITS,
} from './index';
import type {
  OperativeDefinition,
  OperativeRarity,
  OperativeRoleTag,
} from '../model';
import { getStressTier } from '../roster';

describe('Roster content', () => {
  const operatives: readonly OperativeDefinition[] = ROSTER_OPERATIVES;

  it('defines exactly ten unique operatives', () => {
    const operativeIds = operatives.map((operative) => operative.id);

    expect(operativeIds.length).toBe(10);
    expect(new Set(operativeIds).size).toBe(10);
  });

  it('uses only supported rarities and role tags', () => {
    const rarities = new Set<OperativeRarity>(['common', 'uncommon', 'rare']);
    const roleTags = new Set<OperativeRoleTag>([
      'intel',
      'social',
      'violence',
      'tech',
      'heat_control',
      'money',
      'ruin',
      'stability',
      'rival_pressure',
      'recruitment',
    ]);

    for (const operative of operatives) {
      expect(rarities.has(operative.rarity))
        .withContext(`${operative.id} has rarity ${operative.rarity}`)
        .toBeTrue();

      for (const roleTag of operative.roleTags) {
        expect(roleTags.has(roleTag))
          .withContext(`${operative.id} has role tag ${roleTag}`)
          .toBeTrue();
      }
    }

    expect(getOperativeDefinition('op_mother_neon')?.rarity).toBe('rare');
  });

  it('resolves one signature and at most one liability for every operative', () => {
    for (const operative of operatives) {
      const signature = getTraitDefinition(operative.signatureTraitId);

      expect(signature)
        .withContext(`${operative.id} references ${operative.signatureTraitId}`)
        .toBeDefined();
      expect(signature?.kind)
        .withContext(`${operative.id} signature must be a signature trait`)
        .toBe('signature');

      if (operative.liabilityTraitId) {
        const liability = getTraitDefinition(operative.liabilityTraitId);

        expect(liability)
          .withContext(`${operative.id} references ${operative.liabilityTraitId}`)
          .toBeDefined();
        expect(liability?.kind)
          .withContext(`${operative.id} liability must be a liability trait`)
          .toBe('liability');
      }
    }
  });

  it('defines unique trait and affinity IDs', () => {
    const traitIds = ROSTER_TRAITS.map((trait) => trait.id);
    const affinityIds = operatives.flatMap((operative) =>
      operative.affinities.map((affinity) => affinity.id),
    );

    expect(new Set(traitIds).size).toBe(traitIds.length);
    expect(new Set(affinityIds).size).toBe(affinityIds.length);
    expect(affinityIds.every((id) => id.length > 0)).toBeTrue();
  });

  it('keeps starting Loyalty and Stress in range and below Unstable', () => {
    for (const operative of operatives) {
      expect(operative.startingLoyalty)
        .withContext(`${operative.id} starting Loyalty`)
        .toBeGreaterThanOrEqual(0);
      expect(operative.startingLoyalty)
        .withContext(`${operative.id} starting Loyalty`)
        .toBeLessThanOrEqual(100);
      expect(operative.startingStress)
        .withContext(`${operative.id} starting Stress`)
        .toBeGreaterThanOrEqual(0);
      expect(operative.startingStress)
        .withContext(`${operative.id} starting Stress`)
        .toBeLessThanOrEqual(100);
      expect(['stable', 'strained']).toContain(getStressTier(operative.startingStress));
    }
  });

  it('preserves the existing six operative stats', () => {
    const existingOperatives = [
      ...DISTRICT_ZERO_STARTING_OPERATIVES,
      ...DISTRICT_ZERO_RECRUIT_POOL,
    ];

    for (const existing of existingOperatives) {
      const definition = operatives.find((operative) => operative.id === existing.id);

      expect(definition)
        .withContext(`missing definition for ${existing.id}`)
        .toBeDefined();
      expect(definition?.baseStats).toEqual({
        violence: existing.violence,
        charm: existing.charm,
        tech: existing.tech,
        subtlety: existing.subtlety,
      });
    }
  });

  it('looks up each operative and trait by explicit ID', () => {
    for (const operative of operatives) {
      expect(getOperativeDefinition(operative.id)).toBe(operative);
    }

    for (const trait of ROSTER_TRAITS) {
      expect(getTraitDefinition(trait.id)).toBe(trait);
    }
  });
});
