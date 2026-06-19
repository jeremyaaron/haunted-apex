import type { GameState } from '../model';
import type { HandlerRecommendation } from './advisor-types';
import { recommendHandlerEvent } from './handler-event-policy';
import { recommendHandlerCommand } from './handler-policy';
import type { LegalEventChoiceOption, LegalOrderOption } from './legal-options';

export type SelectHandlerRecommendationOptions = {
  legalOrderOptions?: readonly LegalOrderOption[];
  legalEventChoiceOptions?: readonly LegalEventChoiceOption[];
};

export function selectHandlerRecommendation(
  state: GameState,
  options: SelectHandlerRecommendationOptions | readonly LegalOrderOption[] = {},
): HandlerRecommendation {
  const normalizedOptions = (
    Array.isArray(options) ? { legalOrderOptions: options as readonly LegalOrderOption[] } : options
  ) as SelectHandlerRecommendationOptions;

  if (state.phase === 'EVENT_CHOICE') {
    return recommendHandlerEvent({
      state,
      ...(normalizedOptions.legalEventChoiceOptions
        ? { legalOptions: normalizedOptions.legalEventChoiceOptions }
        : {}),
    });
  }

  return recommendHandlerCommand({
    state,
    ...(normalizedOptions.legalOrderOptions
      ? { legalOptions: normalizedOptions.legalOrderOptions }
      : {}),
  });
}
