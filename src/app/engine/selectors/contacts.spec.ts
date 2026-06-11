import { CONTACT_DEFINITIONS } from '../content';
import { addLedgerEntry } from '../ledger';
import type { GameState } from '../model';
import { newGame } from '../simulation';
import {
  isActiveContact,
  selectActiveContacts,
  selectContactState,
  selectContactView,
} from './contacts';

describe('Contact selectors', () => {
  it('returns active contact views with derived status', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const views = selectActiveContacts(state);

    expect(views.length).toBe(3);
    expect(views.map((view) => view.id)).toEqual(state.activeContactIds);
    expect(views.every((view) => view.status.length > 0)).toBeTrue();
    expect(views.every((view) => view.services.length > 0)).toBeTrue();
    expect(views.every((view) => view.metrics.length === 4)).toBeTrue();
    expect(views.every((view) => view.services.every((service) => service.effectSummary.length > 0)))
      .toBeTrue();
  });

  it('hides inactive contacts from normal contact lookup', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const inactiveContact = CONTACT_DEFINITIONS.find(
      (definition) => !state.activeContactIds.includes(definition.id),
    );

    if (!inactiveContact) {
      fail('Expected at least one inactive contact');
      return;
    }

    expect(selectContactView(state, inactiveContact.id)).toBeUndefined();
    expect(isActiveContact(state, inactiveContact.id)).toBeFalse();
    expect(selectContactState(state, inactiveContact.id)).toEqual(
      state.contacts[inactiveContact.id],
    );
  });

  it('returns burned contacts with disabled services', () => {
    const state = newGame({ seed: 'CONTACT-BURNED-VIEW' });
    const contactId = state.activeContactIds[0]!;
    const burned: GameState = {
      ...state,
      contacts: {
        ...state.contacts,
        [contactId]: {
          ...state.contacts[contactId],
          burned: true,
        },
      },
    };
    const view = selectContactView(burned, contactId);

    expect(view?.burned).toBeTrue();
    expect(view?.status).toBe('burned');
    expect(view?.services.every((service) => !service.available)).toBeTrue();
    expect(view?.services.every((service) => service.unavailableReason === 'contact_burned'))
      .toBeTrue();
  });

  it('includes recent interactions and related Ledger links', () => {
    const base = newGame({ seed: 'CONTACT-LINKS-VIEW' });
    const contactId = base.activeContactIds[0]!;
    const withInteraction: GameState = {
      ...base,
      contacts: {
        ...base.contacts,
        [contactId]: {
          ...base.contacts[contactId],
          recentInteractions: [
            {
              week: 1,
              optionId: 'cultivate',
              kind: 'cultivate',
              label: 'Cultivate',
              effectsSummary: {
                trust: 10,
                volatility: -6,
              },
            },
          ],
        },
      },
    };
    const withLedger = addLedgerEntry(withInteraction, {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'action',
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId,
          optionId: 'cultivate',
        },
      },
      relatedContactId: contactId,
    });
    const view = selectContactView(withLedger, contactId);

    expect(view?.recentInteractions[0].effectRows.map((row) => row.id)).toEqual([
      'trust',
      'volatility',
    ]);
    expect(view?.relatedLedgerEntries[0]).toEqual(
      jasmine.objectContaining({
        name: 'Owes the Liaison',
        status: 'active',
      }),
    );
  });
});
