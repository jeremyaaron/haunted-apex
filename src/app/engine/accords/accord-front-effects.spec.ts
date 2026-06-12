import type { FrontState } from '../model';
import { previewAccordFrontEffect, selectHighestExposureFront } from './accord-front-effects';

describe('accord front effects', () => {
  it('selects the highest-exposure active front with deterministic tie-breaking', () => {
    const selected = selectHighestExposureFront({
      fronts: {
        front_pale_circuit: front({
          id: 'front_pale_circuit',
          definitionId: 'front_pale_circuit',
          exposure: 80,
        }),
        front_black_clinic: front({
          id: 'front_black_clinic',
          definitionId: 'front_black_clinic',
          exposure: 80,
        }),
        front_zero_mercy_cut: front({
          id: 'front_zero_mercy_cut',
          definitionId: 'front_zero_mercy_cut',
          exposure: 60,
        }),
      },
    });

    expect(selected?.id).toBe('front_black_clinic');
  });

  it('ignores inactive fronts and returns undefined when no active front exists', () => {
    expect(
      selectHighestExposureFront({
        fronts: {
          front_zero_mercy_cut: front({
            id: 'front_zero_mercy_cut',
            definitionId: 'front_zero_mercy_cut',
            exposure: 95,
            active: false,
          }),
        },
      }),
    ).toBeUndefined();
  });

  it('previews highest-exposure front cooling and clamps projected exposure', () => {
    const preview = previewAccordFrontEffect(
      {
        fronts: {
          front_zero_mercy_cut: front({
            id: 'front_zero_mercy_cut',
            definitionId: 'front_zero_mercy_cut',
            exposure: 7,
          }),
        },
      },
      { type: 'cool_highest_exposure_front', exposureDelta: -10 },
    );

    expect(preview).toEqual({
      type: 'cool_highest_exposure_front',
      frontId: 'front_zero_mercy_cut',
      frontName: 'Zero Mercy Cut',
      currentExposure: 7,
      exposureDelta: -10,
      projectedExposure: 0,
    });
  });

  function front(overrides: Partial<FrontState>): FrontState {
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
