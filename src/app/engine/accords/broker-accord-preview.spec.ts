import { createActiveAccordId } from './accord-caps';
import { previewBrokerAccord } from './broker-accord-preview';
import { newGame } from '../simulation';
import type { ActiveAccord, ActiveAccordId, FactionId, GameState } from '../model';

describe('previewBrokerAccord', () => {
  it('previews costs, pressure effects, faction effects, and timing', () => {
    const preview = previewBrokerAccord(newGame({ seed: 'BROKER-PREVIEW' }), {
      type: 'faction',
      factionId: 'faction_ashline_bureau',
      accordId: 'accord_ashline_clean_corridor',
    });

    expect(preview.ok).toBeTrue();

    if (!preview.ok) {
      return;
    }

    expect(preview.factionName).toBe('Ashline Bureau');
    expect(preview.accordLabel).toBe('Clean Corridor');
    expect(preview.costRows).toEqual([{ id: 'resources', value: 700 }]);
    expect(preview.immediateEffects).toEqual({ heat: -6 });
    expect(preview.weeklyEffects).toEqual({ heat: -3 });
    expect(preview.durationWeeks).toBe(2);
    expect(preview.timingLabel).toBe('Starting next week for 2 weeks');
    expect(preview.factionEffectsOnStart).toEqual({
      standing: 3,
      suspicion: 8,
      obligation: 8,
    });
    expect(preview.factionEffectsPerWeek).toEqual({ suspicion: 3 });
  });

  it('previews Ledger, rival pressure, and front hooks', () => {
    const helix = previewBrokerAccord(ensureActive('faction_helix_meridian'), {
      type: 'faction',
      factionId: 'faction_helix_meridian',
      accordId: 'accord_helix_quiet_capital',
    });
    const velvet = previewBrokerAccord(ensureActive('faction_velvet_house'), {
      type: 'faction',
      factionId: 'faction_velvet_house',
      accordId: 'accord_velvet_guest_list',
    });
    const ashline = previewBrokerAccord(newGame({ seed: 'BROKER-FRONT-HOOK' }), {
      type: 'faction',
      factionId: 'faction_ashline_bureau',
      accordId: 'accord_ashline_inspection_delay',
    });

    expect(helix.ok && helix.ledgerEffectsOnStart).toEqual([
      jasmine.objectContaining({
        definitionId: 'debt_dirty_books',
        entryName: 'Dirty Books',
        kind: 'debt',
        relatedFactionId: 'faction_helix_meridian',
      }),
    ]);
    expect(velvet.ok && velvet.rivalPressureEffectsOnStart).toEqual([
      jasmine.objectContaining({
        rivalId: 'rival_nyx_ardent',
        rivalName: 'Nyx Ardent',
        pressureGain: 5,
        projectedPressure: 5,
      }),
    ]);
    expect(ashline.ok && ashline.frontEffectsOnStart).toEqual([
      jasmine.objectContaining({
        frontId: 'front_pale_circuit',
        frontName: 'The Pale Circuit',
        currentExposure: 12,
        exposureDelta: -10,
        projectedExposure: 2,
      }),
    ]);
  });

  it('reports stable unavailable reasons', () => {
    const state = newGame({ seed: 'BROKER-UNAVAILABLE' });
    const activeFactionId = state.activeFactionIds.find(
      (factionId) => factionId !== 'faction_ashline_bureau',
    )!;
    const inactiveFactionId = (
      [
        'faction_helix_meridian',
        'faction_velvet_house',
        'faction_chrome_maw',
        'faction_ghostline_communion',
      ] as const
    ).find((factionId) => !state.activeFactionIds.includes(factionId))!;

    expect(previewBrokerAccord(state).ok).toBeFalse();
    expect(
      previewBrokerAccord(state, {
        type: 'district',
        id: 'district_violet_ward',
      }).ok,
    ).toBeFalse();
    expect(
      previewBrokerAccord(state, {
        type: 'faction',
        factionId: inactiveFactionId,
        accordId: `${inactiveFactionId.replace('faction', 'accord')}_missing` as never,
      }).ok,
    ).toBeFalse();
    expect(
      previewBrokerAccord(state, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_helix_quiet_capital',
      }),
    ).toEqual(jasmine.objectContaining({ ok: false, unavailableReason: 'accord_wrong_faction' }));

    const used = structuredClone(state);
    used.factions.faction_ashline_bureau!.usedAccordIds = ['accord_ashline_clean_corridor'];
    expect(
      previewBrokerAccord(used, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_ashline_clean_corridor',
      }),
    ).toEqual(jasmine.objectContaining({ ok: false, unavailableReason: 'accord_already_used' }));

    const active = withActiveAccord(
      state,
      'faction_ashline_bureau',
      'accord_ashline_clean_corridor',
      createActiveAccordId('accord_ashline_clean_corridor', 1),
    );
    expect(
      previewBrokerAccord(active, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_ashline_clean_corridor',
      }),
    ).toEqual(jasmine.objectContaining({ ok: false, unavailableReason: 'accord_already_active' }));
    expect(
      previewBrokerAccord(active, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_ashline_inspection_delay',
      }),
    ).toEqual(
      jasmine.objectContaining({ ok: false, unavailableReason: 'faction_accord_cap_reached' }),
    );

    const capped = withTwoExternalActiveAccords(state, activeFactionId);
    expect(
      previewBrokerAccord(capped, {
        type: 'faction',
        factionId: activeFactionId,
        accordId: state.factions[activeFactionId]!.id === 'faction_velvet_house'
          ? 'accord_velvet_guest_list'
          : state.factions[activeFactionId]!.id === 'faction_chrome_maw'
            ? 'accord_chrome_dockside_tithe'
            : state.factions[activeFactionId]!.id === 'faction_ghostline_communion'
              ? 'accord_ghostline_dead_channel'
              : 'accord_helix_quiet_capital',
      }),
    ).toEqual(jasmine.objectContaining({ ok: false, unavailableReason: 'accord_cap_reached' }));

    const unaffordable = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 0,
      },
    };
    expect(
      previewBrokerAccord(unaffordable, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_ashline_clean_corridor',
      }),
    ).toEqual(jasmine.objectContaining({ ok: false, unavailableReason: 'not_enough_resources' }));
  });

  it('reports unmet requirements', () => {
    const state = newGame({ seed: 'BROKER-REQUIREMENT' });
    state.factions.faction_ashline_bureau!.standing = 10;

    expect(
      previewBrokerAccord(state, {
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_ashline_inspection_delay',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'accord_requirement_not_met',
        unmetRequirements: [{ metric: 'standing', gte: 35 }],
      }),
    );
  });
});

function ensureActive(factionId: FactionId): GameState {
  const state = newGame({ seed: `BROKER-ACTIVE-${factionId}` });

  if (state.activeFactionIds.includes(factionId)) {
    return state;
  }

  const inactiveFactionId = state.activeFactionIds.find(
    (activeFactionId) => activeFactionId !== 'faction_ashline_bureau',
  )!;
  const next = structuredClone(state);
  next.activeFactionIds = next.activeFactionIds.map((activeFactionId) =>
    activeFactionId === inactiveFactionId ? factionId : activeFactionId,
  );
  delete next.factions[inactiveFactionId];
  next.factions[factionId] = {
    id: factionId,
    standing: 50,
    suspicion: 20,
    obligation: 0,
    usedAccordIds: [],
    activeAccordIds: [],
    flags: {},
    recentInteractions: [],
  };

  return next;
}

function withActiveAccord(
  state: GameState,
  factionId: FactionId,
  definitionId: ActiveAccord['definitionId'],
  activeAccordId: ActiveAccordId,
): GameState {
  const next = structuredClone(state);
  next.factions[factionId]!.activeAccordIds = [activeAccordId];
  next.activeAccords[activeAccordId] = {
    id: activeAccordId,
    definitionId,
    factionId,
    startedWeek: 1,
    remainingWeeks: 2,
    firstWeeklyEffectWeek: 2,
    source: {
      type: 'broker_accord',
    },
  };

  return next;
}

function withTwoExternalActiveAccords(state: GameState, targetFactionId: FactionId): GameState {
  const next = structuredClone(state);
  const externalFactionIds = next.activeFactionIds
    .filter((factionId) => factionId !== targetFactionId)
    .slice(0, 2);
  const accordIds = {
    faction_ashline_bureau: 'accord_ashline_clean_corridor',
    faction_helix_meridian: 'accord_helix_quiet_capital',
    faction_velvet_house: 'accord_velvet_guest_list',
    faction_chrome_maw: 'accord_chrome_dockside_tithe',
    faction_ghostline_communion: 'accord_ghostline_dead_channel',
  } as const;

  for (const [index, factionId] of externalFactionIds.entries()) {
    const definitionId = accordIds[factionId];
    const activeAccordId = createActiveAccordId(definitionId, index + 1);
    next.factions[factionId]!.activeAccordIds = [activeAccordId];
    next.activeAccords[activeAccordId] = {
      id: activeAccordId,
      definitionId,
      factionId,
      startedWeek: 1,
      remainingWeeks: 2,
      firstWeeklyEffectWeek: 2,
      source: {
        type: 'broker_accord',
      },
    };
  }

  return next;
}
