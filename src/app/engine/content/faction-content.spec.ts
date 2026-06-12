import {
  CONTACT_DEFINITIONS,
  FACTION_DEFINITIONS,
  FRONT_DEFINITIONS,
  getContactDefinition,
  getDistrictDefinition,
  getFactionDefinition,
  getRivalDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_RIVALS,
} from './index';
import type {
  ContactDefinition,
  FactionArchetype,
  FactionDefinition,
  FactionRoleTag,
  FrontRoleTag,
} from '../model';

describe('Faction content', () => {
  const definitions: readonly FactionDefinition[] = FACTION_DEFINITIONS;
  const contactDefinitions: readonly ContactDefinition[] = CONTACT_DEFINITIONS;

  it('defines the v0.7 faction slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(5);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(ids).toEqual([
      'faction_ashline_bureau',
      'faction_helix_meridian',
      'faction_velvet_house',
      'faction_chrome_maw',
      'faction_ghostline_communion',
    ]);
  });

  it('uses supported archetypes, role tags, base metrics, and complete player-facing fields', () => {
    const supportedArchetypes = new Set<FactionArchetype>([
      'security_bureau',
      'megacorp',
      'nightlife_house',
      'industrial_syndicate',
      'ghost_market',
      'memory_cult',
    ]);
    const supportedRoleTags = new Set<FactionRoleTag>([
      'heat_control',
      'resources',
      'intel',
      'dominion',
      'fronts',
      'ledger',
      'rival_pressure',
      'security',
      'nightlife',
      'industrial',
      'weird',
      'ruin',
      'stability',
      'social',
    ]);

    for (const definition of definitions) {
      expect(supportedArchetypes.has(definition.archetype))
        .withContext(`${definition.id} archetype ${definition.archetype}`)
        .toBeTrue();
      expect(definition.name.trim()).withContext(`${definition.id} name`).not.toBe('');
      expect(definition.roleTags.length)
        .withContext(`${definition.id} role tags`)
        .toBeGreaterThan(0);
      expect(definition.flavor.dossier.trim()).withContext(`${definition.id} dossier`).not.toBe('');
      expectInMetricRange(definition.baseStanding, `${definition.id} standing`);
      expectInMetricRange(definition.baseSuspicion, `${definition.id} suspicion`);
      expectInMetricRange(definition.baseObligation, `${definition.id} obligation`);

      for (const tag of definition.roleTags) {
        expect(supportedRoleTags.has(tag))
          .withContext(`${definition.id} role tag ${tag}`)
          .toBeTrue();
      }
    }
  });

  it('keeps Ashline Bureau as the always-active anchor faction', () => {
    expect(getFactionDefinition('faction_ashline_bureau')).toEqual(
      jasmine.objectContaining({
        name: 'Ashline Bureau',
        archetype: 'security_bureau',
        baseStanding: 45,
        baseSuspicion: 35,
        baseObligation: 0,
      }),
    );
  });

  it('connects faction associations to existing content', () => {
    const frontRoleTags = new Set<FrontRoleTag>([
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

    expect(FRONT_DEFINITIONS.length).toBeGreaterThan(0);

    for (const definition of definitions) {
      for (const districtId of definition.associatedDistrictIds ?? []) {
        expect(getDistrictDefinition(districtId))
          .withContext(`${definition.id} district ${districtId}`)
          .toBeDefined();
      }

      for (const venueId of definition.associatedVenueIds ?? []) {
        expect(getVenueDefinition(venueId))
          .withContext(`${definition.id} venue ${venueId}`)
          .toBeDefined();
      }

      for (const rivalId of definition.associatedRivalIds ?? []) {
        expect(getRivalDefinition(rivalId))
          .withContext(`${definition.id} rival ${rivalId}`)
          .toBeDefined();
      }

      for (const contactId of definition.associatedContactIds ?? []) {
        expect(getContactDefinition(contactId))
          .withContext(`${definition.id} contact ${contactId}`)
          .toBeDefined();
      }

      for (const tag of definition.associatedFrontTags ?? []) {
        expect(frontRoleTags.has(tag)).withContext(`${definition.id} front tag ${tag}`).toBeTrue();
      }
    }
  });

  it('wires the locked direct rival and contact faction associations', () => {
    expect(getRivalDefinition('rival_nyx_ardent')?.associatedFactionId).toBe(
      'faction_velvet_house',
    );
    expect(getRivalDefinition('rival_knox_marrow')?.associatedFactionId).toBe('faction_chrome_maw');
    expect(getContactDefinition('contact_captain_hollis')?.associatedFactionId).toBe(
      'faction_ashline_bureau',
    );
    expect(getContactDefinition('contact_veyra_lux')?.associatedFactionId).toBe(
      'faction_velvet_house',
    );
    expect(getContactDefinition('contact_ciro_moth')?.associatedFactionId).toBe(
      'faction_ghostline_communion',
    );
  });

  it('resolves every direct rival and contact faction association', () => {
    for (const rival of RIVAL_TERRITORY_RIVALS) {
      if (rival.associatedFactionId) {
        expect(getFactionDefinition(rival.associatedFactionId))
          .withContext(`${rival.id} faction ${rival.associatedFactionId}`)
          .toBeDefined();
      }
    }

    for (const contact of contactDefinitions) {
      if (contact.associatedFactionId) {
        expect(getFactionDefinition(contact.associatedFactionId))
          .withContext(`${contact.id} faction ${contact.associatedFactionId}`)
          .toBeDefined();
      }
    }
  });

  it('looks up every Faction definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getFactionDefinition(definition.id)).toBe(definition);
    }
  });

  function expectInMetricRange(value: number, label: string): void {
    expect(value).withContext(label).toBeGreaterThanOrEqual(0);
    expect(value).withContext(label).toBeLessThanOrEqual(100);
    expect(Number.isInteger(value)).withContext(label).toBeTrue();
  }
});
