import { deriveFrontStatus } from './derive-front-status';

describe('deriveFrontStatus', () => {
  it('maps exact exposure thresholds to Front status', () => {
    expect(deriveFrontStatus(0)).toBe('quiet');
    expect(deriveFrontStatus(29)).toBe('quiet');
    expect(deriveFrontStatus(30)).toBe('noticed');
    expect(deriveFrontStatus(59)).toBe('noticed');
    expect(deriveFrontStatus(60)).toBe('hot');
    expect(deriveFrontStatus(79)).toBe('hot');
    expect(deriveFrontStatus(80)).toBe('compromised');
    expect(deriveFrontStatus(100)).toBe('compromised');
  });
});
