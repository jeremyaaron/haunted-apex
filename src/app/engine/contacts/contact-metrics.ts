import type { ContactMetricDelta, ContactState } from '../model';

export function clampContactMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function applyContactMetricDelta(
  contact: ContactState,
  delta: ContactMetricDelta,
): ContactState {
  return {
    ...contact,
    trust: clampContactMetric(contact.trust + (delta.trust ?? 0)),
    leverage: clampContactMetric(contact.leverage + (delta.leverage ?? 0)),
    volatility: clampContactMetric(contact.volatility + (delta.volatility ?? 0)),
    exposure: clampContactMetric(contact.exposure + (delta.exposure ?? 0)),
  };
}
