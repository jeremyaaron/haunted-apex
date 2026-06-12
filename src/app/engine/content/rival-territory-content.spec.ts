import {
  getDistrictDefinition,
  getFactionDefinition,
  getRivalDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  RIVAL_TERRITORY_VENUES,
} from './index';

describe('Rival Territory content', () => {
  it('defines the expected districts, venues, and rivals', () => {
    expect(RIVAL_TERRITORY_DISTRICTS.length).toBe(3);
    expect(RIVAL_TERRITORY_VENUES.length).toBe(4);
    expect(RIVAL_TERRITORY_RIVALS.length).toBe(2);
  });

  it('resolves every district venue and rival reference', () => {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      for (const venueId of district.venueIds) {
        expect(getVenueDefinition(venueId))
          .withContext(`${district.id} references ${venueId}`)
          .toBeDefined();
      }

      if ('rivalId' in district) {
        expect(getRivalDefinition(district.rivalId))
          .withContext(`${district.id} references ${district.rivalId}`)
          .toBeDefined();
      }
    }
  });

  it('resolves every venue district and controlling rival reference', () => {
    for (const venue of RIVAL_TERRITORY_VENUES) {
      expect(getDistrictDefinition(venue.districtId))
        .withContext(`${venue.id} references ${venue.districtId}`)
        .toBeDefined();

      if ('controllingRivalId' in venue) {
        expect(getRivalDefinition(venue.controllingRivalId))
          .withContext(`${venue.id} references ${venue.controllingRivalId}`)
          .toBeDefined();
      }
    }
  });

  it('resolves every rival-controlled district and venue reference', () => {
    for (const rival of RIVAL_TERRITORY_RIVALS) {
      for (const districtId of rival.controlledDistrictIds) {
        expect(getDistrictDefinition(districtId))
          .withContext(`${rival.id} controls ${districtId}`)
          .toBeDefined();
      }

      for (const venueId of rival.controlledVenueIds) {
        expect(getVenueDefinition(venueId))
          .withContext(`${rival.id} controls ${venueId}`)
          .toBeDefined();
      }

      if (rival.associatedFactionId) {
        expect(getFactionDefinition(rival.associatedFactionId))
          .withContext(`${rival.id} references faction ${rival.associatedFactionId}`)
          .toBeDefined();
      }
    }
  });

  it('looks up each definition by its explicit ID', () => {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      expect(getDistrictDefinition(district.id)).toBe(district);
    }

    for (const venue of RIVAL_TERRITORY_VENUES) {
      expect(getVenueDefinition(venue.id)).toBe(venue);
    }

    for (const rival of RIVAL_TERRITORY_RIVALS) {
      expect(getRivalDefinition(rival.id)).toBe(rival);
    }
  });
});
