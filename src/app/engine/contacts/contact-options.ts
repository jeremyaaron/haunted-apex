import {
  getContactDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  UNIVERSAL_CONTACT_OPTIONS,
} from '../content';
import type {
  ActionTarget,
  ContactDefinition,
  ContactId,
  ContactLedgerEffectDefinition,
  ContactMetricDelta,
  ContactOptionId,
  ContactOptionKind,
  ContactServiceCost,
  ContactServiceDefinition,
  ContactServiceRequirement,
  ContactState,
  GameState,
  LedgerEntryDefinitionId,
  OperativeId,
  PressureDelta,
  PressureId,
  RivalId,
  UniversalContactOptionDefinition,
} from '../model';
import { PRESSURE_IDS } from '../model';

export type ContactActionTarget = Extract<ActionTarget, { type: 'contact' }>;

export type ContactOptionUnavailableReason =
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'target_inactive'
  | 'contact_burned'
  | 'contact_option_not_found'
  | 'not_enough_resources'
  | 'not_enough_intel'
  | 'not_enough_trust'
  | 'not_enough_leverage'
  | 'requirement_not_met'
  | 'quiet_treatment_no_target';

export type ContactCostId = 'resources' | 'intel' | 'trust' | 'leverage';

export type ContactCostRow = {
  id: ContactCostId;
  value: number;
};

export type ContactLedgerEffectPreview = {
  type: 'create_entry';
  definitionId: LedgerEntryDefinitionId;
  entryName: string;
  kind: string;
};

export type QuietTreatmentPreview = {
  operativeId: OperativeId;
  operativeName: string;
  stressDelta: -10;
  currentStress: number;
  projectedStress: number;
};

export type ContactOptionPreview =
  | {
      ok: true;
      contactId: ContactId;
      contactName: string;
      id: ContactOptionId;
      kind: ContactOptionKind;
      label: string;
      description: string;
      affordable: true;
      cost: Required<ContactServiceCost>;
      costRows: ContactCostRow[];
      effects: PressureDelta;
      resolvedDelta: PressureDelta;
      contactEffects: ContactMetricDelta;
      resolvedContactEffects: ContactMetricDelta;
      ledgerEffects: ContactLedgerEffectPreview[];
      rivalPressureEffects: Partial<Record<RivalId, number>>;
      quietTreatment?: QuietTreatmentPreview;
      riskModifier: number;
      riskChance: number;
    }
  | {
      ok: false;
      contactId?: ContactId;
      contactName?: string;
      id?: ContactOptionId;
      kind?: ContactOptionKind;
      label?: string;
      description?: string;
      affordable: false;
      unavailableReason: ContactOptionUnavailableReason;
      cost: Required<ContactServiceCost>;
      costRows: ContactCostRow[];
      effects: PressureDelta;
      resolvedDelta: PressureDelta;
      contactEffects: ContactMetricDelta;
      resolvedContactEffects: ContactMetricDelta;
      ledgerEffects: ContactLedgerEffectPreview[];
      rivalPressureEffects: Partial<Record<RivalId, number>>;
      quietTreatment?: QuietTreatmentPreview;
      riskModifier: number;
      riskChance: number;
    };

export type ContactTargetOption = {
  target: ContactActionTarget;
  label: string;
  targetType: 'contact';
  contactId: ContactId;
  contactName: string;
  optionId: ContactOptionId;
  optionLabel: string;
  kind: ContactOptionKind;
  affordable: boolean;
  unavailableReason?: ContactOptionUnavailableReason;
  riskChance: number;
};

type ContactOptionDefinition =
  | (UniversalContactOptionDefinition &
      Partial<
        Pick<
          ContactServiceDefinition,
          | 'requirements'
          | 'ledgerEffects'
          | 'rivalPressureEffects'
          | 'riskModifier'
          | 'specialEffect'
        >
      >)
  | (ContactServiceDefinition & { kind: 'request_service' });

const CONTACT_BASE_RISK = 10;

export function selectQuietTreatmentTarget(state: GameState): OperativeId | undefined {
  return state.operatives.reduce<OperativeId | undefined>((selectedId, operative) => {
    if (operative.stress <= 0) {
      return selectedId;
    }

    if (!selectedId) {
      return operative.id;
    }

    const selected = state.operatives.find((candidate) => candidate.id === selectedId);
    return selected && selected.stress >= operative.stress ? selectedId : operative.id;
  }, undefined);
}

export function selectContactOptionPreviews(
  state: GameState,
  contactId: ContactId,
  baseRiskChance = CONTACT_BASE_RISK,
): ContactOptionPreview[] {
  const contact = state.contacts[contactId];

  if (!contact || !state.activeContactIds.includes(contactId) || contact.burned) {
    return [];
  }

  const definition = getContactDefinition(contactId);

  if (!definition) {
    return [];
  }

  return getContactOptionDefinitions(definition).map((option) =>
    previewContactOption(
      state,
      {
        type: 'contact',
        contactId,
        optionId: option.id,
      },
      baseRiskChance,
    ),
  );
}

export function selectManageContactTargetOptions(state: GameState): ContactTargetOption[] {
  return state.activeContactIds.flatMap((contactId) =>
    selectContactOptionPreviews(state, contactId).flatMap((preview) => {
      if (!preview.contactId || !preview.id || !preview.label || !preview.kind) {
        return [];
      }

      return [
        {
          target: {
            type: 'contact',
            contactId: preview.contactId,
            optionId: preview.id,
          },
          label: `${preview.contactName} - ${preview.label}`,
          targetType: 'contact' as const,
          contactId: preview.contactId,
          contactName: preview.contactName ?? preview.contactId,
          optionId: preview.id,
          optionLabel: preview.label,
          kind: preview.kind,
          affordable: preview.affordable,
          ...(!preview.affordable && preview.unavailableReason
            ? { unavailableReason: preview.unavailableReason }
            : {}),
          riskChance: preview.riskChance,
        },
      ];
    }),
  );
}

export function previewContactOption(
  state: GameState,
  target: ActionTarget | undefined,
  baseRiskChance = CONTACT_BASE_RISK,
): ContactOptionPreview {
  if (!target) {
    return unavailable('target_required', baseRiskChance);
  }

  if (target.type !== 'contact') {
    return unavailable('target_not_allowed', baseRiskChance);
  }

  const contact = state.contacts[target.contactId];
  const definition = getContactDefinition(target.contactId);

  if (!contact || !definition) {
    return unavailable('target_not_found', baseRiskChance);
  }

  const option = getContactOptionDefinition(definition, target.optionId);
  const contactName = definition.name;
  const riskChance = calculateContactOptionRisk(
    contact,
    option,
    baseRiskChance,
  );

  if (!state.activeContactIds.includes(target.contactId)) {
    return unavailable('target_inactive', riskChance, definition, contact, option);
  }

  if (contact.burned) {
    return unavailable('contact_burned', riskChance, definition, contact, option);
  }

  if (!option) {
    return unavailable('contact_option_not_found', riskChance, definition, contact);
  }

  const cost = normalizeCost(option.cost);
  const costRows = toCostRows(cost);
  const effects = normalizePressureDelta(option.effects);
  const contactEffects = normalizeContactDelta(option.contactEffects);
  const resolvedDelta = mergePressureDeltas(effects, toPressureCostDelta(cost));
  const resolvedContactEffects = normalizeContactDelta({
    ...contactEffects,
    trust: (contactEffects.trust ?? 0) - cost.trust,
    leverage: (contactEffects.leverage ?? 0) - cost.leverage,
  });
  const ledgerEffects = toLedgerEffectPreviews(option.ledgerEffects);
  const rivalPressureEffects = { ...(option.rivalPressureEffects ?? {}) };
  const quietTreatment = option.specialEffect === 'quiet_treatment'
    ? getQuietTreatmentPreview(state)
    : undefined;
  const unavailableReason =
    getCostUnavailableReason(state, contact, cost) ??
    getRequirementUnavailableReason(state, contact, option.requirements) ??
    (option.specialEffect === 'quiet_treatment' && !quietTreatment
      ? 'quiet_treatment_no_target'
      : undefined);
  const common = {
    contactId: definition.id,
    contactName,
    id: option.id,
    kind: option.kind,
    label: option.label,
    description: option.description,
    cost,
    costRows,
    effects,
    resolvedDelta,
    contactEffects,
    resolvedContactEffects,
    ledgerEffects,
    rivalPressureEffects,
    ...(quietTreatment ? { quietTreatment } : {}),
    riskModifier: option.riskModifier ?? 0,
    riskChance,
  };

  if (unavailableReason) {
    return {
      ...common,
      affordable: false,
      ok: false,
      unavailableReason,
    };
  }

  return {
    ...common,
    affordable: true,
    ok: true,
  };
}

export function getContactCostUnavailableReason(
  state: GameState,
  contactId: ContactId,
  cost: ContactServiceCost,
): ContactOptionUnavailableReason | undefined {
  const contact = state.contacts[contactId];

  if (!contact) {
    return 'target_not_found';
  }

  return getCostUnavailableReason(state, contact, normalizeCost(cost));
}

export function calculateContactOptionRisk(
  contact: ContactState,
  option: ContactOptionDefinition | undefined,
  baseRiskChance = CONTACT_BASE_RISK,
): number {
  const volatilityRisk = Math.floor(Math.max(0, contact.volatility - 50) / 10);
  const exposureRisk = Math.floor(Math.max(0, contact.exposure - 50) / 15);

  return clampRisk(
    baseRiskChance +
      volatilityRisk +
      exposureRisk +
      (option?.riskModifier ?? 0),
  );
}

function getContactOptionDefinitions(
  definition: ContactDefinition,
): ContactOptionDefinition[] {
  return [
    ...UNIVERSAL_CONTACT_OPTIONS,
    ...definition.services.map((service) => ({
      ...service,
      kind: 'request_service' as const,
    })),
  ];
}

function getContactOptionDefinition(
  definition: ContactDefinition,
  optionId: ContactOptionId,
): ContactOptionDefinition | undefined {
  return getContactOptionDefinitions(definition).find((option) => option.id === optionId);
}

function getCostUnavailableReason(
  state: GameState,
  contact: ContactState,
  cost: Required<ContactServiceCost>,
): ContactOptionUnavailableReason | undefined {
  if (cost.resources > state.pressures.resources) {
    return 'not_enough_resources';
  }

  if (cost.intel > state.pressures.intel) {
    return 'not_enough_intel';
  }

  if (cost.trust > contact.trust) {
    return 'not_enough_trust';
  }

  if (cost.leverage > contact.leverage) {
    return 'not_enough_leverage';
  }

  return undefined;
}

function getRequirementUnavailableReason(
  state: GameState,
  contact: ContactState,
  requirements: readonly ContactServiceRequirement[] | undefined,
): ContactOptionUnavailableReason | undefined {
  if (!requirements) {
    return undefined;
  }

  for (const requirement of requirements) {
    if (requirement.type === 'min_trust' && contact.trust < requirement.value) {
      return 'requirement_not_met';
    }

    if (requirement.type === 'min_leverage' && contact.leverage < requirement.value) {
      return 'requirement_not_met';
    }

    if (
      requirement.type === 'operative_stress_available' &&
      !selectQuietTreatmentTarget(state)
    ) {
      return 'quiet_treatment_no_target';
    }
  }

  return undefined;
}

function getQuietTreatmentPreview(state: GameState): QuietTreatmentPreview | undefined {
  const operativeId = selectQuietTreatmentTarget(state);
  const operative = operativeId
    ? state.operatives.find((candidate) => candidate.id === operativeId)
    : undefined;
  const definition = operative ? getOperativeDefinition(operative.id) : undefined;

  if (!operative || !definition) {
    return undefined;
  }

  return {
    operativeId: operative.id,
    operativeName: definition.name,
    stressDelta: -10,
    currentStress: operative.stress,
    projectedStress: Math.max(0, operative.stress - 10),
  };
}

function normalizeCost(cost: ContactServiceCost | undefined): Required<ContactServiceCost> {
  return {
    resources: cost?.resources ?? 0,
    intel: cost?.intel ?? 0,
    trust: cost?.trust ?? 0,
    leverage: cost?.leverage ?? 0,
  };
}

function toCostRows(cost: Required<ContactServiceCost>): ContactCostRow[] {
  return [
    ...(cost.resources > 0
      ? [{ id: 'resources' as const, value: cost.resources }]
      : []),
    ...(cost.intel > 0
      ? [{ id: 'intel' as const, value: cost.intel }]
      : []),
    ...(cost.trust > 0
      ? [{ id: 'trust' as const, value: cost.trust }]
      : []),
    ...(cost.leverage > 0
      ? [{ id: 'leverage' as const, value: cost.leverage }]
      : []),
  ];
}

function toPressureCostDelta(cost: Required<ContactServiceCost>): PressureDelta {
  return normalizePressureDelta({
    resources: cost.resources > 0 ? -cost.resources : 0,
    intel: cost.intel > 0 ? -cost.intel : 0,
  });
}

function toLedgerEffectPreviews(
  ledgerEffects: readonly ContactLedgerEffectDefinition[] | undefined,
): ContactLedgerEffectPreview[] {
  return (ledgerEffects ?? []).flatMap((effect) => {
    const definition = getLedgerEntryDefinition(effect.definitionId);

    if (!definition) {
      return [];
    }

    return [
      {
        type: effect.type,
        definitionId: definition.id,
        entryName: definition.name,
        kind: definition.kind,
      },
    ];
  });
}

function mergePressureDeltas(base: PressureDelta, modifier: PressureDelta = {}): PressureDelta {
  const merged: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = (base[id] ?? 0) + (modifier[id] ?? 0);

    if (value !== 0) {
      merged[id] = value;
    }
  }

  return merged;
}

function normalizePressureDelta(delta: PressureDelta): PressureDelta {
  const normalized: PressureDelta = {};

  for (const id of PRESSURE_IDS) {
    const value = delta[id];

    if (value !== undefined && value !== 0) {
      normalized[id] = value;
    }
  }

  return normalized;
}

function normalizeContactDelta(delta: ContactMetricDelta = {}): ContactMetricDelta {
  const normalized: ContactMetricDelta = {};

  for (const id of ['trust', 'leverage', 'volatility', 'exposure'] as const) {
    const value = delta[id];

    if (value !== undefined && value !== 0) {
      normalized[id] = value;
    }
  }

  return normalized;
}

function clampRisk(value: number): number {
  return Math.min(45, Math.max(3, Math.round(value)));
}

function unavailable(
  reason: ContactOptionUnavailableReason,
  riskChance: number,
  definition?: ContactDefinition,
  contact?: ContactState,
  option?: ContactOptionDefinition,
): ContactOptionPreview {
  const cost = normalizeCost(option?.cost);
  const effects = normalizePressureDelta(option?.effects ?? {});
  const contactEffects = normalizeContactDelta(option?.contactEffects);

  return {
    ...(definition ? { contactId: definition.id, contactName: definition.name } : {}),
    ...(option
      ? {
          id: option.id,
          kind: option.kind,
          label: option.label,
          description: option.description,
        }
      : {}),
    affordable: false,
    ok: false,
    unavailableReason: reason,
    cost,
    costRows: toCostRows(cost),
    effects,
    resolvedDelta: mergePressureDeltas(effects, toPressureCostDelta(cost)),
    contactEffects,
    resolvedContactEffects: normalizeContactDelta({
      ...contactEffects,
      trust: (contactEffects.trust ?? 0) - cost.trust,
      leverage: (contactEffects.leverage ?? 0) - cost.leverage,
    }),
    ledgerEffects: toLedgerEffectPreviews(option?.ledgerEffects),
    rivalPressureEffects: { ...(option?.rivalPressureEffects ?? {}) },
    riskModifier: option?.riskModifier ?? 0,
    riskChance: clampRisk(riskChance),
  };
}
