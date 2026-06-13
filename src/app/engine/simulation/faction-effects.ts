import { getAccordDefinition, getContactDefinition, getFactionDefinition } from '../content';
import { clampFactionMetric } from '../factions';
import type {
  ContactId,
  ContactOptionKind,
  DistrictId,
  FactionId,
  FactionInteraction,
  FactionMetricDelta,
  FrontId,
  FrontRoleTag,
  GameState,
  VenueId,
} from '../model';

export type FactionTouch = {
  factionId: FactionId;
  factionName: string;
  delta: FactionMetricDelta;
};

export function applyFactionMetricDelta(
  state: GameState,
  factionId: FactionId,
  delta: FactionMetricDelta,
  context: Pick<FactionInteraction, 'sourceType' | 'sourceId'>,
): GameState {
  if (!state.activeFactionIds.includes(factionId)) {
    return state;
  }

  const faction = state.factions[factionId];

  if (!faction) {
    return state;
  }

  const standing = clampFactionMetric(faction.standing + (delta.standing ?? 0));
  const suspicion = clampFactionMetric(faction.suspicion + (delta.suspicion ?? 0));
  const obligation = clampFactionMetric(faction.obligation + (delta.obligation ?? 0));
  const changed =
    standing !== faction.standing ||
    suspicion !== faction.suspicion ||
    obligation !== faction.obligation;
  const interaction: FactionInteraction = {
    week: state.week,
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    ...(standing !== faction.standing ? { standingDelta: standing - faction.standing } : {}),
    ...(suspicion !== faction.suspicion ? { suspicionDelta: suspicion - faction.suspicion } : {}),
    ...(obligation !== faction.obligation
      ? { obligationDelta: obligation - faction.obligation }
      : {}),
  };

  return {
    ...state,
    factions: {
      ...state.factions,
      [factionId]: {
        ...faction,
        standing,
        suspicion,
        obligation,
        recentInteractions: changed
          ? [...faction.recentInteractions, interaction].slice(-8)
          : faction.recentInteractions,
      },
    },
  };
}

export function getFrontFactionTouches(
  state: GameState,
  front: {
    frontId: FrontId;
    districtId: DistrictId;
    venueId?: VenueId;
    roleTags: readonly FrontRoleTag[];
  },
): FactionTouch[] {
  return state.activeFactionIds.flatMap((factionId) => {
    const definition = getFactionDefinition(factionId);

    if (!definition || !state.factions[factionId] || !frontMatchesFaction(definition, front)) {
      return [];
    }

    const roleTagMatch = front.roleTags.some((tag) =>
      definition.associatedFrontTags?.includes(tag),
    );
    const suspicionDelta = hasActiveFrontsAccord(state, factionId) ? 2 : 4;
    const delta: FactionMetricDelta = {
      suspicion: suspicionDelta,
      ...(roleTagMatch ? { standing: 1 } : {}),
    };

    return [
      {
        factionId,
        factionName: definition.name,
        delta,
      },
    ];
  });
}

export function getContactFactionTouch(
  state: GameState,
  contactId: ContactId,
  kind: ContactOptionKind,
  options: {
    hasPressureBenefit: boolean;
    createsLedgerValue: boolean;
  },
): FactionTouch | undefined {
  const contact = getContactDefinition(contactId);
  const factionId = contact?.associatedFactionId;

  if (!factionId || !state.activeFactionIds.includes(factionId) || !state.factions[factionId]) {
    return undefined;
  }

  const faction = getFactionDefinition(factionId);

  if (!faction) {
    return undefined;
  }

  const delta = getContactTouchDelta(kind, options);

  if (!delta || Object.values(delta).every((value) => value === 0 || value === undefined)) {
    return undefined;
  }

  return {
    factionId,
    factionName: faction.name,
    delta,
  };
}

function frontMatchesFaction(
  faction: NonNullable<ReturnType<typeof getFactionDefinition>>,
  front: {
    districtId: DistrictId;
    venueId?: VenueId;
    roleTags: readonly FrontRoleTag[];
  },
): boolean {
  return (
    Boolean(faction.associatedDistrictIds?.includes(front.districtId)) ||
    Boolean(front.venueId && faction.associatedVenueIds?.includes(front.venueId)) ||
    front.roleTags.some((tag) => faction.associatedFrontTags?.includes(tag))
  );
}

function hasActiveFrontsAccord(state: GameState, factionId: FactionId): boolean {
  return Object.values(state.activeAccords).some((activeAccord) => {
    if (activeAccord.factionId !== factionId) {
      return false;
    }

    return getAccordDefinition(activeAccord.definitionId)?.tags.includes('fronts') ?? false;
  });
}

function getContactTouchDelta(
  kind: ContactOptionKind,
  options: {
    hasPressureBenefit: boolean;
    createsLedgerValue: boolean;
  },
): FactionMetricDelta | undefined {
  switch (kind) {
    case 'cultivate':
      return { standing: 1 };
    case 'pressure':
      return { suspicion: 2 };
    case 'request_service':
      return {
        suspicion: 2,
        ...(options.hasPressureBenefit || options.createsLedgerValue
          ? { obligation: 2 }
          : {}),
      };
    default:
      return undefined;
  }
}
