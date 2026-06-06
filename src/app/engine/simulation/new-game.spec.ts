import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
  getOperativeDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import { newGame } from './new-game';

describe('newGame', () => {
  it('creates the expected starting campaign state', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.seed).toBe('VIOLET-ASH-1047');
    expect(state.schemaVersion).toBe(3);
    expect(state.week).toBe(1);
    expect(state.maxWeeks).toBe(DISTRICT_ZERO_MAX_WEEKS);
    expect(state.phase).toBe('COMMAND');
    expect(state.commandPointsPerWeek).toBe(DISTRICT_ZERO_COMMAND_POINTS);
    expect(state.rngCursor).toBe(10);
    expect(state.pressures).toEqual(DISTRICT_ZERO_INITIAL_PRESSURES);
    expect(state.queuedOrders).toEqual([]);
    expect(state.recentActivity).toEqual([]);
    expect(state.eventLog).toEqual([]);
    expect(state.flags).toEqual({});
    expect(state.seenSignatureEventIds).toEqual([]);
    expect(state.gameOver).toBeUndefined();
    expect(state.pendingEvent).toBeUndefined();
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
        pressure: 0,
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
    expect(second.districts['district_violet_ward'].control).toBe(12);
    expect(second.rivals['rival_nyx_ardent'].pressure).toBe(0);
    expect(second.recentActivity).toEqual([]);
  });
});
