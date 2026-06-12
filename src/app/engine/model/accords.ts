import type { FactionId, FactionMetricDelta, FactionRoleTag } from './factions';
import type { LedgerEntryDefinitionId } from './ledger';
import type { PressureDelta } from './pressures';
import type { RivalId } from './rivals';

export type AccordId =
  | 'accord_ashline_clean_corridor'
  | 'accord_ashline_inspection_delay'
  | 'accord_helix_quiet_capital'
  | 'accord_helix_permit_shell'
  | 'accord_velvet_guest_list'
  | 'accord_velvet_silence'
  | 'accord_chrome_dockside_tithe'
  | 'accord_chrome_muscle_retainer'
  | 'accord_ghostline_dead_channel'
  | 'accord_ghostline_mercy_static';

export type ActiveAccordId = `active_${AccordId}_${number}`;

export type AccordRequirement =
  | { metric: 'standing'; gte: number }
  | { metric: 'standing'; lte: number }
  | { metric: 'suspicion'; gte: number }
  | { metric: 'suspicion'; lte: number }
  | { metric: 'obligation'; gte: number }
  | { metric: 'obligation'; lte: number }
  | { type: 'owned_front_required' };

export type AccordFrontEffect = {
  type: 'cool_highest_exposure_front';
  exposureDelta: number;
};

export type AccordLedgerEffect = {
  type: 'create';
  definitionId: LedgerEntryDefinitionId;
  relatedFactionId?: FactionId;
};

export type AccordCost = {
  resources?: number;
  intel?: number;
};

export type AccordDefinition = {
  id: AccordId;
  factionId: FactionId;
  label: string;
  description: string;
  durationWeeks: number;
  requirements?: readonly AccordRequirement[];
  cost?: AccordCost;
  immediateEffects?: PressureDelta;
  weeklyEffects?: PressureDelta;
  factionEffectsOnStart?: FactionMetricDelta;
  factionEffectsPerWeek?: FactionMetricDelta;
  factionEffectsOnExpire?: FactionMetricDelta;
  ledgerEffectsOnStart?: readonly AccordLedgerEffect[];
  rivalPressureEffectsOnStart?: Partial<Record<RivalId, number>>;
  frontEffectsOnStart?: readonly AccordFrontEffect[];
  tags: readonly FactionRoleTag[];
};

export type ActiveAccord = {
  id: ActiveAccordId;
  definitionId: AccordId;
  factionId: FactionId;
  startedWeek: number;
  remainingWeeks: number;
  firstWeeklyEffectWeek: number;
  source: {
    type: 'broker_accord';
  };
};
