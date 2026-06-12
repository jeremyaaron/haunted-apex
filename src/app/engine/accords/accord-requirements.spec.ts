import type { AccordRequirement, FactionState, FrontState } from '../model';
import { getUnmetAccordRequirements, isAccordRequirementMet } from './accord-requirements';

describe('accord requirements', () => {
  it('checks faction metric thresholds', () => {
    const faction = factionState({
      standing: 45,
      suspicion: 35,
      obligation: 10,
    });

    expect(isAccordRequirementMet({ metric: 'standing', gte: 40 }, faction, noFronts())).toBeTrue();
    expect(
      isAccordRequirementMet({ metric: 'standing', gte: 50 }, faction, noFronts()),
    ).toBeFalse();
    expect(
      isAccordRequirementMet({ metric: 'suspicion', lte: 40 }, faction, noFronts()),
    ).toBeTrue();
    expect(
      isAccordRequirementMet({ metric: 'obligation', lte: 5 }, faction, noFronts()),
    ).toBeFalse();
  });

  it('checks owned active front requirements', () => {
    const requirement: AccordRequirement = { type: 'owned_front_required' };

    expect(isAccordRequirementMet(requirement, factionState(), noFronts())).toBeFalse();
    expect(
      isAccordRequirementMet(requirement, factionState(), {
        fronts: {
          front_pale_circuit: front({ active: false }),
        },
      }),
    ).toBeFalse();
    expect(
      isAccordRequirementMet(requirement, factionState(), {
        fronts: {
          front_pale_circuit: front({ active: true }),
        },
      }),
    ).toBeTrue();
  });

  it('returns unmet requirements for an accord', () => {
    const unmet = getUnmetAccordRequirements(
      {
        requirements: [
          { metric: 'standing', gte: 50 },
          { metric: 'suspicion', lte: 50 },
          { type: 'owned_front_required' },
        ],
      },
      factionState({ standing: 45, suspicion: 35 }),
      noFronts(),
    );

    expect(unmet).toEqual([{ metric: 'standing', gte: 50 }, { type: 'owned_front_required' }]);
  });

  function noFronts(): { fronts: Partial<Record<FrontState['id'], FrontState>> } {
    return { fronts: {} };
  }

  function factionState(overrides: Partial<FactionState> = {}): FactionState {
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

  function front(overrides: Partial<FrontState> = {}): FrontState {
    return {
      id: 'front_pale_circuit',
      definitionId: 'front_pale_circuit',
      districtId: 'district_violet_ward',
      venueId: 'venue_pale_circuit',
      relatedRivalId: 'rival_nyx_ardent',
      level: 1,
      exposure: 30,
      establishedWeek: 1,
      compromised: false,
      active: true,
      flags: {},
      yieldHistory: [],
      ...overrides,
    };
  }
});
