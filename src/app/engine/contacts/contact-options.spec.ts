import type { ContactId, GameState } from '../model';
import { newGame } from '../simulation';
import {
  getContactCostUnavailableReason,
  previewContactOption,
  selectContactOptionPreviews,
  selectManageContactTargetOptions,
  selectQuietTreatmentTarget,
} from './contact-options';

describe('Contact option previews', () => {
  it('exposes Cultivate and Pressure for every active non-burned contact', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-OPTIONS' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);

    for (const contactId of state.activeContactIds) {
      const previews = selectContactOptionPreviews(state, contactId);

      expect(previews.map((preview) => preview.id)).toContain('cultivate');
      expect(previews.map((preview) => preview.id)).toContain('pressure');
      expect(previews.every((preview) => preview.contactId === contactId)).toBeTrue();
    }
  });

  it('excludes burned contacts from queueable target options', () => {
    const state = withActiveContacts(newGame({ seed: 'BURNED-CONTACT' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
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

    expect(selectContactOptionPreviews(burned, 'contact_veyra_lux')).toEqual([]);
    expect(
      selectManageContactTargetOptions(burned).some(
        (option) => option.contactId === 'contact_veyra_lux',
      ),
    ).toBeFalse();
    expect(
      previewContactOption(burned, {
        type: 'contact',
        contactId: 'contact_veyra_lux',
        optionId: 'cultivate',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'contact_burned',
      }),
    );
  });

  it('excludes inactive contacts from normal target options', () => {
    const state = withActiveContacts(newGame({ seed: 'INACTIVE-CONTACT' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);

    expect(selectContactOptionPreviews(state, 'contact_mina_glass')).toEqual([]);
    expect(
      selectManageContactTargetOptions(state).some(
        (option) => option.contactId === 'contact_mina_glass',
      ),
    ).toBeFalse();
    expect(
      previewContactOption(state, {
        type: 'contact',
        contactId: 'contact_mina_glass',
        optionId: 'cultivate',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'target_inactive',
      }),
    );
  });

  it('disables unaffordable Resource and Intel costs', () => {
    const state = withActiveContacts(newGame({ seed: 'COST-CONTACT' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const noResources: GameState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 0,
      },
    };
    const lowIntel: GameState = {
      ...state,
      pressures: {
        ...state.pressures,
        intel: 1,
      },
    };

    expect(
      previewContactOption(noResources, {
        type: 'contact',
        contactId: 'contact_veyra_lux',
        optionId: 'soothe_the_room',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'not_enough_resources',
      }),
    );
    expect(
      getContactCostUnavailableReason(lowIntel, 'contact_captain_hollis', {
        intel: 2,
      }),
    ).toBe('not_enough_intel');
  });

  it('disables services when Trust or Leverage costs and requirements are not met', () => {
    const state = withActiveContacts(newGame({ seed: 'RELATIONSHIP-COSTS' }), [
      'contact_mina_glass',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const lowTrust: GameState = {
      ...state,
      contacts: {
        ...state.contacts,
        contact_mina_glass: {
          ...state.contacts.contact_mina_glass,
          trust: 2,
        },
      },
    };
    const lowLeverage: GameState = {
      ...state,
      contacts: {
        ...state.contacts,
        contact_captain_hollis: {
          ...state.contacts.contact_captain_hollis,
          leverage: 12,
        },
      },
    };

    expect(
      previewContactOption(lowTrust, {
        type: 'contact',
        contactId: 'contact_mina_glass',
        optionId: 'open_the_guest_list',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'not_enough_trust',
      }),
    );
    expect(
      previewContactOption(lowLeverage, {
        type: 'contact',
        contactId: 'contact_captain_hollis',
        optionId: 'lose_the_file',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'requirement_not_met',
      }),
    );
  });

  it('selects the highest-stress operative for Quiet Treatment deterministically', () => {
    const state = withActiveContacts(newGame({ seed: 'QUIET-TREATMENT' }), [
      'contact_dr_mercy_iram',
      'contact_veyra_lux',
      'contact_captain_hollis',
    ]);
    const stressed: GameState = {
      ...state,
      operatives: state.operatives.map((operative, index) => ({
        ...operative,
        stress: index === 1 ? 38 : index === 2 ? 38 : 12,
      })),
    };
    const selectedId = selectQuietTreatmentTarget(stressed);
    const preview = previewContactOption(stressed, {
      type: 'contact',
      contactId: 'contact_dr_mercy_iram',
      optionId: 'quiet_treatment',
    });

    expect(selectedId).toBe(stressed.operatives[1].id);
    expect(preview).toEqual(
      jasmine.objectContaining({
        ok: true,
        quietTreatment: jasmine.objectContaining({
          operativeId: stressed.operatives[1].id,
          stressDelta: -10,
          currentStress: 38,
          projectedStress: 28,
        }),
      }),
    );
  });

  it('disables Quiet Treatment when no roster operative has Stress', () => {
    const state = withActiveContacts(newGame({ seed: 'QUIET-TREATMENT-DISABLED' }), [
      'contact_dr_mercy_iram',
      'contact_veyra_lux',
      'contact_captain_hollis',
    ]);
    const calm: GameState = {
      ...state,
      operatives: state.operatives.map((operative) => ({
        ...operative,
        stress: 0,
      })),
    };

    expect(selectQuietTreatmentTarget(calm)).toBeUndefined();
    expect(
      previewContactOption(calm, {
        type: 'contact',
        contactId: 'contact_dr_mercy_iram',
        optionId: 'quiet_treatment',
      }),
    ).toEqual(
      jasmine.objectContaining({
        ok: false,
        unavailableReason: 'quiet_treatment_no_target',
      }),
    );
  });

  it('previews pressure effects, contact effects, costs, Ledger effects, rival effects, and risk', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-PAYLOAD' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const preview = previewContactOption(state, {
      type: 'contact',
      contactId: 'contact_veyra_lux',
      optionId: 'private_room_access',
    });

    expect(preview).toEqual(
      jasmine.objectContaining({
        ok: true,
        kind: 'request_service',
        effects: {
          dominion: 3,
          intel: 8,
        },
        resolvedDelta: {
          dominion: 3,
          intel: 8,
        },
        contactEffects: {
          trust: -6,
          volatility: 8,
        },
        resolvedContactEffects: {
          trust: -6,
          volatility: 8,
        },
        ledgerEffects: [
          jasmine.objectContaining({
            definitionId: 'debt_owes_liaison',
            entryName: 'Owes the Liaison',
            kind: 'debt',
          }),
        ],
        rivalPressureEffects: {
          rival_nyx_ardent: 6,
        },
        riskChance: 10,
      }),
    );
  });
});

function withActiveContacts(state: GameState, activeContactIds: ContactId[]): GameState {
  return {
    ...state,
    activeContactIds,
  };
}
