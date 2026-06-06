import type { GameState } from '../model';
import { newGame } from '../simulation';
import {
  getTargetControllerId,
  getTargetTags,
  resolveTargetDistrictId,
  selectActionTargetOptions,
} from './territory';

describe('territory selectors', () => {
  it('returns target options in stable district, venue, and rival order', () => {
    const options = selectActionTargetOptions(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'gather_intel',
    );

    expect(options.map((option) => `${option.target.type}:${option.target.id}`)).toEqual([
      'district:district_violet_ward',
      'district:district_chrome_narrows',
      'district:district_ghostline_market',
      'venue:venue_pale_circuit',
      'venue:venue_glass_saint',
      'venue:venue_zero_mercy',
      'venue:venue_black_halo_exchange',
      'rival:rival_nyx_ardent',
      'rival:rival_knox_marrow',
    ]);
  });

  it('returns only target types supported by the action', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(
      selectActionTargetOptions(state, 'bribe_official').map((option) => option.targetType),
    ).toEqual(['district', 'district', 'district', 'rival', 'rival']);
    expect(
      selectActionTargetOptions(state, 'run_small_job').map((option) => option.targetType),
    ).toEqual(['district', 'district', 'district', 'venue', 'venue', 'venue', 'venue']);
  });

  it('omits inactive rivals from rival target options', () => {
    const state = withInactiveRival('rival_nyx_ardent');
    const rivalTargets = selectActionTargetOptions(state, 'gather_intel').filter(
      (option) => option.targetType === 'rival',
    );

    expect(rivalTargets.map((option) => option.target.id)).toEqual(['rival_knox_marrow']);
  });

  it('includes district and controller metadata', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const options = selectActionTargetOptions(state, 'gather_intel');
    const glassSaint = options.find((option) => option.target.id === 'venue_glass_saint');

    expect(glassSaint).toEqual(
      jasmine.objectContaining({
        label: 'The Glass Saint',
        targetType: 'venue',
        districtName: 'Violet Ward',
        controlledByRivalId: 'rival_nyx_ardent',
        controlledByRivalName: 'Nyx Ardent',
      }),
    );
  });

  it('resolves target districts', () => {
    expect(
      resolveTargetDistrictId({
        type: 'district',
        id: 'district_chrome_narrows',
      }),
    ).toBe('district_chrome_narrows');
    expect(
      resolveTargetDistrictId({
        type: 'venue',
        id: 'venue_zero_mercy',
      }),
    ).toBe('district_chrome_narrows');
    expect(
      resolveTargetDistrictId({
        type: 'rival',
        id: 'rival_knox_marrow',
      }),
    ).toBeUndefined();
  });

  it('combines venue and district tags without duplicates', () => {
    expect(
      getTargetTags({
        type: 'venue',
        id: 'venue_pale_circuit',
      }),
    ).toEqual(['nightlife', 'liaison', 'social', 'safe', 'starting']);
  });

  it('uses venue control before parent district control and resolves rival control', () => {
    expect(
      getTargetControllerId({
        type: 'venue',
        id: 'venue_glass_saint',
      }),
    ).toBe('rival_nyx_ardent');
    expect(
      getTargetControllerId({
        type: 'venue',
        id: 'venue_pale_circuit',
      }),
    ).toBe('rival_nyx_ardent');
    expect(
      getTargetControllerId({
        type: 'rival',
        id: 'rival_knox_marrow',
      }),
    ).toBe('rival_knox_marrow');
  });
});

function withInactiveRival(rivalId: 'rival_nyx_ardent' | 'rival_knox_marrow'): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...state.rivals[rivalId],
        active: false,
      },
    },
  };
}
