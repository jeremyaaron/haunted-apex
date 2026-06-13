import {
  getActionDefinition,
  getAccordDefinition,
  getContactDefinition,
  getDistrictDefinition,
  getFactionDefinition,
  getFrontDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import type {
  ActionId,
  ActionTarget,
  DistrictArchetype,
  DistrictId,
  GameState,
  LedgerEntryKind,
  LedgerUseOptionId,
  OperativeId,
  OperativeRarity,
  OperativeRoleTag,
  PressureDelta,
  PressureId,
  RivalArchetype,
  RivalId,
  RivalPressureTier,
  VenueArchetype,
  VenueId,
} from '../model';
import { previewBrokerAccord, type BrokerAccordUnavailableReason } from '../accords';
import { previewFrontInvestment } from '../fronts';
import { getRivalPressureTier } from './rivals';
import { selectActiveLedgerEntryViews } from '../ledger';
import {
  selectManageContactTargetOptions,
  type ContactTargetOption,
} from '../contacts';

export type TerritoryTargetOption = {
  target: Exclude<ActionTarget, { type: 'recruit' }>;
  label: string;
  targetType: 'district' | 'venue' | 'rival';
  districtName?: string;
  rivalName?: string;
  controlledByRivalId?: RivalId;
  controlledByRivalName?: string;
};

export type RecruitTargetOption = {
  target: { type: 'recruit'; id: OperativeId };
  label: string;
  targetType: 'recruit';
  operativeId: OperativeId;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: readonly OperativeRoleTag[];
};

export type LedgerTargetOption = {
  target: { type: 'ledger'; entryId: string; useOptionId: LedgerUseOptionId };
  label: string;
  targetType: 'ledger';
  entryId: string;
  useOptionId: LedgerUseOptionId;
  entryName: string;
  useOptionLabel: string;
  kind: LedgerEntryKind;
  affordable: boolean;
  unavailableReason?: string;
};

export type FrontTargetOption = {
  target: Extract<ActionTarget, { type: 'front_opportunity' | 'front' }>;
  label: string;
  targetType: 'front_opportunity' | 'front';
  mode: 'establish' | 'upgrade' | 'cool';
  frontName: string;
  districtName?: string;
  venueName?: string;
  relatedRivalName?: string;
  affordable: boolean;
  unavailableReason?: string;
};

export type FactionAccordTargetOption = {
  target: Extract<ActionTarget, { type: 'faction' }>;
  label: string;
  targetType: 'faction';
  factionName: string;
  accordLabel: string;
  affordable: boolean;
  unavailableReason?: BrokerAccordUnavailableReason;
};

export type ActionTargetOption =
  | TerritoryTargetOption
  | RecruitTargetOption
  | LedgerTargetOption
  | FrontTargetOption
  | FactionAccordTargetOption
  | ContactTargetOption;

export type VenueTerritoryView = {
  id: VenueId;
  name: string;
  archetype: VenueArchetype;
  districtId: DistrictId;
  controllingRivalId?: RivalId;
  controllingRivalName?: string;
  wealthMod: number;
  intelMod: number;
  dominionMod: number;
  heatMod: number;
  loyaltyMod: number;
  ruinMod: number;
};

export type DistrictTerritoryView = {
  id: DistrictId;
  name: string;
  archetype: DistrictArchetype;
  control: number;
  heat: number;
  baseHeat: number;
  controllingRivalId?: RivalId;
  controllingRivalName?: string;
  venues: VenueTerritoryView[];
};

export type RivalTerritoryView = {
  id: RivalId;
  name: string;
  archetype: RivalArchetype;
  pressure: number;
  pressureTier: RivalPressureTier;
  disposition: number;
  active: boolean;
  preferredPressureAttack: Exclude<PressureId, 'ruin'>;
  controlledDistrictNames: string[];
  controlledVenueNames: string[];
};

export function selectActionTargetOptions(
  state: GameState,
  actionId: ActionId,
): ActionTargetOption[] {
  const action = getActionDefinition(actionId);

  if (!action) {
    return [];
  }

  const allowedTypes = new Set(action.allowedTargetTypes);
  const options: ActionTargetOption[] = [];

  if (allowedTypes.has('district')) {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      const controllerId = getTargetControllerId({
        type: 'district',
        id: district.id,
      });
      const controller = controllerId ? getRivalDefinition(controllerId) : undefined;

      options.push({
        target: {
          type: 'district',
          id: district.id,
        },
        label: district.name,
        targetType: 'district',
        districtName: district.name,
        controlledByRivalId: controller?.id,
        controlledByRivalName: controller?.name,
      });
    }
  }

  if (allowedTypes.has('venue')) {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      for (const venueId of district.venueIds) {
        const venue = getVenueDefinition(venueId);

        if (!venue) {
          continue;
        }

        const controllerId = getTargetControllerId({
          type: 'venue',
          id: venue.id,
        });
        const controller = controllerId ? getRivalDefinition(controllerId) : undefined;

        options.push({
          target: {
            type: 'venue',
            id: venue.id,
          },
          label: venue.name,
          targetType: 'venue',
          districtName: district.name,
          controlledByRivalId: controller?.id,
          controlledByRivalName: controller?.name,
        });
      }
    }
  }

  if (allowedTypes.has('rival')) {
    for (const rival of RIVAL_TERRITORY_RIVALS) {
      if (!state.rivals[rival.id]?.active) {
        continue;
      }

      options.push({
        target: {
          type: 'rival',
          id: rival.id,
        },
        label: rival.name,
        targetType: 'rival',
        rivalName: rival.name,
        controlledByRivalId: rival.id,
        controlledByRivalName: rival.name,
      });
    }
  }

  if (allowedTypes.has('recruit')) {
    for (const operativeId of state.hirePool) {
      const operative = getOperativeDefinition(operativeId);

      if (!operative) {
        continue;
      }

      options.push({
        target: {
          type: 'recruit',
          id: operative.id,
        },
        label: operative.name,
        targetType: 'recruit',
        operativeId: operative.id,
        archetype: operative.archetype,
        rarity: operative.rarity,
        roleTags: operative.roleTags,
      });
    }
  }

  if (allowedTypes.has('ledger')) {
    for (const entry of selectActiveLedgerEntryViews(state)) {
      for (const useOption of entry.useOptions) {
        options.push({
          target: {
            type: 'ledger',
            entryId: entry.id,
            useOptionId: useOption.id,
          },
          label: `${entry.name} - ${useOption.label}`,
          targetType: 'ledger',
          entryId: entry.id,
          useOptionId: useOption.id,
          entryName: entry.name,
          useOptionLabel: useOption.label,
          kind: entry.kind,
          affordable: useOption.affordable,
          unavailableReason: useOption.unavailableReason,
        });
      }
    }
  }

  if (allowedTypes.has('contact')) {
    options.push(...selectManageContactTargetOptions(state));
  }

  if (allowedTypes.has('front_opportunity')) {
    for (const opportunity of state.frontOpportunities) {
      const definition = getFrontDefinition(opportunity.definitionId);

      if (!definition) {
        continue;
      }

      const target = {
        type: 'front_opportunity' as const,
        id: opportunity.id,
      };
      const preview = previewFrontInvestment(state, target);
      const district = getDistrictDefinition(opportunity.districtId);
      const venue = opportunity.venueId ? getVenueDefinition(opportunity.venueId) : undefined;
      const rival = opportunity.relatedRivalId
        ? getRivalDefinition(opportunity.relatedRivalId)
        : undefined;

      options.push({
        target,
        label: `${definition.name} - Establish`,
        targetType: 'front_opportunity',
        mode: 'establish',
        frontName: definition.name,
        districtName: district?.name,
        venueName: venue?.name,
        relatedRivalName: rival?.name,
        affordable: preview.ok && state.pressures.resources >= preview.cost,
        ...(!preview.ok ? { unavailableReason: preview.unavailableReason } : {}),
        ...(preview.ok && state.pressures.resources < preview.cost
          ? { unavailableReason: 'not_enough_resources' }
          : {}),
      });
    }
  }

  if (allowedTypes.has('front')) {
    for (const front of Object.values(state.fronts)) {
      if (!front?.active) {
        continue;
      }

      const definition = getFrontDefinition(front.definitionId);

      if (!definition) {
        continue;
      }

      const target = {
        type: 'front' as const,
        id: front.id,
      };
      const district = getDistrictDefinition(front.districtId);
      const venue = front.venueId ? getVenueDefinition(front.venueId) : undefined;
      const rival = front.relatedRivalId ? getRivalDefinition(front.relatedRivalId) : undefined;
      const isLayLow = actionId === 'lay_low';
      const preview = isLayLow ? undefined : previewFrontInvestment(state, target);
      const affordable = isLayLow
        ? state.pressures.resources >= 300
        : Boolean(preview?.ok && state.pressures.resources >= preview.cost);

      options.push({
        target,
        label: `${definition.name} - ${isLayLow ? 'Cool Exposure' : 'Upgrade'}`,
        targetType: 'front',
        mode: isLayLow ? 'cool' : 'upgrade',
        frontName: definition.name,
        districtName: district?.name,
        venueName: venue?.name,
        relatedRivalName: rival?.name,
        affordable,
        ...(preview && !preview.ok ? { unavailableReason: preview.unavailableReason } : {}),
        ...(preview?.ok && state.pressures.resources < preview.cost
          ? { unavailableReason: 'not_enough_resources' }
          : {}),
        ...(isLayLow && state.pressures.resources < 300
          ? { unavailableReason: 'not_enough_resources' }
          : {}),
      });
    }
  }

  if (allowedTypes.has('faction')) {
    for (const factionId of state.activeFactionIds) {
      const factionDefinition = getFactionDefinition(factionId);

      if (!factionDefinition) {
        continue;
      }

      for (const accordId of factionDefinition.accordIds) {
        const accord = getAccordDefinition(accordId);

        if (!accord) {
          continue;
        }

        const target = {
          type: 'faction' as const,
          factionId,
          accordId,
        };
        const preview = previewBrokerAccord(state, target);

        options.push({
          target,
          label: `${factionDefinition.name} - ${accord.label}`,
          targetType: 'faction',
          factionName: factionDefinition.name,
          accordLabel: accord.label,
          affordable: preview.ok,
          ...(!preview.ok ? { unavailableReason: preview.unavailableReason } : {}),
        });
      }
    }
  }

  return options;
}

export function selectDistrictTerritoryViews(state: GameState): DistrictTerritoryView[] {
  return RIVAL_TERRITORY_DISTRICTS.map((contentDistrict) => {
    const district = getDistrictDefinition(contentDistrict.id);

    if (!district) {
      throw new Error(`Missing district definition for ${contentDistrict.id}`);
    }

    const districtState = state.districts[district.id];
    const controller = district.rivalId ? getRivalDefinition(district.rivalId) : undefined;

    return {
      id: district.id,
      name: district.name,
      archetype: district.archetype,
      control: districtState.control,
      heat: districtState.heat,
      baseHeat: district.baseHeat,
      ...(controller
        ? {
            controllingRivalId: controller.id,
            controllingRivalName: controller.name,
          }
        : {}),
      venues: district.venueIds.flatMap((venueId) => {
        const venue = getVenueDefinition(venueId);

        if (!venue) {
          return [];
        }

        const venueControllerId = venue.controllingRivalId ?? district.rivalId;
        const venueController = venueControllerId
          ? getRivalDefinition(venueControllerId)
          : undefined;

        return [
          {
            id: venue.id,
            name: venue.name,
            archetype: venue.archetype,
            districtId: venue.districtId,
            ...(venueController
              ? {
                  controllingRivalId: venueController.id,
                  controllingRivalName: venueController.name,
                }
              : {}),
            wealthMod: venue.wealthMod,
            intelMod: venue.intelMod,
            dominionMod: venue.dominionMod,
            heatMod: venue.heatMod,
            loyaltyMod: venue.loyaltyMod,
            ruinMod: venue.ruinMod,
          },
        ];
      }),
    };
  });
}

export function selectRivalTerritoryViews(state: GameState): RivalTerritoryView[] {
  return RIVAL_TERRITORY_RIVALS.map((rival) => {
    const rivalState = state.rivals[rival.id];

    return {
      id: rival.id,
      name: rival.name,
      archetype: rival.archetype,
      pressure: rivalState.pressure,
      pressureTier: getRivalPressureTier(rivalState.pressure),
      disposition: rivalState.disposition,
      active: rivalState.active,
      preferredPressureAttack: rival.preferredPressureAttack,
      controlledDistrictNames: rival.controlledDistrictIds.flatMap(
        (districtId) => getDistrictDefinition(districtId)?.name ?? [],
      ),
      controlledVenueNames: rival.controlledVenueIds.flatMap(
        (venueId) => getVenueDefinition(venueId)?.name ?? [],
      ),
    };
  });
}

export function resolveTargetDistrictId(target?: ActionTarget): DistrictId | undefined {
  if (!target) {
    return undefined;
  }

  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.id;
    case 'venue':
      return getVenueDefinition(target.id)?.districtId;
    case 'rival':
    case 'recruit':
    case 'ledger':
    case 'contact':
    case 'front_opportunity':
    case 'front':
    case 'faction':
      return undefined;
  }
}

export function getTargetTags(target?: ActionTarget): string[] {
  if (!target) {
    return [];
  }

  switch (target.type) {
    case 'district':
      return [...(getDistrictDefinition(target.id)?.tags ?? [])];
    case 'venue': {
      const venue = getVenueDefinition(target.id);
      const district = venue ? getDistrictDefinition(venue.districtId) : undefined;
      return [...new Set([...(district?.tags ?? []), ...(venue?.tags ?? [])])];
    }
    case 'rival':
      return [...(getRivalDefinition(target.id)?.traits ?? [])];
    case 'contact':
      return [...(getContactDefinition(target.contactId)?.roleTags ?? [])];
    case 'faction': {
      const faction = getFactionDefinition(target.factionId);
      const accord = getAccordDefinition(target.accordId);
      return [...new Set([...(faction?.roleTags ?? []), ...(accord?.tags ?? [])])];
    }
    case 'recruit':
    case 'ledger':
    case 'front_opportunity':
    case 'front':
      return [];
  }
}

export function getTargetControllerId(target?: ActionTarget): RivalId | undefined {
  if (!target) {
    return undefined;
  }

  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.rivalId;
    case 'venue': {
      const venue = getVenueDefinition(target.id);

      if (!venue) {
        return undefined;
      }

      return (
        venue.controllingRivalId ?? getDistrictDefinition(venue.districtId)?.rivalId
      );
    }
    case 'rival':
      return getRivalDefinition(target.id)?.id;
    case 'contact':
      return getContactDefinition(target.contactId)?.associatedRivalId;
    case 'faction': {
      const faction = getFactionDefinition(target.factionId);
      return faction?.associatedRivalIds?.[0];
    }
    case 'recruit':
    case 'ledger':
    case 'front_opportunity':
    case 'front':
      return undefined;
  }
}

export function getTargetLabel(target?: ActionTarget, state?: GameState): string | undefined {
  if (!target) {
    return undefined;
  }

  switch (target.type) {
    case 'district':
      return getDistrictDefinition(target.id)?.name;
    case 'venue':
      return getVenueDefinition(target.id)?.name;
    case 'rival':
      return getRivalDefinition(target.id)?.name;
    case 'recruit':
      return getOperativeDefinition(target.id)?.name;
    case 'contact': {
      const contact = getContactDefinition(target.contactId);
      const option = contact?.services.find((candidate) => candidate.id === target.optionId);
      const universalLabel =
        target.optionId === 'cultivate'
          ? 'Cultivate'
          : target.optionId === 'pressure'
            ? 'Pressure'
            : undefined;

      return contact
        ? `${contact.name} - ${option?.label ?? universalLabel ?? target.optionId}`
        : target.contactId;
    }
    case 'ledger': {
      const entry = state?.ledger.entries.find((candidate) => candidate.id === target.entryId);
      const definition = entry ? getLedgerEntryDefinition(entry.definitionId) : undefined;
      const useOption = definition?.useOptions.find(
        (candidate) => candidate.id === target.useOptionId,
      );

      return definition && useOption
        ? `${definition.name} - ${useOption.label}`
        : target.entryId;
    }
    case 'front_opportunity': {
      const opportunity = state?.frontOpportunities.find(
        (candidate) => candidate.id === target.id,
      );
      const definition = opportunity ? getFrontDefinition(opportunity.definitionId) : undefined;

      return definition ? `${definition.name} - Establish` : target.id;
    }
    case 'front': {
      const front = state?.fronts[target.id];
      const definition = front ? getFrontDefinition(front.definitionId) : undefined;

      return definition?.name ?? getFrontDefinition(target.id)?.name ?? target.id;
    }
    case 'faction': {
      const faction = getFactionDefinition(target.factionId);
      const accord = getAccordDefinition(target.accordId);

      return faction && accord ? `${faction.name} - ${accord.label}` : target.factionId;
    }
  }
}

export function calculateTargetControlGain(
  actionId: ActionId,
  target?: ActionTarget,
  operativeModifier = 0,
): number {
  if (
    !target ||
    target.type === 'rival' ||
    target.type === 'recruit' ||
    target.type === 'ledger' ||
    target.type === 'contact' ||
    target.type === 'front_opportunity' ||
    target.type === 'front' ||
    target.type === 'faction'
  ) {
    return 0;
  }

  switch (actionId) {
    case 'expand_influence':
      return (target.type === 'district' ? 12 : 8) + operativeModifier;
    case 'run_small_job':
      return 3 + operativeModifier;
    case 'gather_intel':
      return 1 + operativeModifier;
    case 'bribe_official':
    case 'recruit_operative':
    case 'lay_low':
    case 'work_the_ledger':
    case 'manage_contact':
    case 'invest_front':
    case 'broker_accord':
      return 0;
  }
}

export function calculateTargetLocalHeatGain(
  effects: PressureDelta,
  target?: ActionTarget,
): number {
  if (!resolveTargetDistrictId(target)) {
    return 0;
  }

  return Math.ceil(Math.max(0, effects.heat ?? 0) / 3);
}
