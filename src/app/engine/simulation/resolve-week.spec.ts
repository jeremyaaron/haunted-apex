import type { ActionTarget, GameState } from '../model';
import { getGameOverState } from './win-loss';
import { advanceWeek } from './resolve-week';
import { clampPressures } from './clamps';
import { applyWeeklyDrift } from './weekly-drift';
import { queueOrder } from './queue-order';
import { newGame } from './new-game';

describe('advanceWeek', () => {
  it('resolves Gather Intel effects, stress, idle recovery, drift, and logs', () => {
    const queued = mustQueue(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.phase).toBe('EVENT_CHOICE');
    expect(result.state.week).toBe(1);
    expect(result.state.rngCursor).toBe(2);
    expect(result.state.queuedOrders).toEqual([]);
    expect(result.state.pendingEvent).toEqual(
      jasmine.objectContaining({
        week: 1,
      }),
    );
    expect(result.eventSelection.event).toEqual(result.state.pendingEvent!);
    expect(result.eventSelection.diagnostics.finalWeight).toBeGreaterThan(0);
    expect(result.state.pressures).toEqual({
      dominion: 12,
      heat: 17,
      loyalty: 67,
      resources: 4100,
      intel: 20,
      ruin: 0,
    });
    expect(result.state.operatives.find((operative) => operative.id === 'op_mara_voss')?.stress).toBe(
      24,
    );
    expect(result.state.operatives.find((operative) => operative.id === 'op_juno_hex')?.stress).toBe(
      30,
    );
    expect(result.state.operatives.find((operative) => operative.id === 'op_saint_calder')?.stress).toBe(
      18,
    );
    expect(result.state.eventLog.map((entry) => entry.type)).toEqual([
      'order_resolved',
      'drift',
      'event_presented',
    ]);
  });

  it('applies dangerous action stress for Run a Small Job', () => {
    const queued = mustQueue(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'run_small_job',
      assignedOperativeId: 'op_mara_voss',
      target: {
        type: 'venue',
        id: 'venue_zero_mercy',
      },
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.operatives.find((operative) => operative.id === 'op_mara_voss')?.stress).toBe(
      28,
    );
    expect(result.state.pressures.resources).toBe(6050);
    expect(result.state.pressures.dominion).toBe(18);
    expect(result.state.pressures.heat).toBe(28);
    expect(result.state.districts.district_chrome_narrows).toEqual({
      id: 'district_chrome_narrows',
      control: 11,
      heat: 31,
    });
    expect(result.state.rivals.rival_knox_marrow.pressure).toBe(10);
    expect(result.state.recentActivity).toEqual([
      jasmine.objectContaining({
        actionId: 'run_small_job',
        target: {
          type: 'venue',
          id: 'venue_zero_mercy',
        },
        rivalId: 'rival_knox_marrow',
        heatDelta: 12,
        dominionDelta: 6,
      }),
    ]);
    expect(result.state.eventLog[0].body).toContain('Target: Zero Mercy.');
    expect(result.state.eventLog[0].body).toContain('Rival attention: Knox Marrow +10.');
  });

  it('applies Bribe Official failure behavior and sets bribe_exposed', () => {
    const queued = mustQueue(newGame({ seed: 'E' }), {
      actionId: 'bribe_official',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.flags['bribe_exposed']).toBeTrue();
    expect(result.state.pressures).toEqual({
      dominion: 12,
      heat: 22,
      loyalty: 67,
      resources: 3300,
      intel: 12,
      ruin: 2,
    });
    expect(result.state.eventLog.map((entry) => entry.type)).toEqual([
      'order_resolved',
      'complication',
      'drift',
      'event_presented',
    ]);
  });

  it('applies generic complications for non-bribe failed risks', () => {
    const queued = mustQueue(newGame({ seed: 'E' }), {
      actionId: 'run_small_job',
      target: {
        type: 'district',
        id: 'district_chrome_narrows',
      },
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.pressures).toEqual({
      dominion: 16,
      heat: 30,
      loyalty: 63,
      resources: 6000,
      intel: 10,
      ruin: 0,
    });
    expect(result.state.districts.district_chrome_narrows).toEqual({
      id: 'district_chrome_narrows',
      control: 11,
      heat: 32,
    });
    expect(result.state.recentActivity[0]).toEqual(
      jasmine.objectContaining({
        heatDelta: 14,
        dominionDelta: 4,
      }),
    );
    expect(result.state.eventLog.some((entry) => entry.type === 'complication')).toBeTrue();
    expect(result.orderResolutions).toEqual([
      jasmine.objectContaining({
        complication: true,
        order: jasmine.objectContaining({
          actionId: 'run_small_job',
          target: {
            type: 'district',
            id: 'district_chrome_narrows',
          },
        }),
      }),
    ]);
  });

  it('recruits the first candidate from the recruit pool', () => {
    const queued = mustQueue(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'recruit_operative',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.operatives.map((operative) => operative.name)).toContain('Iris Vale');
    expect(result.state.recruitPool.map((candidate) => candidate.name)).toEqual([
      'Knox Riven',
      'Orchid Seven',
    ]);
    expect(result.state.operatives.find((operative) => operative.name === 'Iris Vale')).toEqual(
      jasmine.objectContaining({
        loyalty: 55,
        stress: 8,
        status: 'available',
      }),
    );
  });

  it('recovers assigned stress for Lay Low', () => {
    const queued = mustQueue(newGame({ seed: 'VIOLET-ASH-1047' }), {
      actionId: 'lay_low',
      assignedOperativeId: 'op_juno_hex',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.operatives.find((operative) => operative.id === 'op_juno_hex')?.stress).toBe(
      24,
    );
    expect(result.state.operatives.find((operative) => operative.id === 'op_mara_voss')?.stress).toBe(
      16,
    );
  });

  it('cools districts, applies rival effects, then presents an event before win/loss', () => {
    const baseState = newGame({ seed: 'VIOLET-ASH-1047' });
    const pressuredState: GameState = {
      ...baseState,
      pressures: {
        ...baseState.pressures,
        heat: 98,
      },
      districts: {
        ...baseState.districts,
        district_chrome_narrows: {
          ...baseState.districts.district_chrome_narrows,
          heat: 30,
        },
      },
      rivals: {
        ...baseState.rivals,
        rival_knox_marrow: {
          ...baseState.rivals.rival_knox_marrow,
          pressure: 60,
        },
      },
    };
    const queued = mustQueue(pressuredState, {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
    });
    const result = advanceWeek(queued);

    if (!result.ok) {
      fail(`Expected week resolution, got ${result.error}`);
      return;
    }

    expect(result.state.districts.district_chrome_narrows.heat).toBe(29);
    expect(result.state.pressures.heat).toBe(100);
    expect(result.state.phase).toBe('EVENT_CHOICE');
    expect(result.state.pendingEvent).toBeDefined();
    expect(result.state.gameOver).toBeUndefined();
    expect(result.state.eventLog.map((entry) => entry.type)).toEqual([
      'order_resolved',
      'drift',
      'rival_effect',
      'event_presented',
    ]);
  });

  it('refuses to advance without queued orders', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(advanceWeek(state)).toEqual({
      ok: false,
      state,
      error: 'no_queued_orders',
    });
  });

  it('refuses to advance outside command phase', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      phase: 'WEEK_COMPLETE' as const,
    };

    expect(advanceWeek(state)).toEqual({
      ok: false,
      state,
      error: 'not_command_phase',
    });
  });
});

describe('weekly drift', () => {
  it('applies upkeep, natural cooling, and fatigue', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const drifted = applyWeeklyDrift(state);

    expect(drifted.pressures).toEqual({
      dominion: 12,
      heat: 16,
      loyalty: 67,
      resources: 4500,
      intel: 10,
      ruin: 0,
    });
  });

  it('applies conditional drift after projected pressure changes', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      pressures: {
        dominion: 40,
        heat: 70,
        loyalty: 50,
        resources: 1200,
        intel: 10,
        ruin: 0,
      },
    };
    const drifted = applyWeeklyDrift(state);

    expect(drifted.pressures).toEqual({
      dominion: 40,
      heat: 72,
      loyalty: 43,
      resources: 700,
      intel: 10,
      ruin: 0,
    });
  });
});

describe('clamps and win/loss', () => {
  it('clamps bounded pressures but allows resources below zero', () => {
    expect(
      clampPressures({
        dominion: 120,
        heat: -5,
        loyalty: 140,
        resources: -50,
        intel: 130,
        ruin: -10,
      }),
    ).toEqual({
      dominion: 100,
      heat: 0,
      loyalty: 100,
      resources: -50,
      intel: 100,
      ruin: 0,
    });
  });

  it('detects dominion victory', () => {
    expect(getGameOverState(withPressures({ dominion: 85 }))).toEqual({
      result: 'victory',
      reason: 'dominion_victory',
    });
  });

  it('detects loss before victory when fail and win thresholds are both crossed', () => {
    expect(getGameOverState(withPressures({ dominion: 85, heat: 100 }))).toEqual({
      result: 'loss',
      reason: 'heat_lockdown',
    });
  });

  it('detects heat loss', () => {
    expect(getGameOverState(withPressures({ heat: 100 }))).toEqual({
      result: 'loss',
      reason: 'heat_lockdown',
    });
  });

  it('detects loyalty loss', () => {
    expect(getGameOverState(withPressures({ loyalty: 0 }))).toEqual({
      result: 'loss',
      reason: 'loyalty_collapse',
    });
  });

  it('detects bankruptcy loss', () => {
    expect(getGameOverState(withPressures({ resources: -1 }))).toEqual({
      result: 'loss',
      reason: 'bankrupt',
    });
  });

  it('detects out-of-time loss', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      week: 8,
    };

    expect(getGameOverState(state)).toEqual({
      result: 'loss',
      reason: 'out_of_time',
    });
  });
});

function mustQueue(
  state: GameState,
  request: {
    actionId: 'gather_intel' | 'run_small_job' | 'bribe_official' | 'recruit_operative' | 'lay_low';
    assignedOperativeId?: string;
    target?: ActionTarget;
  },
): GameState {
  const result = queueOrder(state, request);

  if (!result.ok) {
    throw new Error(`Expected queued order, got ${result.error}`);
  }

  return result.state;
}

function withPressures(pressures: Partial<GameState['pressures']>): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

  return {
    ...state,
    pressures: {
      ...state.pressures,
      ...pressures,
    },
  };
}
