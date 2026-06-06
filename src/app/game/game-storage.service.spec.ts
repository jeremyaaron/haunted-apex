import { TestBed } from '@angular/core/testing';
import { newGame, queueOrder } from '../engine';
import { CURRENT_RUN_STORAGE_KEY, GameStorageService } from './game-storage.service';

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

  it('round-trips the current run through localStorage', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });

    service.saveCurrentRun(state);

    expect(service.loadCurrentRun()).toEqual(state);
  });

  it('clears the current run', () => {
    service.saveCurrentRun(newGame({ seed: 'VIOLET-ASH-1047' }));

    service.clearCurrentRun();

    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
    expect(service.loadCurrentRun()).toBeUndefined();
  });

  it('returns undefined for invalid JSON', () => {
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, '{not json');

    expect(service.loadCurrentRun()).toBeUndefined();
  });

  it('returns undefined for stale or malformed save data', () => {
    localStorage.setItem(
      CURRENT_RUN_STORAGE_KEY,
      JSON.stringify({
        id: 'run_bad',
        seed: 'BAD',
      }),
    );

    expect(service.loadCurrentRun()).toBeUndefined();
  });

  it('round-trips complete v0.2 territory, rival, activity, and target state', () => {
    const baseState = newGame({ seed: 'VIOLET-ASH-1047' });
    const queued = queueOrder(baseState, {
      actionId: 'run_small_job',
      assignedOperativeId: 'op_mara_voss',
      target: {
        type: 'venue',
        id: 'venue_zero_mercy',
      },
    });

    if (!queued.ok) {
      fail(`Expected targeted order, got ${queued.error}`);
      return;
    }

    const state = {
      ...queued.state,
      recentActivity: [
        {
          id: 'activity_1_1',
          week: 1,
          actionId: 'gather_intel' as const,
          target: {
            type: 'district' as const,
            id: 'district_violet_ward' as const,
          },
          targetTags: ['nightlife'],
          rivalId: 'rival_nyx_ardent' as const,
          heatDelta: 2,
          dominionDelta: 1,
        },
      ],
    };

    service.saveCurrentRun(state);

    expect(service.loadCurrentRun()).toEqual(state);
  });

  it('rejects a v0.1-shaped save under the v0.2 key', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const { districts: _districts, rivals: _rivals, recentActivity: _activity, ...v01State } =
      state;

    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(v01State));

    expect(service.loadCurrentRun()).toBeUndefined();
  });

  it('rejects saves missing a district or rival overlay', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const missingDistrict = structuredClone(state);
    const missingRival = structuredClone(state);

    delete (missingDistrict.districts as Partial<typeof missingDistrict.districts>)
      .district_violet_ward;
    delete (missingRival.rivals as Partial<typeof missingRival.rivals>).rival_knox_marrow;

    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(missingDistrict));
    expect(service.loadCurrentRun()).toBeUndefined();

    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(missingRival));
    expect(service.loadCurrentRun()).toBeUndefined();
  });

  it('rejects queued orders with invalid or illegal targets', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const invalidTarget = {
      ...state,
      queuedOrders: [
        {
          id: 'order_1_1',
          actionId: 'run_small_job',
          assignedOperativeId: 'op_mara_voss',
          target: {
            type: 'venue',
            id: 'venue_missing',
          },
        },
      ],
    };
    const illegalTarget = {
      ...state,
      queuedOrders: [
        {
          id: 'order_1_1',
          actionId: 'run_small_job',
          assignedOperativeId: 'op_mara_voss',
          target: {
            type: 'rival',
            id: 'rival_knox_marrow',
          },
        },
      ],
    };

    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(invalidTarget));
    expect(service.loadCurrentRun()).toBeUndefined();

    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(illegalTarget));
    expect(service.loadCurrentRun()).toBeUndefined();
  });
});
