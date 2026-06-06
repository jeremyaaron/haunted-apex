import type { GameState, RivalId } from '../model';
import { newGame } from './new-game';
import { applyRivalPassiveEffects } from './rival-effects';

describe('rival passive effects', () => {
  it('does not apply Nyx Ardent below pressure 60', () => {
    const state = withRivalPressure('rival_nyx_ardent', 59);
    const resolved = applyRivalPassiveEffects(state);

    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty);
    expect(resolved.eventLog).toEqual([]);
  });

  it('does not apply Nyx Ardent when Intel is at least 20', () => {
    const state = {
      ...withRivalPressure('rival_nyx_ardent', 60),
      pressures: {
        ...newGame().pressures,
        intel: 20,
      },
    };
    const resolved = applyRivalPassiveEffects(state);

    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty);
    expect(resolved.eventLog).toEqual([]);
  });

  it('applies and logs Nyx Ardent Loyalty pressure under the full condition', () => {
    const state = withRivalPressure('rival_nyx_ardent', 60);
    const resolved = applyRivalPassiveEffects(state);

    expect(resolved.pressures.loyalty).toBe(state.pressures.loyalty - 3);
    expect(resolved.eventLog).toEqual([
      jasmine.objectContaining({
        type: 'rival_effect',
        title: jasmine.stringContaining('Nyx Ardent'),
        pressureDelta: {
          loyalty: -3,
        },
        tags: jasmine.arrayContaining(['RIVAL', 'LOYALTY', 'rival_nyx_ardent']),
      }),
    ]);
  });

  it('applies and clamps Knox Marrow Heat pressure at pressure 60', () => {
    const state = {
      ...withRivalPressure('rival_knox_marrow', 60),
      pressures: {
        ...newGame().pressures,
        heat: 99,
      },
    };
    const resolved = applyRivalPassiveEffects(state);

    expect(resolved.pressures.heat).toBe(100);
    expect(resolved.eventLog).toEqual([
      jasmine.objectContaining({
        type: 'rival_effect',
        title: jasmine.stringContaining('Knox Marrow'),
        pressureDelta: {
          heat: 3,
        },
        tags: jasmine.arrayContaining(['RIVAL', 'HEAT', 'rival_knox_marrow']),
      }),
    ]);
  });

  it('applies each rival effect at most once per week', () => {
    const state = withRivalPressure(
      'rival_knox_marrow',
      60,
      withRivalPressure('rival_nyx_ardent', 60),
    );
    const firstResolution = applyRivalPassiveEffects(state);
    const secondResolution = applyRivalPassiveEffects(firstResolution);

    expect(secondResolution.pressures.loyalty).toBe(state.pressures.loyalty - 3);
    expect(secondResolution.pressures.heat).toBe(state.pressures.heat + 3);
    expect(
      secondResolution.eventLog.filter((entry) => entry.type === 'rival_effect').length,
    ).toBe(2);
  });

  it('does not apply effects from inactive rivals', () => {
    const pressured = withRivalPressure(
      'rival_knox_marrow',
      60,
      withRivalPressure('rival_nyx_ardent', 60),
    );
    const state: GameState = {
      ...pressured,
      rivals: {
        rival_nyx_ardent: {
          ...pressured.rivals.rival_nyx_ardent,
          active: false,
        },
        rival_knox_marrow: {
          ...pressured.rivals.rival_knox_marrow,
          active: false,
        },
      },
    };
    const resolved = applyRivalPassiveEffects(state);

    expect(resolved.pressures).toEqual(state.pressures);
    expect(resolved.eventLog).toEqual([]);
  });
});

function withRivalPressure(
  rivalId: RivalId,
  pressure: number,
  state: GameState = newGame({ seed: 'VIOLET-ASH-1047' }),
): GameState {
  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...state.rivals[rivalId],
        pressure,
      },
    },
  };
}
