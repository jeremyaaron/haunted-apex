import {
  getAccordDefinition,
  getContactDefinition,
  getDistrictDefinition,
  getEventDefinition,
  getFactionDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import { previewBrokerAccord, type BrokerAccordUnavailableReason } from '../accords';
import { deriveFactionStatus } from '../factions';
import type {
  AccordId,
  ActiveAccord,
  ActiveAccordId,
  AccordRequirement,
  FactionArchetype,
  FactionId,
  FactionInteraction,
  FactionMetricDelta,
  FactionRoleTag,
  FactionState,
  FactionStatus,
  GameState,
  PressureDelta,
} from '../model';
import { pressureDeltaToView, type PressureDeltaView } from './previews';

export type FactionMetricView = {
  id: keyof FactionMetricDelta;
  label: string;
  value: number;
  tone: 'positive' | 'warning' | 'danger';
};

export type FactionRelatedEntityView = {
  id: string;
  kind: 'District' | 'Venue' | 'Rival' | 'Contact' | 'Front Tag';
  label: string;
};

export type FactionAccordOptionView = {
  id: AccordId;
  label: string;
  description: string;
  tags: readonly FactionRoleTag[];
  durationWeeks: number;
  available: boolean;
  unavailableReason?: BrokerAccordUnavailableReason;
  requirementSummary: string;
  costSummary: string;
  immediateSummary: string;
  weeklySummary: string;
  factionStartSummary: string;
  factionWeeklySummary: string;
  factionExpireSummary: string;
  ledgerSummary: string;
  rivalSummary: string;
  frontSummary: string;
};

export type ActiveAccordView = {
  id: ActiveAccordId;
  accordId: AccordId;
  label: string;
  tags: readonly FactionRoleTag[];
  startedWeek: number;
  remainingWeeks: number;
  timingLabel: string;
  weeklyEffects: PressureDeltaView[];
  weeklySummary: string;
  factionWeeklySummary: string;
};

export type FactionInteractionView = {
  week: number;
  sourceType: FactionInteraction['sourceType'];
  sourceLabel: string;
  effectRows: FactionMetricView[];
};

export type FactionCardView = {
  id: FactionId;
  name: string;
  archetype: FactionArchetype;
  roleTags: readonly FactionRoleTag[];
  status: FactionStatus;
  standing: number;
  suspicion: number;
  obligation: number;
  metrics: readonly FactionMetricView[];
  dossier: string;
  visualTags: readonly string[];
  relatedEntities: readonly FactionRelatedEntityView[];
  accordOptions: readonly FactionAccordOptionView[];
  activeAccords: readonly ActiveAccordView[];
  recentInteractions: readonly FactionInteractionView[];
};

export type FactionPanelView = {
  activeCount: number;
  activeAccordCount: number;
  availableAccordCount: number;
  factions: readonly FactionCardView[];
};

export function selectFactionPanelView(state: GameState): FactionPanelView {
  const factions = state.activeFactionIds.flatMap((factionId) => {
    const faction = state.factions[factionId];

    return faction ? [toFactionCardView(state, faction)] : [];
  });

  return {
    activeCount: factions.length,
    activeAccordCount: Object.keys(state.activeAccords).length,
    availableAccordCount: factions.reduce(
      (count, faction) => count + faction.accordOptions.filter((accord) => accord.available).length,
      0,
    ),
    factions,
  };
}

function toFactionCardView(state: GameState, faction: FactionState): FactionCardView {
  const definition = getFactionDefinition(faction.id);

  if (!definition) {
    throw new Error(`Missing Faction definition for ${faction.id}`);
  }

  return {
    id: definition.id,
    name: definition.name,
    archetype: definition.archetype,
    roleTags: definition.roleTags,
    status: deriveFactionStatus(faction),
    standing: faction.standing,
    suspicion: faction.suspicion,
    obligation: faction.obligation,
    metrics: toMetricViews(faction),
    dossier: definition.flavor.dossier,
    visualTags: definition.flavor.visualTags ?? [],
    relatedEntities: toRelatedEntities(definition),
    accordOptions: definition.accordIds.map((accordId) =>
      toAccordOptionView(state, faction.id, accordId),
    ),
    activeAccords: faction.activeAccordIds.flatMap((activeAccordId) => {
      const activeAccord = state.activeAccords[activeAccordId];

      return activeAccord ? [toActiveAccordView(activeAccord)] : [];
    }),
    recentInteractions: faction.recentInteractions.slice(-3).reverse().map(toInteractionView),
  };
}

function toAccordOptionView(
  state: GameState,
  factionId: FactionId,
  accordId: AccordId,
): FactionAccordOptionView {
  const definition = getAccordDefinition(accordId);
  const preview = previewBrokerAccord(state, {
    type: 'faction',
    factionId,
    accordId,
  });

  if (!definition) {
    throw new Error(`Missing Accord definition for ${accordId}`);
  }

  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    tags: definition.tags,
    durationWeeks: definition.durationWeeks,
    available: preview.ok,
    ...(!preview.ok ? { unavailableReason: preview.unavailableReason } : {}),
    requirementSummary: formatRequirementSummary(definition.requirements ?? []),
    costSummary: formatCostRows(preview.costRows),
    immediateSummary: formatPressureSummary(preview.immediateEffects),
    weeklySummary: formatPressureSummary(preview.weeklyEffects),
    factionStartSummary: formatFactionSummary(preview.factionEffectsOnStart),
    factionWeeklySummary: formatFactionSummary(preview.factionEffectsPerWeek),
    factionExpireSummary: formatFactionSummary(preview.factionEffectsOnExpire),
    ledgerSummary: preview.ledgerEffectsOnStart.length
      ? preview.ledgerEffectsOnStart
          .map((effect) => `Creates ${formatToken(effect.kind)}: ${effect.entryName}`)
          .join(' · ')
      : 'No Ledger effect',
    rivalSummary: preview.rivalPressureEffectsOnStart.length
      ? preview.rivalPressureEffectsOnStart
          .map((effect) => `${effect.rivalName} Pressure +${effect.pressureGain}`)
          .join(' · ')
      : 'No rival pressure',
    frontSummary: preview.frontEffectsOnStart.length
      ? preview.frontEffectsOnStart
          .map((effect) => `${effect.frontName} Exposure ${signed(effect.exposureDelta)}`)
          .join(' · ')
      : 'No Front effect',
  };
}

function toActiveAccordView(activeAccord: ActiveAccord): ActiveAccordView {
  const definition = getAccordDefinition(activeAccord.definitionId);

  if (!definition) {
    throw new Error(`Missing Accord definition for ${activeAccord.definitionId}`);
  }

  return {
    id: activeAccord.id,
    accordId: definition.id,
    label: definition.label,
    tags: definition.tags,
    startedWeek: activeAccord.startedWeek,
    remainingWeeks: activeAccord.remainingWeeks,
    timingLabel:
      activeAccord.remainingWeeks === 1
        ? '1 weekly tick remaining'
        : `${activeAccord.remainingWeeks} weekly ticks remaining`,
    weeklyEffects: pressureDeltaToView(definition.weeklyEffects ?? {}),
    weeklySummary: formatPressureSummary(definition.weeklyEffects ?? {}),
    factionWeeklySummary: formatFactionSummary(definition.factionEffectsPerWeek ?? {}),
  };
}

function toMetricViews(faction: FactionState): FactionMetricView[] {
  return [
    { id: 'standing', label: 'Standing', value: faction.standing, tone: 'positive' },
    {
      id: 'suspicion',
      label: 'Suspicion',
      value: faction.suspicion,
      tone: metricTone('suspicion', faction.suspicion),
    },
    {
      id: 'obligation',
      label: 'Obligation',
      value: faction.obligation,
      tone: metricTone('obligation', faction.obligation),
    },
  ];
}

function metricTone(id: keyof FactionMetricDelta, value: number): FactionMetricView['tone'] {
  if (id === 'standing') {
    return value <= 25 ? 'danger' : 'positive';
  }

  if (value >= 70) {
    return 'danger';
  }

  return value >= 45 ? 'warning' : 'positive';
}

function toRelatedEntities(
  definition: NonNullable<ReturnType<typeof getFactionDefinition>>,
): FactionRelatedEntityView[] {
  return [
    ...(definition.associatedDistrictIds ?? []).map((id) => ({
      id,
      kind: 'District' as const,
      label: getDistrictDefinition(id)?.name ?? id,
    })),
    ...(definition.associatedVenueIds ?? []).map((id) => ({
      id,
      kind: 'Venue' as const,
      label: getVenueDefinition(id)?.name ?? id,
    })),
    ...(definition.associatedRivalIds ?? []).map((id) => ({
      id,
      kind: 'Rival' as const,
      label: getRivalDefinition(id)?.name ?? id,
    })),
    ...(definition.associatedContactIds ?? []).map((id) => ({
      id,
      kind: 'Contact' as const,
      label: getContactDefinition(id)?.name ?? id,
    })),
    ...(definition.associatedFrontTags ?? []).map((id) => ({
      id,
      kind: 'Front Tag' as const,
      label: formatToken(id),
    })),
  ];
}

function toInteractionView(interaction: FactionInteraction): FactionInteractionView {
  return {
    week: interaction.week,
    sourceType: interaction.sourceType,
    sourceLabel: getInteractionSourceLabel(interaction),
    effectRows: factionDeltaToRows({
      standing: interaction.standingDelta,
      suspicion: interaction.suspicionDelta,
      obligation: interaction.obligationDelta,
    }),
  };
}

function factionDeltaToRows(delta: FactionMetricDelta): FactionMetricView[] {
  return (['standing', 'suspicion', 'obligation'] as const).flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0
      ? [
          {
            id,
            label: formatToken(id),
            value,
            tone: metricTone(id, value),
          },
        ]
      : [];
  });
}

function getInteractionSourceLabel(interaction: FactionInteraction): string {
  if (interaction.sourceType === 'accord') {
    return (
      getAccordDefinition(interaction.sourceId as AccordId)?.label ??
      formatToken(interaction.sourceId)
    );
  }

  if (interaction.sourceType === 'event') {
    return getEventDefinition(interaction.sourceId)?.title ?? formatToken(interaction.sourceId);
  }

  return formatToken(interaction.sourceId);
}

function formatRequirementSummary(requirements: readonly AccordRequirement[]): string {
  if (requirements.length === 0) {
    return 'No requirement';
  }

  return requirements.map(formatRequirement).join(' · ');
}

function formatRequirement(requirement: AccordRequirement): string {
  if ('type' in requirement) {
    return 'Requires owned Front';
  }

  const comparison = 'gte' in requirement ? 'at least' : 'at most';
  const value = 'gte' in requirement ? requirement.gte : requirement.lte;

  return `Requires ${formatToken(requirement.metric)} ${comparison} ${value}`;
}

function formatCostRows(rows: readonly { id: string; value: number }[]): string {
  return rows.length
    ? rows.map((row) => `${row.value} ${formatToken(row.id)}`).join(' · ')
    : 'No cost';
}

function formatPressureSummary(delta: PressureDelta): string {
  const rows = pressureDeltaToView(delta).map(
    (row) => `${signed(row.value)} ${formatToken(row.id)}`,
  );

  return rows.length ? rows.join(' · ') : 'No pressure change';
}

function formatFactionSummary(delta: FactionMetricDelta): string {
  const rows = factionDeltaToRows(delta).map((row) => `${signed(row.value)} ${row.label}`);

  return rows.length ? rows.join(' · ') : 'No faction change';
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatToken(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
