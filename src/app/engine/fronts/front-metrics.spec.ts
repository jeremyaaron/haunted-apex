import { getFrontDefinition } from '../content';
import type { FrontState } from '../model';
import { calculateFrontWeeklyYield, clampFrontExposure } from './front-metrics';

describe('Front metrics', () => {
  it('clamps Front exposure to the 0-100 range', () => {
    expect(clampFrontExposure(-1)).toBe(0);
    expect(clampFrontExposure(12.4)).toBe(12);
    expect(clampFrontExposure(12.5)).toBe(13);
    expect(clampFrontExposure(101)).toBe(100);
  });

  it('calculates base weekly yield at level 1 and adds the level 2 bonus at level 2', () => {
    const definition = getFrontDefinition('front_pale_circuit');
    const front = {
      level: 1,
    } as Pick<FrontState, 'level'>;

    expect(definition).toBeDefined();
    expect(calculateFrontWeeklyYield(front, definition!)).toEqual({
      resources: 250,
      loyalty: 1,
    });

    expect(calculateFrontWeeklyYield({ ...front, level: 2 }, definition!)).toEqual({
      dominion: 1,
      loyalty: 2,
      resources: 350,
    });
  });
});
