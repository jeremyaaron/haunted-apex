import { addLedgerEntry } from '../ledger';
import type { ContactId, GameState } from '../model';
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

  it('requires a candidate target for recruitment', () => {
    expect(
      getOrderAvailability(newGame({ seed: 'VIOLET-ASH-1047' }), {
        actionId: 'recruit_operative',
      }),
    ).toEqual({
      available: false,
      reason: 'target_required',
    });
  });

  it('requires a Ledger target for Work the Ledger', () => {
    expect(
      getOrderAvailability(newGame({ seed: 'VIOLET-ASH-1047' }), {
        actionId: 'work_the_ledger',
      }),
    ).toEqual({
      available: false,
      reason: 'target_required',
    });
  });

  it('requires a Contact target for Manage Contact', () => {
    expect(
      getOrderAvailability(newGame({ seed: 'VIOLET-ASH-1047' }), {
        actionId: 'manage_contact',
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

  it('rejects district, venue, and rival recruitment targets', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const targets = [
      { type: 'district', id: 'district_violet_ward' },
      { type: 'venue', id: 'venue_pale_circuit' },
      { type: 'rival', id: 'rival_nyx_ardent' },
    ];

    for (const target of targets) {
      expect(
        getOrderAvailability(state, {
          actionId: 'recruit_operative',
          target: target as never,
        }),
      ).toEqual({
        available: false,
        reason: 'target_not_allowed',
      });
    }
  });

  it('rejects unknown and absent recruit candidates', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    for (const operativeId of ['op_missing', state.operatives[0].id]) {
      expect(
        getOrderAvailability(state, {
          actionId: 'recruit_operative',
          target: {
            type: 'recruit',
            id: operativeId,
          } as never,
        }),
      ).toEqual({
        available: false,
        reason: 'recruit_not_in_hire_pool',
      });
    }
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

  it('rejects invalid Ledger targets', () => {
    const active = addLedgerEntry(newGame({ seed: 'LEDGER-QUEUE' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const entryId = active.ledger.entries[0].id;
    const consumed = {
      ...active,
      ledger: {
        ...active.ledger,
        entries: active.ledger.entries.map((entry) => ({
          ...entry,
          consumed: true,
        })),
        consumedCount: 1,
      },
    };

    expect(
      getOrderAvailability(active, {
        actionId: 'work_the_ledger',
        target: {
          type: 'ledger',
          entryId: 'ledger_missing',
          useOptionId: 'burn_patrol_window',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'target_not_found',
    });
    expect(
      getOrderAvailability(consumed, {
        actionId: 'work_the_ledger',
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'burn_patrol_window',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'ledger_entry_consumed',
    });
    expect(
      getOrderAvailability(active, {
        actionId: 'work_the_ledger',
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'missing_option',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'ledger_use_option_not_found',
    });
  });

  it('rejects unaffordable Ledger use options', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-BROKE' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const entryId = state.ledger.entries[0].id;
    const brokeState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 100,
        intel: 1,
      },
    };

    expect(
      getOrderAvailability(brokeState, {
        actionId: 'work_the_ledger',
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'pay_in_credits',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'not_enough_resources',
    });
    expect(
      getOrderAvailability(brokeState, {
        actionId: 'work_the_ledger',
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'offer_information',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'not_enough_intel',
    });
  });

  it('rejects invalid Contact targets and options', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-QUEUE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const inactive = {
      type: 'contact',
      contactId: 'contact_mina_glass',
      optionId: 'cultivate',
    } as const;
    const burned: GameState = {
      ...state,
      contacts: {
        ...state.contacts,
        contact_veyra_lux: {
          ...state.contacts.contact_veyra_lux,
          burned: true,
        },
      },
    };

    expect(
      getOrderAvailability(state, {
        actionId: 'manage_contact',
        assignedOperativeId: state.operatives[0].id,
        target: {
          type: 'contact',
          contactId: 'contact_veyra_lux',
          optionId: 'cultivate',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'operative_not_allowed',
    });
    expect(
      getOrderAvailability(state, {
        actionId: 'manage_contact',
        target: inactive,
      }),
    ).toEqual({
      available: false,
      reason: 'target_inactive',
    });
    expect(
      getOrderAvailability(burned, {
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId: 'contact_veyra_lux',
          optionId: 'cultivate',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'contact_burned',
    });
    expect(
      getOrderAvailability(state, {
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId: 'contact_veyra_lux',
          optionId: 'missing_option',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'contact_option_not_found',
    });
  });

  it('rejects unaffordable Contact options', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-BROKE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const brokeState: GameState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 100,
      },
    };

    expect(
      getOrderAvailability(brokeState, {
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId: 'contact_veyra_lux',
          optionId: 'cultivate',
        },
      }),
    ).toEqual({
      available: false,
      reason: 'not_enough_resources',
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

  it('queues an affordable active Ledger use and preserves entry and use option ids', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-QUEUE' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const target = {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'pay_in_credits',
    } as const;
    const result = queueOrder(state, {
      actionId: 'work_the_ledger',
      target,
    });

    if (!result.ok) {
      fail(`Expected Ledger order, got ${result.error}`);
      return;
    }

    expect(result.order).toEqual({
      id: 'order_1_1',
      actionId: 'work_the_ledger',
      target,
    });
    expect(getCommandPointsRemaining(result.state)).toBe(1);
    expect(selectQueuedOrderViews(result.state)[0]).toEqual(
      jasmine.objectContaining({
        actionId: 'work_the_ledger',
        label: 'Work the Ledger',
        targetLabel: 'Owes the Liaison - Pay in Credits',
      }),
    );
  });

  it('queues an affordable active Contact option and preserves contact and option ids', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-QUEUE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const target = {
      type: 'contact',
      contactId: 'contact_veyra_lux',
      optionId: 'cultivate',
    } as const;
    const result = queueOrder(state, {
      actionId: 'manage_contact',
      target,
    });

    if (!result.ok) {
      fail(`Expected Contact order, got ${result.error}`);
      return;
    }

    expect(result.order).toEqual({
      id: 'order_1_1',
      actionId: 'manage_contact',
      target,
    });
    expect(selectQueuedOrderViews(result.state)[0]).toEqual(
      jasmine.objectContaining({
        actionId: 'manage_contact',
        label: 'Manage Contact',
        targetLabel: 'Veyra Lux - Cultivate',
        contactResolvedEffects: [
          { id: 'trust', value: 10 },
          { id: 'volatility', value: -6 },
          { id: 'exposure', value: 2 },
        ],
      }),
    );
  });

  it('removes a queued Ledger order and restores command availability', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-REMOVE' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const target = {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'burn_patrol_window',
    } as const;
    const queued = queueOrder(state, {
      actionId: 'work_the_ledger',
      target,
    });

    if (!queued.ok) {
      fail(`Expected Ledger order, got ${queued.error}`);
      return;
    }

    const removed = removeQueuedOrder(queued.state, queued.order.id);

    if (!removed.ok) {
      fail(`Expected removed order, got ${removed.error}`);
      return;
    }

    expect(getOrderAvailability(removed.state, {
      actionId: 'work_the_ledger',
      target,
    })).toEqual({
      available: true,
    });
    expect(getCommandPointsRemaining(removed.state)).toBe(2);
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
      target: {
        type: 'recruit',
        id: state.hirePool[0],
      },
    });

    expect(availability).toEqual({
      available: false,
      reason: 'operative_not_allowed',
    });
  });

  it('rejects duplicate candidate recruitment', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const target = {
      type: 'recruit',
      id: state.hirePool[0],
    } as const;
    const first = queueOrder(state, {
      actionId: 'recruit_operative',
      target,
    });

    if (!first.ok) {
      fail(`Expected first recruitment, got ${first.error}`);
      return;
    }

    expect(
      getOrderAvailability(first.state, {
        actionId: 'recruit_operative',
        target,
      }),
    ).toEqual({
      available: false,
      reason: 'recruit_already_queued',
    });
  });

  it('queues two distinct candidates when the roster cap permits', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const first = queueOrder(state, {
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: state.hirePool[0],
      },
    });

    if (!first.ok) {
      fail(`Expected first recruitment, got ${first.error}`);
      return;
    }

    const second = queueOrder(first.state, {
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: state.hirePool[1],
      },
    });

    expect(second.ok).toBeTrue();
    expect(second.ok && second.state.queuedOrders.length).toBe(2);
  });

  it('does not queue recruitment when the roster would exceed the cap', () => {
    const state = queueOneRecruitmentWithFourOperatives();
    const availability = getOrderAvailability(state, {
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: state.hirePool[1],
      },
    });

    expect(availability).toEqual({
      available: false,
      reason: 'roster_full',
    });
  });

  it('disables recruitment for a full active roster', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const recruitedIds = state.hirePool.slice(0, 2);
    const fullState = {
      ...state,
      operatives: [
        ...state.operatives,
        ...recruitedIds.map(materializeOperativeState),
      ],
      hirePool: state.hirePool.slice(2),
    };

    expect(
      getOrderAvailability(fullState, {
        actionId: 'recruit_operative',
        target: {
          type: 'recruit',
          id: fullState.hirePool[0],
        },
      }),
    ).toEqual({
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
          heat: 15,
          loyalty: -1,
          resources: 1950,
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
    target: {
      type: 'recruit',
      id: fourOperativeState.hirePool[0],
    },
  });

  if (!first.ok) {
    throw new Error(`Expected first recruitment, got ${first.error}`);
  }

  return first.state;
}

function withActiveContacts(state: GameState, activeContactIds: ContactId[]): GameState {
  return {
    ...state,
    activeContactIds,
  };
}
