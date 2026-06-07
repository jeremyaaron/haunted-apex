import { getActionDefinition } from '../content';
import { getResolvedActionDelta, newGame } from '../simulation';
import {
  applyVenueModifiers,
  calculateRiskChance,
  getActionPreview,
  getOrderAvailability,
  pressureDeltaToView,
  riskLabel,
  selectActionCards,
} from './previews';
import { getRivalPressureTier } from './rivals';

describe('action previews', () => {
  it('includes resource cost and pressure effects', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel');

    expect(preview).toEqual(
      jasmine.objectContaining({
        actionId: 'gather_intel',
        commandCost: 1,
        resourceCost: 400,
        adjustedResourceCost: 400,
        baseEffects: {
          intel: 10,
          heat: 2,
        },
        adjustedEffects: {
          intel: 10,
          heat: 2,
        },
      }),
    );
  });

  it('applies Mara Voss Gather Intel modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel', 'op_mara_voss');

    expect(preview?.adjustedEffects).toEqual({
      heat: 1,
      intel: 10,
    });
    expect(preview?.riskLabel).toBe('Very Low');
  });

  it('applies Juno Hex Gather Intel modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel', 'op_juno_hex');

    expect(preview?.adjustedEffects).toEqual({
      heat: 2,
      intel: 13,
      ruin: 1,
    });
  });

  it('applies Saint Calder Bribe Official modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'bribe_official', 'op_saint_calder');

    expect(preview?.resourceCost).toBe(1200);
    expect(preview?.adjustedResourceCost).toBe(900);
    expect(preview?.adjustedEffects).toEqual({
      heat: -12,
      intel: 2,
      ruin: 2,
    });
  });

  it('applies district wealth to Resource-producing actions', () => {
    const preview = getActionPreview(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'run_small_job',
      undefined,
      {
        type: 'district',
        id: 'district_violet_ward',
      },
    );

    expect(preview?.adjustedEffects.resources).toBe(1620);
  });

  it('applies district secrecy to Intel-producing actions', () => {
    const preview = getActionPreview(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'gather_intel',
      undefined,
      {
        type: 'district',
        id: 'district_ghostline_market',
      },
    );

    expect(preview?.adjustedEffects.intel).toBe(12);
  });

  it('uses current local heat for positive Heat modifiers', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const heatedState = {
      ...state,
      districts: {
        ...state.districts,
        district_violet_ward: {
          ...state.districts.district_violet_ward,
          heat: 60,
        },
      },
    };
    const preview = getActionPreview(heatedState, 'gather_intel', undefined, {
      type: 'district',
      id: 'district_violet_ward',
    });

    expect(preview?.adjustedEffects.heat).toBe(5);
  });

  it('composes operative, district, and venue modifiers in order', () => {
    const preview = getActionPreview(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'gather_intel',
      'op_juno_hex',
      {
        type: 'venue',
        id: 'venue_glass_saint',
      },
    );

    expect(preview?.adjustedEffects).toEqual({
      heat: 5,
      intel: 18,
      ruin: 3,
    });
  });

  it('does not let venue modifiers introduce unrelated pressure keys', () => {
    const preview = getActionPreview(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'recruit_operative',
      undefined,
      {
        type: 'venue',
        id: 'venue_pale_circuit',
      },
    );

    expect(preview?.adjustedEffects).toEqual({
      dominion: 1,
      loyalty: -3,
    });
    expect(preview?.adjustedEffects.intel).toBeUndefined();
    expect(preview?.adjustedEffects.heat).toBeUndefined();
  });

  it('makes safe and dangerous venues trade Dominion yield for pressure', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const paleCircuit = getActionPreview(state, 'expand_influence', undefined, {
      type: 'venue',
      id: 'venue_pale_circuit',
    });
    const glassSaint = getActionPreview(state, 'expand_influence', undefined, {
      type: 'venue',
      id: 'venue_glass_saint',
    });

    expect(paleCircuit?.adjustedEffects.dominion).toBe(7);
    expect(paleCircuit?.adjustedEffects.heat).toBe(8);
    expect(glassSaint?.adjustedEffects.dominion).toBe(11);
    expect(glassSaint?.adjustedEffects.heat).toBe(11);
  });

  it('normalizes a venue modifier that cancels an existing effect', () => {
    expect(
      applyVenueModifiers(
        {
          heat: 1,
        },
        {
          id: 'venue_pale_circuit',
          name: 'The Pale Circuit',
          archetype: 'failing_lounge',
          districtId: 'district_violet_ward',
          wealthMod: 0,
          intelMod: 0,
          dominionMod: 0,
          heatMod: -1,
          loyaltyMod: 0,
          ruinMod: 0,
          tags: [],
        },
      ),
    ).toEqual({});
  });

  it('maps qualitative risk labels at configured thresholds', () => {
    expect(riskLabel(3)).toBe('Very Low');
    expect(riskLabel(6)).toBe('Very Low');
    expect(riskLabel(7)).toBe('Low');
    expect(riskLabel(14)).toBe('Low');
    expect(riskLabel(15)).toBe('Moderate');
    expect(riskLabel(24)).toBe('Moderate');
    expect(riskLabel(25)).toBe('High');
    expect(riskLabel(34)).toBe('High');
    expect(riskLabel(35)).toBe('Severe');
  });

  it('calculates risk from skill, stress, and loyalty', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const action = getActionDefinition('expand_influence');
    const saint = state.operatives.find((operative) => operative.id === 'op_saint_calder');

    if (!action || !saint) {
      fail('Expected action and operative to exist');
      return;
    }

    expect(calculateRiskChance(action, saint)).toBe(10);
  });

  it('adds local heat risk and applies control reductions', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const action = getActionDefinition('run_small_job');

    if (!action) {
      fail('Expected action to exist');
      return;
    }

    const target = {
      type: 'district',
      id: 'district_violet_ward',
    } as const;
    const heatedState = {
      ...state,
      districts: {
        ...state.districts,
        district_violet_ward: {
          ...state.districts.district_violet_ward,
          heat: 40,
          control: 40,
        },
      },
    };
    const uncontrolledState = {
      ...heatedState,
      districts: {
        ...heatedState.districts,
        district_violet_ward: {
          ...heatedState.districts.district_violet_ward,
          control: 0,
        },
      },
    };
    const controlledState = {
      ...heatedState,
      districts: {
        ...heatedState.districts,
        district_violet_ward: {
          ...heatedState.districts.district_violet_ward,
          control: 70,
        },
      },
    };

    expect(calculateRiskChance(action, undefined, uncontrolledState, target)).toBe(24);
    expect(calculateRiskChance(action, undefined, heatedState, target)).toBe(22);
    expect(calculateRiskChance(action, undefined, controlledState, target)).toBe(20);
  });

  it('keeps target-adjusted risk clamped', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const lowRiskAction = getActionDefinition('lay_low');
    const highRiskAction = getActionDefinition('run_small_job');
    const mara = state.operatives.find((operative) => operative.id === 'op_mara_voss');

    if (!lowRiskAction || !highRiskAction || !mara) {
      fail('Expected actions and operative to exist');
      return;
    }

    const target = {
      type: 'district',
      id: 'district_violet_ward',
    } as const;
    const extremeState = {
      ...state,
      districts: {
        ...state.districts,
        district_violet_ward: {
          ...state.districts.district_violet_ward,
          heat: 100,
          control: 100,
        },
      },
    };
    const compromisedMara = {
      ...mara,
      violence: 0,
      stress: 100,
      loyalty: 0,
    };

    expect(calculateRiskChance(lowRiskAction, undefined, extremeState, target)).toBe(8);
    expect(calculateRiskChance(highRiskAction, compromisedMara, extremeState, target)).toBe(45);
  });

  it('projects controlled-target rival attention and local impact', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const pressuredState = {
      ...state,
      rivals: {
        ...state.rivals,
        rival_nyx_ardent: {
          ...state.rivals.rival_nyx_ardent,
          pressure: 20,
        },
      },
    };
    const preview = getActionPreview(pressuredState, 'expand_influence', undefined, {
      type: 'district',
      id: 'district_violet_ward',
    });

    expect(preview?.targetLabel).toBe('Violet Ward');
    expect(preview?.rivalAttention).toEqual({
      rivalId: 'rival_nyx_ardent',
      rivalName: 'Nyx Ardent',
      pressureGain: 14,
      currentPressure: 20,
      projectedPressure: 34,
      projectedTier: 'interested',
    });
    expect(preview?.localImpact).toEqual({
      districtId: 'district_violet_ward',
      districtName: 'Violet Ward',
      controlGain: 12,
      localHeatGain: 3,
    });
  });

  it('maps rival pressure tiers at exact boundaries', () => {
    expect(getRivalPressureTier(24)).toBe('watching');
    expect(getRivalPressureTier(25)).toBe('interested');
    expect(getRivalPressureTier(49)).toBe('interested');
    expect(getRivalPressureTier(50)).toBe('provoked');
    expect(getRivalPressureTier(74)).toBe('provoked');
    expect(getRivalPressureTier(75)).toBe('retaliating');
  });

  it('uses the same target effects for preview and clean resolution', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const action = getActionDefinition('run_small_job');
    const target = {
      type: 'venue',
      id: 'venue_zero_mercy',
    } as const;
    const preview = getActionPreview(state, 'run_small_job', 'op_mara_voss', target);

    if (!action || !preview) {
      fail('Expected action and preview to exist');
      return;
    }

    expect(getResolvedActionDelta(action, 'op_mara_voss', false, state, target)).toEqual(
      preview.adjustedEffects,
    );
  });

  it('marks unaffordable actions unavailable', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const brokeState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 300,
      },
    };

    expect(getOrderAvailability(brokeState, { actionId: 'gather_intel' })).toEqual({
      available: false,
      reason: 'not_enough_resources',
    });
  });

  it('marks action cards with availability and operative options', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const cards = selectActionCards(state);
    const recruitCard = cards.find((card) => card.actionId === 'recruit_operative');

    expect(cards.length).toBe(6);
    expect(recruitCard?.state).toBe('unavailable');
    expect(recruitCard?.unavailableReason).toBe('target_required');
    expect(recruitCard?.availableOperatives.every((operative) => operative.disabled)).toBeTrue();
    expect(recruitCard?.availableOperatives[0].reason).toBe('operative_not_allowed');
  });

  it('converts pressure deltas into stable display rows', () => {
    expect(pressureDeltaToView({ heat: -2, intel: 4 })).toEqual([
      {
        id: 'heat',
        value: -2,
      },
      {
        id: 'intel',
        value: 4,
      },
    ]);
  });
});
