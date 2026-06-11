import type { ActionTarget, GameState } from '../model';
import { addLedgerEntry } from '../ledger';
import { newGame } from '../simulation';
import {
  getTargetControllerId,
  getTargetTags,
  resolveTargetDistrictId,
  selectActionTargetOptions,
  selectDistrictTerritoryViews,
  selectRivalTerritoryViews,
} from './territory';

describe('territory selectors', () => {
  it('returns target options in stable district, venue, and rival order', () => {
    const options = selectActionTargetOptions(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'gather_intel',
    );

    expect(options.map((option) => targetKey(option.target))).toEqual([
      'district:district_violet_ward',
      'district:district_chrome_narrows',
      'district:district_ghostline_market',
      'venue:venue_pale_circuit',
      'venue:venue_glass_saint',
      'venue:venue_zero_mercy',
      'venue:venue_black_halo_exchange',
      'rival:rival_nyx_ardent',
      'rival:rival_knox_marrow',
    ]);
  });

  it('returns only target types supported by the action', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(
      selectActionTargetOptions(state, 'bribe_official').map((option) => option.targetType),
    ).toEqual(['district', 'district', 'district', 'rival', 'rival']);
    expect(
      selectActionTargetOptions(state, 'run_small_job').map((option) => option.targetType),
    ).toEqual(['district', 'district', 'district', 'venue', 'venue', 'venue', 'venue']);
    expect(
      selectActionTargetOptions(state, 'recruit_operative').map(
        (option) => `${option.targetType}:${targetKey(option.target).split(':').at(-1)}`,
      ),
    ).toEqual(state.hirePool.map((operativeId) => `recruit:${operativeId}`));
  });

  it('returns Ledger target options for active entries and use options', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-TARGETS' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const entryId = state.ledger.entries[0].id;
    const options = selectActionTargetOptions(state, 'work_the_ledger');

    expect(options).toEqual([
      jasmine.objectContaining({
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'pay_in_credits',
        },
        label: 'Owes the Liaison - Pay in Credits',
        targetType: 'ledger',
        entryName: 'Owes the Liaison',
        useOptionLabel: 'Pay in Credits',
        kind: 'debt',
        affordable: true,
      }),
      jasmine.objectContaining({
        target: {
          type: 'ledger',
          entryId,
          useOptionId: 'offer_information',
        },
        label: 'Owes the Liaison - Offer Information',
        targetType: 'ledger',
        useOptionLabel: 'Offer Information',
      }),
    ]);
  });

  it('omits consumed Ledger entries from Ledger target options', () => {
    const state = addLedgerEntry(newGame({ seed: 'LEDGER-SPENT-TARGETS' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
      },
    });
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

    expect(selectActionTargetOptions(consumed, 'work_the_ledger')).toEqual([]);
  });

  it('exposes authored recruit candidate metadata in hire-pool order', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const options = selectActionTargetOptions(state, 'recruit_operative');

    expect(options[0]).toEqual(
      jasmine.objectContaining({
        label: 'Iris Vale',
        targetType: 'recruit',
        operativeId: 'op_iris_vale',
        archetype: 'Socialite',
        rarity: 'uncommon',
        roleTags: ['social', 'recruitment', 'rival_pressure'],
      }),
    );
  });

  it('omits inactive rivals from rival target options', () => {
    const state = withInactiveRival('rival_nyx_ardent');
    const rivalTargets = selectActionTargetOptions(state, 'gather_intel').filter(
      (option) => option.targetType === 'rival',
    );

    expect(rivalTargets.map((option) => targetKey(option.target))).toEqual([
      'rival:rival_knox_marrow',
    ]);
  });

  it('includes district and controller metadata', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const options = selectActionTargetOptions(state, 'gather_intel');
    const glassSaint = options.find((option) => targetKey(option.target) === 'venue:venue_glass_saint');

    expect(glassSaint).toEqual(
      jasmine.objectContaining({
        label: 'The Glass Saint',
        targetType: 'venue',
        districtName: 'Violet Ward',
        controlledByRivalId: 'rival_nyx_ardent',
        controlledByRivalName: 'Nyx Ardent',
      }),
    );
  });

  it('resolves target districts', () => {
    expect(
      resolveTargetDistrictId({
        type: 'district',
        id: 'district_chrome_narrows',
      }),
    ).toBe('district_chrome_narrows');
    expect(
      resolveTargetDistrictId({
        type: 'venue',
        id: 'venue_zero_mercy',
      }),
    ).toBe('district_chrome_narrows');
    expect(
      resolveTargetDistrictId({
        type: 'rival',
        id: 'rival_knox_marrow',
      }),
    ).toBeUndefined();
    expect(
      resolveTargetDistrictId({
        type: 'recruit',
        id: 'op_iris_vale',
      }),
    ).toBeUndefined();
  });

  it('keeps recruit targets outside territory, rival, and event-tag context', () => {
    const target = {
      type: 'recruit',
      id: 'op_iris_vale',
    } as const;

    expect(getTargetControllerId(target)).toBeUndefined();
    expect(getTargetTags(target)).toEqual([]);
  });

  it('combines venue and district tags without duplicates', () => {
    expect(
      getTargetTags({
        type: 'venue',
        id: 'venue_pale_circuit',
      }),
    ).toEqual(['nightlife', 'liaison', 'social', 'safe', 'starting']);
  });

  it('uses venue control before parent district control and resolves rival control', () => {
    expect(
      getTargetControllerId({
        type: 'venue',
        id: 'venue_glass_saint',
      }),
    ).toBe('rival_nyx_ardent');
    expect(
      getTargetControllerId({
        type: 'venue',
        id: 'venue_pale_circuit',
      }),
    ).toBe('rival_nyx_ardent');
    expect(
      getTargetControllerId({
        type: 'rival',
        id: 'rival_knox_marrow',
      }),
    ).toBe('rival_knox_marrow');
  });

  it('projects mutable district state with static venue and controller content', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    state.districts.district_violet_ward.control = 44;
    state.districts.district_violet_ward.heat = 63;
    const violetWard = selectDistrictTerritoryViews(state)[0];

    expect(violetWard).toEqual(
      jasmine.objectContaining({
        name: 'Violet Ward',
        control: 44,
        heat: 63,
        baseHeat: 20,
        controllingRivalName: 'Nyx Ardent',
      }),
    );
    expect(violetWard.venues.map((venue) => venue.name)).toEqual([
      'The Pale Circuit',
      'The Glass Saint',
    ]);
  });

  it('projects rival pressure tiers and controlled territory names', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    state.rivals.rival_knox_marrow.pressure = 76;
    const knox = selectRivalTerritoryViews(state)[1];

    expect(knox).toEqual(
      jasmine.objectContaining({
        name: 'Knox Marrow',
        pressure: 76,
        pressureTier: 'retaliating',
        preferredPressureAttack: 'heat',
        controlledDistrictNames: ['Chrome Narrows'],
        controlledVenueNames: ['Zero Mercy'],
      }),
    );
  });
});

function targetKey(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `ledger:${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `contact:${target.contactId}:${target.optionId}`;
  }

  return `${target.type}:${target.id}`;
}

function withInactiveRival(rivalId: 'rival_nyx_ardent' | 'rival_knox_marrow'): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...state.rivals[rivalId],
        active: false,
      },
    },
  };
}
