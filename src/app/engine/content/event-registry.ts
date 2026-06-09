import type { EventDefinition } from '../model';
import { DISTRICT_ZERO_EVENTS as CITY_EVENTS } from './district-zero-events';
import { ROSTER_EVENTS } from './roster-events';

export const DISTRICT_ZERO_EVENTS: readonly EventDefinition[] = [
  ...CITY_EVENTS,
  ...ROSTER_EVENTS,
];

export function getEventDefinition(eventDefinitionId: string): EventDefinition | undefined {
  return DISTRICT_ZERO_EVENTS.find((event) => event.id === eventDefinitionId);
}
