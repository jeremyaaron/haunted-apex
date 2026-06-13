import { applyContactMetricDelta } from '../contacts';
import { getContactDefinition, getFactionDefinition, getRivalDefinition } from '../content';
import type {
  CampaignState,
  CampaignTensionDefinition,
  ContactId,
  FactionId,
  FactionMetricDelta,
  GameLogEntry,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';
import { applyFactionMetricDelta } from '../simulation/faction-effects';
import { applyPressureDelta } from '../simulation/pressure-delta';

type CampaignAppliedModifiers = CampaignState['appliedModifiers'];

export function applyCampaignModifiersToRun(
  state: GameState,
  campaign: CampaignTensionDefinition,
): GameState {
  if (hasAppliedCampaignModifiers(state.campaign.appliedModifiers)) {
    return state;
  }

  let next: GameState = {
    ...state,
    pressures: applyPressureDelta(state.pressures, campaign.startingPressureDelta ?? {}),
  };
  const appliedModifiers: CampaignAppliedModifiers = {};

  if (campaign.startingPressureDelta) {
    appliedModifiers.startingPressureDelta = { ...campaign.startingPressureDelta };
  }

  const factionModifiers = applyFactionModifiers(next, campaign);
  next = factionModifiers.state;

  if (Object.keys(factionModifiers.applied).length > 0) {
    appliedModifiers.factionModifiers = factionModifiers.applied;
  }

  const rivalPressureModifiers = applyRivalPressureModifiers(next, campaign);
  next = rivalPressureModifiers.state;

  if (Object.keys(rivalPressureModifiers.applied).length > 0) {
    appliedModifiers.rivalPressureModifiers = rivalPressureModifiers.applied;
  }

  const contactMetricModifiers = applyContactMetricModifiers(next, campaign);
  next = contactMetricModifiers.state;

  if (Object.keys(contactMetricModifiers.applied).length > 0) {
    appliedModifiers.contactMetricModifiers = contactMetricModifiers.applied;
  }

  return appendCampaignOpeningLog({
    ...next,
    campaign: {
      ...next.campaign,
      appliedModifiers,
    },
  }, campaign, appliedModifiers);
}

export function formatCampaignModifierSummary(
  campaign: CampaignTensionDefinition,
  appliedModifiers: CampaignAppliedModifiers,
): string {
  const lines = [
    formatPressureLine(appliedModifiers.startingPressureDelta),
    ...formatFactionLines(appliedModifiers.factionModifiers),
    ...formatRivalLines(appliedModifiers.rivalPressureModifiers),
    ...formatContactLines(appliedModifiers.contactMetricModifiers),
  ].filter((line) => line.length > 0);

  if (lines.length === 0) {
    return campaign.openingBriefing;
  }

  return `${campaign.openingBriefing}\n\nStarting shifts: ${lines.join(' ')}`;
}

function applyFactionModifiers(
  state: GameState,
  campaign: CampaignTensionDefinition,
): { state: GameState; applied: NonNullable<CampaignAppliedModifiers['factionModifiers']> } {
  let next = state;
  const applied: Partial<Record<FactionId, FactionMetricDelta>> = {};

  for (const [factionId, delta] of Object.entries(campaign.factionModifiers ?? {})) {
    if (!delta || !next.activeFactionIds.includes(factionId as FactionId)) {
      continue;
    }

    const faction = next.factions[factionId as FactionId];

    if (!faction) {
      continue;
    }

    next = applyFactionMetricDelta(next, factionId as FactionId, delta, {
      sourceType: 'campaign',
      sourceId: campaign.id,
    });
    applied[factionId as FactionId] = { ...delta };
  }

  return { state: next, applied };
}

function applyRivalPressureModifiers(
  state: GameState,
  campaign: CampaignTensionDefinition,
): { state: GameState; applied: NonNullable<CampaignAppliedModifiers['rivalPressureModifiers']> } {
  const applied: Partial<Record<RivalId, number>> = {};
  const rivals = { ...state.rivals };

  for (const [rivalId, pressureDelta] of Object.entries(campaign.rivalPressureModifiers ?? {})) {
    const rival = rivals[rivalId as RivalId];

    if (!rival || !rival.active || pressureDelta === undefined) {
      continue;
    }

    rivals[rivalId as RivalId] = {
      ...rival,
      pressure: clampPercent(rival.pressure + pressureDelta),
    };
    applied[rivalId as RivalId] = pressureDelta;
  }

  return {
    state: {
      ...state,
      rivals,
    },
    applied,
  };
}

function applyContactMetricModifiers(
  state: GameState,
  campaign: CampaignTensionDefinition,
): {
  state: GameState;
  applied: NonNullable<CampaignAppliedModifiers['contactMetricModifiers']>;
} {
  const applied: NonNullable<CampaignAppliedModifiers['contactMetricModifiers']> = {};
  const contacts = { ...state.contacts };

  for (const [contactId, delta] of Object.entries(campaign.contactMetricModifiers ?? {})) {
    const contact = contacts[contactId as ContactId];

    if (!contact || !delta) {
      continue;
    }

    contacts[contactId as ContactId] = applyContactMetricDelta(contact, delta);
    applied[contactId as ContactId] = { ...delta };
  }

  return {
    state: {
      ...state,
      contacts,
    },
    applied,
  };
}

function appendCampaignOpeningLog(
  state: GameState,
  campaign: CampaignTensionDefinition,
  appliedModifiers: CampaignAppliedModifiers,
): GameState {
  const logEntry: GameLogEntry = {
    id: `log_${state.week}_${state.eventLog.length + 1}_campaign`,
    week: state.week,
    type: 'campaign',
    title: `${campaign.name}: ${state.campaign.cityName}`,
    body: formatCampaignModifierSummary(campaign, appliedModifiers),
    pressureDelta: appliedModifiers.startingPressureDelta,
    tags: ['CAMPAIGN', campaign.id],
  };

  return {
    ...state,
    eventLog: [...state.eventLog, logEntry],
  };
}

function hasAppliedCampaignModifiers(appliedModifiers: CampaignAppliedModifiers): boolean {
  return (
    appliedModifiers.startingPressureDelta !== undefined ||
    appliedModifiers.factionModifiers !== undefined ||
    appliedModifiers.rivalPressureModifiers !== undefined ||
    appliedModifiers.contactMetricModifiers !== undefined
  );
}

function formatPressureLine(delta: PressureDelta | undefined): string {
  const formatted = formatDeltaEntries(delta);
  return formatted.length > 0 ? `Pressure ${formatted}.` : '';
}

function formatFactionLines(
  modifiers: CampaignAppliedModifiers['factionModifiers'],
): string[] {
  return Object.entries(modifiers ?? {}).flatMap(([factionId, delta]) => {
    const formatted = formatDeltaEntries(delta);
    const factionName = getFactionDefinition(factionId as FactionId)?.name ?? factionId;
    return formatted.length > 0 ? [`${factionName} ${formatted}.`] : [];
  });
}

function formatRivalLines(
  modifiers: CampaignAppliedModifiers['rivalPressureModifiers'],
): string[] {
  return Object.entries(modifiers ?? {}).flatMap(([rivalId, delta]) => {
    const rivalName = getRivalDefinition(rivalId as RivalId)?.name ?? rivalId;
    return delta ? [`${rivalName} Pressure ${signed(delta)}.`] : [];
  });
}

function formatContactLines(
  modifiers: CampaignAppliedModifiers['contactMetricModifiers'],
): string[] {
  return Object.entries(modifiers ?? {}).flatMap(([contactId, delta]) => {
    const formatted = formatDeltaEntries(delta);
    const contactName = getContactDefinition(contactId as ContactId)?.name ?? contactId;
    return formatted.length > 0 ? [`${contactName} ${formatted}.`] : [];
  });
}

function formatDeltaEntries(delta: Record<string, number | undefined> | undefined): string {
  return Object.entries(delta ?? {})
    .filter(([, value]) => value !== undefined && value !== 0)
    .map(([id, value]) => `${formatToken(id)} ${signed(value)}`)
    .join(', ');
}

function signed(value: number | undefined): string {
  const safeValue = value ?? 0;
  return safeValue > 0 ? `+${safeValue}` : `${safeValue}`;
}

function formatToken(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
