import type { Pressures } from '../model';
import { diffPressures } from './pressure-attribution';

describe('pressure attribution helpers', () => {
  it('returns non-zero signed pressure deltas in canonical pressure order', () => {
    const before: Pressures = {
      dominion: 20,
      heat: 50,
      loyalty: 42,
      resources: 1200,
      intel: 8,
      ruin: 3,
    };
    const after: Pressures = {
      dominion: 24,
      heat: 43,
      loyalty: 42,
      resources: 900,
      intel: 10,
      ruin: 3,
    };

    expect(diffPressures(before, after)).toEqual([
      {
        pressure: 'dominion',
        before: 20,
        after: 24,
        delta: 4,
      },
      {
        pressure: 'heat',
        before: 50,
        after: 43,
        delta: -7,
      },
      {
        pressure: 'resources',
        before: 1200,
        after: 900,
        delta: -300,
      },
      {
        pressure: 'intel',
        before: 8,
        after: 10,
        delta: 2,
      },
    ]);
  });

  it('returns an empty array when no pressure changed', () => {
    const pressures: Pressures = {
      dominion: 20,
      heat: 50,
      loyalty: 42,
      resources: 1200,
      intel: 8,
      ruin: 3,
    };

    expect(diffPressures(pressures, { ...pressures })).toEqual([]);
  });
});
