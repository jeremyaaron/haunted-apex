import { FRONT_DEFINITIONS, getDistrictDefinition, getVenueDefinition } from '../content';
import {
  FRONT_OPPORTUNITY_COUNT,
  generateFrontNetwork,
  materializeStartingFront,
  OWNED_FRONT_CAP,
  satisfiesFrontOpportunityCoverage,
  STARTING_FRONT_ID,
} from './generate-front-opportunities';

describe('generateFrontNetwork', () => {
  it('starts every run with The Pale Circuit as an owned Front', () => {
    const network = generateFrontNetwork('VIOLET-ASH-1047');
    const paleCircuit = network.fronts.front_pale_circuit;

    expect(Object.keys(network.fronts)).toEqual([STARTING_FRONT_ID]);
    expect(Object.keys(network.fronts).length).toBeLessThan(OWNED_FRONT_CAP);
    expect(paleCircuit).toEqual(
      jasmine.objectContaining({
        id: 'front_pale_circuit',
        definitionId: 'front_pale_circuit',
        districtId: 'district_violet_ward',
        venueId: 'venue_pale_circuit',
        relatedRivalId: 'rival_nyx_ardent',
        level: 1,
        exposure: 12,
        establishedWeek: 1,
        compromised: false,
        active: true,
        flags: {},
        yieldHistory: [],
      }),
    );
  });

  it('generates deterministic fixed opportunities by seed', () => {
    const first = generateFrontNetwork('VIOLET-ASH-1047');
    const second = generateFrontNetwork('violet-ash-1047');
    const other = generateFrontNetwork('VIOLET-ASH-1048');

    expect(first.frontOpportunities).toEqual(second.frontOpportunities);
    expect(first.frontOpportunities).not.toEqual(other.frontOpportunities);
  });

  it('generates four opportunities that exclude The Pale Circuit and satisfy role coverage', () => {
    const network = generateFrontNetwork('FRONT-COVERAGE');
    const opportunityDefinitionIds = network.frontOpportunities.map(
      (opportunity) => opportunity.definitionId,
    );

    expect(network.frontOpportunities.length).toBe(FRONT_OPPORTUNITY_COUNT);
    expect(new Set(opportunityDefinitionIds).size).toBe(FRONT_OPPORTUNITY_COUNT);
    expect(opportunityDefinitionIds).not.toContain(STARTING_FRONT_ID);
    expect(satisfiesFrontOpportunityCoverage(FRONT_DEFINITIONS, opportunityDefinitionIds))
      .toBeTrue();
  });

  it('stores related rivals inferred from generated district or venue context', () => {
    const network = generateFrontNetwork('RIVAL-FRONTS');

    for (const opportunity of network.frontOpportunities) {
      const venue = opportunity.venueId ? getVenueDefinition(opportunity.venueId) : undefined;
      const district = getDistrictDefinition(opportunity.districtId);

      expect(opportunity.relatedRivalId)
        .withContext(opportunity.id)
        .toBe(venue?.controllingRivalId ?? district?.rivalId);
    }
  });

  it('materializes starting Front state from a definition', () => {
    const definition = FRONT_DEFINITIONS.find(
      (candidate) => candidate.id === 'front_pale_circuit',
    );

    expect(definition).toBeDefined();
    expect(materializeStartingFront(definition!)).toEqual(
      jasmine.objectContaining({
        id: definition!.id,
        definitionId: definition!.id,
        exposure: definition!.exposureOnEstablish,
      }),
    );
  });
});
