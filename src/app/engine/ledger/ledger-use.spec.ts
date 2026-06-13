import { getFactionDefinition } from '../content';
import { materializeFactionState } from '../factions';
import type { FactionId, GameState } from '../model';
import { applyPressureDelta } from '../simulation';
import { newGame } from '../simulation/new-game';
import { resolveQueuedOrder } from '../simulation/resolve-action';
import { addLedgerEntry } from './add-ledger-entry';
import { previewLedgerUse, resolveLedgerUse } from './ledger-use';

describe('Ledger use preview and resolution', () => {
  it('previews costs, effects, affordability, consumption, and risk', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-PREVIEW' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const preview = previewLedgerUse(state, {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'pay_in_credits',
    });

    expect(preview).toEqual(
      jasmine.objectContaining({
        ok: true,
        entryName: 'Owes the Liaison',
        useOptionLabel: 'Pay in Credits',
        targetLabel: 'Owes the Liaison - Pay in Credits',
        cost: {
          resources: 900,
          intel: 0,
        },
        costRows: [{ id: 'resources', value: 900 }],
        effects: { loyalty: 2 },
        resolvedDelta: {
          resources: -900,
          loyalty: 2,
        },
        consumesEntry: true,
        affordable: true,
        riskModifier: 0,
        riskChance: 3,
      }),
    );
  });

  it('adds use-option risk modifiers to the normal action risk', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-RISK' }), {
      definitionId: 'secret_magistrate_glass_room',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const preview = previewLedgerUse(
      state,
      {
        type: 'ledger',
        entryId: state.ledger.entries[0].id,
        useOptionId: 'press_the_magistrate',
      },
      3,
    );

    expect(preview.ok && preview.riskChance).toBe(5);
  });

  it('applies the exact previewed debt settlement delta and consumes the debt', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-RESOLVE-DEBT' }), {
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
      useOptionId: 'offer_information',
    } as const;
    const preview = previewLedgerUse(state, target);
    const result = resolveLedgerUse(state, target);

    if (!preview.ok) {
      fail(`Expected valid preview, got ${preview.reason}`);
      return;
    }

    expect(result.resolvedDelta).toEqual(preview.resolvedDelta);
    expect(result.state.pressures).toEqual(
      applyPressureDelta(state.pressures, preview.resolvedDelta),
    );
    expect(result.state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        consumed: true,
        consumedWeek: state.week,
        consumedBy: {
          type: 'action',
          actionId: 'work_the_ledger',
          useOptionId: 'offer_information',
        },
      }),
    );
    expect(result.state.ledger.consumedCount).toBe(1);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'order_resolved',
        title: 'Work the Ledger: Owes the Liaison',
        pressureDelta: preview.resolvedDelta,
      }),
    );
  });

  it('can spend a Secret to reduce Heat and consume the Secret', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-SECRET' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const result = resolveLedgerUse(state, {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'burn_patrol_window',
    });

    expect(result.resolvedDelta).toEqual({
      heat: -12,
      intel: -2,
    });
    expect(result.state.pressures.heat).toBe(6);
    expect(result.state.pressures.intel).toBe(8);
    expect(result.state.ledger.entries[0].consumed).toBeTrue();
  });

  it('can spend a Favor for comeback effects and consume the Favor', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-FAVOR' }), {
      definitionId: 'favor_hidden_route',
      source: {
        type: 'event',
        eventId: 'blackmail_lead',
        choiceId: 'save_it_for_later',
      },
    });
    const result = resolveLedgerUse(state, {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'open_hidden_route',
    });

    expect(result.resolvedDelta).toEqual({
      heat: -6,
      loyalty: 2,
      intel: -1,
    });
    expect(result.state.pressures.loyalty).toBe(70);
    expect(result.state.ledger.entries[0].consumed).toBeTrue();
  });

  it('does not resolve consumed or unaffordable Ledger entries', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-BLOCKED' }), {
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
    const consumed = {
      ...state,
      ledger: {
        ...state.ledger,
        entries: state.ledger.entries.map((entry) => ({
          ...entry,
          consumed: true,
        })),
        consumedCount: 1,
      },
    };
    const broke = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 100,
      },
    };
    const consumedResult = resolveLedgerUse(consumed, target);
    const brokeResult = resolveLedgerUse(broke, target);

    expect(consumedResult.resolvedDelta).toEqual({});
    expect(consumedResult.state.pressures).toEqual(consumed.pressures);
    expect(consumedResult.state.ledger).toEqual(consumed.ledger);
    expect(consumedResult.state.eventLog.at(-1)?.title).toBe('Ledger Use Blocked');
    expect(brokeResult.resolvedDelta).toEqual({});
    expect(brokeResult.state.pressures).toEqual(broke.pressures);
    expect(brokeResult.state.ledger).toEqual(broke.ledger);
    expect(brokeResult.state.eventLog.at(-1)?.tags).toContain('not_enough_resources');
  });

  it('keeps Work the Ledger resolution aligned with the shared preview', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-PARITY' }), {
      definitionId: 'secret_knox_route_manifests',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
    const target = {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'reroute_knox_cargo',
    } as const;
    const preview = previewLedgerUse(state, target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'work_the_ledger',
      target,
    });

    if (!preview.ok) {
      fail(`Expected valid preview, got ${preview.reason}`);
      return;
    }

    expect(result.riskChance).toBe(preview.riskChance);
    expect(result.resolvedDelta).toEqual(preview.resolvedDelta);
    expect(result.state.pressures).toEqual(
      applyPressureDelta(state.pressures, preview.resolvedDelta),
    );
  });

  it('previews and applies declared contact effects for contact-linked Ledger use', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-CONTACT-EFFECTS' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'action',
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId: 'contact_veyra_lux',
          optionId: 'private_room_access',
        },
      },
      relatedContactId: 'contact_veyra_lux',
    });
    const target = {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'pay_in_credits',
    } as const;
    const preview = previewLedgerUse(state, target);
    const result = resolveLedgerUse(state, target);

    if (!preview.ok) {
      fail(`Expected valid preview, got ${preview.reason}`);
      return;
    }

    expect(preview.relatedContactName).toBe('Veyra Lux');
    expect(preview.relatedContactEffectRows).toEqual([
      { id: 'trust', value: 4 },
      { id: 'volatility', value: -2 },
    ]);
    expect(result.state.contacts.contact_veyra_lux.trust).toBe(
      state.contacts.contact_veyra_lux.trust + 4,
    );
    expect(result.state.contacts.contact_veyra_lux.volatility).toBe(
      state.contacts.contact_veyra_lux.volatility - 2,
    );
    expect(result.state.eventLog.at(-1)?.body).toContain(
      'Veyra Lux: trust +4, volatility -2.',
    );
  });

  it('does not change a linked contact when the use option declares no contact effects', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-CONTACT-NO-EFFECTS' }), {
      definitionId: 'favor_hidden_route',
      source: {
        type: 'event',
        eventId: 'blackmail_lead',
        choiceId: 'save_it_for_later',
      },
      relatedContactId: 'contact_ciro_moth',
    });
    const result = resolveLedgerUse(state, {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'open_hidden_route',
    });

    expect(result.state.contacts.contact_ciro_moth).toEqual(
      state.contacts.contact_ciro_moth,
    );
    expect(result.state.eventLog.at(-1)?.body).not.toContain('Ciro Moth:');
  });

  it('previews and applies declared faction effects for faction-linked Ledger use', () => {
    const withFaction = withActiveFaction(
      newGame({ seed: 'LEDGER-FACTION-EFFECTS' }),
      'faction_helix_meridian',
    );
    const state = addLedgerEntry(
      {
        ...withFaction,
        factions: {
          ...withFaction.factions,
          faction_helix_meridian: {
            ...withFaction.factions.faction_helix_meridian!,
            obligation: 5,
          },
        },
      },
      {
        definitionId: 'debt_dirty_books',
        source: {
          type: 'action',
          actionId: 'broker_accord',
          target: {
            type: 'faction',
            factionId: 'faction_helix_meridian',
            accordId: 'accord_helix_quiet_capital',
          },
        },
        relatedFactionId: 'faction_helix_meridian',
      },
    );
    const target = {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'pay_auditors_off',
    } as const;
    const preview = previewLedgerUse(state, target);
    const result = resolveLedgerUse(state, target);

    if (!preview.ok) {
      fail(`Expected valid preview, got ${preview.reason}`);
      return;
    }

    expect(preview.relatedFactionName).toBe('Helix Meridian');
    expect(preview.relatedFactionEffectRows).toEqual([
      { id: 'standing', value: 1 },
      { id: 'obligation', value: -3 },
    ]);
    expect(result.state.factions.faction_helix_meridian?.standing).toBe(
      state.factions.faction_helix_meridian!.standing + 1,
    );
    expect(result.state.factions.faction_helix_meridian?.obligation).toBe(2);
    expect(result.state.eventLog.at(-1)?.body).toContain(
      'Helix Meridian: standing +1, obligation -3.',
    );
  });

  it('does not change a linked faction when the use option declares no faction effects', () => {
    const withFaction = withActiveFaction(
      newGame({ seed: 'LEDGER-FACTION-NO-EFFECTS' }),
      'faction_ghostline_communion',
    );
    const state = addLedgerEntry(withFaction, {
      definitionId: 'favor_hidden_route',
      source: {
        type: 'event',
        eventId: 'blackmail_lead',
        choiceId: 'save_it_for_later',
      },
      relatedFactionId: 'faction_ghostline_communion',
    });
    const before = structuredClone(state.factions.faction_ghostline_communion);
    const result = resolveLedgerUse(state, {
      type: 'ledger',
      entryId: state.ledger.entries[0].id,
      useOptionId: 'open_hidden_route',
    });

    expect(result.state.factions.faction_ghostline_communion).toEqual(before);
    expect(result.state.eventLog.at(-1)?.body).not.toContain('Ghostline Communion:');
  });
});

function withActiveFaction(state: GameState, factionId: FactionId): GameState {
  if (state.activeFactionIds.includes(factionId)) {
    return state;
  }

  const replaceableId = state.activeFactionIds.find(
    (activeFactionId) => activeFactionId !== 'faction_ashline_bureau',
  )!;
  const definition = getFactionDefinition(factionId)!;
  const next = structuredClone(state);
  next.activeFactionIds = next.activeFactionIds.map((activeFactionId) =>
    activeFactionId === replaceableId ? factionId : activeFactionId,
  );
  delete next.factions[replaceableId];
  next.factions[factionId] = materializeFactionState(definition);

  return next;
}
