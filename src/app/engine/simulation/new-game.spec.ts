import {
  CAMPAIGN_TENSION_DEFINITIONS,
  CONTACT_DEFINITIONS,
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  FACTION_DEFINITIONS,
  FRONT_DEFINITIONS,
  getDistrictDefinition,
  getVenueDefinition,
  getOperativeDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import { applyCampaignModifiersToRun } from '../campaign';
import { ACTIVE_CONTACT_COUNT, satisfiesContactCoverage } from '../contacts';
import {
  ACTIVE_FACTION_COUNT,
  ALWAYS_ACTIVE_FACTION_ID,
  materializeFactionState,
} from '../factions';
import {
  FRONT_OPPORTUNITY_COUNT,
  satisfiesFrontOpportunityCoverage,
  STARTING_FRONT_ID,
} from '../fronts';
import { newGame } from './new-game';

describe('newGame', () => {
  it('creates the expected starting campaign state', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.seed).toBe('VIOLET-ASH-1047');
    expect(state.schemaVersion).toBe(9);
    expect(state.week).toBe(1);
    expect(state.maxWeeks).toBe(DISTRICT_ZERO_MAX_WEEKS);
    expect(state.phase).toBe('COMMAND');
    expect(state.commandPointsPerWeek).toBe(DISTRICT_ZERO_COMMAND_POINTS);
    expect(state.run).toEqual({
      mode: 'standard',
      dominionTarget: 90,
      validationStatus: 'unvalidated',
      customSeed: true,
    });
    expect(state.rngCursor).toBe(10);
    expect(state.queuedOrders).toEqual([]);
    expect(state.recentActivity).toEqual([]);
    expect(state.ledger).toEqual({
      entries: [],
      discoveredCount: 0,
      consumedCount: 0,
    });
    expect(state.eventLog.length).toBe(1);
    expect(state.eventLog[0]).toEqual(
      jasmine.objectContaining({
        id: 'log_1_1_campaign',
        week: 1,
        type: 'campaign',
        tags: ['CAMPAIGN', state.campaign.tensionId],
      }),
    );
    expect(state.flags).toEqual({});
    expect(state.seenSignatureEventIds).toEqual([]);
    expect(state.gameOver).toBeUndefined();
    expect(state.pendingEvent).toBeUndefined();
  });

  it('marks generated Standard runs as harness validated', () => {
    const state = newGame();

    expect(state.run).toEqual({
      mode: 'standard',
      dominionTarget: 90,
      validationStatus: 'harness_validated',
      customSeed: false,
    });
  });

  it('creates Training runs with the Training Dominion target', () => {
    const state = newGame({
      seed: 'TRAINING-GLASS-CROWN-001',
      runMode: 'training',
      campaignTensionId: 'campaign_dirty_capital',
    });

    expect(state.run).toEqual({
      mode: 'training',
      dominionTarget: 80,
      validationStatus: 'validated',
      customSeed: true,
    });
  });

  it('creates deterministic Campaign identity and run-start active-content audit', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const matchingTension = CAMPAIGN_TENSION_DEFINITIONS.find(
      (definition) => definition.id === state.campaign.tensionId,
    );

    expect(matchingTension).toBeDefined();
    expect(state.campaign.cityName.trim()).not.toBe('');
    expect(matchingTension?.cityProfileOptions).toContain(state.campaign.cityProfile);
    expect(state.campaign.openingBriefingShown).toBeFalse();
    expect(state.campaign.appliedModifiers).not.toEqual({});
    expect(state.campaign.flags).toEqual({});
    expect(state.campaign.activeContent.factionIds).toEqual(state.activeFactionIds);
    expect(state.campaign.activeContent.contactIds).toEqual(state.activeContactIds);
    expect(state.campaign.activeContent.rivalIds).toEqual(
      RIVAL_TERRITORY_RIVALS.map((rival) => rival.id),
    );
    expect(state.campaign.activeContent.startingOperativeIds).toEqual(
      state.operatives.map((operative) => operative.id),
    );
    expect(state.campaign.activeContent.frontDefinitionIds).toEqual([
      'front_pale_circuit',
      ...state.frontOpportunities.map((opportunity) => opportunity.definitionId),
    ]);
  });

  it('respects explicit Campaign Tension override', () => {
    const state = newGame({
      seed: 'VIOLET-ASH-1047',
      campaignTensionId: 'campaign_ghostline_signal',
    });

    expect(state.campaign.tensionId).toBe('campaign_ghostline_signal');
    expect(state.campaign.cityProfile).toBe('ghost_market');
  });

  it('applies explicit Campaign starting pressure and rival modifiers once', () => {
    const state = newGame({
      seed: 'VIOLET-ASH-1047',
      campaignTensionId: 'campaign_nightlife_war',
    });
    const campaign = CAMPAIGN_TENSION_DEFINITIONS.find(
      (definition) => definition.id === 'campaign_nightlife_war',
    )!;
    const reapplied = applyCampaignModifiersToRun(state, campaign);

    expect(state.pressures).toEqual({
      ...DISTRICT_ZERO_INITIAL_PRESSURES,
      dominion: DISTRICT_ZERO_INITIAL_PRESSURES.dominion + 3,
      heat: DISTRICT_ZERO_INITIAL_PRESSURES.heat + 4,
      loyalty: DISTRICT_ZERO_INITIAL_PRESSURES.loyalty - 4,
    });
    expect(state.rivals.rival_nyx_ardent.pressure).toBe(15);
    expect(state.campaign.appliedModifiers).toEqual({
      startingPressureDelta: { dominion: 3, loyalty: -4, heat: 4 },
      rivalPressureModifiers: { rival_nyx_ardent: 15 },
    });
    expect(state.eventLog.length).toBe(1);
    expect(state.eventLog[0].title).toBe(`Nightlife War: ${state.campaign.cityName}`);
    expect(state.eventLog[0].body).toContain(campaign.openingBriefing);
    expect(state.eventLog[0].body).toContain('Nyx Ardent Pressure +15');
    expect(reapplied).toEqual(state);
  });

  it('applies Campaign faction modifiers to active factions and records faction interactions', () => {
    const state = newGame({
      seed: 'VIOLET-ASH-1047',
      campaignTensionId: 'campaign_corp_crackdown',
    });
    const ashline = state.factions.faction_ashline_bureau;

    expect(ashline).toBeDefined();
    expect(ashline?.standing).toBe(45);
    expect(ashline?.suspicion).toBe(47);
    expect(ashline?.obligation).toBe(0);
    expect(ashline?.recentInteractions).toEqual([
      {
        week: 1,
        sourceType: 'campaign',
        sourceId: 'campaign_corp_crackdown',
        suspicionDelta: 12,
      },
    ]);
    expect(state.campaign.appliedModifiers.factionModifiers).toEqual({
      faction_ashline_bureau: { suspicion: 12 },
    });
  });

  it('initializes district overlays from static definitions', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(Object.keys(state.districts).length).toBe(RIVAL_TERRITORY_DISTRICTS.length);

    for (const definition of RIVAL_TERRITORY_DISTRICTS) {
      expect(state.districts[definition.id]).toEqual({
        id: definition.id,
        control: definition.baseControl,
        heat: definition.baseHeat,
      });
    }
  });

  it('initializes active rival overlays from static definitions', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(Object.keys(state.rivals).length).toBe(RIVAL_TERRITORY_RIVALS.length);

    for (const definition of RIVAL_TERRITORY_RIVALS) {
      expect(state.rivals[definition.id]).toEqual({
        id: definition.id,
        pressure: state.campaign.appliedModifiers.rivalPressureModifiers?.[definition.id] ?? 0,
        disposition: definition.baseDisposition,
        active: true,
      });
    }
  });

  it('creates the starting operatives', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.operatives.length).toBe(3);
    expect(
      state.operatives.map(
        (operative) => getOperativeDefinition(operative.id)?.name,
      ),
    ).toEqual(['Saint Calder', 'Mara Voss', 'Juno Hex']);
    expect(state.operatives.every((operative) => operative.status === 'available')).toBeTrue();
    expect(state.operatives.every((operative) => operative.recentAssignments.length === 0))
      .toBeTrue();
  });

  it('creates the hire pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.hirePool.length).toBe(4);
    expect(getOperativeDefinition(state.hirePool[0])?.name).toBe('Iris Vale');
  });

  it('creates the active contact network', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(Object.keys(state.contacts).length).toBe(CONTACT_DEFINITIONS.length);
    expect(state.activeContactIds.length).toBe(ACTIVE_CONTACT_COUNT);
    expect(satisfiesContactCoverage(CONTACT_DEFINITIONS, state.activeContactIds)).toBeTrue();

    for (const definition of CONTACT_DEFINITIONS) {
      expect(state.contacts[definition.id]).toEqual({
        id: definition.id,
        trust: definition.baseTrust,
        leverage: definition.baseLeverage,
        volatility: definition.baseVolatility,
        exposure: definition.baseExposure,
        burned: false,
        recentInteractions: [],
        flags: {},
      });
    }
  });

  it('creates the active faction network', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.activeFactionIds.length).toBe(ACTIVE_FACTION_COUNT);
    expect(new Set(state.activeFactionIds).size).toBe(ACTIVE_FACTION_COUNT);
    expect(state.activeFactionIds).toContain(ALWAYS_ACTIVE_FACTION_ID);
    expect(Object.keys(state.factions).sort()).toEqual([...state.activeFactionIds].sort());
    expect(state.activeAccords).toEqual({});

    for (const factionId of state.activeFactionIds) {
      const definition = FACTION_DEFINITIONS.find((candidate) => candidate.id === factionId);
      const campaignDelta = state.campaign.appliedModifiers.factionModifiers?.[factionId];
      const expected = materializeFactionState(definition!);

      expect(definition).toBeDefined();
      expect(state.factions[factionId]).toEqual({
        ...expected,
        standing: expected.standing + (campaignDelta?.standing ?? 0),
        suspicion: expected.suspicion + (campaignDelta?.suspicion ?? 0),
        obligation: expected.obligation + (campaignDelta?.obligation ?? 0),
        recentInteractions: campaignDelta
          ? [
              jasmine.objectContaining({
                week: 1,
                sourceType: 'campaign',
                sourceId: state.campaign.tensionId,
              }),
            ]
          : [],
      });
    }
  });

  it('creates the starting Front and fixed Front opportunities', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const opportunityDefinitionIds = state.frontOpportunities.map(
      (opportunity) => opportunity.definitionId,
    );

    expect(Object.keys(state.fronts)).toEqual([STARTING_FRONT_ID]);
    expect(state.fronts.front_pale_circuit).toEqual(
      jasmine.objectContaining({
        id: 'front_pale_circuit',
        definitionId: 'front_pale_circuit',
        districtId: 'district_violet_ward',
        venueId: 'venue_pale_circuit',
        relatedRivalId: 'rival_nyx_ardent',
        level: 1,
        exposure: 12,
      }),
    );
    expect(state.frontOpportunities.length).toBe(FRONT_OPPORTUNITY_COUNT);
    expect(opportunityDefinitionIds).not.toContain(STARTING_FRONT_ID);
    expect(satisfiesFrontOpportunityCoverage(FRONT_DEFINITIONS, opportunityDefinitionIds))
      .toBeTrue();

    for (const opportunity of state.frontOpportunities) {
      const venue = opportunity.venueId ? getVenueDefinition(opportunity.venueId) : undefined;
      const district = getDistrictDefinition(opportunity.districtId);

      expect(opportunity.relatedRivalId)
        .withContext(opportunity.id)
        .toBe(venue?.controllingRivalId ?? district?.rivalId);
    }
  });

  it('creates identical state for the same seed', () => {
    const first = newGame({ seed: 'violet-ash-1047' });
    const second = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(first).toEqual(second);
  });

  it('generates a seed when none is provided', () => {
    const state = newGame();

    expect(state.seed.length).toBeGreaterThan(0);
    expect(state.seed).toContain('VIOLET-ASH-');
  });

  it('returns cloned collections so content constants cannot be mutated through state', () => {
    const first = newGame({ seed: 'VIOLET-ASH-1047' });
    const second = newGame({ seed: 'VIOLET-ASH-1047' });

    first.operatives[0].revealedTraits.push('trait_old_debts');
    first.operatives[0].hiddenFlags['test_mutation'] = true;
    first.operatives[0].recentAssignments.push({
      id: 'assignment_test',
      week: 1,
      actionId: 'gather_intel',
      targetTags: ['test'],
      complication: false,
      stressDelta: 1,
    });
    first.hirePool.pop();
    first.activeContactIds.pop();
    first.contacts[first.activeContactIds[0]].trust = 99;
    first.contacts[first.activeContactIds[0]].flags['test_mutation'] = true;
    first.activeFactionIds.pop();
    first.factions[first.activeFactionIds[0]]!.standing = 99;
    first.factions[first.activeFactionIds[0]]!.flags['test_mutation'] = true;
    first.districts['district_violet_ward'].control = 99;
    first.rivals['rival_nyx_ardent'].pressure = 99;
    first.recentActivity.push({
      id: 'activity_test',
      week: 1,
      actionId: 'gather_intel',
      targetTags: ['test'],
      heatDelta: 0,
      dominionDelta: 0,
    });

    expect(second.operatives[0].revealedTraits).not.toContain('trait_old_debts');
    expect(second.operatives[0].hiddenFlags['test_mutation']).toBeUndefined();
    expect(second.operatives[0].recentAssignments).toEqual([]);
    expect(second.hirePool.length).toBe(4);
    expect(second.activeContactIds.length).toBe(ACTIVE_CONTACT_COUNT);
    expect(second.contacts[second.activeContactIds[0]].trust).not.toBe(99);
    expect(second.contacts[second.activeContactIds[0]].flags['test_mutation']).toBeUndefined();
    expect(second.activeFactionIds.length).toBe(ACTIVE_FACTION_COUNT);
    expect(second.factions[second.activeFactionIds[0]]!.standing).not.toBe(99);
    expect(second.factions[second.activeFactionIds[0]]!.flags['test_mutation']).toBeUndefined();
    expect(second.districts['district_violet_ward'].control).toBe(12);
    expect(second.rivals['rival_nyx_ardent'].pressure).toBe(
      second.campaign.appliedModifiers.rivalPressureModifiers?.rival_nyx_ardent ?? 0,
    );
    expect(second.recentActivity).toEqual([]);
  });
});
