import { newGame } from '../simulation';
import { selectDominionPace } from './dominion-pace';

describe('selectDominionPace', () => {
  it('uses the Standard Dominion target and starts on pace', () => {
    const state = newGame({ seed: 'PACE-STANDARD', campaignTensionId: 'campaign_dirty_capital' });
    const pace = selectDominionPace(state);

    expect(pace.target).toBe(90);
    expect(pace.current).toBe(state.pressures.dominion);
    expect(pace.weeksRemaining).toBe(8);
    expect(pace.requiredPerWeek).toBe(9.8);
    expect(pace.status).toBe('on_pace');
  });

  it('uses the Training Dominion target', () => {
    const state = newGame({
      runMode: 'training',
      seed: 'TRAINING-GLASS-CROWN-001',
      campaignTensionId: 'campaign_dirty_capital',
      customSeed: false,
    });
    const pace = selectDominionPace(state);

    expect(pace.target).toBe(80);
    expect(pace.requiredPerWeek).toBe(8.5);
    expect(pace.status).toBe('on_pace');
  });

  it('marks late low Dominion as critical', () => {
    const state = {
      ...newGame({ seed: 'PACE-CRITICAL', campaignTensionId: 'campaign_dirty_capital' }),
      week: 7,
      pressures: {
        ...newGame({ seed: 'PACE-CRITICAL', campaignTensionId: 'campaign_dirty_capital' })
          .pressures,
        dominion: 40,
      },
    };
    const pace = selectDominionPace(state);

    expect(pace.weeksRemaining).toBe(2);
    expect(pace.requiredPerWeek).toBe(25);
    expect(pace.status).toBe('critical');
  });

  it('marks reached target as ahead', () => {
    const initial = newGame({ seed: 'PACE-AHEAD', campaignTensionId: 'campaign_dirty_capital' });
    const pace = selectDominionPace({
      ...initial,
      pressures: {
        ...initial.pressures,
        dominion: 90,
      },
    });

    expect(pace.dominionNeeded).toBe(0);
    expect(pace.status).toBe('ahead');
  });
});
