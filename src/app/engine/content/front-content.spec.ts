import {
  FRONT_EVENTS,
  FRONT_DEFINITIONS,
  getDistrictDefinition,
  getEventDefinition,
  getFrontDefinition,
  getLedgerEntryDefinition,
  getVenueDefinition,
} from './index';
import { PRESSURE_IDS } from '../model';
import type {
  FrontArchetype,
  FrontDefinition,
  FrontRoleTag,
  PressureDelta,
} from '../model';

describe('Front content', () => {
  const definitions: readonly FrontDefinition[] = FRONT_DEFINITIONS;

  it('defines the v0.6 front slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(6);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(ids).toContain('front_pale_circuit');
    expect(ids).toContain('front_black_clinic');
    expect(ids).toContain('front_courier_line');
    expect(ids).toContain('front_zero_mercy_cut');
    expect(ids).toContain('front_shell_gallery');
    expect(ids).toContain('front_surveillance_den');
  });

  it('uses supported archetypes, role tags, and complete player-facing fields', () => {
    const supportedArchetypes = new Set<FrontArchetype>([
      'lounge',
      'clinic',
      'courier_line',
      'fight_pit',
      'shell_gallery',
      'surveillance_den',
      'data_chapel',
    ]);
    const supportedRoleTags = new Set<FrontRoleTag>([
      'resources',
      'loyalty',
      'intel',
      'heat_control',
      'dominion',
      'ruin',
      'stability',
      'rival_pressure',
      'nightlife',
      'security',
      'weird',
      'social',
    ]);

    for (const definition of definitions) {
      expect(supportedArchetypes.has(definition.archetype))
        .withContext(`${definition.id} archetype ${definition.archetype}`)
        .toBeTrue();
      expect(definition.name.trim())
        .withContext(`${definition.id} name`)
        .not.toBe('');
      expect(definition.roleTags.length)
        .withContext(`${definition.id} role tags`)
        .toBeGreaterThan(0);
      expect(definition.flavor.dossier.trim())
        .withContext(`${definition.id} dossier`)
        .not.toBe('');

      for (const tag of definition.roleTags) {
        expect(supportedRoleTags.has(tag))
          .withContext(`${definition.id} role tag ${tag}`)
          .toBeTrue();
      }
    }
  });

  it('defines valid costs, level caps, exposure values, and yields', () => {
    for (const definition of definitions) {
      expect(definition.setupCost)
        .withContext(`${definition.id} setup cost`)
        .toBeGreaterThanOrEqual(0);
      expect(definition.upgradeCost)
        .withContext(`${definition.id} upgrade cost`)
        .toBeGreaterThanOrEqual(0);
      expect(definition.maxLevel)
        .withContext(`${definition.id} max level`)
        .toBe(2);
      expect(definition.exposureOnEstablish)
        .withContext(`${definition.id} establish exposure`)
        .toBeGreaterThanOrEqual(0);
      expect(definition.exposureOnUpgrade)
        .withContext(`${definition.id} upgrade exposure`)
        .toBeGreaterThanOrEqual(0);
      expect(definition.exposurePerWeek)
        .withContext(`${definition.id} weekly exposure`)
        .toBeGreaterThanOrEqual(0);
      expect(Object.keys(definition.baseWeeklyYield).length)
        .withContext(`${definition.id} base yield`)
        .toBeGreaterThan(0);

      expectValidPressureDelta(definition.baseWeeklyYield, `${definition.id} base yield`);
      expectValidPressureDelta(definition.level2BonusYield, `${definition.id} level 2 yield`);
      expectValidPressureDelta(definition.establishEffects, `${definition.id} establish`);
      expectValidPressureDelta(definition.upgradeEffects, `${definition.id} upgrade`);
    }
  });

  it('keeps The Pale Circuit as the free starting front', () => {
    expect(getFrontDefinition('front_pale_circuit')).toEqual(
      jasmine.objectContaining({
        name: 'The Pale Circuit',
        setupCost: 0,
        preferredVenueIds: ['venue_pale_circuit'],
      }),
    );
  });

  it('connects preferred districts and venues to existing territory', () => {
    for (const definition of definitions) {
      for (const districtId of definition.preferredDistrictIds ?? []) {
        expect(getDistrictDefinition(districtId))
          .withContext(`${definition.id} preferred district ${districtId}`)
          .toBeDefined();
      }

      for (const venueId of definition.preferredVenueIds ?? []) {
        expect(getVenueDefinition(venueId))
          .withContext(`${definition.id} preferred venue ${venueId}`)
          .toBeDefined();
      }
    }
  });

  it('looks up every Front definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getFrontDefinition(definition.id)).toBe(definition);
    }
  });

  it('connects Front event hooks to authored front events', () => {
    const frontEventIds = FRONT_EVENTS.map((event) => event.id);

    expect(frontEventIds).toEqual([
      'front_inspection',
      'front_staff_wants_protection',
      'front_rival_leans_on_your_front',
      'front_clean_money_dirty_hands',
      'front_back_room_ledger',
    ]);

    for (const event of FRONT_EVENTS) {
      expect(event.front).withContext(`${event.id} front metadata`).toBeDefined();
      expect(event.tags).withContext(`${event.id} tags`).toContain('FRONT');
      expect(event.title).withContext(`${event.id} title`).toContain('{frontName}');
      expect(event.text).withContext(`${event.id} text`).toContain('{frontName}');
      expect(getEventDefinition(event.id)).toBe(event);
    }

    for (const definition of definitions) {
      for (const eventId of definition.eventIds) {
        expect(getEventDefinition(eventId))
          .withContext(`${definition.id} event ${eventId}`)
          .toBeDefined();
      }
    }
  });

  it('defines the v0.6 Front Ledger entries', () => {
    expect(getLedgerEntryDefinition('secret_back_room_guest_list')).toEqual(
      jasmine.objectContaining({
        kind: 'secret',
        name: 'Back Room Guest List',
      }),
    );
    expect(getLedgerEntryDefinition('debt_dirty_books')).toEqual(
      jasmine.objectContaining({
        kind: 'debt',
        name: 'Dirty Books',
      }),
    );
  });

  function expectValidPressureDelta(delta: PressureDelta, label: string): void {
    for (const key of Object.keys(delta)) {
      expect(PRESSURE_IDS).withContext(`${label} ${key}`).toContain(key as never);
      expect(delta[key as keyof PressureDelta])
        .withContext(`${label} ${key} amount`)
        .not.toBe(0);
    }
  }
});
