import type { ContactId, GameState } from '../model';
import { previewContactOption } from '../contacts';
import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';

describe('resolveQueuedOrder Manage Contact', () => {
  it('applies Cultivate exactly as previewed', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-CULTIVATE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const target = {
      type: 'contact',
      contactId: 'contact_veyra_lux',
      optionId: 'cultivate',
    } as const;
    const preview = previewContactOption(state, target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'manage_contact',
      target,
    });

    if (!preview.ok) {
      fail(`Expected preview, got ${preview.unavailableReason}`);
      return;
    }

    expect(result.resolvedDelta).toEqual(preview.resolvedDelta);
    expect(result.state.pressures.resources).toBe(
      state.pressures.resources + (preview.resolvedDelta.resources ?? 0),
    );
    expect(result.state.contacts.contact_veyra_lux.trust).toBe(
      state.contacts.contact_veyra_lux.trust + 10,
    );
    expect(result.state.contacts.contact_veyra_lux.volatility).toBe(
      state.contacts.contact_veyra_lux.volatility - 6,
    );
    expect(result.state.contacts.contact_veyra_lux.exposure).toBe(
      state.contacts.contact_veyra_lux.exposure + 2,
    );
  });

  it('applies Pressure exactly as previewed', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-PRESSURE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const target = {
      type: 'contact',
      contactId: 'contact_veyra_lux',
      optionId: 'pressure',
    } as const;
    const preview = previewContactOption(state, target);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'manage_contact',
      target,
    });

    if (!preview.ok) {
      fail(`Expected preview, got ${preview.unavailableReason}`);
      return;
    }

    expect(result.resolvedDelta).toEqual(preview.resolvedDelta);
    expect(result.state.pressures.intel).toBe(
      state.pressures.intel + (preview.resolvedDelta.intel ?? 0),
    );
    expect(result.state.pressures.ruin).toBe(
      state.pressures.ruin + (preview.resolvedDelta.ruin ?? 0),
    );
    expect(result.state.contacts.contact_veyra_lux.leverage).toBe(
      state.contacts.contact_veyra_lux.leverage + 10,
    );
    expect(result.state.contacts.contact_veyra_lux.trust).toBe(
      state.contacts.contact_veyra_lux.trust - 6,
    );
    expect(result.state.contacts.contact_veyra_lux.volatility).toBe(
      state.contacts.contact_veyra_lux.volatility + 8,
    );
  });

  it('applies service pressure, contact, and rival pressure effects', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-SERVICE' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'manage_contact',
      target: {
        type: 'contact',
        contactId: 'contact_veyra_lux',
        optionId: 'private_room_access',
      },
    });

    expect(result.state.pressures.intel).toBe(state.pressures.intel + 8);
    expect(result.state.pressures.dominion).toBe(state.pressures.dominion + 3);
    expect(result.state.contacts.contact_veyra_lux.trust).toBe(
      state.contacts.contact_veyra_lux.trust - 6,
    );
    expect(result.state.contacts.contact_veyra_lux.volatility).toBe(
      state.contacts.contact_veyra_lux.volatility + 8,
    );
    expect(result.state.rivals.rival_nyx_ardent.pressure).toBe(
      state.rivals.rival_nyx_ardent.pressure + 6,
    );
  });

  it('records recent contact interactions', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-HISTORY' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ]);
    const result = resolveQueuedOrder(state, {
      id: 'order_1_1',
      actionId: 'manage_contact',
      target: {
        type: 'contact',
        contactId: 'contact_veyra_lux',
        optionId: 'pressure',
      },
    });

    expect(result.state.contacts.contact_veyra_lux.recentInteractions).toEqual([
      {
        week: 1,
        optionId: 'pressure',
        kind: 'pressure',
        label: 'Pressure',
        effectsSummary: {
          trust: -6,
          leverage: 10,
          volatility: 8,
        },
      },
    ]);
    expect(result.state.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'order_resolved',
        title: 'Manage Contact: Veyra Lux',
      }),
    );
  });

  it('reduces the Quiet Treatment target Stress by 10', () => {
    const state = withActiveContacts(newGame({ seed: 'CONTACT-QUIET-TREATMENT' }), [
      'contact_dr_mercy_iram',
      'contact_veyra_lux',
      'contact_captain_hollis',
    ]);
    const stressed: GameState = {
      ...state,
      operatives: state.operatives.map((operative, index) => ({
        ...operative,
        stress: index === 1 ? 37 : 12,
      })),
    };
    const targetOperative = stressed.operatives[1];
    const result = resolveQueuedOrder(stressed, {
      id: 'order_1_1',
      actionId: 'manage_contact',
      target: {
        type: 'contact',
        contactId: 'contact_dr_mercy_iram',
        optionId: 'quiet_treatment',
      },
    });

    expect(result.stressDelta).toBe(-10);
    expect(
      result.state.operatives.find((operative) => operative.id === targetOperative.id)?.stress,
    ).toBe(27);
    expect(result.state.pressures.heat).toBe(stressed.pressures.heat - 4);
    expect(result.state.contacts.contact_dr_mercy_iram.exposure).toBe(
      stressed.contacts.contact_dr_mercy_iram.exposure + 3,
    );
  });
});

function withActiveContacts(state: GameState, activeContactIds: ContactId[]): GameState {
  return {
    ...state,
    activeContactIds,
  };
}
