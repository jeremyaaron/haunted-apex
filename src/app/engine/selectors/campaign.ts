import {
  getCampaignTensionDefinition,
  getContactDefinition,
  getFactionDefinition,
  getFrontDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from '../content';
import type {
  CampaignState,
  CampaignTensionDefinition,
  ContactId,
  ContactMetricDelta,
  FactionId,
  FactionMetricDelta,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';

export type CampaignHeaderView = {
  cityName: string;
  cityProfile: CampaignState['cityProfile'];
  tensionId: CampaignState['tensionId'];
  tensionName: string;
  tensionSubtitle: string;
  label: string;
};

export type CampaignEffectRow = {
  id: string;
  kind: 'pressure' | 'faction' | 'rival' | 'contact';
  label: string;
  amount: number;
  value: string;
};

export type CampaignBriefingView = CampaignHeaderView & {
  description: string;
  openingBriefing: string;
  seed: string;
  pressurePattern: readonly string[];
  startingEffectRows: readonly CampaignEffectRow[];
  activeThisRun: readonly string[];
  favoredByTension: readonly string[];
};

export function selectCampaignHeaderView(state: GameState): CampaignHeaderView {
  const definition = requireCampaignDefinition(state.campaign.tensionId);

  return {
    cityName: state.campaign.cityName,
    cityProfile: state.campaign.cityProfile,
    tensionId: definition.id,
    tensionName: definition.name,
    tensionSubtitle: definition.subtitle,
    label: `${state.campaign.cityName} · ${definition.name}`,
  };
}

export function selectCampaignBriefingView(state: GameState): CampaignBriefingView {
  const definition = requireCampaignDefinition(state.campaign.tensionId);
  const header = selectCampaignHeaderView(state);

  return {
    ...header,
    description: definition.description,
    openingBriefing: definition.openingBriefing,
    seed: state.seed,
    pressurePattern: [...definition.briefing.pressurePattern],
    startingEffectRows: selectCampaignStartingEffectRows(state),
    activeThisRun: selectCampaignActiveThisRunLabels(state),
    favoredByTension: [...definition.briefing.favoredLabels],
  };
}

export function selectCampaignStartingEffectRows(state: GameState): CampaignEffectRow[] {
  return [
    ...formatPressureRows(state.campaign.appliedModifiers.startingPressureDelta),
    ...formatFactionRows(state.campaign.appliedModifiers.factionModifiers),
    ...formatRivalRows(state.campaign.appliedModifiers.rivalPressureModifiers),
    ...formatContactRows(state.campaign.appliedModifiers.contactMetricModifiers),
  ];
}

export function selectCampaignActiveThisRunLabels(state: GameState): string[] {
  const rivalPressureModifiers = state.campaign.appliedModifiers.rivalPressureModifiers ?? {};

  return [
    ...state.campaign.activeContent.factionIds.map((factionId) => {
      const name = getFactionDefinition(factionId)?.name ?? factionId;
      return `${name} active`;
    }),
    ...state.campaign.activeContent.rivalIds.map((rivalId) => {
      const name = getRivalDefinition(rivalId)?.name ?? rivalId;
      return rivalPressureModifiers[rivalId] ? `${name} pressured` : `${name} active`;
    }),
    ...state.campaign.activeContent.contactIds.map((contactId) => {
      const name = getContactDefinition(contactId)?.name ?? contactId;
      return `${name} active`;
    }),
    ...state.campaign.activeContent.frontDefinitionIds.map((frontDefinitionId) => {
      const name = getFrontDefinition(frontDefinitionId)?.name ?? frontDefinitionId;
      return state.fronts[frontDefinitionId] ? `${name} owned` : `${name} available`;
    }),
    ...state.campaign.activeContent.startingOperativeIds.map((operativeId) => {
      const name = getOperativeDefinition(operativeId)?.name ?? operativeId;
      return `${name} starting`;
    }),
  ];
}

function requireCampaignDefinition(
  campaignTensionId: CampaignState['tensionId'],
): CampaignTensionDefinition {
  const definition = getCampaignTensionDefinition(campaignTensionId);

  if (!definition) {
    throw new Error(`Missing Campaign Tension definition ${campaignTensionId}.`);
  }

  return definition;
}

function formatPressureRows(delta: PressureDelta | undefined): CampaignEffectRow[] {
  return Object.entries(delta ?? {}).flatMap(([pressureId, amount]) =>
    formatMetricRow({
      id: `pressure:${pressureId}`,
      kind: 'pressure',
      label: formatToken(pressureId),
      amount,
    }),
  );
}

function formatFactionRows(
  modifiers: CampaignState['appliedModifiers']['factionModifiers'],
): CampaignEffectRow[] {
  return Object.entries(modifiers ?? {}).flatMap(([factionId, delta]) => {
    const factionName = getFactionDefinition(factionId as FactionId)?.name ?? factionId;

    return formatMetricRows({
      idPrefix: `faction:${factionId}`,
      kind: 'faction',
      ownerLabel: factionName,
      delta,
    });
  });
}

function formatRivalRows(
  modifiers: CampaignState['appliedModifiers']['rivalPressureModifiers'],
): CampaignEffectRow[] {
  return Object.entries(modifiers ?? {}).flatMap(([rivalId, amount]) => {
    const rivalName = getRivalDefinition(rivalId as RivalId)?.name ?? rivalId;

    return formatMetricRow({
      id: `rival:${rivalId}:pressure`,
      kind: 'rival',
      label: `${rivalName} Pressure`,
      amount,
    });
  });
}

function formatContactRows(
  modifiers: CampaignState['appliedModifiers']['contactMetricModifiers'],
): CampaignEffectRow[] {
  return Object.entries(modifiers ?? {}).flatMap(([contactId, delta]) => {
    const contactName = getContactDefinition(contactId as ContactId)?.name ?? contactId;

    return formatMetricRows({
      idPrefix: `contact:${contactId}`,
      kind: 'contact',
      ownerLabel: contactName,
      delta,
    });
  });
}

function formatMetricRows(config: {
  idPrefix: string;
  kind: CampaignEffectRow['kind'];
  ownerLabel: string;
  delta: FactionMetricDelta | ContactMetricDelta | undefined;
}): CampaignEffectRow[] {
  return Object.entries(config.delta ?? {}).flatMap(([metricId, amount]) =>
    formatMetricRow({
      id: `${config.idPrefix}:${metricId}`,
      kind: config.kind,
      label: `${config.ownerLabel} ${formatToken(metricId)}`,
      amount,
    }),
  );
}

function formatMetricRow(config: {
  id: string;
  kind: CampaignEffectRow['kind'];
  label: string;
  amount: number | undefined;
}): CampaignEffectRow[] {
  if (config.amount === undefined || config.amount === 0) {
    return [];
  }

  return [
    {
      id: config.id,
      kind: config.kind,
      label: config.label,
      amount: config.amount,
      value: signed(config.amount),
    },
  ];
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
