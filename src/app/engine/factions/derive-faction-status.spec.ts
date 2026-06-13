import type { FactionState } from '../model';
import { deriveFactionStatus } from './derive-faction-status';

describe('deriveFactionStatus', () => {
  it('prioritizes hostile and entangled states', () => {
    expect(deriveFactionStatus(faction({ standing: 20, suspicion: 95, obligation: 95 }))).toBe(
      'hostile',
    );
    expect(deriveFactionStatus(faction({ standing: 45, suspicion: 60, obligation: 70 }))).toBe(
      'entangled',
    );
  });

  it('derives indebted, watching, favorable, cold, and neutral states', () => {
    expect(deriveFactionStatus(faction({ suspicion: 59, obligation: 70 }))).toBe('indebted');
    expect(deriveFactionStatus(faction({ suspicion: 70, obligation: 69 }))).toBe('watching');
    expect(deriveFactionStatus(faction({ standing: 70, suspicion: 40 }))).toBe('favorable');
    expect(deriveFactionStatus(faction({ standing: 40, suspicion: 40 }))).toBe('cold');
    expect(deriveFactionStatus(faction({ standing: 45, suspicion: 40, obligation: 20 }))).toBe(
      'neutral',
    );
  });

  function faction(overrides: Partial<FactionState>): FactionState {
    return {
      id: 'faction_ashline_bureau',
      standing: 45,
      suspicion: 35,
      obligation: 0,
      usedAccordIds: [],
      activeAccordIds: [],
      flags: {},
      recentInteractions: [],
      ...overrides,
    };
  }
});
