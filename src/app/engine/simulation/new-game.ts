import { assembleNewRun } from '../campaign';
import type { GameState, NewGameConfig } from '../model';

export function newGame(config: NewGameConfig = {}): GameState {
  return assembleNewRun(config);
}
