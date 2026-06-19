import type { GameState } from '../model';
import type { HandlerRecommendation } from './advisor-types';
import { recommendHandlerCommand } from './handler-policy';
import type { LegalOrderOption } from './legal-options';

export function selectHandlerRecommendation(
  state: GameState,
  legalOptions?: readonly LegalOrderOption[],
): HandlerRecommendation {
  return recommendHandlerCommand({
    state,
    ...(legalOptions ? { legalOptions } : {}),
  });
}
