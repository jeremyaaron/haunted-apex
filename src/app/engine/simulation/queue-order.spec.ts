import { getCommandPointsRemaining, getOrderAvailability, selectQueuedOrderViews } from '../selectors';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import { queueOrder, removeQueuedOrder } from './queue-order';

describe('queueOrder', () => {
  it('queues one legal action', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const result = queueOrder(state, {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    if (!result.ok) {
      fail(`Expected queued order, got ${result.error}`);
      return;
    }

    expect(result.order).toEqual({
      id: 'order_1_1',
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });
    expect(result.state.queuedOrders).toEqual([result.order]);
    expect(getCommandPointsRemaining(result.state)).toBe(1);
    expect(result.state.operatives.find((operative) => operative.id === 'op_mara_voss')?.status).toBe(
      'assigned',
    );
  });

  it('queues two legal actions', () => {
    const first = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    if (!first.ok) {
      fail(`Expected first order, got ${first.error}`);
      return;
    }

    const second = queueOrder(first.state, {
      actionId: 'bribe_official',
      assignedOperativeId: 'op_saint_calder',
    });

    if (!second.ok) {
      fail(`Expected second order, got ${second.error}`);
      return;
    }

    expect(second.state.queuedOrders.length).toBe(2);
    expect(second.order.id).toBe('order_1_2');
    expect(getCommandPointsRemaining(second.state)).toBe(0);
  });

  it('requires a target for Run Small Job', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const result = queueOrder(state, {
      actionId: 'run_small_job',
    });

    expect(result.ok).toBeFalse();

    if (!result.ok) {
      expect(result.error).toBe('target_required');
      expect(result.state).toBe(state);
    }
  });

  it('requires a target for Expand Influence', () => {
    expect(
      getOrderAvailability(newGame({ seed: 'VIOLET-ASH-1047' }), {
        actionId: 'expand_influence',
      }),
    ).toEqual({
      available: false,
      reason: 'target_required',
    });
  });

  it('allows optional target actions to queue without a target', () => {
    const result = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
    });

    expect(result.ok).toBeTrue();
  });

  it('rejects a target type unsupported by the action', () => {
    expect(
      getOrderAvailability(newGame({ seed: 'VIOLET-ASH-1047' }), {
        actionId: 'run_small_job',
        target: {
          type: 'rival',
          id: 'rival_nyx_ardent',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'target_not_allowed',
    });
  });

  it('rejects unknown district, venue, and rival IDs', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const invalidTargets = [
      {
        type: 'district',
        id: 'district_missing',
      },
      {
        type: 'venue',
        id: 'venue_missing',
      },
      {
        type: 'rival',
        id: 'rival_missing',
      },
    ];

    for (const target of invalidTargets) {
      expect(
        getOrderAvailability(state, {
          actionId: 'gather_intel',
          target: target as never,
        }),
      ).toEqual({
        available: false,
        reason: 'target_not_found',
      });
    }
  });

  it('rejects an inactive rival target', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const inactiveState = {
      ...state,
      rivals: {
        ...state.rivals,
        rival_nyx_ardent: {
          ...state.rivals.rival_nyx_ardent,
          active: false,
        },
      },
    };

    expect(
      getOrderAvailability(inactiveState, {
        actionId: 'gather_intel',
        target: {
          type: 'rival',
          id: 'rival_nyx_ardent',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'target_inactive',
    });
  });

  it('preserves the target on a queued order', () => {
    const target = {
      type: 'venue',
      id: 'venue_zero_mercy',
    } as const;
    const result = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'run_small_job',
      target,
    });

    if (!result.ok) {
      fail(`Expected queued order, got ${result.error}`);
      return;
    }

    expect(result.order.target).toEqual(target);
    expect(result.order.target).not.toBe(target);
  });

  it('restores normal availability after removing a targeted order', () => {
    const queued = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'expand_influence',
      assignedOperativeId: 'op_saint_calder',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const removed = removeQueuedOrder(queued.state, queued.order.id);

    if (!removed.ok) {
      fail(`Expected removed order, got ${removed.error}`);
      return;
    }

    expect(
      getOrderAvailability(removed.state, {
        actionId: 'expand_influence',
        assignedOperativeId: 'op_saint_calder',
        target: {
          type: 'district',
          id: 'district_violet_ward',
        },
      }),
    ).toEqual({
      available: true,
    });
  });

  it('does not queue a third action', () => {
    const state = queueTwoOrders();
    const result = queueOrder(state, {
      actionId: 'lay_low',
    });

    expect(result.ok).toBeFalse();

    if (!result.ok) {
      expect(result.error).toBe('not_enough_command_points');
      expect(result.state).toBe(state);
    }
  });

  it('removes a queued action and restores command availability', () => {
    const first = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    if (!first.ok) {
      fail(`Expected order, got ${first.error}`);
      return;
    }

    const removed = removeQueuedOrder(first.state, first.order.id);

    if (!removed.ok) {
      fail(`Expected order removal, got ${removed.error}`);
      return;
    }

    expect(removed.state.queuedOrders).toEqual([]);
    expect(getCommandPointsRemaining(removed.state)).toBe(2);
    expect(removed.state.operatives.find((operative) => operative.id === 'op_mara_voss')?.status).toBe(
      'available',
    );
  });

  it('does not assign one operative to two actions', () => {
    const first = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    if (!first.ok) {
      fail(`Expected first order, got ${first.error}`);
      return;
    }

    const second = queueOrder(first.state, {
      actionId: 'expand_influence',
      assignedOperativeId: 'op_mara_voss',
      target: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });

    expect(second.ok).toBeFalse();

    if (!second.ok) {
      expect(second.error).toBe('operative_already_assigned');
    }
  });

  it('does not assign an operative to recruitment', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const availability = getOrderAvailability(state, {
      actionId: 'recruit_operative',
      assignedOperativeId: 'op_saint_calder',
    });

    expect(availability).toEqual({
      available: false,
      reason: 'operative_not_allowed',
    });
  });

  it('does not queue recruitment when the roster would exceed the cap', () => {
    const state = queueOneRecruitmentWithFourOperatives();
    const availability = getOrderAvailability(state, {
      actionId: 'recruit_operative',
    });

    expect(availability).toEqual({
      available: false,
      reason: 'roster_full',
    });
  });

  it('shows queued order views with adjusted effects and risk labels', () => {
    const result = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });

    if (!result.ok) {
      fail(`Expected order, got ${result.error}`);
      return;
    }

    expect(selectQueuedOrderViews(result.state)).toEqual([
      jasmine.objectContaining({
        id: 'order_1_1',
        actionId: 'gather_intel',
        label: 'Gather Intel',
        assignedOperativeName: 'Mara Voss',
        adjustedEffects: {
          heat: 1,
          intel: 10,
        },
        adjustedResourceCost: 400,
        riskLabel: 'Very Low',
      }),
    ]);
  });

  it('shows the target label and target-adjusted effects for a queued order', () => {
    const result = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'run_small_job',
      assignedOperativeId: 'op_mara_voss',
      target: {
        type: 'venue',
        id: 'venue_zero_mercy',
      },
    });

    if (!result.ok) {
      fail(`Expected order, got ${result.error}`);
      return;
    }

    expect(selectQueuedOrderViews(result.state)).toEqual([
      jasmine.objectContaining({
        targetLabel: 'Zero Mercy',
        adjustedEffects: {
          dominion: 6,
          heat: 12,
          loyalty: -1,
          resources: 1550,
        },
      }),
    ]);
  });
});

function queueTwoOrders() {
  const first = queueOrder(newGame({ seed: 'VIOLET-ASH-1047' }), {
    actionId: 'gather_intel',
    assignedOperativeId: 'op_mara_voss',
  });

  if (!first.ok) {
    throw new Error(`Expected first order, got ${first.error}`);
  }

  const second = queueOrder(first.state, {
    actionId: 'bribe_official',
    assignedOperativeId: 'op_saint_calder',
  });

  if (!second.ok) {
    throw new Error(`Expected second order, got ${second.error}`);
  }

  return second.state;
}

function queueOneRecruitmentWithFourOperatives() {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });
  const extraOperativeId = state.hirePool[0];
  const fourOperativeState = {
    ...state,
    operatives: [...state.operatives, materializeOperativeState(extraOperativeId)],
    hirePool: state.hirePool.slice(1),
  };
  const first = queueOrder(fourOperativeState, {
    actionId: 'recruit_operative',
  });

  if (!first.ok) {
    throw new Error(`Expected first recruitment, got ${first.error}`);
  }

  return first.state;
}
