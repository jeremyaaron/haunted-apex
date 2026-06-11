import type { ContactState } from '../model';
import { deriveContactStatus } from './derive-contact-status';

describe('deriveContactStatus', () => {
  it('prioritizes burned and volatile states', () => {
    expect(deriveContactStatus(contact({ burned: true, volatility: 90 }))).toBe('burned');
    expect(deriveContactStatus(contact({ volatility: 75, trust: 80 }))).toBe('volatile');
  });

  it('derives trusted, pressured, entangled, cold, and useful states', () => {
    expect(deriveContactStatus(contact({ trust: 70, leverage: 49 }))).toBe('trusted');
    expect(deriveContactStatus(contact({ trust: 49, leverage: 65 }))).toBe('pressured');
    expect(deriveContactStatus(contact({ trust: 50, leverage: 50 }))).toBe('entangled');
    expect(deriveContactStatus(contact({ trust: 24, leverage: 24 }))).toBe('cold');
    expect(deriveContactStatus(contact({ trust: 45, leverage: 30 }))).toBe('useful');
  });

  function contact(overrides: Partial<ContactState>): ContactState {
    return {
      id: 'contact_veyra_lux',
      trust: 40,
      leverage: 20,
      volatility: 30,
      exposure: 30,
      burned: false,
      recentInteractions: [],
      flags: {},
      ...overrides,
    };
  }
});
