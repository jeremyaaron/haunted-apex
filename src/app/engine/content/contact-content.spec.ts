import {
  CONTACT_DEFINITIONS,
  getContactDefinition,
  getDistrictDefinition,
  getLedgerEntryDefinition,
  getRivalDefinition,
  getVenueDefinition,
  UNIVERSAL_CONTACT_OPTIONS,
} from './index';
import type {
  ContactArchetype,
  ContactDefinition,
  ContactGenerationTag,
  ContactRoleTag,
} from '../model';

describe('Contact content', () => {
  const definitions: readonly ContactDefinition[] = CONTACT_DEFINITIONS;

  it('defines the v0.5 contact slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(6);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(ids).toContain('contact_veyra_lux');
    expect(ids).toContain('contact_captain_hollis');
    expect(ids).toContain('contact_dr_mercy_iram');
    expect(ids).toContain('contact_ciro_moth');
    expect(ids).toContain('contact_mina_glass');
    expect(ids).toContain('contact_father_static');
  });

  it('uses supported archetypes, role tags, and complete player-facing fields', () => {
    const supportedArchetypes = new Set<ContactArchetype>([
      'liaison',
      'official',
      'surgeon',
      'broker',
      'club_heir',
      'confessor',
      'informant',
      'patron',
    ]);
    const supportedRoleTags = new Set<ContactRoleTag>([
      'heat_control',
      'intel',
      'loyalty',
      'resources',
      'ruin',
      'ledger',
      'rival_pressure',
      'nightlife',
      'security',
      'weird',
      'social',
      'stability',
    ]);
    const supportedGenerationTags = new Set<ContactGenerationTag>([
      ...supportedRoleTags,
      'high_risk',
      'low_exposure',
      'rival_linked',
      'clinic',
      'official_channel',
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
      expect(definition.generationTags.length)
        .withContext(`${definition.id} generation tags`)
        .toBeGreaterThan(0);
      expect(definition.flavor.dossier.trim())
        .withContext(`${definition.id} dossier`)
        .not.toBe('');
      expect(definition.services.length)
        .withContext(`${definition.id} services`)
        .toBeGreaterThanOrEqual(2);

      for (const tag of definition.roleTags) {
        expect(supportedRoleTags.has(tag))
          .withContext(`${definition.id} role tag ${tag}`)
          .toBeTrue();
      }

      for (const tag of definition.generationTags) {
        expect(supportedGenerationTags.has(tag))
          .withContext(`${definition.id} generation tag ${tag}`)
          .toBeTrue();
      }
    }
  });

  it('initializes base metrics in the 0-100 range', () => {
    for (const definition of definitions) {
      expectInMetricRange(definition.baseTrust, `${definition.id} trust`);
      expectInMetricRange(definition.baseLeverage, `${definition.id} leverage`);
      expectInMetricRange(definition.baseVolatility, `${definition.id} volatility`);
      expectInMetricRange(definition.baseExposure, `${definition.id} exposure`);
    }
  });

  it('connects associations to existing territory and rivals', () => {
    for (const definition of definitions) {
      if (definition.associatedDistrictId) {
        expect(getDistrictDefinition(definition.associatedDistrictId))
          .withContext(`${definition.id} district ${definition.associatedDistrictId}`)
          .toBeDefined();
      }

      if (definition.associatedVenueId) {
        expect(getVenueDefinition(definition.associatedVenueId))
          .withContext(`${definition.id} venue ${definition.associatedVenueId}`)
          .toBeDefined();
      }

      if (definition.associatedRivalId) {
        expect(getRivalDefinition(definition.associatedRivalId))
          .withContext(`${definition.id} rival ${definition.associatedRivalId}`)
          .toBeDefined();
      }
    }
  });

  it('defines universal Cultivate and Pressure options from v0.5A', () => {
    const cultivate = UNIVERSAL_CONTACT_OPTIONS.find((option) => option.kind === 'cultivate');
    const pressure = UNIVERSAL_CONTACT_OPTIONS.find((option) => option.kind === 'pressure');

    expect(UNIVERSAL_CONTACT_OPTIONS.length).toBe(2);
    expect(cultivate).toEqual(
      jasmine.objectContaining({
        id: 'cultivate',
        label: 'Cultivate',
        cost: {
          resources: 600,
        },
        effects: {},
        contactEffects: {
          trust: 10,
          volatility: -6,
          exposure: 2,
        },
      }),
    );
    expect(pressure).toEqual(
      jasmine.objectContaining({
        id: 'pressure',
        label: 'Pressure',
        effects: {
          intel: 4,
          ruin: 2,
        },
        contactEffects: {
          leverage: 10,
          trust: -6,
          volatility: 8,
        },
      }),
    );
  });

  it('defines deterministic services with valid costs, effects, requirements, and Ledger hooks', () => {
    for (const definition of definitions) {
      const serviceIds = definition.services.map((service) => service.id);

      expect(new Set(serviceIds).size)
        .withContext(`${definition.id} service ids`)
        .toBe(serviceIds.length);

      for (const service of definition.services) {
        expect(service.id.trim())
          .withContext(`${definition.id} service id`)
          .not.toBe('');
        expect(service.label.trim())
          .withContext(`${definition.id} ${service.id} label`)
          .not.toBe('');
        expect(service.description.trim())
          .withContext(`${definition.id} ${service.id} description`)
          .not.toBe('');
        expect(Object.keys(service.effects).length > 0 || service.specialEffect)
          .withContext(`${definition.id} ${service.id} effects`)
          .toBeTrue();

        for (const amount of Object.values(service.cost ?? {})) {
          expect(amount)
            .withContext(`${definition.id} ${service.id} cost amount`)
            .toBeGreaterThan(0);
        }

        for (const requirement of service.requirements ?? []) {
          if (requirement.type === 'min_trust' || requirement.type === 'min_leverage') {
            expect(requirement.value)
              .withContext(`${definition.id} ${service.id} ${requirement.type}`)
              .toBeGreaterThan(0);
          }
        }

        for (const ledgerEffect of service.ledgerEffects ?? []) {
          expect(ledgerEffect.type).toBe('create_entry');
          expect(ledgerEffect.relatedContact)
            .withContext(`${definition.id} ${service.id} related contact`)
            .toBeTrue();
          expect(getLedgerEntryDefinition(ledgerEffect.definitionId))
            .withContext(`${definition.id} ${service.id} ledger ${ledgerEffect.definitionId}`)
            .toBeDefined();
        }
      }
    }
  });

  it('looks up every Contact definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getContactDefinition(definition.id)).toBe(definition);
    }
  });

  function expectInMetricRange(value: number, label: string): void {
    expect(value).withContext(label).toBeGreaterThanOrEqual(0);
    expect(value).withContext(label).toBeLessThanOrEqual(100);
  }
});
