import type { ActionTarget, GameState, PressureDelta } from '../model';
import { newGame } from './new-game';
import {
  applyLocalDistrictCooling,
  applyTargetedActionConsequences,
} from './district-effects';

describe('targeted action consequences', () => {
  it('adds 12 control for district-targeted Expand Influence', () => {
    const state = applyConsequences('expand_influence', {
      type: 'district',
      id: 'district_violet_ward',
    });

    expect(state.districts.district_violet_ward.control).toBe(24);
  });

  it('adds 8 control for venue-targeted Expand Influence', () => {
    const state = applyConsequences('expand_influence', {
      type: 'venue',
      id: 'venue_glass_saint',
    });

    expect(state.districts.district_violet_ward.control).toBe(20);
  });

  it('adds expected control for Small Job and Gather Intel', () => {
    const smallJob = applyConsequences('run_small_job', {
      type: 'district',
      id: 'district_chrome_narrows',
    });
    const gatherIntel = applyConsequences('gather_intel', {
      type: 'venue',
      id: 'venue_black_halo_exchange',
    });

    expect(smallJob.districts.district_chrome_narrows.control).toBe(11);
    expect(gatherIntel.districts.district_ghostline_market.control).toBe(6);
  });

  it('adds local heat from positive resolved Heat', () => {
    const state = applyConsequences(
      'run_small_job',
      {
        type: 'district',
        id: 'district_chrome_narrows',
      },
      {
        heat: 12,
      },
    );

    expect(state.districts.district_chrome_narrows.heat).toBe(32);
  });

  it('does not lower local heat for negative resolved Heat', () => {
    const state = applyConsequences(
      'lay_low',
      {
        type: 'district',
        id: 'district_violet_ward',
      },
      {
        heat: -12,
      },
    );

    expect(state.districts.district_violet_ward.heat).toBe(20);
  });

  it('increases the controlling rival pressure and clamps it', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const pressuredState = {
      ...state,
      rivals: {
        ...state.rivals,
        rival_nyx_ardent: {
          ...state.rivals.rival_nyx_ardent,
          pressure: 95,
        },
      },
    };
    const result = applyTargetedActionConsequences(
      pressuredState,
      'expand_influence',
      {
        type: 'venue',
        id: 'venue_glass_saint',
      },
      {},
    );

    expect(result.rivals.rival_nyx_ardent.pressure).toBe(100);
  });

  it('does not add rival pressure for uncontrolled territory', () => {
    const state = applyConsequences('run_small_job', {
      type: 'venue',
      id: 'venue_black_halo_exchange',
    });

    expect(state.rivals.rival_nyx_ardent.pressure).toBe(0);
    expect(state.rivals.rival_knox_marrow.pressure).toBe(0);
  });

  it('adds pressure for a direct rival target without changing districts', () => {
    const initial = newGame({ seed: 'VIOLET-ASH-1047' });
    const state = applyTargetedActionConsequences(
      initial,
      'gather_intel',
      {
        type: 'rival',
        id: 'rival_knox_marrow',
      },
      {
        heat: 4,
      },
    );

    expect(state.rivals.rival_knox_marrow.pressure).toBe(4);
    expect(state.districts).toEqual(initial.districts);
  });
});

describe('local district cooling', () => {
  it('cools each district by one without falling below base heat', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const heatedState = {
      ...state,
      districts: {
        ...state.districts,
        district_violet_ward: {
          ...state.districts.district_violet_ward,
          heat: 24,
        },
      },
    };
    const cooled = applyLocalDistrictCooling(heatedState);

    expect(cooled.districts.district_violet_ward.heat).toBe(23);
    expect(cooled.districts.district_chrome_narrows.heat).toBe(28);
    expect(cooled.districts.district_ghostline_market.heat).toBe(14);
  });
});

function applyConsequences(
  actionId: 'expand_influence' | 'run_small_job' | 'gather_intel' | 'lay_low',
  target: ActionTarget,
  delta: PressureDelta = {},
): GameState {
  return applyTargetedActionConsequences(
    newGame({ seed: 'VIOLET-ASH-1047' }),
    actionId,
    target,
    delta,
  );
}
