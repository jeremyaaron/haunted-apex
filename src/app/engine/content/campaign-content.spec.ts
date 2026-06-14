import {
  CAMPAIGN_TENSION_DEFINITIONS,
  CONTACT_DEFINITIONS,
  DISTRICT_ZERO_EVENTS,
  FACTION_DEFINITIONS,
  FRONT_DEFINITIONS,
  getCampaignTensionDefinition,
  getContactDefinition,
  getEventDefinition,
  getFactionDefinition,
  getFrontDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from './index';
import type {
  CampaignRoleTag,
  CampaignTensionDefinition,
  CityProfile,
  EventTag,
  FrontRoleTag,
  OperativeRoleTag,
} from '../model';

describe('Campaign Tension content', () => {
  const definitions: readonly CampaignTensionDefinition[] = CAMPAIGN_TENSION_DEFINITIONS;

  it('defines the locked v0.8 Campaign Tension slice', () => {
    const ids = definitions.map((definition) => definition.id);

    expect(definitions.length).toBe(5);
    expect(new Set(ids).size).toBe(definitions.length);
    expect(ids).toEqual([
      'campaign_corp_crackdown',
      'campaign_nightlife_war',
      'campaign_ghostline_signal',
      'campaign_industrial_cut',
      'campaign_dirty_capital',
    ]);
  });

  it('uses supported role tags, city profiles, and complete player-facing fields', () => {
    const supportedRoleTags = new Set<CampaignRoleTag>([
      'heat',
      'nightlife',
      'ghostline',
      'industrial',
      'capital',
      'fronts',
      'ledger',
      'contacts',
      'factions',
      'rivals',
      'ruin',
      'resources',
      'dominion',
    ]);
    const supportedCityProfiles = new Set<CityProfile>([
      'rain_noir',
      'violet_nightlife',
      'ghost_market',
      'industrial_chrome',
      'corporate_spire',
    ]);

    for (const definition of definitions) {
      expect(definition.name.trim()).withContext(`${definition.id} name`).not.toBe('');
      expect(definition.subtitle.trim()).withContext(`${definition.id} subtitle`).not.toBe('');
      expect(definition.description.trim()).withContext(`${definition.id} description`).not.toBe('');
      expect(definition.openingBriefing.trim())
        .withContext(`${definition.id} opening`)
        .not.toBe('');
      expect(definition.roleTags.length)
        .withContext(`${definition.id} role tags`)
        .toBeGreaterThan(0);
      expect(definition.cityProfileOptions.length)
        .withContext(`${definition.id} city profiles`)
        .toBeGreaterThan(0);
      expect(definition.briefing.pressurePattern.length)
        .withContext(`${definition.id} pressure pattern`)
        .toBeGreaterThan(0);

      for (const tag of definition.roleTags) {
        expect(supportedRoleTags.has(tag))
          .withContext(`${definition.id} role tag ${tag}`)
          .toBeTrue();
      }

      for (const profile of definition.cityProfileOptions) {
        expect(supportedCityProfiles.has(profile))
          .withContext(`${definition.id} city profile ${profile}`)
          .toBeTrue();
      }
    }
  });

  it('connects every Campaign reference to existing content', () => {
    const supportedEventTags = new Set<EventTag>(
      DISTRICT_ZERO_EVENTS.flatMap((event) => [...event.tags]),
    );
    const supportedOperativeTags = new Set<OperativeRoleTag>([
      'intel',
      'social',
      'violence',
      'tech',
      'heat_control',
      'money',
      'ruin',
      'stability',
      'rival_pressure',
      'recruitment',
    ]);
    const supportedFrontTags = new Set<FrontRoleTag>(
      FRONT_DEFINITIONS.flatMap((front) => [...front.roleTags]),
    );

    expect(FACTION_DEFINITIONS.length).toBeGreaterThan(0);
    expect(CONTACT_DEFINITIONS.length).toBeGreaterThan(0);

    for (const definition of definitions) {
      for (const factionId of definition.generationBias.requiredFactionIds ?? []) {
        expect(getFactionDefinition(factionId))
          .withContext(`${definition.id} required faction ${factionId}`)
          .toBeDefined();
      }

      for (const factionId of Object.keys(definition.generationBias.weightedFactionIds ?? {})) {
        expect(getFactionDefinition(factionId as never))
          .withContext(`${definition.id} weighted faction ${factionId}`)
          .toBeDefined();
      }

      for (const factionId of Object.keys(definition.factionModifiers ?? {})) {
        expect(getFactionDefinition(factionId as never))
          .withContext(`${definition.id} faction modifier ${factionId}`)
          .toBeDefined();
      }

      for (const rivalId of definition.generationBias.featuredRivalIds ?? []) {
        expect(getRivalDefinition(rivalId))
          .withContext(`${definition.id} featured rival ${rivalId}`)
          .toBeDefined();
      }

      for (const rivalId of Object.keys(definition.generationBias.weightedRivalIds ?? {})) {
        expect(getRivalDefinition(rivalId as never))
          .withContext(`${definition.id} weighted rival ${rivalId}`)
          .toBeDefined();
      }

      for (const rivalId of Object.keys(definition.rivalPressureModifiers ?? {})) {
        expect(getRivalDefinition(rivalId as never))
          .withContext(`${definition.id} rival modifier ${rivalId}`)
          .toBeDefined();
      }

      for (const contactId of definition.generationBias.requiredContactIds ?? []) {
        expect(getContactDefinition(contactId))
          .withContext(`${definition.id} required contact ${contactId}`)
          .toBeDefined();
      }

      for (const contactId of Object.keys(definition.generationBias.weightedContactIds ?? {})) {
        expect(getContactDefinition(contactId as never))
          .withContext(`${definition.id} weighted contact ${contactId}`)
          .toBeDefined();
      }

      for (const contactId of Object.keys(definition.contactMetricModifiers ?? {})) {
        expect(getContactDefinition(contactId as never))
          .withContext(`${definition.id} contact modifier ${contactId}`)
          .toBeDefined();
      }

      for (const operativeId of Object.keys(definition.generationBias.weightedOperativeIds ?? {})) {
        expect(getOperativeDefinition(operativeId as never))
          .withContext(`${definition.id} weighted operative ${operativeId}`)
          .toBeDefined();
      }

      for (const tag of Object.keys(definition.generationBias.weightedOperativeTags ?? {})) {
        expect(supportedOperativeTags.has(tag as OperativeRoleTag))
          .withContext(`${definition.id} weighted operative tag ${tag}`)
          .toBeTrue();
      }

      for (const frontId of Object.keys(definition.generationBias.weightedFrontDefinitionIds ?? {})) {
        expect(getFrontDefinition(frontId as never))
          .withContext(`${definition.id} weighted front ${frontId}`)
          .toBeDefined();
      }

      for (const tag of Object.keys(definition.generationBias.weightedFrontTags ?? {})) {
        expect(supportedFrontTags.has(tag as FrontRoleTag))
          .withContext(`${definition.id} weighted front tag ${tag}`)
          .toBeTrue();
      }

      for (const tag of Object.keys(definition.generationBias.weightedEventTags ?? {})) {
        expect(supportedEventTags.has(tag as EventTag))
          .withContext(`${definition.id} weighted event tag ${tag}`)
          .toBeTrue();
      }

      for (const modifier of definition.eventWeightModifiers ?? []) {
        if (modifier.eventId) {
          expect(getEventDefinition(modifier.eventId))
            .withContext(`${definition.id} event modifier ${modifier.eventId}`)
            .toBeDefined();
        }

        if (modifier.eventTag) {
          expect(supportedEventTags.has(modifier.eventTag))
            .withContext(`${definition.id} event modifier tag ${modifier.eventTag}`)
            .toBeTrue();
        }
      }
    }
  });

  it('maps the vision resources operative tag to the current money role tag', () => {
    expect(
      definitions.some(
        (definition) => definition.generationBias.weightedOperativeTags?.money !== undefined,
      ),
    ).toBeTrue();
  });

  it('looks up every Campaign Tension definition by explicit ID', () => {
    for (const definition of definitions) {
      expect(getCampaignTensionDefinition(definition.id)).toBe(definition);
    }
  });
});
