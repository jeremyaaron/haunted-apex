import { CONTACT_DEFINITIONS } from '../content';
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
});
