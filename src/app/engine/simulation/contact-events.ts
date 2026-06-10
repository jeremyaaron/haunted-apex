import { getContactDefinition } from '../content';
import type {
  ContactId,
  ContactMetricDelta,
  ContactState,
  EventChoiceDefinition,
  EventDefinition,
  GameState,
} from '../model';

export type ContactEventEligibilityDiagnostics = {
  eligible: boolean;
  eligibleContactIds: ContactId[];
  reason?:
    | 'not_contact_event'
    | 'no_active_contact'
    | 'signature_seen'
    | 'generic_cooldown'
    | 'criteria_not_met';
};

export type ContactEffectPreviewRow = {
  contactId: ContactId;
  contactName: string;
  id: keyof ContactMetricDelta;
  value: number;
};

export function getContactEventEligibility(
  state: GameState,
  event: EventDefinition,
): ContactEventEligibilityDiagnostics {
  if (!event.contact) {
    return {
      eligible: true,
      eligibleContactIds: [],
      reason: 'not_contact_event',
    };
  }

  if (event.contact.signature && state.seenSignatureEventIds.includes(event.id)) {
    return {
      eligible: false,
      eligibleContactIds: [],
      reason: 'signature_seen',
    };
  }

  const mostRecentPresentedWeek = getMostRecentPresentedWeek(state, event.id);

  if (
    event.contact.generic &&
    mostRecentPresentedWeek > 0 &&
    mostRecentPresentedWeek >= state.week - 2
  ) {
    return {
      eligible: false,
      eligibleContactIds: [],
      reason: 'generic_cooldown',
    };
  }

  const eligibleContactIds = state.activeContactIds.filter((contactId) =>
    contactSatisfiesEvent(state, state.contacts[contactId], event),
  );

  if (eligibleContactIds.length === 0) {
    return {
      eligible: false,
      eligibleContactIds: [],
      reason: state.activeContactIds.length === 0 ? 'no_active_contact' : 'criteria_not_met',
    };
  }

  return {
    eligible: true,
    eligibleContactIds,
  };
}

export function selectContactForEvent(
  state: GameState,
  event: EventDefinition,
): ContactId | undefined {
  const eligible = getContactEventEligibility(state, event).eligibleContactIds;

  if (eligible.length === 0) {
    return undefined;
  }

  if (event.contact?.contactId) {
    return event.contact.contactId;
  }

  return eligible
    .map((contactId) => state.contacts[contactId])
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.volatility + right.exposure - (left.volatility + left.exposure) ||
        right.trust + right.leverage - (left.trust + left.leverage) ||
        left.id.localeCompare(right.id),
    )[0]?.id;
}

export function resolveEventContactId(
  state: GameState,
  event: EventDefinition,
  choice?: EventChoiceDefinition,
): ContactId | undefined {
  const contactId =
    choice?.contactId ?? state.pendingEvent?.selectedContactId ?? event.contact?.contactId;

  return contactId && isActiveNonBurnedContact(state, contactId) ? contactId : undefined;
}

export function previewEventContactEffects(
  state: GameState,
  event: EventDefinition,
  choice: EventChoiceDefinition,
): ContactEffectPreviewRow[] {
  const contactId = resolveEventContactId(state, event, choice);

  if (!contactId || !choice.contactEffects) {
    return [];
  }

  const contactName = getContactDefinition(contactId)?.name ?? contactId;

  return normalizeContactDelta(choice.contactEffects).map((row) => ({
    contactId,
    contactName,
    ...row,
  }));
}

export function normalizeContactDelta(
  delta: ContactMetricDelta = {},
): { id: keyof ContactMetricDelta; value: number }[] {
  return (['trust', 'leverage', 'volatility', 'exposure'] as const).flatMap((id) => {
    const value = delta[id];

    return typeof value === 'number' && value !== 0 ? [{ id, value }] : [];
  });
}

export function contactEventHasPresented(state: GameState, eventId: string): boolean {
  return getMostRecentPresentedWeek(state, eventId) > 0;
}

export function getContactEventRepeatMultiplier(
  state: GameState,
  event: EventDefinition,
): number {
  if (!event.contact?.generic) {
    return 1;
  }

  return contactEventHasPresented(state, event.id) ? 0.5 : 1;
}

function contactSatisfiesEvent(
  state: GameState,
  contact: ContactState | undefined,
  event: EventDefinition,
): boolean {
  const criteria = event.contact;

  if (!contact || !criteria || contact.burned) {
    return false;
  }

  if (criteria.contactId && contact.id !== criteria.contactId) {
    return false;
  }

  if (criteria.minTrust !== undefined && contact.trust < criteria.minTrust) {
    return false;
  }

  if (criteria.maxTrust !== undefined && contact.trust > criteria.maxTrust) {
    return false;
  }

  if (criteria.minLeverage !== undefined && contact.leverage < criteria.minLeverage) {
    return false;
  }

  if (criteria.minVolatility !== undefined && contact.volatility < criteria.minVolatility) {
    return false;
  }

  if (criteria.minExposure !== undefined && contact.exposure < criteria.minExposure) {
    return false;
  }

  if (criteria.recentInteractionWithinWeeks !== undefined) {
    const weeks = criteria.recentInteractionWithinWeeks;
    return contact.recentInteractions.some(
      (interaction) => interaction.week >= state.week - weeks,
    );
  }

  return true;
}

function isActiveNonBurnedContact(state: GameState, contactId: ContactId): boolean {
  const contact = state.contacts[contactId];

  return state.activeContactIds.includes(contactId) && !!contact && !contact.burned;
}

function getMostRecentPresentedWeek(state: GameState, eventId: string): number {
  return state.eventLog.reduce((latestWeek, entry) => {
    if (
      entry.type !== 'event_presented' ||
      (entry.id !== eventId && entry.title !== eventId && !entry.tags?.includes(eventId))
    ) {
      return latestWeek;
    }

    return Math.max(latestWeek, entry.week);
  }, 0);
}
