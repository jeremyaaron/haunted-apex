import {
  DISTRICT_ZERO_ACTIONS,
  DISTRICT_ZERO_WIN_LOSS_THRESHOLDS,
  getOperativeDefinition,
} from '../content';
import type {
  ActionId,
  ActionTarget,
  EventChoiceDefinition,
  GameState,
  OperativeId,
  OperativeRoleTag,
  PressureDelta,
  Pressures,
  QueuedOrder,
  StressTier,
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
  chooseOrder: (_state, options, context) =>
    options.length > 0 ? context.pick(options) : undefined,
  chooseEventChoice: (_state, options, context) =>
    options.length > 0 ? context.pick(options) : undefined,
};

export const AGGRESSIVE_BOT: StrategyAgent = {
  id: 'aggressive',
  label: 'AggressiveBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(
      state,
      options,
      context,
      aggressiveWeights(state),
      {},
      scoreAggressiveTarget,
    ),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, aggressiveWeights(state)),
};

export const CAUTIOUS_BOT: StrategyAgent = {
  id: 'cautious',
  label: 'CautiousBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(
      state,
      options,
      context,
      cautiousWeights(state),
      {
        risk: -0.85,
        resourceCost: -0.0014,
      },
      (option) => scoreCautiousTarget(state, option) + scoreCautiousRoster(state, option),
    ),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, cautiousWeights(state)),
};

export const GREEDY_BOT: StrategyAgent = {
  id: 'greedy',
  label: 'GreedyBot',
  chooseOrder: (state, options, context) =>
    chooseHighestScoringOrder(
      state,
      options,
      context,
      greedyWeights(state),
      {},
      (option) => scoreGreedyTarget(state, option) + scoreGreedyRoster(state, option),
    ),
  chooseEventChoice: (state, options, context) =>
    chooseHighestScoringChoice(state, options, context, greedyWeights(state)),
};

export const OPERATOR_BOT: StrategyAgent = {
  id: 'operator',
  label: 'Operator / Sane',
  chooseOrder: (state, options, context) =>
    chooseHighestScoring(
      options,
      context,
      (option) =>
        scoreOperatorPressureMove(
          state.pressures,
          getOrderNetDelta(option),
          option.preview.riskChance,
        ) +
        scoreOperatorTarget(state, option) +
        scoreOperatorRoster(state, option),
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

export function getQueuedActionUsage(
  queuedOrders: readonly QueuedOrder[],
): Record<ActionId, number> {
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
  scoreTarget: (option: LegalOrderOption) => number = () => 0,
): LegalOrderOption | undefined {
  return chooseHighestScoring(options, context, (option) => {
    const pressureScore = scoreDelta(option.preview.adjustedEffects, weights);
    const riskPenalty = option.preview.riskChance * (penalties.risk ?? -0.25);
    const costPenalty = option.preview.adjustedResourceCost * (penalties.resourceCost ?? -0.0007);
    const pressureBias =
      state.pressures.resources < 2200 && option.actionId === 'run_small_job' ? 18 : 0;

    return (
      pressureScore +
      riskPenalty +
      costPenalty +
      pressureBias +
      scoreVisibleModifiers(option, weights) +
      scoreBasicOperativeFit(option) +
      scoreTarget(option)
    );
  });
}

function scoreAggressiveTarget(option: LegalOrderOption): number {
  return (
    (option.preview.localImpact?.controlGain ?? 0) * 1.5 +
    (option.preview.rivalAttention ? 2 : 0) +
    scoreAggressiveRoster(option)
  );
}

function scoreCautiousTarget(state: GameState, option: LegalOrderOption): number {
  const target = option.preview.selectedTarget;
  const districtId = option.preview.localImpact?.districtId;
  const localHeat = districtId ? state.districts[districtId].heat : 0;
  const paleCircuitBias = target?.type === 'venue' && target.id === 'venue_pale_circuit' ? 18 : 0;
  const uncontrolledBias = target && !option.preview.rivalAttention ? 8 : 0;
  const rivalPenalty = option.preview.rivalAttention ? -18 : 0;
  const resourceRecoveryBias =
    option.actionId === 'run_small_job'
      ? state.pressures.resources <= 1200
        ? 120
        : state.pressures.resources <= 2400
          ? 35
          : 0
      : 0;
  const unaffordableUpkeepPenalty =
    state.pressures.resources <= 1600 && option.preview.adjustedResourceCost > 0 ? -60 : 0;

  return (
    paleCircuitBias +
    uncontrolledBias +
    rivalPenalty +
    resourceRecoveryBias +
    unaffordableUpkeepPenalty -
    localHeat * 0.35
  );
}

function scoreCautiousRoster(state: GameState, option: LegalOrderOption): number {
  if (option.actionId === 'recruit_operative') {
    const candidateScore = scoreCandidate(
      state,
      option,
      {
        heat_control: 34,
        stability: 24,
        social: 7,
        intel: 5,
      },
      {
        missingRoleMultiplier: 1.4,
        stressRelief: getHighStressShare(state) * 42,
        reserveFloor: 2100,
      },
    );

    const lacksHeatControl = getRoleCount(state, 'heat_control') === 0;
    const highStressRoster = getHighStressShare(state) >= 0.5;

    return candidateScore + (lacksHeatControl || highStressRoster ? 38 : -12);
  }

  const selected = option.preview.selectedOperative;

  if (!selected) {
    return option.actionId === 'lay_low' && state.pressures.heat >= 65 ? 14 : 0;
  }

  const tierPenalty = stressTierValue(selected.projectedStressTier, {
    stable: 8,
    strained: 1,
    unstable: -26,
    breaking: -80,
  });
  const heatRoleBias = hasRole(selected.operativeId, 'heat_control') ? 12 : 0;
  const stabilityBias = hasRole(selected.operativeId, 'stability') ? 8 : 0;
  const layLowStressBias =
    option.actionId === 'lay_low' ? selected.stress * 1.2 + stressReductionValue(selected) * 2 : 0;

  return tierPenalty + heatRoleBias + stabilityBias + layLowStressBias;
}

function scoreGreedyTarget(state: GameState, option: LegalOrderOption): number {
  const target = option.preview.selectedTarget;
  const favoredVenueBias =
    target?.type === 'venue' &&
    (target.id === 'venue_zero_mercy' || target.id === 'venue_black_halo_exchange')
      ? 12
      : 0;
  const economicYield =
    (option.preview.adjustedEffects.resources ?? 0) * 0.0015 +
    (option.preview.adjustedEffects.intel ?? 0) * 0.8;
  const nextHeat = state.pressures.heat + (option.preview.adjustedEffects.heat ?? 0);
  const heatLossPenalty = nextHeat >= 100 ? -10_000 : 0;
  const dangerPenalty = nextHeat >= 85 ? (nextHeat - 84) * -10 : 0;
  const recoveryBias =
    state.pressures.heat >= 72 && (option.preview.adjustedEffects.heat ?? 0) < 0
      ? Math.abs(option.preview.adjustedEffects.heat ?? 0) * 5
      : 0;
  const conversionBias =
    option.actionId === 'expand_influence' &&
    (state.pressures.resources >= 3000 || state.pressures.intel >= 35)
      ? 22
      : 0;
  const nextResources =
    state.pressures.resources +
    (option.preview.adjustedEffects.resources ?? 0) -
    option.preview.adjustedResourceCost;
  const reservePenalty = nextResources < 800 ? (800 - nextResources) * -0.08 : 0;
  const cashRecoveryBias =
    option.actionId === 'run_small_job' && state.pressures.resources < 1800 ? 60 : 0;

  return (
    favoredVenueBias +
    economicYield +
    heatLossPenalty +
    dangerPenalty +
    recoveryBias +
    conversionBias +
    reservePenalty +
    cashRecoveryBias
  );
}

function scoreGreedyRoster(state: GameState, option: LegalOrderOption): number {
  if (option.actionId === 'recruit_operative') {
    return scoreCandidate(
      state,
      option,
      {
        money: 42,
        intel: 18,
        tech: 14,
        violence: 9,
      },
      {
        missingRoleMultiplier: 0.9,
        reserveFloor: 2600,
      },
    );
  }

  const selected = option.preview.selectedOperative;
  const roleBias = selected
    ? scoreRoles(getRoleTags(selected.operativeId), {
        money: 14,
        intel: 10,
        tech: 8,
        violence: option.actionId === 'run_small_job' ? 8 : 0,
      })
    : 0;
  const stressPenalty = selected ? stressAssignmentPenalty(selected.projectedStressTier) * 0.45 : 0;

  return roleBias + stressPenalty;
}

function scoreAggressiveRoster(option: LegalOrderOption): number {
  if (option.actionId === 'recruit_operative') {
    return scoreCandidateRoles(option, {
      violence: 36,
      money: 22,
      rival_pressure: 12,
      social: 7,
    });
  }

  const selected = option.preview.selectedOperative;
  const victoryMove =
    (option.preview.adjustedEffects.dominion ?? 0) >= 8 || option.actionId === 'expand_influence';
  const projectedBreakingPenalty =
    selected?.projectedStressTier === 'breaking' && !victoryMove ? -24 : 0;
  const roleBias = selected
    ? scoreRoles(getRoleTags(selected.operativeId), {
        violence: 16,
        money: 10,
        rival_pressure: 6,
        social: 5,
      })
    : 0;

  return roleBias + projectedBreakingPenalty;
}

function scoreOperatorTarget(state: GameState, option: LegalOrderOption): number {
  const rivalAttention = option.preview.rivalAttention;
  const winsImmediately =
    state.pressures.dominion + (option.preview.adjustedEffects.dominion ?? 0) >=
    DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory;
  const highPressurePenalty =
    rivalAttention && rivalAttention.currentPressure >= 60 && !winsImmediately ? -120 : 0;
  const districtId = option.preview.localImpact?.districtId;
  const localHeat = districtId ? state.districts[districtId].heat : 0;
  const heatAwarePenalty = state.pressures.heat >= 65 ? localHeat * -0.35 : 0;
  const controlValue = (option.preview.localImpact?.controlGain ?? 0) * 0.6;

  return highPressurePenalty + heatAwarePenalty + controlValue;
}

function scoreOperatorRoster(state: GameState, option: LegalOrderOption): number {
  if (option.actionId === 'recruit_operative') {
    return scoreCandidate(state, option, operatorRoleValues(state), {
      missingRoleMultiplier: 1.7,
      stressRelief: getHighStressShare(state) * 46,
      reserveFloor: state.pressures.resources <= 2200 ? 2400 : 1700,
    });
  }

  const selected = option.preview.selectedOperative;

  if (!selected) {
    return 0;
  }

  const skillScore = selected.relevantSkillValue ? selected.relevantSkillValue * 0.55 : 0;
  const currentStressPenalty = selected.stress * -0.18;
  const projectedStressPenalty = stressAssignmentPenalty(selected.projectedStressTier);
  const roleScore = scoreRoles(getRoleTags(selected.operativeId), operatorRoleValues(state));
  const recoveryBias =
    option.actionId === 'lay_low'
      ? stressReductionValue(selected) * 3.5 + selected.stress * 0.5
      : 0;

  return skillScore + currentStressPenalty + projectedStressPenalty + roleScore + recoveryBias;
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

function aggressiveWeights(state: GameState): PressureWeights {
  const heatBrake = state.pressures.heat >= 85;

  return {
    dominion: 4,
    heat: heatBrake ? -3.5 : -0.45,
    loyalty: 0.5,
    resources: 0.00045,
    intel: 0.4,
    ruin: -0.35,
  };
}

function greedyWeights(state: GameState): PressureWeights {
  return {
    dominion: 1.3,
    heat: state.pressures.heat >= 72 ? -3.2 : -0.05,
    loyalty: 0.1,
    resources: state.pressures.resources < 1800 ? 0.007 : 0.0035,
    intel: 0.8,
    ruin: -0.05,
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
    resources:
      (option.preview.adjustedEffects.resources ?? 0) - option.preview.adjustedResourceCost,
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

function scoreVisibleModifiers(option: LegalOrderOption, weights: PressureWeights): number {
  const selected = option.preview.selectedOperative;

  if (!selected) {
    return 0;
  }

  return selected.appliedSources.reduce((score, source) => {
    const effectScore = source.effects ? scoreDelta(source.effects, weights) : 0;
    const riskScore = (source.riskModifier ?? 0) * -0.8;
    const stressScore = (source.stressModifier ?? 0) * -0.6;
    const costScore = (source.resourceCostModifier ?? 0) * -0.001;
    const territoryScore = (source.districtControlModifier ?? 0) * 0.8;
    const rivalScore = (source.rivalPressureModifier ?? 0) * -0.5;

    return score + effectScore + riskScore + stressScore + costScore + territoryScore + rivalScore;
  }, 0);
}

function scoreBasicOperativeFit(option: LegalOrderOption): number {
  const selected = option.preview.selectedOperative;

  if (!selected) {
    return 0;
  }

  const skillScore = selected.relevantSkillValue ? selected.relevantSkillValue * 0.12 : 0;
  const stressScore = stressAssignmentPenalty(selected.projectedStressTier) * 0.25;

  return skillScore + stressScore;
}

function scoreCandidate(
  state: GameState,
  option: LegalOrderOption,
  roleValues: Partial<Record<OperativeRoleTag, number>>,
  config: {
    missingRoleMultiplier: number;
    reserveFloor: number;
    stressRelief?: number;
  },
): number {
  if (option.actionId !== 'recruit_operative' || option.target?.type !== 'recruit') {
    return 0;
  }

  const next = applyDeltaForScoring(state.pressures, getOrderNetDelta(option));

  if (isLosingProjection(next)) {
    return -10_000;
  }

  const reservePenalty =
    next.resources < config.reserveFloor ? (config.reserveFloor - next.resources) * -0.035 : 0;
  const targetDefinition = getOperativeDefinition(option.target.id);
  const missingRoleScore = targetDefinition
    ? targetDefinition.roleTags.reduce((score, role) => {
        const base = roleValues[role] ?? 0;
        const missingMultiplier =
          getRoleCount(state, role) === 0 ? config.missingRoleMultiplier : 1;
        return score + base * missingMultiplier;
      }, 0)
    : 0;
  const candidateStressValue =
    option.preview.selectedOperative?.projectedStressTier === 'stable' ? 8 : 0;

  return missingRoleScore + (config.stressRelief ?? 0) + candidateStressValue + reservePenalty;
}

function scoreCandidateRoles(
  option: LegalOrderOption,
  roleValues: Partial<Record<OperativeRoleTag, number>>,
): number {
  if (option.actionId !== 'recruit_operative' || option.target?.type !== 'recruit') {
    return 0;
  }

  return scoreRoles(getRoleTags(option.target.id), roleValues);
}

function operatorRoleValues(state: GameState): Partial<Record<OperativeRoleTag, number>> {
  const heatDanger = highBandDanger(
    state.pressures.heat,
    60,
    DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss,
  );
  const loyaltyDanger = lowBandDanger(state.pressures.loyalty, 45);
  const resourceDanger = lowBandDanger(state.pressures.resources, 1800);
  const intelNeed = state.pressures.intel < 25 ? 1 : 0;
  const ruinDanger = state.pressures.ruin >= 18 ? 1 : 0;

  return {
    heat_control: 12 + heatDanger * 44,
    stability: 10 + Math.max(heatDanger, loyaltyDanger, ruinDanger) * 30,
    money: 8 + resourceDanger * 34,
    intel: 7 + intelNeed * 22,
    tech: 5 + intelNeed * 10,
    social: 8 + loyaltyDanger * 15,
    violence: state.pressures.dominion < 60 ? 10 : 4,
    rival_pressure: 4,
    ruin: ruinDanger ? 18 : 4,
    recruitment: getHighStressShare(state) >= 0.5 ? 16 : 5,
  };
}

function scoreRoles(
  roles: readonly OperativeRoleTag[],
  roleValues: Partial<Record<OperativeRoleTag, number>>,
): number {
  return roles.reduce((score, role) => score + (roleValues[role] ?? 0), 0);
}

function getRoleTags(operativeId: OperativeId): readonly OperativeRoleTag[] {
  return getOperativeDefinition(operativeId)?.roleTags ?? [];
}

function hasRole(operativeId: OperativeId, role: OperativeRoleTag): boolean {
  return getRoleTags(operativeId).includes(role);
}

function getRoleCount(state: GameState, role: OperativeRoleTag): number {
  return state.operatives.filter((operative) => hasRole(operative.id, role)).length;
}

function getHighStressShare(state: GameState): number {
  if (state.operatives.length === 0) {
    return 0;
  }

  return (
    state.operatives.filter((operative) => operative.stress >= 60).length / state.operatives.length
  );
}

function stressAssignmentPenalty(tier: StressTier): number {
  return stressTierValue(tier, {
    stable: 4,
    strained: -4,
    unstable: -22,
    breaking: -58,
  });
}

function stressReductionValue(selected: NonNullable<ActionPreview['selectedOperative']>): number {
  return Math.max(0, selected.stress - selected.projectedStress);
}

function stressTierValue(tier: StressTier, values: Record<StressTier, number>): number {
  return values[tier];
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
  const loyaltyMargin = (pressures.loyalty - DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss) / 60;
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
