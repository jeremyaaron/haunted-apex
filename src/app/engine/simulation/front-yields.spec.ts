import type { FrontState, GameState } from '../model';
import { newGame } from './new-game';
import { applyWeeklyFrontYields } from './front-yields';

describe('applyWeeklyFrontYields', () => {
  it('applies level 1 weekly yield, exposure, district control, history, and log output', () => {
    const state = newGame({ seed: 'FRONT-YIELD-L1' });
    const resolved = applyWeeklyFrontYields(state);

    expect(resolved.pressures.resources).toBe(state.pressures.resources + 250);
    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty + 1);
    expect(resolved.districts.district_violet_ward.control).toBe(
      state.districts.district_violet_ward.control + 1,
    );
    expect(resolved.fronts.front_pale_circuit?.exposure).toBe(14);
    expect(resolved.fronts.front_pale_circuit?.yieldHistory).toEqual([
      {
        week: 1,
        effects: {
          resources: 250,
          loyalty: 1,
        },
        exposureDelta: 2,
      },
    ]);
    expect(resolved.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'front_yield',
        title: 'Front Network Yield',
        pressureDelta: {
          resources: 250,
          loyalty: 1,
        },
        tags: jasmine.arrayContaining(['FRONT', 'YIELD', 'front_pale_circuit']),
      }),
    );
  });

  it('adds level 2 bonus yield and one extra weekly exposure', () => {
    const state = withFront('front_pale_circuit', {
      level: 2,
      exposure: 20,
    });
    const resolved = applyWeeklyFrontYields(state);

    expect(resolved.pressures.dominion).toBe(state.pressures.dominion + 1);
    expect(resolved.pressures.resources).toBe(state.pressures.resources + 350);
    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty + 2);
    expect(resolved.fronts.front_pale_circuit?.exposure).toBe(23);
    expect(resolved.fronts.front_pale_circuit?.yieldHistory.at(-1)).toEqual({
      week: 1,
      effects: {
        resources: 350,
        loyalty: 2,
        dominion: 1,
      },
      exposureDelta: 3,
    });
  });

  it('clamps district control and explicit weekly rival pressure', () => {
    const state = withFront('front_zero_mercy_cut', {
      districtId: 'district_chrome_narrows',
      venueId: 'venue_zero_mercy',
      relatedRivalId: 'rival_knox_marrow',
      exposure: 98,
    });
    state.districts.district_chrome_narrows.control = 99;
    state.rivals.rival_knox_marrow.pressure = 99;

    const resolved = applyWeeklyFrontYields(state);

    expect(resolved.pressures.resources).toBe(state.pressures.resources + 400);
    expect(resolved.pressures.dominion).toBe(state.pressures.dominion + 1);
    expect(resolved.pressures.heat).toBe(state.pressures.heat + 3);
    expect(resolved.districts.district_chrome_narrows.control).toBe(100);
    expect(resolved.rivals.rival_knox_marrow.pressure).toBe(100);
    expect(resolved.fronts.front_zero_mercy_cut?.exposure).toBe(100);
  });

  it('does not apply generic Heat or Loyalty penalties solely from high exposure', () => {
    const state = withFront('front_pale_circuit', {
      exposure: 90,
    });
    const resolved = applyWeeklyFrontYields(state);

    expect(resolved.pressures.heat).toBe(state.pressures.heat);
    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty + 1);
    expect(resolved.fronts.front_pale_circuit?.exposure).toBe(92);
  });

  it('skips inactive fronts', () => {
    const state = withFront('front_pale_circuit', {
      active: false,
    });
    const resolved = applyWeeklyFrontYields(state);

    expect(resolved).toBe(state);
  });
});

function withFront(
  frontId: FrontState['id'],
  overrides: Partial<FrontState>,
): GameState {
  const state = newGame({ seed: `FRONT-YIELD-${frontId}` });
  const existing = state.fronts[frontId] ?? {
    id: frontId,
    definitionId: frontId,
    districtId: 'district_violet_ward',
    level: 1,
    exposure: 10,
    establishedWeek: 1,
    compromised: false,
    active: true,
    flags: {},
    yieldHistory: [],
  };

  return {
    ...state,
    fronts: {
      [frontId]: {
        ...existing,
        ...overrides,
      },
    },
  };
}
