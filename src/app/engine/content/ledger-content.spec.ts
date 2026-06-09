import {
  getDistrictDefinition,
  getLedgerEntryDefinition,
  getRivalDefinition,
  getVenueDefinition,
  LEDGER_ENTRY_DEFINITIONS,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  RIVAL_TERRITORY_VENUES,
} from './index';
import type {
  LedgerEntryDefinition,
  LedgerEntryKind,
  LedgerEntryRarity,
  PressureId,
} from '../model';

describe('Ledger content', () => {
  const definitions: readonly LedgerEntryDefinition[] = LEDGER_ENTRY_DEFINITIONS;

  it('defines the v0.4 content slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(12);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(countByKind('secret')).toBe(6);
    expect(countByKind('debt')).toBe(4);
    expect(countByKind('favor')).toBe(2);
  });

  it('uses supported rarities and complete player-facing fields', () => {
    const supportedRarities = new Set<LedgerEntryRarity>(['common', 'uncommon', 'rare']);
    const supportedKinds = new Set<LedgerEntryKind>(['secret', 'debt', 'favor']);

    for (const definition of definitions) {
      expect(supportedKinds.has(definition.kind))
        .withContext(`${definition.id} has kind ${definition.kind}`)
        .toBeTrue();
      expect(supportedRarities.has(definition.rarity))
        .withContext(`${definition.id} has rarity ${definition.rarity}`)
        .toBeTrue();
      expect(definition.name.trim())
        .withContext(`${definition.id} name`)
        .not.toBe('');
      expect(definition.description.trim())
        .withContext(`${definition.id} description`)
        .not.toBe('');
      expect(definition.tags.length)
        .withContext(`${definition.id} tags`)
        .toBeGreaterThan(0);
      expect(definition.useOptions.length)
        .withContext(`${definition.id} use options`)
        .toBeGreaterThan(0);
    }
  });

  it('defines stable use options with valid costs and effects', () => {
    const pressureIds = new Set<PressureId>([
      'dominion',
      'heat',
      'loyalty',
      'resources',
      'intel',
      'ruin',
    ]);
    const costIds = new Set<PressureId>(['resources', 'intel']);

    for (const definition of definitions) {
      const useOptionIds = definition.useOptions.map((option) => option.id);

      expect(new Set(useOptionIds).size)
        .withContext(`${definition.id} use option ids`)
        .toBe(useOptionIds.length);

      for (const option of definition.useOptions) {
        expect(option.id.trim())
          .withContext(`${definition.id} use option id`)
          .not.toBe('');
        expect(option.label.trim())
          .withContext(`${definition.id} ${option.id} label`)
          .not.toBe('');
        expect(Object.keys(option.effects).length)
          .withContext(`${definition.id} ${option.id} effects`)
          .toBeGreaterThan(0);

        for (const effectId of Object.keys(option.effects)) {
          expect(pressureIds.has(effectId as PressureId))
            .withContext(`${definition.id} ${option.id} effect ${effectId}`)
            .toBeTrue();
        }

        for (const costId of Object.keys(option.cost ?? {})) {
          expect(costIds.has(costId as PressureId))
            .withContext(`${definition.id} ${option.id} cost ${costId}`)
            .toBeTrue();
          expect(option.cost?.[costId as keyof typeof option.cost])
            .withContext(`${definition.id} ${option.id} cost ${costId} amount`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  it('gives debts explicit settlement choices and favors thin consumable uses', () => {
    for (const debt of definitions.filter((definition) => definition.kind === 'debt')) {
      expect(debt.useOptions.length)
        .withContext(`${debt.id} should expose settlement choices`)
        .toBeGreaterThanOrEqual(2);
      expect(debt.useOptions.every((option) => option.consumesEntry))
        .withContext(`${debt.id} settlement options consume the debt`)
        .toBeTrue();
    }

    for (const favor of definitions.filter((definition) => definition.kind === 'favor')) {
      expect(favor.useOptions.length)
        .withContext(`${favor.id} should stay thin for v0.4`)
        .toBe(1);
      expect(favor.useOptions[0].consumesEntry)
        .withContext(`${favor.id} should be consumable`)
        .toBeTrue();
    }
  });

  it('keeps discovery profiles connected to existing target content', () => {
    const availableTargetTags = new Set<string>([
      ...RIVAL_TERRITORY_DISTRICTS.flatMap((district) => district.tags),
      ...RIVAL_TERRITORY_VENUES.flatMap((venue) => venue.tags),
      ...RIVAL_TERRITORY_RIVALS.flatMap((rival) => rival.traits),
    ]);

    for (const definition of definitions) {
      const discovery = definition.discovery;

      if (!discovery) {
        continue;
      }

      expect(definition.kind)
        .withContext(`${definition.id} discovery is Secret-only in v0.4`)
        .toBe('secret');
      expect(discovery.baseWeight)
        .withContext(`${definition.id} base discovery weight`)
        .toBeGreaterThan(0);

      for (const targetTag of discovery.targetTags ?? []) {
        expect(availableTargetTags.has(targetTag))
          .withContext(`${definition.id} discovery tag ${targetTag}`)
          .toBeTrue();
      }

      for (const districtId of discovery.districtIds ?? []) {
        expect(getDistrictDefinition(districtId))
          .withContext(`${definition.id} discovery district ${districtId}`)
          .toBeDefined();
      }

      for (const venueId of discovery.venueIds ?? []) {
        expect(getVenueDefinition(venueId))
          .withContext(`${definition.id} discovery venue ${venueId}`)
          .toBeDefined();
      }

      for (const rivalId of discovery.rivalIds ?? []) {
        expect(getRivalDefinition(rivalId))
          .withContext(`${definition.id} discovery rival ${rivalId}`)
          .toBeDefined();
      }
    }
  });

  it('looks up every Ledger definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getLedgerEntryDefinition(definition.id)).toBe(definition);
    }
  });

  function countByKind(kind: LedgerEntryKind): number {
    return definitions.filter((definition) => definition.kind === kind).length;
  }
});
