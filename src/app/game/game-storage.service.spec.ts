import { TestBed } from '@angular/core/testing';
import { newGame } from '../engine';
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
});

