import { getActionPreview } from '../selectors';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';

describe('resolveQueuedOrder recruitment', () => {
  it('fails closed when a queued candidate is no longer in the hire pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const candidateId = state.hirePool[0];
    const staleState = {
      ...state,
      hirePool: state.hirePool.slice(1),
    };
    const result = resolveQueuedOrder(staleState, {
      id: 'order_1_1',
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: candidateId,
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.rng.cursor).toBe(state.rngCursor);
    expect(result.state.operatives).toEqual(state.operatives);
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'complication',
        title: 'Invalid Recruitment Order',
      }),
    );
  });

  it('applies selected candidate recruitment modifiers during resolution', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const recruitState = {
      ...state,
      hirePool: ['op_mother_neon' as const],
    };
    const result = resolveQueuedOrder(recruitState, {
      id: 'order_1_1',
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: 'op_mother_neon',
      },
    });

    expect(result.state.pressures.dominion).toBe(state.pressures.dominion + 3);
    expect(result.state.pressures.loyalty).toBe(state.pressures.loyalty + 2);
    expect(result.state.pressures.resources).toBe(state.pressures.resources - 1300);
    expect(result.state.pressures.ruin).toBe(state.pressures.ruin + 2);
  });
});

describe('resolveQueuedOrder Front-targeted Lay Low', () => {
  it('reduces Heat, Dominion, Resources, and selected Front exposure', () => {
    const base = newGame({ seed: 'FRONT-LAY-LOW-RESOLVE' });
    const state = {
      ...base,
      fronts: {
        ...base.fronts,
        front_pale_circuit: {
          ...base.fronts.front_pale_circuit!,
          exposure: 28,
        },
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'lay_low',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    expect(result.complication).toBeFalse();
    expect(result.stressDelta).toBe(0);
    expect(result.resolvedDelta).toEqual({
      heat: -6,
      dominion: -1,
      resources: -300,
    });
    expect(result.state.pressures.heat).toBe(state.pressures.heat - 6);
    expect(result.state.pressures.dominion).toBe(state.pressures.dominion - 1);
    expect(result.state.pressures.resources).toBe(state.pressures.resources - 300);
    expect(result.state.fronts.front_pale_circuit?.exposure).toBe(14);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'order_resolved',
        title: 'Lay Low',
        tags: ['FRONT', 'front_pale_circuit'],
      }),
    );
    expect(result.state.eventLog.at(-1)?.body).toContain('The Pale Circuit');
  });

  it('clamps Front exposure at zero', () => {
    const base = newGame({ seed: 'FRONT-LAY-LOW-CLAMP' });
    const state = {
      ...base,
      fronts: {
        ...base.fronts,
        front_pale_circuit: {
          ...base.fronts.front_pale_circuit!,
          exposure: 7,
        },
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'lay_low',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    expect(result.state.fronts.front_pale_circuit?.exposure).toBe(0);
  });

  it('blocks stale Front-targeted Lay Low when the Front is inactive', () => {
    const base = newGame({ seed: 'FRONT-LAY-LOW-STALE' });
    const state = {
      ...base,
      fronts: {
        ...base.fronts,
        front_pale_circuit: {
          ...base.fronts.front_pale_circuit!,
          active: false,
        },
      },
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'lay_low',
      target: {
        type: 'front',
        id: 'front_pale_circuit',
      },
    });

    expect(result.complication).toBeTrue();
    expect(result.rng.cursor).toBe(state.rngCursor);
    expect(result.state.pressures).toEqual(state.pressures);
    expect(result.state.fronts).toEqual(state.fronts);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'complication',
        title: 'Lay Low Blocked',
      }),
    );
  });
});

describe('resolveQueuedOrder operative territory modifiers', () => {
  it('applies Rook Vale Control and Iris Vale rival Pressure modifiers', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const rookState = {
      ...base,
      operatives: [materializeOperativeState('op_rook_vale')],
    };
    const rookResult = resolveQueuedOrder(rookState, {
      id: 'order_1_1',
      actionId: 'expand_influence',
      assignedOperativeId: 'op_rook_vale',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });
    const irisState = {
      ...base,
      operatives: [materializeOperativeState('op_iris_vale')],
    };
    const irisResult = resolveQueuedOrder(irisState, {
      id: 'order_1_1',
      actionId: 'expand_influence',
      assignedOperativeId: 'op_iris_vale',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });

    expect(rookResult.state.districts.district_violet_ward.control).toBe(26);
    expect(irisResult.state.rivals.rival_nyx_ardent.pressure).toBe(16);
  });
});

describe('resolveQueuedOrder assignment history and Stress', () => {
  it('keeps clean resolution aligned with the action preview', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const state = {
      ...base,
      operatives: [materializeOperativeState('op_juno_hex')],
    };
    const target = {
      type: 'venue',
      id: 'venue_glass_saint',
    } as const;
    const preview = getActionPreview(state, 'gather_intel', 'op_juno_hex', target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_juno_hex',
      target,
    });

    if (!preview?.selectedOperative) {
      fail('Expected an operative action preview');
      return;
    }

    expect(result.complication).toBeFalse();
    expect(result.riskChance).toBe(preview.riskChance);
    expect(result.resolvedDelta).toEqual({
      ...preview.adjustedEffects,
      resources: -preview.adjustedResourceCost,
    });
    expect(result.stressDelta).toBe(
      preview.selectedOperative.projectedStress - preview.selectedOperative.stress,
    );
  });

  it('records final target context and complication-inclusive Stress', () => {
    const base = newGame({ seed: 'E' });
    const state = {
      ...base,
      operatives: [materializeOperativeState('op_juno_hex')],
    };
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_juno_hex',
      target: {
        type: 'venue',
        id: 'venue_glass_saint',
      },
    });
    const juno = result.state.operatives[0];

    expect(result.complication).toBeTrue();
    expect(result.stressDelta).toBe(15);
    expect(juno.stress).toBe(47);
    expect(juno.status).toBe('available');
    expect(juno.weeksAssigned).toBe(1);
    expect(juno.recentAssignments).toEqual([
      {
        id: 'assignment_1_1',
        week: 1,
        actionId: 'gather_intel',
        target: {
          type: 'venue',
          id: 'venue_glass_saint',
        },
        targetTags: [
          'nightlife',
          'liaison',
          'social',
          'elite',
          'memory',
          'seduction',
        ],
        complication: true,
        stressDelta: 15,
      },
    ]);
  });

  it('increments weeksAssigned once for multiple assignments in one week', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const state = {
      ...base,
      operatives: [materializeOperativeState('op_mara_voss')],
    };
    const first = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });
    const second = resolveQueuedOrder(first.state, {
      id: 'order_1_2',
      actionId: 'lay_low',
      assignedOperativeId: 'op_mara_voss',
    });
    const mara = second.state.operatives[0];

    expect(mara.weeksAssigned).toBe(1);
    expect(mara.recentAssignments.map((assignment) => assignment.id)).toEqual([
      'assignment_1_1',
      'assignment_1_2',
    ]);
  });

  it('clamps final Stress at both bounds and records the applied delta', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const highState = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          stress: 98,
        },
      ],
    };
    const lowState = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_echo_saint'),
          stress: 2,
        },
      ],
    };
    const high = resolveQueuedOrder(highState, {
      id: 'order_1_1',
      actionId: 'run_small_job',
      assignedOperativeId: 'op_mara_voss',
      target: {
        type: 'district',
        id: 'district_chrome_narrows',
      },
    });
    const low = resolveQueuedOrder(lowState, {
      id: 'order_1_1',
      actionId: 'lay_low',
      assignedOperativeId: 'op_echo_saint',
    });

    expect(high.state.operatives[0].stress).toBe(100);
    expect(high.stressDelta).toBe(2);
    expect(high.state.operatives[0].recentAssignments[0].stressDelta).toBe(2);
    expect(low.state.operatives[0].stress).toBe(0);
    expect(low.stressDelta).toBe(-2);
    expect(low.state.operatives[0].recentAssignments[0].stressDelta).toBe(-2);
  });

  it('keeps Breaking operatives available and logs only actual tier changes', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const breakingState = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          stress: 85,
        },
      ],
    };
    const transitionState = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          stress: 38,
        },
      ],
    };
    const breaking = resolveQueuedOrder(breakingState, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });
    const transition = resolveQueuedOrder(transitionState, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    expect(breaking.state.operatives[0].status).toBe('available');
    expect(
      breaking.state.eventLog.filter((entry) => entry.type === 'operative_condition'),
    ).toEqual([]);
    expect(
      transition.state.eventLog.filter((entry) => entry.type === 'operative_condition'),
    ).toEqual([
      jasmine.objectContaining({
        title: 'Mara Voss Escalates',
        tags: ['OPERATIVE', 'op_mara_voss', 'stable', 'strained'],
      }),
    ]);
  });

  it('does not create assignment history for unassigned orders', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'gather_intel',
    });

    expect(result.stressDelta).toBe(0);
    expect(
      result.state.operatives.every(
        (operative) =>
          operative.weeksAssigned === 0 && operative.recentAssignments.length === 0,
      ),
    ).toBeTrue();
  });

  it('does not apply faction touch to ordinary district or venue targets', () => {
    const state = newGame({ seed: 'NO-BROAD-FACTION-TOUCH' });
    const before = structuredClone(state.factions.faction_ashline_bureau);
    const districtResult = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'gather_intel',
      target: {
        type: 'district',
        id: 'district_chrome_narrows',
      },
    });
    const venueResult = resolveQueuedOrder(districtResult.state, {
      id: 'order_1_2',
      actionId: 'run_small_job',
      target: {
        type: 'venue',
        id: 'venue_pale_circuit',
      },
    });

    expect(districtResult.state.factions.faction_ashline_bureau).toEqual(before);
    expect(venueResult.state.factions.faction_ashline_bureau).toEqual(before);
  });
});
