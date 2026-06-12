import type { FactionState } from '../model';
import {
  ACTIVE_ACCORD_CAP,
  createActiveAccordId,
  FACTION_ACTIVE_ACCORD_CAP,
  hasFactionAccordCapacity,
  hasTotalAccordCapacity,
  isAccordUsed,
} from './accord-caps';

describe('accord caps', () => {
  it('defines the v0.7 active accord caps', () => {
    expect(ACTIVE_ACCORD_CAP).toBe(2);
    expect(FACTION_ACTIVE_ACCORD_CAP).toBe(1);
  });

  it('creates deterministic active accord IDs', () => {
    expect(createActiveAccordId('accord_ashline_clean_corridor', 3)).toBe(
      'active_accord_ashline_clean_corridor_3',
    );
  });

  it('checks total, faction, and used-accord capacity', () => {
    expect(hasTotalAccordCapacity(0)).toBeTrue();
    expect(hasTotalAccordCapacity(1)).toBeTrue();
    expect(hasTotalAccordCapacity(2)).toBeFalse();
    expect(hasFactionAccordCapacity(faction({ activeAccordIds: [] }))).toBeTrue();
    expect(
      hasFactionAccordCapacity(
        faction({ activeAccordIds: ['active_accord_ashline_clean_corridor_1'] }),
      ),
    ).toBeFalse();
    expect(
      isAccordUsed(faction({ usedAccordIds: [] }), 'accord_ashline_clean_corridor'),
    ).toBeFalse();
    expect(
      isAccordUsed(
        faction({ usedAccordIds: ['accord_ashline_clean_corridor'] }),
        'accord_ashline_clean_corridor',
      ),
    ).toBeTrue();
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
