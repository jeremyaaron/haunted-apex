import { getActionDefinition, getFrontDefinition } from '../content';
import type { FrontDefinitionId, FrontState, GameState } from '../model';
import { newGame } from '../simulation';
import {
  getActionPreview,
  getOrderAvailability,
  selectActionTargetOptions,
} from '../selectors';
import { previewFrontInvestment } from './front-investment';

describe('Front investment previews', () => {
  it('defines Invest in Front as a targeted order without operative assignment', () => {
    expect(getActionDefinition('invest_front')).toEqual(
      jasmine.objectContaining({
        requiresTarget: true,
        assignment: 'none',
        allowedTargetTypes: ['front_opportunity', 'front'],
      }),
    );
    expect(
      getOrderAvailability(newGame({ seed: 'FRONT-ACTION' }), {
        actionId: 'invest_front',
      }),
    ).toEqual({
      available: false,
      reason: 'target_required',
    });
  });

  it('rejects operative assignment on Invest in Front', () => {
    const state = newGame({ seed: 'FRONT-ASSIGNMENT' });
    const target = {
      type: 'front_opportunity' as const,
      id: state.frontOpportunities[0].id,
    };

    expect(
      getOrderAvailability(state, {
        actionId: 'invest_front',
        assignedOperativeId: state.operatives[0].id,
        target,
      }),
    ).toEqual({
      available: false,
      reason: 'operative_not_allowed',
    });
  });

  it('includes generated opportunities and owned level 1 fronts as targets', () => {
    const state = newGame({ seed: 'FRONT-TARGETS' });
    const options = selectActionTargetOptions(state, 'invest_front');

    expect(
      options.flatMap((option) =>
        option.target.type === 'front_opportunity' ? [option.target.id] : [],
      ),
    ).toEqual(state.frontOpportunities.map((opportunity) => opportunity.id));
    expect(options).toContain(
      jasmine.objectContaining({
        target: {
          type: 'front',
          id: 'front_pale_circuit',
        },
        label: 'The Pale Circuit - Upgrade',
        targetType: 'front',
        mode: 'upgrade',
        affordable: true,
      }),
    );
  });

  it('keeps level 2 fronts visible as max-level unavailable targets', () => {
    const state = withFrontLevel(newGame({ seed: 'FRONT-MAX' }), 'front_pale_circuit', 2);
    const paleCircuit = selectActionTargetOptions(state, 'invest_front').find(
      (option) => option.target.type === 'front' && option.target.id === 'front_pale_circuit',
    );

    expect(paleCircuit).toEqual(
      jasmine.objectContaining({
        targetType: 'front',
        affordable: false,
        unavailableReason: 'front_already_max_level',
      }),
    );
    expect(
      getOrderAvailability(state, {
        actionId: 'invest_front',
        target: {
          type: 'front',
          id: 'front_pale_circuit',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'front_already_max_level',
    });
  });

  it('shows establish cost, effects, yield, exposure, status, and rival warning', () => {
    const state = findStateWithOpportunity('front_zero_mercy_cut');
    const opportunity = state.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_zero_mercy_cut',
    );

    expect(opportunity).toBeDefined();
    const preview = previewFrontInvestment(state, {
      type: 'front_opportunity',
      id: opportunity!.id,
    });

    expect(preview).toEqual(
      jasmine.objectContaining({
        ok: true,
        mode: 'establish',
        frontName: 'Zero Mercy Cut',
        districtId: 'district_chrome_narrows',
        venueId: 'venue_zero_mercy',
        relatedRivalId: 'rival_knox_marrow',
        cost: 1900,
        effects: {
          dominion: 4,
          heat: 6,
        },
        weeklyYield: {
          resources: 400,
          dominion: 1,
          heat: 3,
        },
        districtControlYield: 2,
        exposureChange: 30,
        projectedExposure: 30,
        projectedStatus: 'noticed',
        weeklyExposureGain: 8,
      }),
    );
    expect(preview.ok ? preview.rivalPressureWarning : undefined).toEqual({
      rivalId: 'rival_knox_marrow',
      rivalName: 'Knox Marrow',
      pressureGain: 12,
      currentPressure: 0,
      projectedPressure: 12,
      projectedTier: 'watching',
      weeklyPressureGain: 4,
    });
  });

  it('shows upgrade cost, effects, updated weekly yield, exposure, and status', () => {
    const state = newGame({ seed: 'FRONT-UPGRADE' });
    const preview = getActionPreview(state, 'invest_front', undefined, {
      type: 'front',
      id: 'front_pale_circuit',
    });

    expect(preview).toEqual(
      jasmine.objectContaining({
        adjustedResourceCost: 2100,
        adjustedEffects: {
          dominion: 2,
          heat: 3,
        },
      }),
    );
    expect(preview?.frontInvestment).toEqual(
      jasmine.objectContaining({
        ok: true,
        mode: 'upgrade',
        frontName: 'The Pale Circuit',
        cost: 2100,
        weeklyYield: {
          resources: 350,
          loyalty: 2,
          dominion: 1,
        },
        districtControlYield: 1,
        currentExposure: 12,
        exposureChange: 14,
        projectedExposure: 26,
        projectedStatus: 'quiet',
        weeklyExposureGain: 2,
      }),
    );
  });

  it('blocks establish at the cap but keeps upgrades available', () => {
    const state = withFrontsAtCap(newGame({ seed: 'FRONT-CAP' }));
    const opportunity = state.frontOpportunities.find(
      (candidate) => !state.fronts[candidate.definitionId],
    );

    expect(opportunity).toBeDefined();
    const opportunityTarget = {
      type: 'front_opportunity' as const,
      id: opportunity!.id,
    };

    expect(
      getOrderAvailability(state, {
        actionId: 'invest_front',
        target: opportunityTarget,
      }),
    ).toEqual({
      available: false,
      reason: 'front_cap_reached',
    });
    expect(
      getOrderAvailability(state, {
        actionId: 'invest_front',
        target: {
          type: 'front',
          id: 'front_pale_circuit',
        },
      }),
    ).toEqual({
      available: true,
    });
  });

  it('marks unaffordable establish targets unavailable', () => {
    const state = {
      ...newGame({ seed: 'FRONT-POOR' }),
      pressures: {
        ...newGame({ seed: 'FRONT-POOR' }).pressures,
        resources: 0,
      },
    };
    const target = {
      type: 'front_opportunity' as const,
      id: state.frontOpportunities[0].id,
    };
    const option = selectActionTargetOptions(state, 'invest_front').find(
      (candidate) => candidate.target.type === 'front_opportunity' &&
        candidate.target.id === target.id,
    );

    expect(option).toEqual(
      jasmine.objectContaining({
        affordable: false,
        unavailableReason: 'not_enough_resources',
      }),
    );
    expect(
      getOrderAvailability(state, {
        actionId: 'invest_front',
        target,
      }),
    ).toEqual({
      available: false,
      reason: 'not_enough_resources',
    });
  });
});

function findStateWithOpportunity(definitionId: FrontDefinitionId): GameState {
  for (let index = 0; index < 100; index += 1) {
    const state = newGame({ seed: `FRONT-SEED-${index}` });

    if (state.frontOpportunities.some((opportunity) => opportunity.definitionId === definitionId)) {
      return state;
    }
  }

  throw new Error(`Could not find generated opportunity ${definitionId}.`);
}

function withFrontLevel(
  state: GameState,
  frontId: FrontState['id'],
  level: FrontState['level'],
): GameState {
  return {
    ...state,
    fronts: {
      ...state.fronts,
      [frontId]: {
        ...state.fronts[frontId]!,
        level,
      },
    },
  };
}

function withFrontsAtCap(state: GameState): GameState {
  return {
    ...state,
    pressures: {
      ...state.pressures,
      resources: 5000,
    },
    fronts: {
      ...state.fronts,
      front_black_clinic: ownedFront('front_black_clinic', 'district_ghostline_market'),
      front_courier_line: ownedFront('front_courier_line', 'district_chrome_narrows'),
    },
  };
}

function ownedFront(
  definitionId: FrontDefinitionId,
  districtId: FrontState['districtId'],
): FrontState {
  const definition = getFrontDefinition(definitionId);

  if (!definition) {
    throw new Error(`Missing Front definition ${definitionId}.`);
  }

  return {
    id: definitionId,
    definitionId,
    districtId,
    level: 1,
    exposure: definition.exposureOnEstablish,
    establishedWeek: 1,
    compromised: false,
    active: true,
    flags: {},
    yieldHistory: [],
  };
}
