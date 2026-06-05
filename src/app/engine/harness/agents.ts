import { DISTRICT_ZERO_ACTIONS } from '../content';
import type {
  ActionId,
  EventChoiceDefinition,
  GameState,
  PressureDelta,
  QueuedOrder,
} from '../model';
import type { ActionPreview, QueueOrderRequest } from '../selectors';

export type LegalOrderOption = QueueOrderRequest & {
  preview: ActionPreview;
};

export type LegalEventChoiceOption = {
  eventId: string;
  choice: EventChoiceDefinition;
};

export type AgentDecisionContext = {
  nextInt: (minInclusive: number, maxInclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export type StrategyAgent = {
  id: string;
  label: string;
  chooseOrder: (
    state: GameState,
    options: readonly LegalOrderOption[],
    context: AgentDecisionContext,
  ) => LegalOrderOption | undefined;
  chooseEventChoice: (
    state: GameState,
    options: readonly LegalEventChoiceOption[],
    context: AgentDecisionContext,
  ) => LegalEventChoiceOption | undefined;
};

type PressureWeights = Partial<Record<keyof PressureDelta, number>>;

const ACTION_ORDER = DISTRICT_ZERO_ACTIONS.map((action) => action.id);

export const RANDOM_BOT: StrategyAgent = {
  id: 'random',
  label: 'RandomBot',
  chooseOrder: (_state, options, context) => (options.length > 0 ? context.pick(options) : undefined),
  chooseEventChoice: (_state, options, context) =>
    options.length > 0 ? context.pick(options) : undefined,
};

export const AGGRESSIVE_BOT: StrategyAgent = {
  id: 'aggressive',
  label: 'AggressiveBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(state, options, context, {
      dominion: 4,
      heat: -0.45,
      loyalty: 0.4,
      resources: 0.00045,
      intel: 0.45,
      ruin: -0.35,
    }),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, {
      dominion: 4,
      heat: -0.45,
      loyalty: 0.5,
      resources: 0.00045,
      intel: 0.4,
      ruin: -0.35,
    }),
};

export const CAUTIOUS_BOT: StrategyAgent = {
  id: 'cautious',
  label: 'CautiousBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(state, options, context, cautiousWeights(state), {
      risk: -0.85,
      resourceCost: -0.0014,
    }),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, cautiousWeights(state)),
};

export const GREEDY_BOT: StrategyAgent = {
  id: 'greedy',
  label: 'GreedyBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(state, options, context, {
      dominion: 1,
      heat: -0.5,
      loyalty: 0.25,
      resources: 0.004,
      intel: 0.9,
      ruin: -0.25,
    }),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, {
      dominion: 1,
      heat: -0.5,
      loyalty: 0.25,
      resources: 0.004,
      intel: 0.9,
      ruin: -0.25,
    }),
};

export const STRATEGY_AGENTS = [
  RANDOM_BOT,
  AGGRESSIVE_BOT,
  CAUTIOUS_BOT,
  GREEDY_BOT,
] as const;

export function getQueuedActionUsage(queuedOrders: readonly QueuedOrder[]): Record<ActionId, number> {
  return queuedOrders.reduce(
    (usage, order) => ({
      ...usage,
      [order.actionId]: usage[order.actionId] + 1,
    }),
    createEmptyActionUsage(),
  );
}

export function createEmptyActionUsage(): Record<ActionId, number> {
  return ACTION_ORDER.reduce(
    (usage, actionId) => ({
      ...usage,
      [actionId]: 0,
    }),
    {} as Record<ActionId, number>,
  );
}

function chooseHighestScoringOrder(
  state: GameState,
  options: readonly LegalOrderOption[],
  context: AgentDecisionContext,
  weights: PressureWeights,
  penalties: { risk?: number; resourceCost?: number } = {},
): LegalOrderOption | undefined {
  return chooseHighestScoring(options, context, (option) => {
    const pressureScore = scoreDelta(option.preview.adjustedEffects, weights);
    const riskPenalty = option.preview.riskChance * (penalties.risk ?? -0.25);
    const costPenalty = option.preview.adjustedResourceCost * (penalties.resourceCost ?? -0.0007);
    const pressureBias = state.pressures.resources < 1200 && option.actionId === 'run_small_job' ? 8 : 0;

    return pressureScore + riskPenalty + costPenalty + pressureBias;
  });
}

function chooseHighestScoringChoice(
  state: GameState,
  options: readonly LegalEventChoiceOption[],
  context: AgentDecisionContext,
  weights: PressureWeights,
): LegalEventChoiceOption | undefined {
  return chooseHighestScoring(options, context, (option) => {
    const delta = mergeChoiceDelta(option.choice);
    const pressureScore = scoreDelta(delta, weights);
    const survivalBias = getSurvivalBias(state, delta);

    return pressureScore + survivalBias;
  });
}

function chooseHighestScoring<T>(
  options: readonly T[],
  context: AgentDecisionContext,
  score: (option: T) => number,
): T | undefined {
  if (options.length === 0) {
    return undefined;
  }

  let bestScore = Number.NEGATIVE_INFINITY;
  const bestOptions: T[] = [];

  for (const option of options) {
    const optionScore = score(option);

    if (optionScore > bestScore) {
      bestScore = optionScore;
      bestOptions.length = 0;
      bestOptions.push(option);
    } else if (optionScore === bestScore) {
      bestOptions.push(option);
    }
  }

  return context.pick(bestOptions);
}

function cautiousWeights(state: GameState): PressureWeights {
  return {
    dominion: state.pressures.heat >= 65 ? 0.4 : 1.25,
    heat: state.pressures.heat >= 65 ? -5.5 : -3.2,
    loyalty: state.pressures.loyalty <= 40 ? 4.5 : 2.4,
    resources: state.pressures.resources <= 1600 ? 0.0025 : 0.0006,
    intel: 0.55,
    ruin: state.pressures.ruin >= 20 ? -5 : -2.4,
  };
}

function scoreDelta(delta: PressureDelta, weights: PressureWeights): number {
  return Object.entries(delta).reduce((score, [pressure, value]) => {
    const weight = weights[pressure as keyof PressureDelta] ?? 0;
    return score + value * weight;
  }, 0);
}

function mergeChoiceDelta(choice: EventChoiceDefinition): PressureDelta {
  const delta: PressureDelta = { ...choice.effects };

  if (!choice.cost) {
    return delta;
  }

  if ('type' in choice.cost) {
    delta.intel = (delta.intel ?? 0) - choice.cost.amount;
    return delta;
  }

  for (const [pressure, value] of Object.entries(choice.cost)) {
    delta[pressure as keyof PressureDelta] = (delta[pressure as keyof PressureDelta] ?? 0) - value;
  }

  return delta;
}

function getSurvivalBias(state: GameState, delta: PressureDelta): number {
  let bias = 0;
  const nextHeat = state.pressures.heat + (delta.heat ?? 0);
  const nextLoyalty = state.pressures.loyalty + (delta.loyalty ?? 0);
  const nextResources = state.pressures.resources + (delta.resources ?? 0);

  if (nextHeat >= 90) {
    bias -= 30;
  }

  if (nextLoyalty <= 15) {
    bias -= 30;
  }

  if (nextResources < 0) {
    bias -= 50;
  }

  return bias;
}
