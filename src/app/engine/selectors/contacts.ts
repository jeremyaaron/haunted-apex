import {
  getContactDefinition,
  getDistrictDefinition,
  getLedgerEntryDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import {
  deriveContactStatus,
  previewContactOption,
  type ContactCostRow,
  type ContactOptionUnavailableReason,
} from '../contacts';
import type {
  ContactArchetype,
  ContactId,
  ContactInteraction,
  ContactMetricDelta,
  ContactRoleTag,
  ContactServiceDefinition,
  ContactServiceRequirement,
  ContactState,
  ContactStatus,
  DistrictId,
  GameState,
  LedgerEntryDefinitionId,
  LedgerEntryId,
  LedgerEntryKind,
  RivalId,
  VenueId,
  PressureDelta,
} from '../model';

export type ContactMetricView = {
  id: keyof ContactMetricDelta;
  label: string;
  value: number;
  tone: 'positive' | 'volatile' | 'exposed';
};

export type ContactServiceView = {
  id: string;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: ContactOptionUnavailableReason;
  unavailableDetail?: string;
  costSummary: string;
  effectSummary: string;
};

export type ContactLedgerLinkView = {
  id: LedgerEntryId;
  definitionId: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  name: string;
  status: 'active' | 'spent' | 'resolved';
};

export type ContactInteractionView = ContactInteraction & {
  effectRows: ContactMetricView[];
};

export type ContactView = {
  id: ContactId;
  name: string;
  archetype: ContactArchetype;
  roleTags: readonly ContactRoleTag[];
  trust: number;
  leverage: number;
  volatility: number;
  exposure: number;
  metrics: readonly ContactMetricView[];
  burned: boolean;
  status: ContactStatus;
  associatedDistrictId?: DistrictId;
  associatedDistrictName?: string;
  associatedVenueId?: VenueId;
  associatedVenueName?: string;
  associatedRivalId?: RivalId;
  associatedRivalName?: string;
  services: readonly ContactServiceView[];
  relatedLedgerEntries: readonly ContactLedgerLinkView[];
  recentInteractions: readonly ContactInteractionView[];
};

export function selectActiveContacts(state: GameState): ContactView[] {
  return state.activeContactIds.flatMap((contactId) => {
    const contact = state.contacts[contactId];

    return contact ? [toContactView(state, contact)] : [];
  });
}

export function selectContactView(
  state: GameState,
  contactId: ContactId,
): ContactView | undefined {
  if (!state.activeContactIds.includes(contactId)) {
    return undefined;
  }

  const contact = state.contacts[contactId];
  return contact ? toContactView(state, contact) : undefined;
}

export function selectContactState(
  state: GameState,
  contactId: ContactId,
): ContactState | undefined {
  return state.contacts[contactId];
}

export function isActiveContact(state: GameState, contactId: ContactId): boolean {
  return state.activeContactIds.includes(contactId);
}

function toContactView(state: GameState, contact: ContactState): ContactView {
  const definition = getContactDefinition(contact.id);

  if (!definition) {
    throw new Error(`Missing contact definition for ${contact.id}`);
  }

  const district = definition.associatedDistrictId
    ? getDistrictDefinition(definition.associatedDistrictId)
    : undefined;
  const venue = definition.associatedVenueId
    ? getVenueDefinition(definition.associatedVenueId)
    : undefined;
  const rival = definition.associatedRivalId
    ? getRivalDefinition(definition.associatedRivalId)
    : undefined;

  return {
    id: definition.id,
    name: definition.name,
    archetype: definition.archetype,
    roleTags: definition.roleTags,
    trust: contact.trust,
    leverage: contact.leverage,
    volatility: contact.volatility,
    exposure: contact.exposure,
    burned: contact.burned,
    status: deriveContactStatus(contact),
    ...(district
      ? {
          associatedDistrictId: district.id,
          associatedDistrictName: district.name,
        }
      : {}),
    ...(venue
      ? {
          associatedVenueId: venue.id,
          associatedVenueName: venue.name,
        }
      : {}),
    ...(rival
      ? {
          associatedRivalId: rival.id,
          associatedRivalName: rival.name,
        }
      : {}),
    metrics: toMetricViews(contact),
    services: definition.services.map((service) => toServiceView(state, contact, service)),
    relatedLedgerEntries: selectRelatedLedgerEntries(state, contact.id),
    recentInteractions: contact.recentInteractions.map(toInteractionView),
  };
}

function toServiceView(
  state: GameState,
  contact: ContactState,
  service: ContactServiceDefinition,
): ContactServiceView {
  const preview = previewContactOption(state, {
    type: 'contact',
    contactId: contact.id,
    optionId: service.id,
  });

  return {
    id: service.id,
    label: service.label,
    description: service.description,
    available: preview.ok,
    ...(!preview.ok
      ? {
          unavailableReason: preview.unavailableReason,
          ...(preview.unavailableReason === 'requirement_not_met'
            ? { unavailableDetail: formatUnmetRequirement(contact, service.requirements) }
            : {}),
        }
      : {}),
    costSummary: formatCostSummary(preview.costRows),
    effectSummary: formatEffectSummary(preview.effects, preview.contactEffects),
  };
}

function toMetricViews(contact: ContactState): ContactMetricView[] {
  return [
    { id: 'trust', label: 'Trust', value: contact.trust, tone: 'positive' },
    { id: 'leverage', label: 'Leverage', value: contact.leverage, tone: 'positive' },
    { id: 'volatility', label: 'Volatility', value: contact.volatility, tone: 'volatile' },
    { id: 'exposure', label: 'Exposure', value: contact.exposure, tone: 'exposed' },
  ];
}

function toInteractionView(interaction: ContactInteraction): ContactInteractionView {
  return {
    ...interaction,
    effectsSummary: { ...interaction.effectsSummary },
    effectRows: contactDeltaToRows(interaction.effectsSummary),
  };
}

function selectRelatedLedgerEntries(
  state: GameState,
  contactId: ContactId,
): ContactLedgerLinkView[] {
  return state.ledger.entries.flatMap((entry) => {
    if (entry.relatedContactId !== contactId) {
      return [];
    }

    const definition = getLedgerEntryDefinition(entry.definitionId);

    if (!definition) {
      return [];
    }

    return [
      {
        id: entry.id,
        definitionId: entry.definitionId,
        kind: entry.kind,
        name: definition.name,
        status: entry.consumed ? (entry.kind === 'debt' ? 'resolved' : 'spent') : 'active',
      },
    ];
  });
}

function contactDeltaToRows(delta: ContactMetricDelta): ContactMetricView[] {
  return (['trust', 'leverage', 'volatility', 'exposure'] as const).flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0
      ? [
          {
            id,
            label: labelMetric(id),
            value,
            tone: metricTone(id),
          },
        ]
      : [];
  });
}

function formatCostSummary(rows: readonly ContactCostRow[]): string {
  return rows.length > 0
    ? rows.map((row) => `${row.value} ${labelCost(row.id)}`).join(', ')
    : 'No Cost';
}

function formatEffectSummary(
  pressureDelta: PressureDelta,
  contactDelta: ContactMetricDelta,
): string {
  const pressureRows = Object.entries(pressureDelta).flatMap(([id, value]) =>
    typeof value === 'number' && value !== 0 ? [`${formatSigned(value)} ${labelCost(id)}`] : [],
  );
  const contactRows = contactDeltaToRows(contactDelta).map(
    (row) => `${formatSigned(row.value)} ${row.label}`,
  );
  const rows = [...pressureRows, ...contactRows];

  return rows.length > 0 ? rows.join(', ') : 'No visible effect';
}

function labelMetric(id: keyof ContactMetricDelta): string {
  return `${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

function metricTone(id: keyof ContactMetricDelta): ContactMetricView['tone'] {
  return id === 'volatility' ? 'volatile' : id === 'exposure' ? 'exposed' : 'positive';
}

function formatUnmetRequirement(
  contact: ContactState,
  requirements: readonly ContactServiceRequirement[] | undefined,
): string | undefined {
  if (!requirements) {
    return undefined;
  }

  for (const requirement of requirements) {
    if (requirement.type === 'min_trust' && contact.trust < requirement.value) {
      return `Requires ${requirement.value} Trust - Current ${contact.trust}`;
    }

    if (requirement.type === 'min_leverage' && contact.leverage < requirement.value) {
      return `Requires ${requirement.value} Leverage - Current ${contact.leverage}`;
    }

    if (requirement.type === 'operative_stress_available') {
      return 'Requires a stressed operative';
    }
  }

  return undefined;
}

function labelCost(id: string): string {
  switch (id) {
    case 'resources':
      return 'Resources';
    case 'intel':
      return 'Intel';
    case 'trust':
      return 'Trust';
    case 'leverage':
      return 'Leverage';
    case 'dominion':
      return 'Dominion';
    case 'heat':
      return 'Heat';
    case 'loyalty':
      return 'Loyalty';
    case 'ruin':
      return 'Ruin';
    default:
      return `${id.charAt(0).toUpperCase()}${id.slice(1)}`;
  }
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
