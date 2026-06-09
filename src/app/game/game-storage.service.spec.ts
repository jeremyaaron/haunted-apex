import { TestBed } from '@angular/core/testing';
import { addLedgerEntry, newGame, queueOrder, type GameState } from '../engine';
import {
  CURRENT_GAME_VERSION,
  CURRENT_RUN_STORAGE_KEY,
  CURRENT_SAVE_SCHEMA_VERSION,
  LEGACY_V03_STORAGE_KEY,
  LEGACY_V02_STORAGE_KEY,
  GameStorageService,
  type StoredRunEnvelope,
} from './game-storage.service';

describe('GameStorageService', () => {
  let service: GameStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GameStorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips a complete v0.4 envelope through localStorage', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    service.saveCurrentRun(state);

    expect(service.loadCurrentRun()).toEqual({
      status: 'loaded',
      state,
    });
    const envelope = readEnvelope();
    expect(envelope.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(envelope.gameVersion).toBe(CURRENT_GAME_VERSION);
    expect(Number.isNaN(Date.parse(envelope.savedAt))).toBeFalse();
    expect(envelope.state).toEqual(state);
  });

  it('clears current and legacy run keys', () => {
    service.saveCurrentRun(newGame({ seed: 'VIOLET-ASH-1047' }));
    localStorage.setItem(LEGACY_V03_STORAGE_KEY, '{}');
    localStorage.setItem(LEGACY_V02_STORAGE_KEY, '{}');

    service.clearCurrentRun();

    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_V03_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_V02_STORAGE_KEY)).toBeNull();
    expect(service.loadCurrentRun()).toEqual({ status: 'empty' });
  });

  it('removes and reports invalid JSON', () => {
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, '{not json');

    expect(service.loadCurrentRun()).toEqual({ status: 'invalid' });
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
  });

  it('rejects and removes a mismatched envelope schema', () => {
    storeEnvelope(newGame(), { schemaVersion: 2 });

    expect(service.loadCurrentRun()).toEqual({
      status: 'incompatible',
      foundVersion: 2,
    });
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
  });

  it('removes the v0.3 key and reports it incompatible', () => {
    localStorage.setItem(
      LEGACY_V03_STORAGE_KEY,
      JSON.stringify(newGame({ seed: 'LEGACY' })),
    );

    expect(service.loadCurrentRun()).toEqual({
      status: 'incompatible',
      foundVersion: 3,
    });
    expect(localStorage.getItem(LEGACY_V03_STORAGE_KEY)).toBeNull();
  });

  it('removes the v0.2 key and reports it incompatible', () => {
    localStorage.setItem(
      LEGACY_V02_STORAGE_KEY,
      JSON.stringify(newGame({ seed: 'LEGACY' })),
    );

    expect(service.loadCurrentRun()).toEqual({
      status: 'incompatible',
      foundVersion: 2,
    });
    expect(localStorage.getItem(LEGACY_V02_STORAGE_KEY)).toBeNull();
  });

  it('rejects malformed envelope metadata and state', () => {
    localStorage.setItem(
      CURRENT_RUN_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        gameVersion: '0.2.0',
        savedAt: 'not-a-date',
        state: { id: 'bad' },
      }),
    );

    expect(service.loadCurrentRun()).toEqual({ status: 'invalid' });
  });

  it('rejects a state schema that disagrees with the envelope', () => {
    const state = structuredClone(newGame());
    (state as { schemaVersion: number }).schemaVersion = 2;

    expectLoadInvalid(state);
  });

  it('round-trips territory, rival, activity, target, and assignment state', () => {
    const baseState = newGame({ seed: 'VIOLET-ASH-1047' });
    const queued = queueOrder(baseState, {
      actionId: 'run_small_job',
      assignedOperativeId: baseState.operatives[0].id,
      target: {
        type: 'venue',
        id: 'venue_zero_mercy',
      },
    });

    if (!queued.ok) {
      fail(`Expected targeted order, got ${queued.error}`);
      return;
    }

    const state: GameState = {
      ...queued.state,
      operatives: queued.state.operatives.map((operative, index) =>
        index === 0
          ? {
              ...operative,
              weeksAssigned: 1,
              recentAssignments: [
                {
                  id: 'assignment_1_1',
                  week: 1,
                  actionId: 'gather_intel',
                  target: {
                    type: 'venue',
                    id: 'venue_glass_saint',
                  },
                  targetTags: ['nightlife', 'memory'],
                  complication: true,
                  stressDelta: 10,
                },
              ],
            }
          : operative,
      ),
      recentActivity: [
        {
          id: 'activity_1_1',
          week: 1,
          actionId: 'gather_intel',
          target: {
            type: 'district',
            id: 'district_violet_ward',
          },
          targetTags: ['nightlife'],
          rivalId: 'rival_nyx_ardent',
          heatDelta: 2,
          dominionDelta: 1,
        },
      ],
      seenSignatureEventIds: ['event_mara_ghost_debt'],
    };

    service.saveCurrentRun(state);

    expect(service.loadCurrentRun()).toEqual({
      status: 'loaded',
      state,
    });
  });

  it('round-trips Ledger entries with source, related context, and consumption metadata', () => {
    const withEntry = addLedgerEntry(newGame({ seed: 'LEDGER-STORAGE' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
      relatedTarget: {
        type: 'district',
        id: 'district_violet_ward',
      },
      relatedRivalId: 'rival_nyx_ardent',
    });
    const state: GameState = {
      ...withEntry,
      ledger: {
        ...withEntry.ledger,
        entries: withEntry.ledger.entries.map((entry) => ({
          ...entry,
          consumed: true,
          consumedWeek: withEntry.week,
          consumedBy: {
            type: 'action',
            actionId: 'work_the_ledger',
            useOptionId: 'pay_in_credits',
          },
        })),
        consumedCount: 1,
      },
    };

    service.saveCurrentRun(state);

    expect(service.loadCurrentRun()).toEqual({
      status: 'loaded',
      state,
    });
  });

  it('rejects invalid operative IDs and duplicate active IDs', () => {
    const invalidId = structuredClone(newGame());
    const duplicate = structuredClone(newGame());
    (invalidId.operatives[0] as { id: string }).id = 'op_missing';
    duplicate.operatives[1] = structuredClone(duplicate.operatives[0]);

    expectLoadInvalid(invalidId);
    expectLoadInvalid(duplicate);
  });

  it('rejects missing territory overlays and illegal queued targets', () => {
    const missingDistrict = structuredClone(newGame());
    const missingRival = structuredClone(newGame());
    const illegalTarget = structuredClone(newGame());
    delete (missingDistrict.districts as Partial<typeof missingDistrict.districts>)
      .district_violet_ward;
    delete (missingRival.rivals as Partial<typeof missingRival.rivals>).rival_knox_marrow;
    illegalTarget.queuedOrders = [
      {
        id: 'order_1_1',
        actionId: 'run_small_job',
        assignedOperativeId: illegalTarget.operatives[0].id,
        target: {
          type: 'rival',
          id: 'rival_knox_marrow',
        },
      },
    ];

    expectLoadInvalid(missingDistrict);
    expectLoadInvalid(missingRival);
    expectLoadInvalid(illegalTarget);
  });

  it('rejects roster bounds, hire-pool bounds, and active/hire overlap', () => {
    const noRoster = structuredClone(newGame());
    const oversizedPool = structuredClone(newGame());
    const overlap = structuredClone(newGame());
    noRoster.operatives = [];
    oversizedPool.hirePool = [
      ...oversizedPool.hirePool,
      'op_mara_voss',
    ];
    overlap.hirePool[0] = overlap.operatives[0].id;

    expectLoadInvalid(noRoster);
    expectLoadInvalid(oversizedPool);
    expectLoadInvalid(overlap);
  });

  it('rejects malformed assignment history and obsolete operative statuses', () => {
    const malformedHistory = structuredClone(newGame());
    const obsoleteStatus = structuredClone(newGame());
    malformedHistory.operatives[0].recentAssignments = [
      {
        id: 'assignment_1_1',
        week: 1,
        actionId: 'gather_intel',
        targetTags: [],
        complication: false,
        stressDelta: Number.NaN,
      },
    ];
    (obsoleteStatus.operatives[0] as { status: string }).status = 'compromised';

    expectLoadInvalid(malformedHistory);
    expectLoadInvalid(obsoleteStatus);
  });

  it('round-trips a queued recruit and rejects recruit targets outside the hire pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const queued = queueOrder(state, {
      actionId: 'recruit_operative',
      target: {
        type: 'recruit',
        id: state.hirePool[1],
      },
    });

    if (!queued.ok) {
      fail(`Expected recruit order, got ${queued.error}`);
      return;
    }

    service.saveCurrentRun(queued.state);
    expect(service.loadCurrentRun()).toEqual({
      status: 'loaded',
      state: queued.state,
    });

    const invalid = structuredClone(state);
    invalid.queuedOrders = [
      {
        id: 'order_1_1',
        actionId: 'recruit_operative',
        target: {
          type: 'recruit',
          id: state.operatives[0].id,
        },
      },
    ];
    expectLoadInvalid(invalid);
  });

  it('rejects invalid and duplicate seen signature event IDs', () => {
    const invalid = structuredClone(newGame());
    const duplicate = structuredClone(newGame());
    invalid.seenSignatureEventIds = ['corp_patrol_sweep'];
    duplicate.seenSignatureEventIds = [
      'event_mara_ghost_debt',
      'event_mara_ghost_debt',
    ];

    expectLoadInvalid(invalid);
    expectLoadInvalid(duplicate);
  });

  it('rejects malformed Ledger entries', () => {
    const missingLedger = structuredClone(newGame()) as Partial<GameState>;
    const unknownDefinition = structuredClone(newGame());
    const mismatchedKind = structuredClone(newGame());
    const malformedSource = structuredClone(newGame());
    const invalidRelatedTarget = structuredClone(newGame());
    const badConsumedCount = structuredClone(newGame());
    delete missingLedger.ledger;
    unknownDefinition.ledger.entries = [
      {
        id: 'ledger_missing',
        definitionId: 'secret_missing',
        kind: 'secret',
        createdWeek: 1,
        source: {
          type: 'action',
          actionId: 'gather_intel',
        },
        potency: 1,
        revealed: true,
        consumed: false,
      },
    ] as unknown as typeof unknownDefinition.ledger.entries;
    unknownDefinition.ledger.discoveredCount = 1;
    mismatchedKind.ledger.entries = [
      {
        id: 'ledger_bad_kind',
        definitionId: 'secret_patrol_schedule',
        kind: 'debt',
        createdWeek: 1,
        source: {
          type: 'action',
          actionId: 'gather_intel',
        },
        potency: 1,
        revealed: true,
        consumed: false,
      },
    ];
    mismatchedKind.ledger.discoveredCount = 1;
    malformedSource.ledger.entries = [
      {
        id: 'ledger_bad_source',
        definitionId: 'secret_patrol_schedule',
        kind: 'secret',
        createdWeek: 1,
        source: {
          type: 'event',
          eventId: 'missing_event',
          choiceId: 'choice',
        },
        potency: 1,
        revealed: true,
        consumed: false,
      },
    ] as unknown as typeof malformedSource.ledger.entries;
    malformedSource.ledger.discoveredCount = 1;
    invalidRelatedTarget.ledger.entries = [
      {
        id: 'ledger_bad_target',
        definitionId: 'secret_patrol_schedule',
        kind: 'secret',
        createdWeek: 1,
        source: {
          type: 'action',
          actionId: 'gather_intel',
        },
        potency: 1,
        revealed: true,
        consumed: false,
        relatedTarget: {
          type: 'venue',
          id: 'venue_missing',
        },
      },
    ] as unknown as typeof invalidRelatedTarget.ledger.entries;
    invalidRelatedTarget.ledger.discoveredCount = 1;
    badConsumedCount.ledger.entries = [
      {
        id: 'ledger_bad_count',
        definitionId: 'favor_hidden_route',
        kind: 'favor',
        createdWeek: 1,
        source: {
          type: 'event',
          eventId: 'blackmail_lead',
          choiceId: 'save_it_for_later',
        },
        potency: 1,
        revealed: true,
        consumed: true,
        consumedWeek: 1,
        consumedBy: {
          type: 'event',
          eventId: 'blackmail_lead',
          choiceId: 'save_it_for_later',
        },
      },
    ];
    badConsumedCount.ledger.discoveredCount = 1;
    badConsumedCount.ledger.consumedCount = 0;

    expectLoadInvalid(missingLedger as GameState);
    expectLoadInvalid(unknownDefinition);
    expectLoadInvalid(mismatchedKind);
    expectLoadInvalid(malformedSource);
    expectLoadInvalid(invalidRelatedTarget);
    expectLoadInvalid(badConsumedCount);
  });

  function expectLoadInvalid(state: GameState): void {
    storeEnvelope(state);
    expect(service.loadCurrentRun()).toEqual({ status: 'invalid' });
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
  }
});

function storeEnvelope(
  state: GameState,
  overrides: {
    schemaVersion?: number;
    gameVersion?: string;
    savedAt?: string;
    state?: GameState;
  } = {},
): void {
  localStorage.setItem(
    CURRENT_RUN_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      gameVersion: CURRENT_GAME_VERSION,
      savedAt: '2026-06-07T00:00:00.000Z',
      state,
      ...overrides,
    }),
  );
}

function readEnvelope(): StoredRunEnvelope {
  return JSON.parse(
    localStorage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null',
  ) as StoredRunEnvelope;
}
