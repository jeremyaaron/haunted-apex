import { DISTRICT_ZERO_EVENTS } from '../content';
import { addLedgerEntry } from '../ledger';
import type {
  ContactId,
  FrontId,
  FrontState,
  GameLogEntry,
  GameState,
  RecentActivityEntry,
  RivalId,
} from '../model';
import { createRng } from '../rng';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import {
  getFrontEventEligibility,
  getFrontEventTargetWeight,
  selectFrontForEvent,
} from './front-events';
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

  it('only includes Contact events for active non-burned eligible contacts', () => {
    const active = withActiveContacts(newGame({ seed: 'CONTACT-EVENT-ACTIVE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const inactive = withActiveContacts(newGame({ seed: 'CONTACT-EVENT-INACTIVE' }), [
      'contact_captain_hollis',
      'contact_father_static',
      'contact_ciro_moth',
    ]);
    const burned = {
      ...active,
      contacts: {
        ...active.contacts,
        contact_veyra_lux: {
          ...active.contacts.contact_veyra_lux,
          burned: true,
        },
      },
    };

    expect(getWeightedEvents(active).some((candidate) => candidate.event.id === 'event_veyra_room'))
      .withContext('active Veyra')
      .toBeTrue();
    expect(getWeightedEvents(inactive).some((candidate) => candidate.event.id === 'event_veyra_room'))
      .withContext('inactive Veyra')
      .toBeFalse();
    expect(getWeightedEvents(burned).some((candidate) => candidate.event.id === 'event_veyra_room'))
      .withContext('burned Veyra')
      .toBeFalse();
  });

  it('removes seen Contact signature events from the weighted pool', () => {
    const state = {
      ...withActiveContacts(newGame({ seed: 'CONTACT-SIGNATURE-SEEN' }), [
        'contact_veyra_lux',
        'contact_captain_hollis',
        'contact_father_static',
      ]),
      seenSignatureEventIds: ['event_veyra_room'] as GameState['seenSignatureEventIds'],
    };

    expect(getWeightedEvents(state).some((candidate) => candidate.event.id === 'event_veyra_room'))
      .toBeFalse();
  });

  it('applies generic Contact event cooldown and post-first downweighting', () => {
    const base = withActiveContacts(newGame({ seed: 'CONTACT-GENERIC-BASE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const cooledDown = {
      ...base,
      week: 4,
      eventLog: [presentedLog('contact_wants_assurance', ['CONTACT', 'contact_wants_assurance'], 2)],
    };
    const seenEarlier = {
      ...base,
      week: 5,
      eventLog: [presentedLog('contact_wants_assurance', ['CONTACT', 'contact_wants_assurance'], 1)],
    };
    const baseline = requireWeightedEvent(base, 'contact_wants_assurance').weight;

    expect(getWeightedEvents(cooledDown).some((candidate) => candidate.event.id === 'contact_wants_assurance'))
      .withContext('two-week cooldown')
      .toBeFalse();
    expect(requireWeightedEvent(seenEarlier, 'contact_wants_assurance').weight)
      .withContext('post-first downweight')
      .toBe(Math.floor(baseline * 0.5));
  });

  it('uses Contact metrics and recent interaction context for Contact event eligibility', () => {
    const lowVolatility = withActiveContacts(newGame({ seed: 'CONTACT-CIRO-LOW' }), [
      'contact_ciro_moth',
      'contact_veyra_lux',
      'contact_captain_hollis',
    ]);
    const highVolatility: GameState = {
      ...lowVolatility,
      contacts: {
        ...lowVolatility.contacts,
        contact_ciro_moth: {
          ...lowVolatility.contacts.contact_ciro_moth,
          volatility: 70,
          recentInteractions: [
            {
              week: lowVolatility.week,
              optionId: 'pressure',
              kind: 'pressure',
              label: 'Pressure',
              effectsSummary: { volatility: 8 },
            },
          ],
        },
      },
    };

    expect(getWeightedEvents(lowVolatility).some((candidate) => candidate.event.id === 'event_ciro_route_remembers'))
      .toBeTrue();
    expect(modifierIdsFor(highVolatility, 'event_ciro_route_remembers')).toContain(
      'contact_recent_interaction',
    );
    expect(modifierIdsFor(highVolatility, 'event_ciro_route_remembers')).toContain(
      'contact_volatile',
    );
  });

  it('stores selected Contact ids on selected Contact events', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-SELECTED' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const selected = findSelection(state, 'contact_wants_assurance');

    expect(selected.event.selectedContactId).toBeDefined();
    if (!selected.event.selectedContactId) {
      fail('Expected selected Contact id');
      return;
    }

    expect(state.activeContactIds).toContain(selected.event.selectedContactId);
  });

  it('keeps Front events in the normal weighted event pool only when eligible', () => {
    const baseline = newGame({ seed: 'FRONT-EVENT-BASE' });
    const exposed = withFronts(baseline, [
      frontState('front_shell_gallery', {
        exposure: 72,
        districtId: 'district_violet_ward',
      }),
    ]);
    const weighted = requireWeightedEvent(exposed, 'front_inspection');

    expect(getWeightedEvents(baseline).some((candidate) => candidate.event.id === 'front_inspection'))
      .withContext('starting front exposure too low')
      .toBeFalse();
    expect(weighted.diagnostics.frontEligibility).toEqual(
      jasmine.objectContaining({
        eligible: true,
        eligibleFrontIds: ['front_shell_gallery'],
        maxExposure: 72,
      }),
    );
    expect(weighted.diagnostics.contextModifiers.map((modifier) => modifier.id)).toContain(
      'front_exposed',
    );
  });

  it('selects Front event targets deterministically with exposure-weighted randomness', () => {
    const event = requireEvent('front_inspection');
    const state = withFronts(newGame({ seed: 'FRONT-EVENT-SELECTION' }), [
      frontState('front_black_clinic', {
        exposure: 61,
        districtId: 'district_ghostline_market',
      }),
      frontState('front_shell_gallery', {
        exposure: 92,
        districtId: 'district_violet_ward',
        level: 2,
      }),
      frontState('front_surveillance_den', {
        exposure: 75,
        districtId: 'district_ghostline_market',
      }),
    ]);
    const selection = selectFrontForEvent(state, event, createRng('FRONT-EVENT-SELECTION'));

    expect(selection).toEqual(selectFrontForEvent(state, event, createRng('FRONT-EVENT-SELECTION')));
    expect(selection.frontId).toBeDefined();
    expect(
      getFrontEventTargetWeight(state, event, state.fronts.front_shell_gallery!),
    ).toBeGreaterThan(getFrontEventTargetWeight(state, event, state.fronts.front_black_clinic!));
  });

  it('stores selected Front ids on selected Front events', () => {
    const state = withFronts(newGame({ seed: 'FRONT-EVENT-PENDING' }), [
      frontState('front_shell_gallery', {
        exposure: 85,
        districtId: 'district_violet_ward',
      }),
    ]);
    const selected = findSelection(state, 'front_inspection');

    expect(selected.event.selectedFrontId).toBe('front_shell_gallery');
  });

  it('requires rival pressure for Rival Leans on Your Front', () => {
    const lowPressure = withFronts(newGame({ seed: 'FRONT-RIVAL-LOW' }), [
      frontState('front_zero_mercy_cut', {
        exposure: 50,
        districtId: 'district_chrome_narrows',
        venueId: 'venue_zero_mercy',
        relatedRivalId: 'rival_knox_marrow',
      }),
    ]);
    const highPressure = {
      ...lowPressure,
      rivals: {
        ...lowPressure.rivals,
        rival_knox_marrow: {
          ...lowPressure.rivals.rival_knox_marrow,
          pressure: 45,
        },
      },
    };
    const event = requireEvent('front_rival_leans_on_your_front');

    expect(getFrontEventEligibility(lowPressure, event).eligible).toBeFalse();
    expect(getFrontEventEligibility(highPressure, event).eligible).toBeTrue();
  });
});

function requireEvent(eventId: string) {
  const event = DISTRICT_ZERO_EVENTS.find((candidate) => candidate.id === eventId);

  if (!event) {
    throw new Error(`Missing test event ${eventId}`);
  }

  return event;
}

function presentedLog(id: string, tags: string[], week = 1): GameLogEntry {
  return {
    id,
    week,
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

function withActiveContacts(state: GameState, activeContactIds: ContactId[]): GameState {
  return {
    ...state,
    activeContactIds,
  };
}

function withFronts(state: GameState, fronts: FrontState[]): GameState {
  return {
    ...state,
    fronts: Object.fromEntries(fronts.map((front) => [front.id, front])) as GameState['fronts'],
  };
}

function frontState(
  id: FrontId,
  overrides: Partial<FrontState> & Pick<FrontState, 'districtId'>,
): FrontState {
  return {
    id,
    definitionId: id,
    districtId: overrides.districtId,
    ...(overrides.venueId ? { venueId: overrides.venueId } : {}),
    ...(overrides.relatedRivalId ? { relatedRivalId: overrides.relatedRivalId } : {}),
    level: overrides.level ?? 1,
    exposure: overrides.exposure ?? 30,
    establishedWeek: overrides.establishedWeek ?? 1,
    compromised: overrides.compromised ?? false,
    active: overrides.active ?? true,
    flags: overrides.flags ?? {},
    yieldHistory: overrides.yieldHistory ?? [],
  };
}
