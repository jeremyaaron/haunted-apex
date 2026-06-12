import {
  ACCORD_DEFINITIONS,
  FACTION_DEFINITIONS,
  getAccordDefinition,
  getFactionDefinition,
  getLedgerEntryDefinition,
  getRivalDefinition,
} from './index';
import { PRESSURE_IDS } from '../model';
import type {
  AccordDefinition,
  AccordId,
  FactionMetricDelta,
  FactionRoleTag,
  PressureDelta,
} from '../model';

describe('Accord content', () => {
  const definitions: readonly AccordDefinition[] = ACCORD_DEFINITIONS;

  it('defines the v0.7 accord slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(10);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(ids).toEqual([
      'accord_ashline_clean_corridor',
      'accord_ashline_inspection_delay',
      'accord_helix_quiet_capital',
      'accord_helix_permit_shell',
      'accord_velvet_guest_list',
      'accord_velvet_silence',
      'accord_chrome_dockside_tithe',
      'accord_chrome_muscle_retainer',
      'accord_ghostline_dead_channel',
      'accord_ghostline_mercy_static',
    ]);
  });

  it('connects every accord to a faction and every faction to two accords', () => {
    for (const definition of definitions) {
      const faction = getFactionDefinition(definition.factionId);

      expect(faction).withContext(`${definition.id} faction`).toBeDefined();
      expect(faction?.accordIds)
        .withContext(`${definition.id} listed by faction`)
        .toContain(definition.id);
    }

    for (const faction of FACTION_DEFINITIONS) {
      expect(faction.accordIds.length).withContext(`${faction.id} accord count`).toBe(2);

      for (const accordId of faction.accordIds) {
        expect(getAccordDefinition(accordId))
          .withContext(`${faction.id} accord ${accordId}`)
          .toBeDefined();
      }
    }
  });

  it('uses valid durations, costs, effects, metric deltas, and role tags', () => {
    const supportedTags = new Set<FactionRoleTag>([
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
      expect(definition.label.trim()).withContext(`${definition.id} label`).not.toBe('');
      expect(definition.description.trim())
        .withContext(`${definition.id} description`)
        .not.toBe('');
      expect(definition.durationWeeks).withContext(`${definition.id} duration`).toBeGreaterThan(0);

      for (const amount of Object.values(definition.cost ?? {})) {
        expect(amount).withContext(`${definition.id} cost`).toBeGreaterThanOrEqual(0);
      }

      expectValidPressureDelta(definition.immediateEffects ?? {}, `${definition.id} immediate`);
      expectValidPressureDelta(definition.weeklyEffects ?? {}, `${definition.id} weekly`);
      expectValidFactionMetricDelta(
        definition.factionEffectsOnStart ?? {},
        `${definition.id} faction start`,
      );
      expectValidFactionMetricDelta(
        definition.factionEffectsPerWeek ?? {},
        `${definition.id} faction weekly`,
      );
      expectValidFactionMetricDelta(
        definition.factionEffectsOnExpire ?? {},
        `${definition.id} faction expire`,
      );

      for (const tag of definition.tags) {
        expect(supportedTags.has(tag)).withContext(`${definition.id} tag ${tag}`).toBeTrue();
      }
    }
  });

  it('resolves Ledger, rival, and front hook references', () => {
    for (const definition of definitions) {
      for (const ledgerEffect of definition.ledgerEffectsOnStart ?? []) {
        expect(ledgerEffect.type).toBe('create');
        expect(getLedgerEntryDefinition(ledgerEffect.definitionId))
          .withContext(`${definition.id} ledger ${ledgerEffect.definitionId}`)
          .toBeDefined();

        if (ledgerEffect.relatedFactionId) {
          expect(getFactionDefinition(ledgerEffect.relatedFactionId))
            .withContext(`${definition.id} related faction ${ledgerEffect.relatedFactionId}`)
            .toBeDefined();
        }
      }

      for (const rivalId of Object.keys(definition.rivalPressureEffectsOnStart ?? {})) {
        expect(getRivalDefinition(rivalId as never))
          .withContext(`${definition.id} rival ${rivalId}`)
          .toBeDefined();
      }

      for (const frontEffect of definition.frontEffectsOnStart ?? []) {
        expect(frontEffect.type).toBe('cool_highest_exposure_front');
        expect(frontEffect.exposureDelta)
          .withContext(`${definition.id} front exposure delta`)
          .toBeLessThan(0);
      }
    }
  });

  it('locks the concrete v0.7 front hook and deferred Permit Shell discount', () => {
    expect(getAccordDefinition('accord_ashline_inspection_delay')).toEqual(
      jasmine.objectContaining({
        frontEffectsOnStart: [{ type: 'cool_highest_exposure_front', exposureDelta: -10 }],
      }),
    );
    expect(getAccordDefinition('accord_helix_permit_shell')?.frontEffectsOnStart).toBeUndefined();
  });

  it('looks up every Accord definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getAccordDefinition(definition.id)).toBe(definition);
    }
  });

  function expectValidPressureDelta(delta: PressureDelta, label: string): void {
    for (const key of Object.keys(delta)) {
      expect(PRESSURE_IDS)
        .withContext(`${label} ${key}`)
        .toContain(key as never);
      expect(delta[key as keyof PressureDelta])
        .withContext(`${label} ${key} amount`)
        .not.toBe(0);
    }
  }

  function expectValidFactionMetricDelta(delta: FactionMetricDelta, label: string): void {
    const supportedKeys = new Set(['standing', 'suspicion', 'obligation']);

    for (const key of Object.keys(delta)) {
      expect(supportedKeys.has(key)).withContext(`${label} ${key}`).toBeTrue();
      expect(delta[key as keyof FactionMetricDelta])
        .withContext(`${label} ${key} amount`)
        .not.toBe(0);
    }
  }
});
