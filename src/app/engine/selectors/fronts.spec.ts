import type { FrontId, FrontState, GameState } from '../model';
import { newGame } from '../simulation';
import { selectFrontPanelView } from './fronts';

describe('front selectors', () => {
  it('returns owned Fronts with status, yield, and upgrade preview', () => {
    const state = newGame({ seed: 'FRONT-PANEL-OWNED' });
    const panel = selectFrontPanelView(state);
    const paleCircuit = panel.ownedFronts.find((front) => front.id === 'front_pale_circuit');

    expect(panel.ownedCount).toBe(1);
    expect(panel.cap).toBe(3);
    expect(panel.capReached).toBeFalse();
    expect(paleCircuit).toEqual(
      jasmine.objectContaining({
        name: 'The Pale Circuit',
        level: 1,
        maxLevel: 2,
        status: 'quiet',
        exposure: 12,
        districtName: 'Violet Ward',
        venueName: 'The Pale Circuit',
        relatedRivalName: 'Nyx Ardent',
        weeklyExposureGain: 2,
        districtControlYield: 1,
      }),
    );
    expect(paleCircuit?.weeklyYield).toEqual([
      { id: 'loyalty', value: 1 },
      { id: 'resources', value: 250 },
    ]);
    expect(paleCircuit?.upgrade).toEqual(
      jasmine.objectContaining({
        available: true,
        mode: 'upgrade',
        cost: 1200,
        projectedExposure: 20,
        projectedStatus: 'quiet',
      }),
    );
  });

  it('returns opportunity previews and cap-reached state', () => {
    const base = newGame({ seed: 'FRONT-PANEL-CAP' });
    const state: GameState = {
      ...base,
      fronts: {
        front_pale_circuit: frontState('front_pale_circuit', {
          districtId: 'district_violet_ward',
          venueId: 'venue_pale_circuit',
          relatedRivalId: 'rival_nyx_ardent',
        }),
        front_black_clinic: frontState('front_black_clinic', {
          districtId: 'district_ghostline_market',
        }),
        front_courier_line: frontState('front_courier_line', {
          districtId: 'district_chrome_narrows',
        }),
      },
      frontOpportunities: base.frontOpportunities.filter(
        (opportunity) =>
          ![
            'front_pale_circuit',
            'front_black_clinic',
            'front_courier_line',
          ].includes(opportunity.definitionId),
      ),
    };
    const panel = selectFrontPanelView(state);

    expect(panel.ownedCount).toBe(3);
    expect(panel.capReached).toBeTrue();
    expect(panel.opportunities.length).toBeGreaterThan(0);
    expect(panel.opportunities.every((opportunity) => !opportunity.establish.available))
      .withContext('cap disables establish previews')
      .toBeTrue();
    expect(
      panel.opportunities.every(
        (opportunity) => opportunity.establish.unavailableReason === 'front_cap_reached',
      ),
    ).toBeTrue();
  });
});

function frontState(
  id: FrontId,
  overrides: Partial<FrontState> & Pick<FrontState, 'districtId'>,
): FrontState {
  return {
    id,
    definitionId: id,
    districtId: overrides.districtId,
    ...(overrides.venueId ? { venueId: overrides.venueId } : {}),
    ...(overrides.relatedRivalId ? { relatedRivalId: overrides.relatedRivalId } : {}),
    level: overrides.level ?? 1,
    exposure: overrides.exposure ?? 12,
    establishedWeek: overrides.establishedWeek ?? 1,
    compromised: overrides.compromised ?? false,
    active: overrides.active ?? true,
    flags: overrides.flags ?? {},
    yieldHistory: overrides.yieldHistory ?? [],
  };
}
