import type { GameState } from '../model';
import type { QueueOrderRequest } from '../selectors';
import { queueOrder } from './queue-order';
import { newGame } from './new-game';
import { resolveQueuedOrder } from './resolve-action';
import { advanceWeek } from './resolve-week';
import { applyWeeklyAccordEffects } from './weekly-accords';

describe('applyWeeklyAccordEffects', () => {
  it('does not apply weekly effects on the broker week', () => {
    const state = brokerCleanCorridor();
    const resolved = applyWeeklyAccordEffects(state);

    expect(resolved).toBe(state);
    expect(resolved.pressures.heat).toBe(state.pressures.heat);
    expect(
      resolved.activeAccords['active_accord_ashline_clean_corridor_1']?.remainingWeeks,
    ).toBe(2);
    expect(resolved.eventLog.filter((entry) => entry.type === 'accord')).toEqual([]);
  });

  it('applies weekly pressure and faction effects starting the next week', () => {
    const state = {
      ...brokerCleanCorridor(),
      week: 2,
    };
    const resolved = applyWeeklyAccordEffects(state);

    expect(resolved.pressures.heat).toBe(state.pressures.heat - 3);
    expect(
      resolved.activeAccords['active_accord_ashline_clean_corridor_1']?.remainingWeeks,
    ).toBe(1);
    expect(resolved.factions.faction_ashline_bureau?.suspicion).toBe(46);
    expect(resolved.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'accord',
        title: 'Accord Weekly Effects',
        pressureDelta: {
          heat: -3,
        },
      }),
    );
  });

  it('does not apply the same weekly tick twice in one week', () => {
    const state = {
      ...brokerCleanCorridor(),
      week: 2,
    };
    const first = applyWeeklyAccordEffects(state);
    const second = applyWeeklyAccordEffects(first);

    expect(second.pressures.heat).toBe(first.pressures.heat);
    expect(
      second.activeAccords['active_accord_ashline_clean_corridor_1']?.remainingWeeks,
    ).toBe(1);
    expect(second.eventLog.filter((entry) => entry.type === 'accord').length).toBe(1);
    expect(second.factions.faction_ashline_bureau?.suspicion).toBe(46);
  });

  it('expires accords after their final tick and preserves used accord ids', () => {
    const state = {
      ...brokerCleanCorridor(),
      week: 2,
    };
    const firstTick = applyWeeklyAccordEffects(state);
    const secondTick = applyWeeklyAccordEffects({
      ...firstTick,
      week: 3,
    });

    expect(secondTick.activeAccords).toEqual({});
    expect(secondTick.factions.faction_ashline_bureau?.activeAccordIds).toEqual([]);
    expect(secondTick.factions.faction_ashline_bureau?.usedAccordIds).toEqual([
      'accord_ashline_clean_corridor',
    ]);
    expect(secondTick.factions.faction_ashline_bureau?.suspicion).toBe(49);
    expect(secondTick.factions.faction_ashline_bureau?.obligation).toBe(6);
    expect(secondTick.eventLog.at(-1)).toEqual(
      jasmine.objectContaining({
        type: 'accord',
        title: 'Accord Expired: Ashline Bureau - Clean Corridor',
        tags: [
          'ACCORD',
          'EXPIRED',
          'active_accord_ashline_clean_corridor_1',
          'accord_ashline_clean_corridor',
          'faction_ashline_bureau',
        ],
      }),
    );
  });

  it('runs after queued orders and before front yields during advance week', () => {
    const brokered = {
      ...brokerCleanCorridor(),
      week: 2,
      eventLog: [],
    };
    const queued = mustQueue(brokered, {
      actionId: 'gather_intel',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.eventLog.map((entry) => entry.type)).toEqual([
      'order_resolved',
      'accord',
      'front_yield',
      'drift',
      'event_presented',
    ]);
    expect(
      result.state.activeAccords['active_accord_ashline_clean_corridor_1']?.remainingWeeks,
    ).toBe(1);
  });
});

function brokerCleanCorridor(): GameState {
  return resolveQueuedOrder(newGame({ seed: 'WEEKLY-ACCORDS' }), {
    id: 'order_1_1',
    actionId: 'broker_accord',
    target: {
      type: 'faction',
      factionId: 'faction_ashline_bureau',
      accordId: 'accord_ashline_clean_corridor',
    },
  }).state;
}

function mustQueue(state: GameState, request: QueueOrderRequest): GameState {
  const result = queueOrder(state, request);

  if (!result.ok) {
    throw new Error(`Expected queued order, got ${result.error}`);
  }

  return result.state;
}
