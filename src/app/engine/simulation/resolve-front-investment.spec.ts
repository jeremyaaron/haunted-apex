import { getFrontDefinition } from '../content';
import type { FrontDefinitionId, FrontState, GameState } from '../model';
import { previewFrontInvestment } from '../fronts';
import { getActionPreview } from '../selectors';
import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';

describe('resolveQueuedOrder Front investments', () => {
  it('establishes a Front, spends resources, applies effects, and removes the opportunity', () => {
    const state = findStateWithOpportunity('front_zero_mercy_cut');
    const opportunity = state.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_zero_mercy_cut',
    );

    expect(opportunity).toBeDefined();
    const target = {
      type: 'front_opportunity' as const,
      id: opportunity!.id,
    };
    const preview = previewFrontInvestment(state, target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target,
    });

    if (!preview.ok) {
      fail(`Expected Front preview, got ${preview.unavailableReason}`);
      return;
    }

    expect(result.complication).toBeFalse();
    expect(result.riskChance).toBe(10);
    expect(result.resolvedDelta).toEqual({
      ...preview.effects,
      resources: -preview.cost,
    });
    expect(result.state.pressures.resources).toBe(
      state.pressures.resources - preview.cost,
    );
    expect(result.state.pressures.dominion).toBe(
      state.pressures.dominion + (preview.effects.dominion ?? 0),
    );
    expect(result.state.pressures.heat).toBe(
      state.pressures.heat + (preview.effects.heat ?? 0),
    );
    expect(result.state.fronts.front_zero_mercy_cut).toEqual(
      jasmine.objectContaining({
        id: 'front_zero_mercy_cut',
        definitionId: 'front_zero_mercy_cut',
        districtId: opportunity!.districtId,
        venueId: opportunity!.venueId,
        relatedRivalId: opportunity!.relatedRivalId,
        level: 1,
        exposure: preview.projectedExposure,
        establishedWeek: state.week,
        compromised: false,
        active: true,
        flags: {},
        yieldHistory: [],
      }),
    );
    expect(result.state.frontOpportunities.map((candidate) => candidate.id))
      .not.toContain(opportunity!.id);
  });

  it('applies stored related rival pressure on establish and clamps it', () => {
    const base = findStateWithOpportunity('front_zero_mercy_cut');
    const opportunity = base.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_zero_mercy_cut',
    );
    const state = {
      ...base,
      rivals: {
        ...base.rivals,
        rival_knox_marrow: {
          ...base.rivals.rival_knox_marrow,
          pressure: 95,
        },
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front_opportunity',
        id: opportunity!.id,
      },
    });

    expect(result.state.rivals.rival_knox_marrow.pressure).toBe(100);
  });

  it('keeps establish resolution aligned with the action preview', () => {
    const state = findStateWithOpportunity('front_black_clinic');
    const opportunity = state.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_black_clinic',
    );
    const target = {
      type: 'front_opportunity' as const,
      id: opportunity!.id,
    };
    const preview = getActionPreview(state, 'invest_front', undefined, target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target,
    });

    expect(result.resolvedDelta).toEqual({
      ...preview?.adjustedEffects,
      resources: -(preview?.adjustedResourceCost ?? 0),
    });
  });

  it('blocks establish when the Front cap is already full', () => {
    const state = withFrontsAtCap(findStateWithOpportunity('front_surveillance_den'));
    const opportunity = state.frontOpportunities.find(
      (candidate) => !state.fronts[candidate.definitionId],
    );
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front_opportunity',
        id: opportunity!.id,
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.fronts).toEqual(state.fronts);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'complication',
        title: 'Invest in Front Blocked',
      }),
    );
  });

  it('blocks establish when the definition is already owned', () => {
    const base = findStateWithOpportunity('front_black_clinic');
    const opportunity = base.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_black_clinic',
    );
    const state = {
      ...base,
      fronts: {
        ...base.fronts,
        front_black_clinic: ownedFront('front_black_clinic', 'district_ghostline_market'),
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front_opportunity',
        id: opportunity!.id,
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.frontOpportunities).toEqual(state.frontOpportunities);
    expect(result.state.eventLog.at(-1)?.body).toContain('front_already_owned');
  });

  it('blocks stale queued investments that are no longer affordable', () => {
    const base = findStateWithOpportunity('front_black_clinic');
    const opportunity = base.frontOpportunities.find(
      (candidate) => candidate.definitionId === 'front_black_clinic',
    );
    const state = {
      ...base,
      pressures: {
        ...base.pressures,
        resources: 0,
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front_opportunity',
        id: opportunity!.id,
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.fronts).toEqual(state.fronts);
    expect(result.state.eventLog.at(-1)?.body).toContain('not_enough_resources');
  });

  it('upgrades an owned Front, spends resources, applies effects, and increases exposure', () => {
    const state = newGame({ seed: 'FRONT-UPGRADE-RESOLUTION' });
    const preview = previewFrontInvestment(state, {
      type: 'front',
      id: 'front_pale_circuit',
    });
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    if (!preview.ok) {
      fail(`Expected Front preview, got ${preview.unavailableReason}`);
      return;
    }

    expect(result.resolvedDelta).toEqual({
      ...preview.effects,
      resources: -preview.cost,
    });
    expect(result.state.pressures.resources).toBe(state.pressures.resources - preview.cost);
    expect(result.state.pressures.dominion).toBe(
      state.pressures.dominion + (preview.effects.dominion ?? 0),
    );
    expect(result.state.pressures.heat).toBe(
      state.pressures.heat + (preview.effects.heat ?? 0),
    );
    expect(result.state.fronts.front_pale_circuit).toEqual(
      jasmine.objectContaining({
        level: 2,
        exposure: preview.projectedExposure,
      }),
    );
  });

  it('blocks upgrade beyond level 2', () => {
    const state = withFrontLevel(
      newGame({ seed: 'FRONT-MAX-RESOLUTION' }),
      'front_pale_circuit',
      2,
    );
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.fronts.front_pale_circuit?.level).toBe(2);
    expect(result.state.eventLog.at(-1)?.body).toContain('front_already_max_level');
  });

  it('logs resolved Front investments with front names', () => {
    const state = newGame({ seed: 'FRONT-LOG' });
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'invest_front',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'order_resolved',
        title: 'Invest in Front: The Pale Circuit',
      }),
    );
    expect(result.state.eventLog.at(-1)?.body).toContain('Upgraded The Pale Circuit');
  });
});

function findStateWithOpportunity(definitionId: FrontDefinitionId): GameState {
  for (let index = 0; index < 100; index += 1) {
    const state = newGame({ seed: `FRONT-RESOLUTION-${index}` });

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
