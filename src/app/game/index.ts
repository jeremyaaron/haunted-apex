export {
  CURRENT_GAME_VERSION,
  CURRENT_RUN_STORAGE_KEY,
  CURRENT_SAVE_SCHEMA_VERSION,
  LEGACY_V04_STORAGE_KEY,
  LEGACY_V03_STORAGE_KEY,
  LEGACY_V02_STORAGE_KEY,
  GameStorageService,
} from './game-storage.service';
export type {
  GameStorage,
  LoadCurrentRunResult,
  StoredRunEnvelope,
} from './game-storage.service';
export { GameFacade, SAVE_COMPATIBILITY_NOTICE } from './game.facade';
