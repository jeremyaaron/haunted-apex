import {
  getContactDefinition,
  getDistrictDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import { deriveContactStatus } from '../contacts';
import type {
  ContactArchetype,
  ContactId,
  ContactInteraction,
  ContactRoleTag,
  ContactServiceDefinition,
  ContactState,
  ContactStatus,
  DistrictId,
  GameState,
  RivalId,
  VenueId,
} from '../model';

export type ContactServiceView = {
  id: string;
  label: string;
  description: string;
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
  burned: boolean;
  status: ContactStatus;
  associatedDistrictId?: DistrictId;
  associatedDistrictName?: string;
  associatedVenueId?: VenueId;
  associatedVenueName?: string;
  associatedRivalId?: RivalId;
  associatedRivalName?: string;
  services: readonly ContactServiceView[];
  recentInteractions: readonly ContactInteraction[];
};

export function selectActiveContacts(state: GameState): ContactView[] {
  return state.activeContactIds.flatMap((contactId) => {
    const contact = state.contacts[contactId];

    return contact ? [toContactView(contact)] : [];
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
  return contact ? toContactView(contact) : undefined;
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

function toContactView(contact: ContactState): ContactView {
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
    services: definition.services.map(toServiceView),
    recentInteractions: contact.recentInteractions.map((interaction) => ({
      ...interaction,
      effectsSummary: { ...interaction.effectsSummary },
    })),
  };
}

function toServiceView(service: ContactServiceDefinition): ContactServiceView {
  return {
    id: service.id,
    label: service.label,
    description: service.description,
  };
}
