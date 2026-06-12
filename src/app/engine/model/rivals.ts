import type { DistrictId } from './districts';
import type { FactionId } from './factions';
import type { PressureId } from './pressures';
import type { VenueId } from './venues';

export type RivalId = 'rival_nyx_ardent' | 'rival_knox_marrow';

export type RivalArchetype = 'velvet_tyrant' | 'chrome_butcher';

export type RivalPressureTier = 'watching' | 'interested' | 'provoked' | 'retaliating';

export type RivalDefinition = {
  id: RivalId;
  name: string;
  archetype: RivalArchetype;
  power: number;
  aggression: number;
  subtlety: number;
  socialControl: number;
  baseDisposition: number;
  preferredPressureAttack: Exclude<PressureId, 'ruin'>;
  associatedFactionId?: FactionId;
  controlledDistrictIds: readonly DistrictId[];
  controlledVenueIds: readonly VenueId[];
  traits: readonly string[];
};

export type RivalState = {
  id: RivalId;
  pressure: number;
  disposition: number;
  active: boolean;
};
