import {
  getActionDefinition,
  getDistrictDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getTraitDefinition,
} from '../content';
import type {
  GameState,
  OperativeAffinity,
  OperativeId,
  OperativeRarity,
  OperativeRoleTag,
  OperativeStats,
  OperativeStatus,
  RecentAssignment,
  StressTier,
  TraitId,
  TraitKind,
} from '../model';
import { getStressTier } from '../roster';
import {
  getActionPreview,
  getOrderAvailability,
  type QueueOrderUnavailableReason,
} from './previews';

export type TraitView = {
  id: TraitId;
  name: string;
  kind: TraitKind;
  description: string;
};

export type OperativeRosterView = {
  id: OperativeId;
  name: string;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: readonly OperativeRoleTag[];
  loyalty: number;
  stress: number;
  stressTier: StressTier;
  status: OperativeStatus;
  signatureTrait: TraitView;
  liabilityTrait?: TraitView;
};

export type OperativeDetailView = OperativeRosterView & {
  candidate: boolean;
  dossier: string;
  quote?: string;
  baseStats: OperativeStats;
  affinities: string[];
  recentAssignments: RecentAssignment[];
};

export type HireCandidateView = {
  id: OperativeId;
  name: string;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: readonly OperativeRoleTag[];
  baseStats: OperativeStats;
  startingLoyalty: number;
  startingStress: number;
  stressTier: StressTier;
  signatureTrait: TraitView;
  liabilityTrait?: TraitView;
  recruitCost: number;
  recruitable: boolean;
  unavailableReason?: QueueOrderUnavailableReason;
};

export function selectRosterViews(state: GameState): OperativeRosterView[] {
  return state.operatives.flatMap((operative) => {
    const definition = getOperativeDefinition(operative.id);

    if (!definition) {
      return [];
    }

    return [
      {
        id: operative.id,
        name: definition.name,
        archetype: definition.archetype,
        rarity: definition.rarity,
        roleTags: definition.roleTags,
        loyalty: operative.loyalty,
        stress: operative.stress,
        stressTier: getStressTier(operative.stress),
        status: operative.status,
        signatureTrait: requireTraitView(definition.signatureTraitId),
        ...(definition.liabilityTraitId
          ? { liabilityTrait: requireTraitView(definition.liabilityTraitId) }
          : {}),
      },
    ];
  });
}

export function selectOperativeDetail(
  state: GameState,
  operativeId: OperativeId,
): OperativeDetailView | undefined {
  const definition = getOperativeDefinition(operativeId);

  if (!definition) {
    return undefined;
  }

  const operative = state.operatives.find((candidate) => candidate.id === operativeId);

  if (operative) {
    const rosterView = selectRosterViews(state).find((candidate) => candidate.id === operativeId);

    if (!rosterView) {
      return undefined;
    }

    return {
      ...rosterView,
      candidate: false,
      dossier: definition.flavor.dossier,
      ...(definition.flavor.quote ? { quote: definition.flavor.quote } : {}),
      baseStats: { ...definition.baseStats },
      affinities: definition.affinities.map(describeAffinity),
      recentAssignments: operative.recentAssignments.map((assignment) => ({
        ...assignment,
        ...(assignment.target ? { target: { ...assignment.target } } : {}),
        targetTags: [...assignment.targetTags],
      })),
    };
  }

  if (!state.hirePool.includes(operativeId)) {
    return undefined;
  }

  return {
    id: definition.id,
    name: definition.name,
    archetype: definition.archetype,
    rarity: definition.rarity,
    roleTags: definition.roleTags,
    loyalty: definition.startingLoyalty,
    stress: definition.startingStress,
    stressTier: getStressTier(definition.startingStress),
    status: 'available',
    signatureTrait: requireTraitView(definition.signatureTraitId),
    ...(definition.liabilityTraitId
      ? { liabilityTrait: requireTraitView(definition.liabilityTraitId) }
      : {}),
    candidate: true,
    dossier: definition.flavor.dossier,
    ...(definition.flavor.quote ? { quote: definition.flavor.quote } : {}),
    baseStats: { ...definition.baseStats },
    affinities: definition.affinities.map(describeAffinity),
    recentAssignments: [],
  };
}

export function selectHirePoolViews(state: GameState): HireCandidateView[] {
  return state.hirePool.flatMap((operativeId) => {
    const definition = getOperativeDefinition(operativeId);

    if (!definition) {
      return [];
    }

    const target = {
      type: 'recruit' as const,
      id: definition.id,
    };
    const preview = getActionPreview(state, 'recruit_operative', undefined, target);
    const availability = getOrderAvailability(state, {
      actionId: 'recruit_operative',
      target,
    });

    return [
      {
        id: definition.id,
        name: definition.name,
        archetype: definition.archetype,
        rarity: definition.rarity,
        roleTags: definition.roleTags,
        baseStats: { ...definition.baseStats },
        startingLoyalty: definition.startingLoyalty,
        startingStress: definition.startingStress,
        stressTier: getStressTier(definition.startingStress),
        signatureTrait: requireTraitView(definition.signatureTraitId),
        ...(definition.liabilityTraitId
          ? { liabilityTrait: requireTraitView(definition.liabilityTraitId) }
          : {}),
        recruitCost:
          preview?.adjustedResourceCost ??
          getActionDefinition('recruit_operative')?.resourceCost ??
          0,
        recruitable: availability.available,
        ...(availability.reason ? { unavailableReason: availability.reason } : {}),
      },
    ];
  });
}

function requireTraitView(traitId: TraitId): TraitView {
  const trait = getTraitDefinition(traitId);

  if (!trait) {
    throw new Error(`Missing trait definition for ${traitId}`);
  }

  return {
    id: trait.id,
    name: trait.name,
    kind: trait.kind,
    description: trait.description,
  };
}

function describeAffinity(affinity: OperativeAffinity): string {
  const conditions = [
    affinity.actionId ? getActionDefinition(affinity.actionId)?.label : undefined,
    affinity.targetTag ? `${affinity.targetTag} targets` : undefined,
    affinity.districtId ? getDistrictDefinition(affinity.districtId)?.name : undefined,
    affinity.districtTag ? `${affinity.districtTag} districts` : undefined,
    affinity.rivalId ? getRivalDefinition(affinity.rivalId)?.name : undefined,
  ].filter((value): value is string => Boolean(value));
  const effects = [
    ...describePressureEffects(affinity.effects),
    describeSigned('risk', affinity.riskModifier),
    describeSigned('Stress', affinity.stressModifier),
    describeSigned('rival pressure', affinity.rivalPressureModifier),
  ].filter((value): value is string => Boolean(value));

  return `${conditions.join(' + ') || 'All assignments'}: ${effects.join(', ') || 'contextual advantage'}.`;
}

function describePressureEffects(
  effects: OperativeAffinity['effects'],
): string[] {
  if (!effects) {
    return [];
  }

  return Object.entries(effects).map(([pressure, amount]) =>
    `${formatSigned(amount)} ${pressure}`,
  );
}

function describeSigned(label: string, amount?: number): string | undefined {
  return amount === undefined || amount === 0 ? undefined : `${formatSigned(amount)} ${label}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
