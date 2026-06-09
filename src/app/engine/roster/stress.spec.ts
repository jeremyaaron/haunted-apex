import { getStressRiskModifier, getStressTier } from './stress';

describe('operative Stress', () => {
  it('uses the documented tier boundaries', () => {
    expect(getStressTier(39)).toBe('stable');
    expect(getStressTier(40)).toBe('strained');
    expect(getStressTier(59)).toBe('strained');
    expect(getStressTier(60)).toBe('unstable');
    expect(getStressTier(79)).toBe('unstable');
    expect(getStressTier(80)).toBe('breaking');
  });

  it('maps Stress tiers to risk modifiers', () => {
    expect(getStressRiskModifier(0)).toBe(0);
    expect(getStressRiskModifier(40)).toBe(2);
    expect(getStressRiskModifier(60)).toBe(5);
    expect(getStressRiskModifier(80)).toBe(10);
  });
});
