import type { EventId, GameState } from '../model';
import { materializeOperativeState } from '../roster';
import { addLedgerEntry } from '../ledger';
import { newGame } from './new-game';
import {
  getEventChoiceAvailability,
  getEventChoicePreview,
  resolveEventChoice,
} from './resolve-event';

describe('resolveEventChoice', () => {
  it('applies event costs, effects, flags, and advances to the next week', () => {
    const state = withPendingEvent('liaison_favor');
    const result = resolveEventChoice(state, 'event_1_1', 'accept_the_favor');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.week).toBe(2);
    expect(result.state.phase).toBe('COMMAND');
    expect(result.state.pendingEvent).toBeUndefined();
    expect(result.state.pressures.intel).toBe(20);
    expect(result.state.pressures.dominion).toBe(15);
    expect(result.state.pressures.ruin).toBe(2);
    expect(result.state.flags['owes_liaison']).toBeTrue();
    expect(result.state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        definitionId: 'debt_owes_liaison',
        kind: 'debt',
        source: {
          type: 'event',
          eventId: 'liaison_favor',
          choiceId: 'accept_the_favor',
        },
      }),
    );
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'event_choice',
        title: 'Accept the favor',
        body: 'Response to A Favor in Violet Light. Ledger: Creates Debt: Owes the Liaison.',
      }),
    );
  });

  it('subtracts regular event costs', () => {
    const state = withPendingEvent('corp_patrol_sweep');
    const result = resolveEventChoice(state, 'event_1_1', 'pay_for_clean_passage');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.pressures.resources).toBe(4000);
    expect(result.state.pressures.heat).toBe(8);
  });

  it('subtracts tech_or_intel costs from Intel in v0', () => {
    const state = withPendingEvent('rival_sends_flowers');
    const result = resolveEventChoice(state, 'event_1_1', 'keep_the_device_and_reverse_it');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.pressures.intel).toBe(12);
    expect(result.state.pressures.heat).toBe(20);
  });

  it('rejects unaffordable event choices', () => {
    const state = {
      ...withPendingEvent('safehouse_compromised'),
      pressures: {
        ...withPendingEvent('safehouse_compromised').pressures,
        resources: 100,
      },
    };

    expect(getEventChoiceAvailability(state, 'event_1_1', 'move_immediately')).toEqual({
      available: false,
      reason: 'not_enough_cost',
    });
    expect(resolveEventChoice(state, 'event_1_1', 'move_immediately')).toEqual({
      ok: false,
      state,
      error: 'not_enough_cost',
    });
  });

  it('checks win/loss after the event choice before incrementing the week', () => {
    const state = {
      ...withPendingEvent('rival_tests_border'),
      week: 8,
      pressures: {
        ...withPendingEvent('rival_tests_border').pressures,
        dominion: 85,
      },
    };
    const result = resolveEventChoice(state, 'event_1_1', 'answer_publicly');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.week).toBe(8);
    expect(result.state.phase).toBe('GAME_OVER');
    expect(result.state.gameOver).toEqual({
      result: 'victory',
      reason: 'dominion_victory',
    });
  });

  it('clears transient weekly action flags after event resolution', () => {
    const state = {
      ...withPendingEvent('heat_cools'),
      flags: {
        ran_small_job_this_week: true,
        laid_low_this_week: true,
      },
    };
    const result = resolveEventChoice(state, 'event_1_1', 'use_the_quiet_to_listen');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.flags['ran_small_job_this_week']).toBeUndefined();
    expect(result.state.flags['laid_low_this_week']).toBeUndefined();
  });

  it('previews exact event Ledger consequences', () => {
    const createPreview = getEventChoicePreview(
      withPendingEvent('unexpected_windfall'),
      'event_1_1',
      'trace_it_first',
    );
    const optionalPreview = getEventChoicePreview(
      withPendingEvent('operative_wants_more'),
      'event_1_1',
      'pay_them',
    );

    expect(createPreview?.ledgerEffects).toEqual([
      jasmine.objectContaining({
        type: 'create',
        kind: 'secret',
        entryName: 'Dead Channel Trace',
        available: true,
      }),
    ]);
    expect(optionalPreview?.ledgerEffects).toEqual([
      jasmine.objectContaining({
        type: 'resolve',
        kind: 'debt',
        entryName: 'Unfunded Promise',
        available: false,
        optional: true,
      }),
    ]);
  });

  it('creates exact Ledger definitions from existing event choices', () => {
    const blackmail = resolveEventChoice(
      withPendingEvent('blackmail_lead'),
      'event_1_1',
      'save_it_for_later',
    );
    const windfall = resolveEventChoice(
      withPendingEvent('unexpected_windfall'),
      'event_1_1',
      'take_it',
    );

    if (!blackmail.ok || !windfall.ok) {
      fail('Expected event choices to resolve');
      return;
    }

    expect(blackmail.state.ledger.entries[0].definitionId).toBe(
      'secret_magistrate_glass_room',
    );
    expect(windfall.state.ledger.entries[0].definitionId).toBe(
      'debt_contaminated_money',
    );
  });

  it('creates Favors from defensive city and operative event choices', () => {
    const flowers = resolveEventChoice(
      withPendingEvent('rival_sends_flowers'),
      'event_1_1',
      'display_them',
    );
    const route = resolveEventChoice(
      withPendingEvent('event_orchid_route_memory'),
      'event_1_1',
      'map_it_first',
    );

    if (!flowers.ok || !route.ok) {
      fail('Expected event choices to resolve');
      return;
    }

    expect(flowers.state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        definitionId: 'favor_checkpoint_captain',
        kind: 'favor',
      }),
    );
    expect(route.state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        definitionId: 'favor_hidden_route',
        kind: 'favor',
      }),
    );
  });

  it('can resolve an active Ledger entry from an event choice', () => {
    const withDebt = addLedgerEntry(withPendingEvent('operative_wants_more'), {
      definitionId: 'debt_unfunded_promise',
      source: {
        type: 'event',
        eventId: 'operative_wants_more',
        choiceId: 'promise_future_rewards',
      },
    });
    const result = resolveEventChoice(withDebt, 'event_1_1', 'pay_them');

    if (!result.ok) {
      fail(`Expected event choice resolution, got ${result.error}`);
      return;
    }

    expect(result.state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        consumed: true,
        consumedWeek: 1,
        consumedBy: {
          type: 'event',
          eventId: 'operative_wants_more',
          choiceId: 'pay_them',
        },
      }),
    );
    expect(result.state.ledger.consumedCount).toBe(1);
  });

  it('resolves the selected Debt for Debt Comes Due', () => {
    const withDebt = addLedgerEntry(withPendingEvent('ledger_debt_comes_due'), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const state = {
      ...withDebt,
      pendingEvent: {
        ...withDebt.pendingEvent!,
        selectedLedgerEntryId: withDebt.ledger.entries[0].id,
      },
    };
    const preview = getEventChoicePreview(state, 'event_1_1', 'pay_what_is_owed');
    const result = resolveEventChoice(state, 'event_1_1', 'pay_what_is_owed');

    if (!result.ok) {
      fail(`Expected selected Debt resolution, got ${result.error}`);
      return;
    }

    expect(preview?.ledgerEffects).toEqual([
      jasmine.objectContaining({
        type: 'resolve',
        entryName: 'Owes the Liaison',
        available: true,
        entryId: withDebt.ledger.entries[0].id,
      }),
    ]);
    expect(result.state.ledger.entries[0].consumed).toBeTrue();
    expect(result.state.eventLog.at(-1)?.body).toContain(
      'Response to Debt Comes Due: Owes the Liaison.',
    );
  });

  it('can preserve or consume the selected Secret from Leverage Window', () => {
    const withSecret = addLedgerEntry(withPendingEvent('ledger_leverage_window'), {
      definitionId: 'secret_dead_channel_trace',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const state = {
      ...withSecret,
      pendingEvent: {
        ...withSecret.pendingEvent!,
        selectedLedgerEntryId: withSecret.ledger.entries[0].id,
      },
    };
    const held = resolveEventChoice(state, 'event_1_1', 'hold_it');
    const used = resolveEventChoice(state, 'event_1_1', 'use_the_leverage');

    if (!held.ok || !used.ok) {
      fail('Expected Leverage Window choices to resolve');
      return;
    }

    expect(held.state.ledger.entries[0].consumed).toBeFalse();
    expect(used.state.ledger.entries[0].consumed).toBeTrue();
  });

  it('leaves optional Ledger resolution choices affordable without a matching entry', () => {
    const state = withPendingEvent('operative_wants_more');

    expect(getEventChoiceAvailability(state, 'event_1_1', 'pay_them')).toEqual({
      available: true,
    });
  });

  it('rejects choices outside event choice phase', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(resolveEventChoice(state, 'event_1_1', 'accept_the_favor')).toEqual({
      ok: false,
      state,
      error: 'not_event_choice_phase',
    });
  });

  it('applies operative effects to the event owner and clamps Stress', () => {
    const juno = materializeOperativeState('op_juno_hex');
    const mara = materializeOperativeState('op_mara_voss');
    juno.stress = 98;
    const state = {
      ...withPendingEvent('event_juno_static_in_her_voice'),
      operatives: [juno, mara],
    };
    const result = resolveEventChoice(state, 'event_1_1', 'push_deeper');

    if (!result.ok) {
      fail(`Expected operative event resolution, got ${result.error}`);
      return;
    }

    expect(result.state.operatives.find((operative) => operative.id === juno.id)?.stress).toBe(100);
    expect(result.state.operatives.find((operative) => operative.id === mara.id)?.stress).toBe(
      mara.stress,
    );
  });

  it('clamps operative Loyalty and applies rival-pressure effects', () => {
    const saint = materializeOperativeState('op_saint_calder');
    saint.loyalty = 2;
    const saintState = {
      ...withPendingEvent('event_saint_lie_comes_due'),
      operatives: [saint],
    };
    const saintResult = resolveEventChoice(saintState, 'event_1_1', 'use_the_lie');

    if (!saintResult.ok) {
      fail(`Expected operative event resolution, got ${saintResult.error}`);
      return;
    }

    expect(saintResult.state.operatives[0].loyalty).toBe(0);

    const iris = materializeOperativeState('op_iris_vale');
    const irisBase = withPendingEvent('event_iris_velvet_access');
    const irisState = {
      ...irisBase,
      operatives: [iris],
      rivals: {
        ...irisBase.rivals,
        rival_nyx_ardent: {
          ...irisBase.rivals.rival_nyx_ardent,
          pressure: 95,
        },
      },
    };
    const irisResult = resolveEventChoice(irisState, 'event_1_1', 'take_the_room');

    if (!irisResult.ok) {
      fail(`Expected operative event resolution, got ${irisResult.error}`);
      return;
    }

    expect(irisResult.state.rivals.rival_nyx_ardent.pressure).toBe(100);
  });
});

function withPendingEvent(definitionId: EventId): GameState {
  return {
    ...newGame({ seed: 'VIOLET-ASH-1047' }),
    phase: 'EVENT_CHOICE',
    pendingEvent: {
      id: 'event_1_1',
      definitionId,
      week: 1,
    },
  };
}
