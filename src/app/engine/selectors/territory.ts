import {
  getActionDefinition,
  getDistrictDefinition,
  getRivalDefinition,
  getVenueDefinition,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
} from '../content';
import type {
  ActionId,
  ActionTarget,
  DistrictId,
  GameState,
  PressureDelta,
  RivalId,
} from '../model';

export type ActionTargetOption = {
  target: ActionTarget;
  label: string;
  targetType: ActionTarget['type'];
  districtName?: string;
  rivalName?: string;
  controlledByRivalId?: RivalId;
  controlledByRivalName?: string;
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

  return options;
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
  }
}

export function calculateTargetControlGain(
  actionId: ActionId,
  target?: ActionTarget,
): number {
  if (!target || target.type === 'rival') {
    return 0;
  }

  switch (actionId) {
    case 'expand_influence':
      return target.type === 'district' ? 12 : 8;
    case 'run_small_job':
      return 3;
    case 'gather_intel':
      return 1;
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
