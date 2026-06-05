import { DISTRICT_ZERO_EVENTS } from '../content';
import type { GameLogEntry, GameState } from '../model';
import { newGame } from './new-game';
import { calculateEventWeight, getWeightedEvents, selectWeeklyEvent } from './select-weekly-event';

describe('weekly event selection', () => {
  it('selects the same event for the same seed and state', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      rngCursor: 1,
    };

    expect(selectWeeklyEvent(state)).toEqual(selectWeeklyEvent(state));
  });

  it('increases Corp Patrol Sweep weight when Heat is high', () => {
    const event = requireEvent('corp_patrol_sweep');
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const highHeat = {
      ...baseline,
      pressures: {
        ...baseline.pressures,
        heat: 70,
      },
    };

    expect(calculateEventWeight(highHeat, event)).toBeGreaterThan(
      calculateEventWeight(baseline, event),
    );
  });

  it('increases Safehouse Compromised weight when bribe_exposed is set', () => {
    const event = requireEvent('safehouse_compromised');
    const baseline = newGame({ seed: 'VIOLET-ASH-1047' });
    const exposed = {
      ...baseline,
      flags: {
        bribe_exposed: true,
      },
    };

    expect(calculateEventWeight(exposed, event)).toBeGreaterThan(
      calculateEventWeight(baseline, event),
    );
  });

  it('reduces repeated major negative event weights', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      eventLog: [
        presentedLog('corp_patrol_sweep', ['HEAT']),
        presentedLog('job_goes_loud', ['HEAT']),
      ],
    };
    const corpWeight = getWeightedEvents(state).find(
      (candidate) => candidate.event.id === 'corp_patrol_sweep',
    )?.weight;

    expect(corpWeight).toBe(3);
  });
});

function requireEvent(eventId: string) {
  const event = DISTRICT_ZERO_EVENTS.find((candidate) => candidate.id === eventId);

  if (!event) {
    throw new Error(`Missing test event ${eventId}`);
  }

  return event;
}

function presentedLog(id: string, tags: string[]): GameLogEntry {
  return {
    id,
    week: 1,
    type: 'event_presented',
    title: id,
    tags,
  };
}

