import { DISTRICT_ZERO_EVENTS } from '../content';
import { addLedgerEntry } from '../ledger';
import type { GameLogEntry, GameState, RecentActivityEntry, RivalId } from '../model';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import {
  buildEventWeightContext,
  calculateEventWeight,
  getWeightedEvents,
  selectWeeklyEvent,
} from './select-weekly-event';

describe('weekly event selection', () => {
  it('selects the same event for the same seed and state', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      rngCursor: 1,
    };

    expect(selectWeeklyEvent(state)).toEqual(selectWeeklyEvent(state));
  });

  it('increases Corp Patrol Sweep weight when Heat is high', () => {
    const event = requireEvent('corp_patrol_sweep');
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const highHeat = {
      ...baseline,
      pressures: {
        ...baseline.pressures,
        heat: 70,
      },
    };

    expect(calculateEventWeight(highHeat, event)).toBeGreaterThan(
      calculateEventWeight(baseline, event),
    );
  });

  it('increases Safehouse Compromised weight when bribe_exposed is set', () => {
    const event = requireEvent('safehouse_compromised');
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const exposed = {
      ...baseline,
      flags: {
        bribe_exposed: true,
      },
    };

    expect(calculateEventWeight(exposed, event)).toBeGreaterThan(
      calculateEventWeight(baseline, event),
    );
  });

  it('reduces repeated major negative event weights', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      eventLog: [
        presentedLog('corp_patrol_sweep', ['HEAT']),
        presentedLog('job_goes_loud', ['HEAT']),
      ],
    };
    const corpWeight = getWeightedEvents(state).find(
      (candidate) => candidate.event.id === 'corp_patrol_sweep',
    )?.weight;

    expect(corpWeight).toBe(3);
  });

  it('raises Liaison Favor weight after a nightlife target', () => {
    const state = withActivity(activity(['nightlife']));

    expect(weightFor(state, 'liaison_favor')).toBe(13);
    expect(modifierIdsFor(state, 'liaison_favor')).toContain('recent_nightlife');
  });

  it('raises Job Goes Loud weight after a violence target', () => {
    const state = withActivity(activity(['violence']));

    expect(weightFor(state, 'job_goes_loud')).toBe(12);
    expect(modifierIdsFor(state, 'job_goes_loud')).toContain('recent_violence');
  });

  it('raises Windfall and Blackmail weights after a memory target', () => {
    const state = withActivity(activity(['memory']));

    expect(weightFor(state, 'unexpected_windfall')).toBe(11);
    expect(weightFor(state, 'blackmail_lead')).toBe(11);
    expect(modifierIdsFor(state, 'unexpected_windfall')).toContain('recent_memory');
    expect(modifierIdsFor(state, 'blackmail_lead')).toContain('recent_memory');
  });

  it('raises intended event weights when Nyx pressure reaches 40', () => {
    const state = withRivalPressure('rival_nyx_ardent', 40);

    expect(weightFor(state, 'liaison_favor')).toBe(15);
    expect(weightFor(state, 'operative_wants_more')).toBe(20);
    expect(modifierIdsFor(state, 'liaison_favor')).toContain('nyx_pressure');
  });

  it('raises intended event weights when Knox pressure reaches 40', () => {
    const state = withRivalPressure('rival_knox_marrow', 40);

    expect(weightFor(state, 'rival_tests_border')).toBe(28);
    expect(weightFor(state, 'job_goes_loud')).toBe(14);
    expect(modifierIdsFor(state, 'job_goes_loud')).toContain('knox_pressure');
  });

  it('raises Heat-tagged event weights after targeting a high-heat district', () => {
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const state: GameState = {
      ...withActivity(
        activity([], {
          type: 'district',
          id: 'district_chrome_narrows',
        }),
      ),
      districts: {
        ...baseline.districts,
        district_chrome_narrows: {
          ...baseline.districts.district_chrome_narrows,
          heat: 60,
        },
      },
    };

    expect(weightFor(state, 'corp_patrol_sweep')).toBe(10);
    expect(weightFor(state, 'liaison_favor')).toBe(5);
    expect(modifierIdsFor(state, 'corp_patrol_sweep')).toContain(
      'recent_high_local_heat',
    );
  });

  it('applies the recent negative-event penalty after context additions', () => {
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const state: GameState = {
      ...withActivity(
        activity([], {
          type: 'district',
          id: 'district_chrome_narrows',
        }),
      ),
      districts: {
        ...baseline.districts,
        district_chrome_narrows: {
          ...baseline.districts.district_chrome_narrows,
          heat: 60,
        },
      },
      eventLog: [
        presentedLog('corp_patrol_sweep', ['HEAT']),
        presentedLog('job_goes_loud', ['HEAT']),
      ],
    };
    const weighted = requireWeightedEvent(state, 'corp_patrol_sweep');

    expect(weighted.diagnostics.baseAndRuleWeight).toBe(6);
    expect(weighted.diagnostics.weightBeforePenalty).toBe(10);
    expect(weighted.diagnostics.recentPenaltyApplied).toBeTrue();
    expect(weighted.weight).toBe(5);
  });

  it('builds complete context and returns diagnostics for the selected event', () => {
    const pressured = withRivalPressure('rival_nyx_ardent', 55);
    const state = withActivity(
      activity(
        ['nightlife'],
        {
          type: 'venue',
          id: 'venue_glass_saint',
        },
        'rival_nyx_ardent',
      ),
      pressured,
    );
    const context = buildEventWeightContext(state);
    const selection = selectWeeklyEvent(state);
    const weighted = requireWeightedEvent(state, selection.definition.id);

    expect(context.recentTargetTags.has('nightlife')).toBeTrue();
    expect(context.recentRivalIds.has('rival_nyx_ardent')).toBeTrue();
    expect(context.recentDistrictIds.has('district_violet_ward')).toBeTrue();
    expect(context.rivalPressures.rival_nyx_ardent).toBe(55);
    expect(selection.diagnostics).toEqual(weighted.diagnostics);
  });

  it('merges eligible operative events into the city event pool with diagnostics', () => {
    const mara = materializeOperativeState('op_mara_voss');
    mara.stress = 80;
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      operatives: [mara],
    };
    const weighted = getWeightedEvents(state);
    const operativeEvent = requireWeightedEvent(state, 'event_mara_ghost_debt');

    expect(weighted.some((candidate) => candidate.event.kind === 'city')).toBeTrue();
    expect(operativeEvent.event.kind).toBe('operative');
    expect(operativeEvent.weight).toBeLessThan(
      weighted.reduce((sum, candidate) => sum + candidate.weight, 0),
    );
    expect(operativeEvent.diagnostics.operativeEligibility?.eligible).toBeTrue();
    expect(operativeEvent.diagnostics.contextModifiers.map((modifier) => modifier.id))
      .withContext('operative weighting diagnostics')
      .toContain('operative_stress');
  });

  it('removes seen operative events from the weighted pool', () => {
    const mara = materializeOperativeState('op_mara_voss');
    mara.stress = 80;
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      operatives: [mara],
      seenSignatureEventIds: ['event_mara_ghost_debt'] as GameState['seenSignatureEventIds'],
    };

    expect(
      getWeightedEvents(state).some(
        (candidate) => candidate.event.id === 'event_mara_ghost_debt',
      ),
    ).toBeFalse();
  });

  it('keeps Ledger events ineligible without matching active entries', () => {
    const state = newGame({ seed: 'LEDGER-NO-EVENTS' });
    const weighted = getWeightedEvents(state);

    expect(weighted.some((candidate) => candidate.event.id === 'ledger_debt_comes_due')).toBeFalse();
    expect(weighted.some((candidate) => candidate.event.id === 'ledger_leverage_window')).toBeFalse();
    expect(weighted.some((candidate) => candidate.event.id === 'ledger_favor_returned')).toBeFalse();
  });

  it('weights Debt Comes Due with active Debt count and age', () => {
    const youngDebt = addLedgerEntry(newGame({ seed: 'LEDGER-DEBT-YOUNG' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const oldDebt = {
      ...youngDebt,
      week: 4,
    };
    const youngWeighted = requireWeightedEvent(youngDebt, 'ledger_debt_comes_due');
    const oldWeighted = requireWeightedEvent(oldDebt, 'ledger_debt_comes_due');
    const context = buildEventWeightContext(oldDebt);

    expect(context.activeDebts).toBe(1);
    expect(context.oldestDebtAge).toBe(3);
    expect(oldWeighted.weight).toBeGreaterThan(youngWeighted.weight);
    expect(modifierIdsFor(oldDebt, 'ledger_debt_comes_due')).toContain('old_debt');
  });

  it('weights Leverage Window only with active Secrets', () => {
    const withSecret = addLedgerEntry(newGame({ seed: 'LEDGER-SECRET' }), {
      definitionId: 'secret_dead_channel_trace',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const weighted = requireWeightedEvent(withSecret, 'ledger_leverage_window');

    expect(weighted.weight).toBeGreaterThan(0);
    expect(modifierIdsFor(withSecret, 'ledger_leverage_window')).toContain('active_secrets');
  });

  it('weights Favor Returned only with active Favors and comeback pressure', () => {
    const base = addLedgerEntry(newGame({ seed: 'LEDGER-FAVOR' }), {
      definitionId: 'favor_checkpoint_captain',
      source: {
        type: 'event',
        eventId: 'rival_sends_flowers',
        choiceId: 'display_them',
      },
    });
    const pressured = {
      ...base,
      pressures: {
        ...base.pressures,
        heat: 70,
      },
    };
    const weighted = requireWeightedEvent(pressured, 'ledger_favor_returned');

    expect(weighted.weight).toBeGreaterThan(0);
    expect(modifierIdsFor(pressured, 'ledger_favor_returned')).toContain('favor_comeback');
  });

  it('keeps non-Ledger events available when Ledger events enter the pool', () => {
    const withLedger = addLedgerEntry(newGame({ seed: 'LEDGER-MIXED-POOL' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const weighted = getWeightedEvents(withLedger);

    expect(weighted.some((candidate) => candidate.event.id === 'ledger_debt_comes_due')).toBeTrue();
    expect(weighted.some((candidate) => !candidate.event.id.startsWith('ledger_'))).toBeTrue();
  });

  it('preserves selected Ledger entry id on selected Ledger events', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-SELECT-9' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const selected = findSelection(state, 'ledger_debt_comes_due');

    expect(selected.event.selectedLedgerEntryId).toBe(state.ledger.entries[0].id);
  });

  it('applies recent penalties to Ledger events through normal event tags', () => {
    const base = addLedgerEntry(newGame({ seed: 'LEDGER-PENALTY' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const penalized = {
      ...base,
      eventLog: [
        presentedLog('unexpected_windfall', ['RESOURCE']),
        presentedLog('operative_wants_more', ['RESOURCE']),
      ],
    };
    const baselineWeight = requireWeightedEvent(base, 'ledger_debt_comes_due').weight;
    const penalizedEvent = requireWeightedEvent(penalized, 'ledger_debt_comes_due');

    expect(penalizedEvent.diagnostics.recentPenaltyApplied).toBeTrue();
    expect(penalizedEvent.weight).toBeLessThan(baselineWeight);
  });

  it('keeps seeded operative-event selection deterministic', () => {
    const juno = materializeOperativeState('op_juno_hex');
    juno.stress = 70;
    juno.recentAssignments = [
      {
        id: 'assignment_1_1',
        week: 1,
        actionId: 'gather_intel',
        targetTags: ['memory'],
        complication: false,
        stressDelta: 8,
      },
    ];
    const state = {
      ...newGame({ seed: 'STATIC-VOICE' }),
      operatives: [juno],
    };

    expect(selectWeeklyEvent(state)).toEqual(selectWeeklyEvent(state));
  });
});

function requireEvent(eventId: string) {
  const event = DISTRICT_ZERO_EVENTS.find((candidate) => candidate.id === eventId);

  if (!event) {
    throw new Error(`Missing test event ${eventId}`);
  }

  return event;
}

function presentedLog(id: string, tags: string[]): GameLogEntry {
  return {
    id,
    week: 1,
    type: 'event_presented',
    title: id,
    tags,
  };
}

function withActivity(
  recentActivity: RecentActivityEntry,
  state: GameState = newGame({ seed: 'VIOLET-ASH-1047' }),
): GameState {
  return {
    ...state,
    recentActivity: [recentActivity],
  };
}

function activity(
  targetTags: string[],
  target?: RecentActivityEntry['target'],
  rivalId?: RivalId,
): RecentActivityEntry {
  return {
    id: 'activity_1_1',
    week: 1,
    actionId: 'gather_intel',
    ...(target ? { target } : {}),
    targetTags,
    ...(rivalId ? { rivalId } : {}),
    heatDelta: 0,
    dominionDelta: 0,
  };
}

function withRivalPressure(rivalId: RivalId, pressure: number): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

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

function weightFor(state: GameState, eventId: string): number {
  return requireWeightedEvent(state, eventId).weight;
}

function modifierIdsFor(state: GameState, eventId: string): string[] {
  return requireWeightedEvent(state, eventId).diagnostics.contextModifiers.map(
    (modifier) => modifier.id,
  );
}

function requireWeightedEvent(state: GameState, eventId: string) {
  const weighted = getWeightedEvents(state).find((candidate) => candidate.event.id === eventId);

  if (!weighted) {
    throw new Error(`Missing weighted event ${eventId}`);
  }

  return weighted;
}

function findSelection(state: GameState, eventId: string) {
  for (let index = 1; index <= 500; index += 1) {
    const selection = selectWeeklyEvent({
      ...state,
      seed: `LEDGER-SELECT-${index}`,
    });

    if (selection.definition.id === eventId) {
      return selection;
    }
  }

  throw new Error(`Expected to select ${eventId}`);
}
