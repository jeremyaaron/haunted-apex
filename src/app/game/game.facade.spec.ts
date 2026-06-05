import { TestBed } from '@angular/core/testing';
import { getEventDefinition, newGame } from '../engine';
import { CURRENT_RUN_STORAGE_KEY } from './game-storage.service';
import { GameFacade } from './game.facade';

describe('GameFacade', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts a new game and persists it', () => {
    const facade = TestBed.inject(GameFacade);
    const state = facade.startNewGame({ seed: 'VIOLET-ASH-1047' });

    expect(facade.state()).toEqual(state);
    expect(JSON.parse(localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null')).toEqual(state);
  });

  it('loads a valid current run on construction', () => {
    const saved = newGame({ seed: 'SAVED-SEED' });
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(saved));

    const facade = TestBed.inject(GameFacade);

    expect(facade.state()).toEqual(saved);
  });

  it('falls back to a new run when saved data is invalid', () => {
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify({ id: 'bad' }));

    const facade = TestBed.inject(GameFacade);

    expect(facade.state().week).toBe(1);
    expect(facade.state().phase).toBe('COMMAND');
    expect(facade.state().pressures.dominion).toBe(12);
  });

  it('queues and removes an order through the engine', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });

    const queued = facade.queueOrder('gather_intel', 'op_mara_voss');

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    expect(facade.state().queuedOrders.length).toBe(1);
    expect(facade.commandPointsRemaining()).toBe(1);
    expect(facade.queuedOrders()[0].assignedOperativeName).toBe('Mara Voss');

    const removed = facade.removeQueuedOrder(queued.order.id);

    if (!removed.ok) {
      fail(`Expected removed order, got ${removed.error}`);
      return;
    }

    expect(facade.state().queuedOrders).toEqual([]);
    expect(facade.commandPointsRemaining()).toBe(2);
  });

  it('advances to event choice and persists the new state', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });
    facade.queueOrder('gather_intel', 'op_mara_voss');

    const advanced = facade.advanceWeek();

    if (!advanced.ok) {
      fail(`Expected advanced week, got ${advanced.error}`);
      return;
    }

    expect(facade.state().phase).toBe('EVENT_CHOICE');
    expect(facade.state().pendingEvent).toBeDefined();
    expect(facade.pendingEventDefinition()?.id).toBe(facade.state().pendingEvent?.definitionId);
    expect(JSON.parse(localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null')).toEqual(
      facade.state(),
    );
  });

  it('resolves an event choice and returns to command phase or game over', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });
    facade.queueOrder('gather_intel', 'op_mara_voss');
    const advanced = facade.advanceWeek();

    if (!advanced.ok) {
      fail(`Expected advanced week, got ${advanced.error}`);
      return;
    }

    const pendingEvent = facade.state().pendingEvent;
    const definition = pendingEvent ? getEventDefinition(pendingEvent.definitionId) : undefined;
    const availableChoice = definition?.choices.find(
      (choice) =>
        pendingEvent &&
        facade.getEventChoiceAvailability(pendingEvent.id, choice.id).available,
    );

    if (!pendingEvent || !availableChoice) {
      fail('Expected pending event with an available choice');
      return;
    }

    const resolved = facade.resolveEventChoice(pendingEvent.id, availableChoice.id);

    if (!resolved.ok) {
      fail(`Expected resolved event choice, got ${resolved.error}`);
      return;
    }

    expect(['COMMAND', 'GAME_OVER']).toContain(facade.state().phase);
    expect(facade.state().pendingEvent).toBeUndefined();
  });

  it('loads the current run on demand', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'FIRST' });
    const saved = newGame({ seed: 'SECOND' });
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(saved));

    expect(facade.loadCurrentRun()).toBeTrue();
    expect(facade.state()).toEqual(saved);
  });

  it('resets the current run and clears stale state', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'FIRST' });
    facade.queueOrder('gather_intel', 'op_mara_voss');

    const reset = facade.resetCurrentRun({ seed: 'SECOND' });

    expect(facade.state()).toEqual(reset);
    expect(facade.state().seed).toBe('SECOND');
    expect(facade.state().queuedOrders).toEqual([]);
    expect(JSON.parse(localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null')).toEqual(reset);
  });
});

