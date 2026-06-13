import type { GameState } from '../model';
import { newGame } from '../simulation';
import { addLedgerEntry } from './add-ledger-entry';
import {
  getLedgerEntry,
  selectActiveDebts,
  selectActiveFavors,
  selectActiveLedgerEntryViews,
  selectActiveSecrets,
  selectConsumedLedgerEntryViews,
  selectLedgerPanelView,
  selectLedgerSummary,
} from './ledger-selectors';

describe('Ledger lifecycle and selectors', () => {
  it('adds Ledger entries with deterministic ids, source metadata, and logs', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-ADD' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: {
          type: 'venue',
          id: 'venue_zero_mercy',
        },
      },
      relatedTarget: {
        type: 'venue',
        id: 'venue_zero_mercy',
      },
    });

    expect(state.ledger.entries).toHaveSize(1);
    expect(state.ledger.discoveredCount).toBe(1);
    expect(state.ledger.consumedCount).toBe(0);
    expect(state.ledger.entries[0]).toEqual(
      jasmine.objectContaining({
        id: 'ledger_secret_patrol_schedule_1_1',
        definitionId: 'secret_patrol_schedule',
        kind: 'secret',
        createdWeek: 1,
        revealed: true,
        consumed: false,
      }),
    );
    expect(state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'ledger',
        title: 'Ledger entry added: Patrol Schedule',
      }),
    );
  });

  it('allows duplicate Ledger definitions as separate runtime instances', () => {
    const once = addLedgerEntry(newGame({ seed: 'LEDGER-DUPES' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const twice = addLedgerEntry(once, {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });

    expect(twice.ledger.entries.map((entry) => entry.id)).toEqual([
      'ledger_debt_owes_liaison_1_1',
      'ledger_debt_owes_liaison_1_2',
    ]);
    expect(selectActiveDebts(twice)).toHaveSize(2);
  });

  it('groups active and consumed entries by kind', () => {
    const withEntries = addLedgerEntry(
      addLedgerEntry(
        addLedgerEntry(newGame({ seed: 'LEDGER-GROUPS' }), {
          definitionId: 'secret_dead_channel_trace',
          source: {
            type: 'action',
            actionId: 'gather_intel',
          },
        }),
        {
          definitionId: 'debt_unfunded_promise',
          source: {
            type: 'event',
            eventId: 'operative_wants_more',
            choiceId: 'promise_future_rewards',
          },
        },
      ),
      {
        definitionId: 'favor_hidden_route',
        source: {
          type: 'event',
          eventId: 'blackmail_lead',
          choiceId: 'save_it_for_later',
        },
      },
    );
    const consumed = consumeEntry(withEntries, withEntries.ledger.entries[0].id);
    const panel = selectLedgerPanelView(consumed);

    expect(selectActiveSecrets(consumed)).toEqual([]);
    expect(selectActiveDebts(consumed)).toHaveSize(1);
    expect(selectActiveFavors(consumed)).toHaveSize(1);
    expect(selectActiveLedgerEntryViews(consumed).map((entry) => entry.name)).toEqual([
      'Unfunded Promise',
      'Hidden Route',
    ]);
    expect(selectConsumedLedgerEntryViews(consumed).map((entry) => entry.status)).toEqual([
      'spent',
    ]);
    expect(panel.secrets).toEqual([]);
    expect(panel.debts[0].name).toBe('Unfunded Promise');
    expect(panel.favors[0].name).toBe('Hidden Route');
    expect(panel.consumed[0].name).toBe('Dead Channel Trace');
    expect(selectLedgerSummary(consumed)).toEqual({
      totalEntries: 3,
      activeSecrets: 0,
      activeDebts: 1,
      activeFavors: 1,
      consumedEntries: 1,
      unresolvedDebtCount: 1,
    });
  });

  it('reports use option affordability and related context in entry views', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-VIEWS' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
      relatedTarget: {
        type: 'district',
        id: 'district_violet_ward',
      },
    });
    const broke: GameState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 100,
        intel: 1,
      },
    };
    const view = selectActiveLedgerEntryViews(broke)[0];

    expect(getLedgerEntry(broke, view.id)?.definitionId).toBe('debt_owes_liaison');
    expect(view.sourceLabel).toBe('A Favor in Violet Light');
    expect(view.relatedContextLabel).toBe('Violet Ward');
    expect(view.useOptions.map((option) => option.unavailableReason)).toEqual([
      'insufficient_resources',
      'insufficient_intel',
    ]);
    expect(view.useOptions.every((option) => !option.affordable)).toBeTrue();
  });

  it('exposes related contact labels and declared contact effects', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-CONTACT-VIEW' }), {
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
    const view = selectActiveLedgerEntryViews(state)[0];

    expect(view.relatedContactLabel).toBe('Veyra Lux');
    expect(view.useOptions[0].relatedContactEffectRows).toEqual([
      { id: 'trust', value: 4 },
      { id: 'volatility', value: -2 },
    ]);
  });

  it('exposes declared faction effects for faction-linked Ledger entries', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-FACTION-VIEW' }), {
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
    });
    const view = selectActiveLedgerEntryViews(state)[0];

    expect(view.useOptions[0].relatedFactionEffectRows).toEqual([
      { id: 'standing', value: 1 },
      { id: 'obligation', value: -3 },
    ]);
  });

  function consumeEntry(state: GameState, entryId: string): GameState {
    return {
      ...state,
      ledger: {
        ...state.ledger,
        entries: state.ledger.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                consumed: true,
                consumedWeek: state.week,
                consumedBy: {
                  type: 'action',
                  actionId: 'work_the_ledger',
                  useOptionId: entry.id,
                },
              }
            : entry,
        ),
        consumedCount: state.ledger.consumedCount + 1,
      },
    };
  }
});
