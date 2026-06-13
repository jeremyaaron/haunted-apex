import { TestBed } from '@angular/core/testing';
import { getEventDefinition, newGame } from '../engine';
import {
  CURRENT_GAME_VERSION,
  CURRENT_RUN_STORAGE_KEY,
  CURRENT_SAVE_SCHEMA_VERSION,
  LEGACY_V03_STORAGE_KEY,
  type StoredRunEnvelope,
} from './game-storage.service';
import { GameFacade, SAVE_COMPATIBILITY_NOTICE } from './game.facade';

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
    expect(readStoredState()).toEqual(state);
  });

  it('loads a valid current run on construction', () => {
    const saved = newGame({ seed: 'SAVED-SEED' });
    storeEnvelope(saved);

    const facade = TestBed.inject(GameFacade);

    expect(facade.state()).toEqual(saved);
  });

  it('falls back to a new run when saved data is invalid', () => {
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify({ id: 'bad' }));

    const facade = TestBed.inject(GameFacade);

    expect(facade.state().week).toBe(1);
    expect(facade.state().phase).toBe('COMMAND');
    expect(facade.state().pressures.dominion).toBe(12);
    expect(facade.compatibilityNotice()).toBe(SAVE_COMPATIBILITY_NOTICE);
    expect(readStoredState()).toEqual(facade.state());
  });

  it('removes a legacy save, starts fresh, and exposes a compatibility notice', () => {
    localStorage.setItem(LEGACY_V03_STORAGE_KEY, JSON.stringify(newGame({ seed: 'LEGACY' })));

    const facade = TestBed.inject(GameFacade);

    expect(localStorage.getItem(LEGACY_V03_STORAGE_KEY)).toBeNull();
    expect(facade.state().week).toBe(1);
    expect(facade.compatibilityNotice()).toBe(SAVE_COMPATIBILITY_NOTICE);
    expect(readStoredState()).toEqual(facade.state());
  });

  it('dismisses the compatibility notice without changing game state', () => {
    localStorage.setItem(LEGACY_V03_STORAGE_KEY, '{}');
    const facade = TestBed.inject(GameFacade);
    const state = facade.state();

    facade.dismissCompatibilityNotice();

    expect(facade.compatibilityNotice()).toBeUndefined();
    expect(facade.state()).toBe(state);
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

  it('queues and persists a targeted order', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });

    const queued = facade.queueOrder('run_small_job', 'op_mara_voss', {
      type: 'venue',
      id: 'venue_zero_mercy',
    });

    if (!queued.ok) {
      fail(`Expected targeted order, got ${queued.error}`);
      return;
    }

    expect(facade.state().queuedOrders[0].target).toEqual({
      type: 'venue',
      id: 'venue_zero_mercy',
    });
    expect(facade.queuedOrders()[0].targetLabel).toBe('Zero Mercy');
    expect(readStoredState()).toEqual(facade.state());
  });

  it('exposes legal targets, target previews, districts, and rivals', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });
    const target = {
      type: 'venue' as const,
      id: 'venue_glass_saint' as const,
    };

    expect(
      facade
        .getTargetOptions('run_small_job')
        .some((option) => option.target.type === 'venue' && option.target.id === target.id),
    ).toBeTrue();
    expect(facade.getActionPreview('run_small_job', 'op_mara_voss', target)?.targetLabel).toBe(
      'The Glass Saint',
    );
    expect(facade.districts().map((district) => district.name)).toEqual([
      'Violet Ward',
      'Chrome Narrows',
      'Ghostline Market',
    ]);
    expect(facade.rivals().map((rival) => rival.name)).toEqual(['Nyx Ardent', 'Knox Marrow']);
    expect(facade.factions().factions.map((faction) => faction.name)).toContain('Ashline Bureau');
    expect(facade.factions().activeCount).toBe(4);
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
    expect(readStoredState()).toEqual(facade.state());
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
        pendingEvent && facade.getEventChoiceAvailability(pendingEvent.id, choice.id).available,
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
    storeEnvelope(saved);

    expect(facade.loadCurrentRun()).toBeTrue();
    expect(facade.state()).toEqual(saved);
  });

  it('resets the current run and clears stale state', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'FIRST' });
    facade.queueOrder('run_small_job', 'op_mara_voss', {
      type: 'venue',
      id: 'venue_zero_mercy',
    });

    const reset = facade.resetCurrentRun({ seed: 'SECOND' });

    expect(facade.state()).toEqual(reset);
    expect(facade.state().seed).toBe('SECOND');
    expect(facade.state().queuedOrders).toEqual([]);
    expect(facade.state().recentActivity).toEqual([]);
    expect(facade.districts().every((district) => district.heat === district.baseHeat)).toBeTrue();
    expect(facade.rivals().every((rival) => rival.pressure === 0)).toBeTrue();
    expect(readStoredState()).toEqual(reset);
  });

  it('exposes roster, hire-pool, detail, and assignment views', () => {
    const facade = TestBed.inject(GameFacade);
    facade.startNewGame({ seed: 'VIOLET-ASH-1047' });

    expect(facade.roster().length).toBe(3);
    expect(facade.roster()[0].signatureTrait.name.length).toBeGreaterThan(0);
    expect(facade.hirePool().length).toBe(4);
    expect(facade.hirePool()[0].recruitCost).toBe(1600);
    expect(facade.getAssignmentOptions('gather_intel').length).toBe(3);

    const activeId = facade.roster()[0].id;
    facade.selectOperative(activeId);
    expect(facade.selectedOperativeDetail()?.id).toBe(activeId);
    expect(facade.selectedOperativeDetail()?.candidate).toBeFalse();

    const candidateId = facade.hirePool()[0].id;
    facade.selectOperative(candidateId);
    expect(facade.selectedOperativeDetail()?.id).toBe(candidateId);
    expect(facade.selectedOperativeDetail()?.candidate).toBeTrue();

    facade.selectOperative(undefined);
    expect(facade.selectedOperativeDetail()).toBeUndefined();
  });
});

function storeEnvelope(state: ReturnType<typeof newGame>): void {
  const envelope: StoredRunEnvelope = {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    gameVersion: CURRENT_GAME_VERSION,
    savedAt: '2026-06-07T00:00:00.000Z',
    state,
  };
  localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(envelope));
}

function readStoredState() {
  const envelope = JSON.parse(
    localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null',
  ) as StoredRunEnvelope;
  return envelope.state;
}
