import { clampFactionMetric } from './faction-metrics';

describe('faction metrics', () => {
  it('clamps metrics into the supported range', () => {
    expect(clampFactionMetric(-10)).toBe(0);
    expect(clampFactionMetric(44.4)).toBe(44);
    expect(clampFactionMetric(44.5)).toBe(45);
    expect(clampFactionMetric(120)).toBe(100);
  });
});
