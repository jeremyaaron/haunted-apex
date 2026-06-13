import {
  getAccordDefinition,
  getFactionDefinition,
  getLedgerEntryDefinition,
  getRivalDefinition,
} from '../content';
import type {
  AccordCost,
  AccordDefinition,
  AccordId,
  AccordLedgerEffect,
  AccordRequirement,
  ActionTarget,
  FactionMetricDelta,
  FactionState,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';
import { ACTIVE_ACCORD_CAP, FACTION_ACTIVE_ACCORD_CAP } from './accord-caps';
import { previewAccordFrontEffect, type AccordFrontEffectPreview } from './accord-front-effects';
import { getUnmetAccordRequirements } from './accord-requirements';

export type BrokerAccordUnavailableReason =
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'faction_inactive'
  | 'accord_not_found'
  | 'accord_wrong_faction'
  | 'accord_already_used'
  | 'accord_already_active'
  | 'accord_cap_reached'
  | 'faction_accord_cap_reached'
  | 'accord_requirement_not_met'
  | 'not_enough_resources'
  | 'not_enough_intel';

export type BrokerAccordCostRow = {
  id: keyof AccordCost;
  value: number;
};

export type BrokerAccordLedgerPreview = AccordLedgerEffect & {
  entryName: string;
  kind: 'secret' | 'debt' | 'favor';
};

export type BrokerAccordRivalPressurePreview = {
  rivalId: RivalId;
  rivalName: string;
  currentPressure: number;
  pressureGain: number;
  projectedPressure: number;
};

export type BrokerAccordPreviewBase = {
  target?: Extract<ActionTarget, { type: 'faction' }>;
  factionId?: FactionState['id'];
  factionName?: string;
  accordId?: AccordId;
  accordLabel?: string;
  description?: string;
  durationWeeks?: number;
  timingLabel?: string;
  cost: Required<AccordCost>;
  costRows: BrokerAccordCostRow[];
  immediateEffects: PressureDelta;
  weeklyEffects: PressureDelta;
  factionEffectsOnStart: FactionMetricDelta;
  factionEffectsPerWeek: FactionMetricDelta;
  factionEffectsOnExpire: FactionMetricDelta;
  ledgerEffectsOnStart: BrokerAccordLedgerPreview[];
  rivalPressureEffectsOnStart: BrokerAccordRivalPressurePreview[];
  frontEffectsOnStart: AccordFrontEffectPreview[];
  unmetRequirements: AccordRequirement[];
};

export type BrokerAccordPreview =
  | (BrokerAccordPreviewBase & {
      ok: true;
      definition: AccordDefinition;
      faction: FactionState;
    })
  | (BrokerAccordPreviewBase & {
      ok: false;
      unavailableReason: BrokerAccordUnavailableReason;
    });

export type BrokerAccordPreviewOptions = {
  availableResources?: number;
  availableIntel?: number;
};

export function previewBrokerAccord(
  state: GameState,
  target?: ActionTarget,
  options: BrokerAccordPreviewOptions = {},
): BrokerAccordPreview {
  if (!target) {
    return unavailable('target_required');
  }

  if (target.type !== 'faction') {
    return unavailable('target_not_allowed');
  }

  const factionDefinition = getFactionDefinition(target.factionId);

  if (!factionDefinition) {
    return unavailable('target_not_found', { target });
  }

  if (!state.activeFactionIds.includes(target.factionId)) {
    return unavailable('faction_inactive', {
      target,
      factionId: factionDefinition.id,
      factionName: factionDefinition.name,
    });
  }

  const faction = state.factions[target.factionId];

  if (!faction) {
    return unavailable('target_not_found', {
      target,
      factionId: factionDefinition.id,
      factionName: factionDefinition.name,
    });
  }

  const accord = getAccordDefinition(target.accordId);

  if (!accord) {
    return unavailable('accord_not_found', {
      target,
      factionId: factionDefinition.id,
      factionName: factionDefinition.name,
    });
  }

  const base = previewBase(state, target, accord, faction);

  if (accord.factionId !== target.factionId) {
    return unavailable('accord_wrong_faction', base);
  }

  if (faction.usedAccordIds.includes(accord.id)) {
    return unavailable('accord_already_used', base);
  }

  if (Object.values(state.activeAccords).some((active) => active.definitionId === accord.id)) {
    return unavailable('accord_already_active', base);
  }

  if (Object.keys(state.activeAccords).length >= ACTIVE_ACCORD_CAP) {
    return unavailable('accord_cap_reached', base);
  }

  if (faction.activeAccordIds.length >= FACTION_ACTIVE_ACCORD_CAP) {
    return unavailable('faction_accord_cap_reached', base);
  }

  if (base.unmetRequirements.length > 0) {
    return unavailable('accord_requirement_not_met', base);
  }

  if ((options.availableResources ?? state.pressures.resources) < base.cost.resources) {
    return unavailable('not_enough_resources', base);
  }

  if ((options.availableIntel ?? state.pressures.intel) < base.cost.intel) {
    return unavailable('not_enough_intel', base);
  }

  return {
    ...base,
    ok: true,
    definition: accord,
    faction,
  };
}

function previewBase(
  state: GameState,
  target: Extract<ActionTarget, { type: 'faction' }>,
  accord: AccordDefinition,
  faction: FactionState,
): BrokerAccordPreviewBase {
  const factionDefinition = getFactionDefinition(faction.id);
  const cost = {
    resources: accord.cost?.resources ?? 0,
    intel: accord.cost?.intel ?? 0,
  };

  return {
    target,
    factionId: faction.id,
    factionName: factionDefinition?.name ?? faction.id,
    accordId: accord.id,
    accordLabel: accord.label,
    description: accord.description,
    durationWeeks: accord.durationWeeks,
    timingLabel: `Starting next week for ${accord.durationWeeks} weeks`,
    cost,
    costRows: Object.entries(cost).flatMap(([id, value]) =>
      value === 0 ? [] : [{ id: id as keyof AccordCost, value }],
    ),
    immediateEffects: { ...(accord.immediateEffects ?? {}) },
    weeklyEffects: { ...(accord.weeklyEffects ?? {}) },
    factionEffectsOnStart: { ...(accord.factionEffectsOnStart ?? {}) },
    factionEffectsPerWeek: { ...(accord.factionEffectsPerWeek ?? {}) },
    factionEffectsOnExpire: { ...(accord.factionEffectsOnExpire ?? {}) },
    ledgerEffectsOnStart: createLedgerPreviewRows(accord),
    rivalPressureEffectsOnStart: createRivalPressureRows(state, accord),
    frontEffectsOnStart: (accord.frontEffectsOnStart ?? []).flatMap((effect) => {
      const preview = previewAccordFrontEffect(state, effect);
      return preview ? [preview] : [];
    }),
    unmetRequirements: getUnmetAccordRequirements(accord, faction, state),
  };
}

function createLedgerPreviewRows(accord: AccordDefinition): BrokerAccordLedgerPreview[] {
  return (accord.ledgerEffectsOnStart ?? []).flatMap((effect) => {
    const definition = getLedgerEntryDefinition(effect.definitionId);

    return definition
      ? [
          {
            ...effect,
            entryName: definition.name,
            kind: definition.kind,
          },
        ]
      : [];
  });
}

function createRivalPressureRows(
  state: GameState,
  accord: AccordDefinition,
): BrokerAccordRivalPressurePreview[] {
  return Object.entries(accord.rivalPressureEffectsOnStart ?? {}).flatMap(
    ([rivalId, pressureGain]) => {
      if (!pressureGain) {
        return [];
      }

      const typedRivalId = rivalId as RivalId;
      const rival = getRivalDefinition(typedRivalId);
      const rivalState = state.rivals[typedRivalId];

      if (!rival || !rivalState) {
        return [];
      }

      return [
        {
          rivalId: typedRivalId,
          rivalName: rival.name,
          currentPressure: rivalState.pressure,
          pressureGain,
          projectedPressure: Math.min(100, Math.max(0, rivalState.pressure + pressureGain)),
        },
      ];
    },
  );
}

function unavailable(
  unavailableReason: BrokerAccordUnavailableReason,
  base: Partial<BrokerAccordPreviewBase> = {},
): BrokerAccordPreview {
  return {
    cost: { resources: 0, intel: 0 },
    costRows: [],
    immediateEffects: {},
    weeklyEffects: {},
    factionEffectsOnStart: {},
    factionEffectsPerWeek: {},
    factionEffectsOnExpire: {},
    ledgerEffectsOnStart: [],
    rivalPressureEffectsOnStart: [],
    frontEffectsOnStart: [],
    unmetRequirements: [],
    ...base,
    ok: false,
    unavailableReason,
  };
}
