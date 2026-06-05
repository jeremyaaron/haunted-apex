import {
  DISTRICT_ZERO_COMMAND_POINTS,
  DISTRICT_ZERO_INITIAL_PRESSURES,
  DISTRICT_ZERO_MAX_WEEKS,
} from '../content';
import { newGame } from './new-game';

describe('newGame', () => {
  it('creates the expected starting campaign state', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.seed).toBe('VIOLET-ASH-1047');
    expect(state.week).toBe(1);
    expect(state.maxWeeks).toBe(DISTRICT_ZERO_MAX_WEEKS);
    expect(state.phase).toBe('COMMAND');
    expect(state.commandPointsPerWeek).toBe(DISTRICT_ZERO_COMMAND_POINTS);
    expect(state.rngCursor).toBe(0);
    expect(state.pressures).toEqual(DISTRICT_ZERO_INITIAL_PRESSURES);
    expect(state.queuedOrders).toEqual([]);
    expect(state.eventLog).toEqual([]);
    expect(state.flags).toEqual({});
    expect(state.gameOver).toBeUndefined();
    expect(state.pendingEvent).toBeUndefined();
  });

  it('creates the starting operatives', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.operatives.length).toBe(3);
    expect(state.operatives.map((operative) => operative.name)).toEqual([
      'Mara Voss',
      'Juno Hex',
      'Saint Calder',
    ]);
    expect(state.operatives.every((operative) => operative.status === 'available')).toBeTrue();
  });

  it('creates the recruit pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    expect(state.recruitPool.length).toBe(3);
    expect(state.recruitPool.map((candidate) => candidate.name)).toEqual([
      'Iris Vale',
      'Knox Riven',
      'Orchid Seven',
    ]);
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

    first.operatives[0].traitIds.push('test_mutation');
    first.recruitPool[0].traitIds.push('test_mutation');

    expect(second.operatives[0].traitIds).not.toContain('test_mutation');
    expect(second.recruitPool[0].traitIds).not.toContain('test_mutation');
  });
});

