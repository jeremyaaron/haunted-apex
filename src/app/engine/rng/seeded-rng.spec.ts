import { createRng, hashSeed, nextFloat, nextInt, normalizeSeed } from './seeded-rng';

describe('seeded RNG', () => {
  it('normalizes seeds', () => {
    expect(normalizeSeed(' violet-ash-1047 ')).toBe('VIOLET-ASH-1047');
  });

  it('uses the default seed when the provided seed is empty', () => {
    expect(normalizeSeed('   ')).toBe('VIOLET-ASH-1047');
  });

  it('hashes the same seed consistently', () => {
    expect(hashSeed('VIOLET-ASH-1047')).toBe(hashSeed('VIOLET-ASH-1047'));
  });

  it('produces the same float sequence for the same seed', () => {
    const first = nextFloat(createRng('VIOLET-ASH-1047'));
    const second = nextFloat(createRng('VIOLET-ASH-1047'));

    expect(first).toEqual(second);
  });

  it('advances the RNG cursor when values are consumed', () => {
    const first = nextInt(createRng('VIOLET-ASH-1047'), 1, 100);
    const second = nextInt(first.rng, 1, 100);

    expect(first.rng.cursor).toBe(1);
    expect(second.rng.cursor).toBe(2);
  });
});

