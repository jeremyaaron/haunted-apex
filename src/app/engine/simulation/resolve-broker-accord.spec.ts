import { getFactionDefinition } from '../content';
import { previewBrokerAccord } from '../accords';
import type { AccordId, FactionId, FactionState, GameState, QueuedOrder } from '../model';
import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';

describe('resolveQueuedOrder Broker Accord', () => {
  it('spends costs, applies immediate effects, and creates an active accord', () => {
    const state = newGame({ seed: 'BROKER-RESOLVE' });
    const preview = previewBrokerAccord(state, ashlineTarget('accord_ashline_clean_corridor'));
    const resolved = resolveQueuedOrder(
      state,
      order(ashlineTarget('accord_ashline_clean_corridor')),
    );

    expect(preview.ok).toBeTrue();
    expect(resolved.complication).toBeFalse();
    expect(resolved.resolvedDelta).toEqual({
      heat: -6,
      resources: -900,
    });
    expect(resolved.state.pressures.resources).toBe(state.pressures.resources - 900);
    expect(resolved.state.pressures.heat).toBe(state.pressures.heat - 6);
    expect(Object.keys(resolved.state.activeAccords)).toEqual([
      'active_accord_ashline_clean_corridor_1',
    ]);
    expect(resolved.state.activeAccords['active_accord_ashline_clean_corridor_1']).toEqual({
      id: 'active_accord_ashline_clean_corridor_1',
      definitionId: 'accord_ashline_clean_corridor',
      factionId: 'faction_ashline_bureau',
      startedWeek: 1,
      remainingWeeks: 2,
      firstWeeklyEffectWeek: 2,
      source: {
        type: 'broker_accord',
      },
    });
  });

  it('applies faction start effects and marks the accord used immediately', () => {
    const state = newGame({ seed: 'BROKER-FACTION' });
    const resolved = resolveQueuedOrder(
      state,
      order(ashlineTarget('accord_ashline_clean_corridor')),
    );
    const faction = resolved.state.factions.faction_ashline_bureau!;

    expect(faction.standing).toBe(48);
    expect(faction.suspicion).toBe(45);
    expect(faction.obligation).toBe(36);
    expect(faction.usedAccordIds).toEqual(['accord_ashline_clean_corridor']);
    expect(faction.activeAccordIds).toEqual(['active_accord_ashline_clean_corridor_1']);
    expect(faction.recentInteractions).toEqual([
      jasmine.objectContaining({
        week: 1,
        sourceType: 'accord',
        sourceId: 'active_accord_ashline_clean_corridor_1',
        standingDelta: 3,
        suspicionDelta: 10,
        obligationDelta: 36,
      }),
    ]);
  });

  it('applies rival pressure effects', () => {
    const state = ensureActive('faction_velvet_house');
    const resolved = resolveQueuedOrder(
      state,
      order({
        type: 'faction',
        factionId: 'faction_velvet_house',
        accordId: 'accord_velvet_guest_list',
      }),
    );

    expect(resolved.state.rivals.rival_nyx_ardent.pressure).toBe(5);
  });

  it('applies front exposure hooks from Inspection Delay', () => {
    const base = newGame({ seed: 'BROKER-FRONT' });
    const state: GameState = {
      ...base,
      fronts: {
        front_pale_circuit: {
          ...base.fronts.front_pale_circuit!,
          exposure: 44,
        },
      },
    };
    const resolved = resolveQueuedOrder(
      state,
      order(ashlineTarget('accord_ashline_inspection_delay')),
    );

    expect(resolved.state.fronts.front_pale_circuit?.exposure).toBe(34);
  });

  it('creates Ledger entries from accord effects with faction context', () => {
    const state = ensureActive('faction_helix_meridian');
    const resolved = resolveQueuedOrder(
      state,
      order({
        type: 'faction',
        factionId: 'faction_helix_meridian',
        accordId: 'accord_helix_quiet_capital',
      }),
    );

    expect(resolved.state.ledger.entries).toEqual([
      jasmine.objectContaining({
        definitionId: 'debt_institutional_favor',
        kind: 'debt',
        relatedFactionId: 'faction_helix_meridian',
        source: {
          type: 'action',
          actionId: 'broker_accord',
          target: {
            type: 'faction',
            factionId: 'faction_helix_meridian',
            accordId: 'accord_helix_quiet_capital',
          },
        },
      }),
    ]);
    expect(resolved.state.ledger.discoveredCount).toBe(1);
  });

  it('creates Compliance Blind Spot from Inspection Delay with Ashline context', () => {
    const state = newGame({ seed: 'BROKER-COMPLIANCE' });
    const resolved = resolveQueuedOrder(
      state,
      order(ashlineTarget('accord_ashline_inspection_delay')),
    );

    expect(resolved.state.ledger.entries).toEqual([
      jasmine.objectContaining({
        definitionId: 'secret_compliance_blind_spot',
        kind: 'secret',
        relatedFactionId: 'faction_ashline_bureau',
      }),
    ]);
    expect(resolved.state.eventLog.at(-2)).toEqual(
      jasmine.objectContaining({
        type: 'ledger',
        title: 'Ledger entry added: Compliance Blind Spot',
      }),
    );
  });

  it('blocks the same accord after it has been brokered once', () => {
    const state = newGame({ seed: 'BROKER-USED' });
    const first = resolveQueuedOrder(state, order(ashlineTarget('accord_ashline_clean_corridor')));
    const second = resolveQueuedOrder(
      first.state,
      order(ashlineTarget('accord_ashline_clean_corridor')),
    );

    expect(second.complication).toBeTrue();
    expect(Object.keys(second.state.activeAccords)).toEqual([
      'active_accord_ashline_clean_corridor_1',
    ]);
    expect(second.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        title: 'Broker Accord Blocked',
        tags: ['ACCORD', 'BLOCKED', 'accord_already_used'],
      }),
    );
  });

  it('allows a different accord from the same faction after the previous accord is no longer active', () => {
    const state = newGame({ seed: 'BROKER-LATER' });
    const first = resolveQueuedOrder(state, order(ashlineTarget('accord_ashline_clean_corridor')));
    const expired = {
      ...first.state,
      activeAccords: {},
      factions: {
        ...first.state.factions,
        faction_ashline_bureau: {
          ...first.state.factions.faction_ashline_bureau!,
          activeAccordIds: [],
        },
      },
    };
    const second = resolveQueuedOrder(
      expired,
      order(ashlineTarget('accord_ashline_inspection_delay')),
    );

    expect(second.complication).toBeFalse();
    expect(second.state.factions.faction_ashline_bureau?.usedAccordIds).toEqual([
      'accord_ashline_clean_corridor',
      'accord_ashline_inspection_delay',
    ]);
    expect(Object.keys(second.state.activeAccords)).toEqual([
      'active_accord_ashline_inspection_delay_1',
    ]);
  });

  it('blocks stale invalid queued broker orders without crashing', () => {
    const state = newGame({ seed: 'BROKER-STALE' });
    const resolved = resolveQueuedOrder(
      state,
      order({
        type: 'faction',
        factionId: 'faction_ashline_bureau',
        accordId: 'accord_helix_quiet_capital',
      }),
    );

    expect(resolved.complication).toBeTrue();
    expect(resolved.resolvedDelta).toEqual({});
    expect(resolved.state.activeAccords).toEqual({});
    expect(resolved.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        title: 'Broker Accord Blocked',
        body: 'Broker Accord could not resolve: accord_wrong_faction.',
      }),
    );
  });
});

function ashlineTarget(accordId: Extract<AccordId, `accord_ashline_${string}`>): QueuedOrder['target'] {
  return {
    type: 'faction',
    factionId: 'faction_ashline_bureau',
    accordId,
  };
}

function order(target: QueuedOrder['target']): QueuedOrder {
  return {
    id: 'order_1_1',
    actionId: 'broker_accord',
    target,
  };
}

function ensureActive(factionId: FactionId): GameState {
  const state = newGame({ seed: `BROKER-RESOLVE-${factionId}` });

  if (state.activeFactionIds.includes(factionId)) {
    return state;
  }

  const inactiveFactionId = state.activeFactionIds.find(
    (activeFactionId) => activeFactionId !== 'faction_ashline_bureau',
  )!;
  const definition = getFactionDefinition(factionId)!;
  const next = structuredClone(state);
  next.activeFactionIds = next.activeFactionIds.map((activeFactionId) =>
    activeFactionId === inactiveFactionId ? factionId : activeFactionId,
  );
  delete next.factions[inactiveFactionId];
  next.factions[factionId] = materializeFaction(definition);

  return next;
}

function materializeFaction(
  definition: NonNullable<ReturnType<typeof getFactionDefinition>>,
): FactionState {
  return {
    id: definition.id,
    standing: definition.baseStanding,
    suspicion: definition.baseSuspicion,
    obligation: definition.baseObligation,
    usedAccordIds: [],
    activeAccordIds: [],
    flags: {},
    recentInteractions: [],
  };
}
