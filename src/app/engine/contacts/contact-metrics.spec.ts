import type { ContactState } from '../model';
import { applyContactMetricDelta, clampContactMetric } from './contact-metrics';

describe('contact metrics', () => {
  it('clamps metrics into the supported range', () => {
    expect(clampContactMetric(-12)).toBe(0);
    expect(clampContactMetric(45.4)).toBe(45);
    expect(clampContactMetric(45.5)).toBe(46);
    expect(clampContactMetric(140)).toBe(100);
  });

  it('applies contact metric deltas without mutating the original state', () => {
    const original: ContactState = {
      id: 'contact_ciro_moth',
      trust: 5,
      leverage: 95,
      volatility: 50,
      exposure: 20,
      burned: false,
      recentInteractions: [],
      flags: {},
    };

    const updated = applyContactMetricDelta(original, {
      trust: -10,
      leverage: 10,
      volatility: 12,
      exposure: -5,
    });

    expect(updated).toEqual(
      jasmine.objectContaining({
        trust: 0,
        leverage: 100,
        volatility: 62,
        exposure: 15,
      }),
    );
    expect(original.trust).toBe(5);
    expect(original.leverage).toBe(95);
  });
});
