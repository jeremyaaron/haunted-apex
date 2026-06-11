import type { ContactState, ContactStatus } from '../model';

export function deriveContactStatus(contact: ContactState): ContactStatus {
  if (contact.burned) {
    return 'burned';
  }

  if (contact.volatility >= 75) {
    return 'volatile';
  }

  if (contact.trust >= 70 && contact.leverage < 50) {
    return 'trusted';
  }

  if (contact.leverage >= 65 && contact.trust < 50) {
    return 'pressured';
  }

  if (contact.trust >= 50 && contact.leverage >= 50) {
    return 'entangled';
  }

  if (contact.trust < 25 && contact.leverage < 25) {
    return 'cold';
  }

  return 'useful';
}
