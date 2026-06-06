import { DISTRICT_ZERO_ACTIONS, DISTRICT_ZERO_WIN_LOSS_THRESHOLDS } from '../content';
import type {
  ActionId,
  EventChoiceDefinition,
  GameState,
  PressureDelta,
  Pressures,
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
      dominion: 0.9,
      heat: -0.05,
      loyalty: 0.1,
      resources: 0.0035,
      intel: 0.8,
      ruin: -0.05,
    }),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, {
      dominion: 0.9,
      heat: -0.05,
      loyalty: 0.1,
      resources: 0.0035,
      intel: 0.8,
      ruin: -0.05,
    }, false),
};

export const OPERATOR_BOT: StrategyAgent = {
  id: 'operator',
  label: 'OperatorBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoring(options, context, (option) =>
      scoreOperatorPressureMove(state.pressures, getOrderNetDelta(option), option.preview.riskChance),
    ),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoring(options, context, (option) =>
      scoreOperatorPressureMove(state.pressures, mergeChoiceDelta(option.choice), 0),
    ),
};

export const STRATEGY_AGENTS = [
  RANDOM_BOT,
  AGGRESSIVE_BOT,
  CAUTIOUS_BOT,
  GREEDY_BOT,
  OPERATOR_BOT,
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
    const pressureBias =
      state.pressures.resources < 2200 && option.actionId === 'run_small_job' ? 18 : 0;

    return pressureScore + riskPenalty + costPenalty + pressureBias;
  });
}

function chooseHighestScoringChoice(
  state: GameState,
  options: readonly LegalEventChoiceOption[],
  context: AgentDecisionContext,
  weights: PressureWeights,
  includeSurvivalBias = true,
): LegalEventChoiceOption | undefined {
  return chooseHighestScoring(options, context, (option) => {
    const delta = mergeChoiceDelta(option.choice);
    const pressureScore = scoreDelta(delta, weights);
    const survivalBias = includeSurvivalBias ? getSurvivalBias(state, delta) : 0;

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

function getOrderNetDelta(option: LegalOrderOption): PressureDelta {
  return {
    ...option.preview.adjustedEffects,
    resources: (option.preview.adjustedEffects.resources ?? 0) - option.preview.adjustedResourceCost,
  };
}

function scoreOperatorPressureMove(
  pressures: Pressures,
  delta: PressureDelta,
  riskChance: number,
): number {
  const next = applyDeltaForScoring(pressures, delta);

  if (isLosingProjection(next)) {
    return -10_000 + scoreDelta(delta, operatorWeights(pressures));
  }

  const currentWorstMargin = getWorstNormalizedSurvivalMargin(pressures);
  const nextWorstMargin = getWorstNormalizedSurvivalMargin(next);
  const stabilityGain = (nextWorstMargin - currentWorstMargin) * 45;
  const stableEnough = currentWorstMargin >= 0.25;
  const weights = operatorWeights(pressures);
  const dominionFinishBias =
    next.dominion >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory ? 100 : 0;
  const dominanceBias = stableEnough ? (delta.dominion ?? 0) * 3.5 : (delta.dominion ?? 0) * 1.4;
  const riskPenalty = riskChance * (stableEnough ? -0.12 : -0.3);
  const ruinBrake = next.ruin >= 25 ? (next.ruin - 24) * -2.5 : 0;

  return (
    scoreDelta(delta, weights) +
    stabilityGain +
    dominanceBias +
    dominionFinishBias +
    riskPenalty +
    ruinBrake
  );
}

function operatorWeights(pressures: Pressures): PressureWeights {
  const heatDanger = highBandDanger(pressures.heat, 60, DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss);
  const loyaltyDanger = lowBandDanger(pressures.loyalty, 45);
  const resourceDanger = lowBandDanger(pressures.resources, 1800);

  return {
    dominion: Math.max(1.4, 4.7 - (heatDanger + loyaltyDanger + resourceDanger) * 1.7),
    heat: -0.45 - heatDanger * 6,
    loyalty: 0.35 + loyaltyDanger * 7,
    resources: 0.0002 + resourceDanger * 0.008,
    intel: 0.35,
    ruin: pressures.ruin >= 20 ? -5 : -1.6,
  };
}

function highBandDanger(value: number, warningValue: number, failValue: number): number {
  return Math.max(0, Math.min(1, (value - warningValue) / (failValue - warningValue)));
}

function lowBandDanger(value: number, warningValue: number): number {
  return Math.max(0, Math.min(1, (warningValue - value) / warningValue));
}

function getWorstNormalizedSurvivalMargin(pressures: Pressures): number {
  const heatMargin =
    (DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss - pressures.heat) /
    DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss;
  const loyaltyMargin =
    (pressures.loyalty - DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss) / 60;
  const resourceMargin =
    (pressures.resources - DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss) / 5000;

  return Math.min(heatMargin, loyaltyMargin, resourceMargin);
}

function applyDeltaForScoring(pressures: Pressures, delta: PressureDelta): Pressures {
  return {
    dominion: pressures.dominion + (delta.dominion ?? 0),
    heat: pressures.heat + (delta.heat ?? 0),
    loyalty: pressures.loyalty + (delta.loyalty ?? 0),
    resources: pressures.resources + (delta.resources ?? 0),
    intel: pressures.intel + (delta.intel ?? 0),
    ruin: pressures.ruin + (delta.ruin ?? 0),
  };
}

function isLosingProjection(pressures: Pressures): boolean {
  return (
    pressures.heat >= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss ||
    pressures.loyalty <= DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss ||
    pressures.resources < DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss
  );
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
