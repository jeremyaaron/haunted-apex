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

  it('burns contacts when volatility, exposure, or volatile trust collapse hits the limit', () => {
    expect(
      applyContactMetricDelta(contact({ volatility: 94 }), {
        volatility: 8,
      }).burned,
    ).toBeTrue();
    expect(
      applyContactMetricDelta(contact({ exposure: 98 }), {
        exposure: 4,
      }).burned,
    ).toBeTrue();
    expect(
      applyContactMetricDelta(contact({ trust: 3, volatility: 78 }), {
        trust: -6,
      }).burned,
    ).toBeTrue();
    expect(
      applyContactMetricDelta(contact({ trust: 3, volatility: 50 }), {
        trust: -6,
      }).burned,
    ).toBeFalse();
  });
});

function contact(overrides: Partial<ContactState>): ContactState {
  return {
    id: 'contact_veyra_lux',
    trust: 45,
    leverage: 20,
    volatility: 40,
    exposure: 30,
    burned: false,
    recentInteractions: [],
    flags: {},
    ...overrides,
  };
}
