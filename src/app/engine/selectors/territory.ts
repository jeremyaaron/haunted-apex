import {
  getActionDefinition,
  getDistrictDefinition,
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
import { getRivalPressureTier } from './rivals';

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

export type ActionTargetOption = TerritoryTargetOption | RecruitTargetOption;

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
    case 'recruit':
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
    case 'recruit':
      return undefined;
  }
}

export function getTargetLabel(target?: ActionTarget): string | undefined {
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
  }
}

export function calculateTargetControlGain(
  actionId: ActionId,
  target?: ActionTarget,
  operativeModifier = 0,
): number {
  if (!target || target.type === 'rival' || target.type === 'recruit') {
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
