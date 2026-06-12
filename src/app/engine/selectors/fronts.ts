import {
  getDistrictDefinition,
  getFrontDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import {
  calculateFrontWeeklyYield,
  deriveFrontStatus,
  getOwnedActiveFrontCount,
  OWNED_FRONT_CAP,
  previewFrontInvestment,
  type FrontInvestmentPreview,
  type FrontInvestmentRivalWarning,
  type FrontInvestmentUnavailableReason,
} from '../fronts';
import type {
  FrontArchetype,
  FrontId,
  FrontRoleTag,
  FrontState,
  FrontStatus,
  GameState,
} from '../model';
import { pressureDeltaToView, type PressureDeltaView } from './previews';

export type FrontPanelView = {
  ownedCount: number;
  cap: number;
  capReached: boolean;
  ownedFronts: OwnedFrontView[];
  opportunities: FrontOpportunityView[];
};

export type FrontInvestmentPanelView = {
  available: boolean;
  mode: 'establish' | 'upgrade';
  cost?: number;
  immediateEffects: PressureDeltaView[];
  weeklyYield: PressureDeltaView[];
  districtControlYield: number;
  exposureChange?: number;
  projectedExposure?: number;
  projectedStatus?: FrontStatus;
  weeklyExposureGain?: number;
  rivalPressureWarning?: FrontInvestmentRivalWarning;
  unavailableReason?: FrontInvestmentPanelUnavailableReason;
};

export type FrontInvestmentPanelUnavailableReason =
  | FrontInvestmentUnavailableReason
  | 'not_enough_resources';

export type OwnedFrontView = {
  id: FrontId;
  name: string;
  archetype: FrontArchetype;
  roleTags: readonly FrontRoleTag[];
  level: number;
  maxLevel: number;
  status: FrontStatus;
  exposure: number;
  active: boolean;
  compromised: boolean;
  districtName: string;
  venueName?: string;
  relatedRivalName?: string;
  weeklyYield: PressureDeltaView[];
  weeklyExposureGain: number;
  districtControlYield: number;
  establishedWeek: number;
  lastYieldSummary?: FrontYieldSummaryView;
  upgrade: FrontInvestmentPanelView;
};

export type FrontOpportunityView = {
  id: string;
  name: string;
  archetype: FrontArchetype;
  roleTags: readonly FrontRoleTag[];
  districtName: string;
  venueName?: string;
  relatedRivalName?: string;
  establish: FrontInvestmentPanelView;
};

export type FrontYieldSummaryView = {
  week: number;
  effects: PressureDeltaView[];
  exposureDelta: number;
};

export function selectFrontPanelView(state: GameState): FrontPanelView {
  const ownedCount = getOwnedActiveFrontCount(state);

  return {
    ownedCount,
    cap: OWNED_FRONT_CAP,
    capReached: ownedCount >= OWNED_FRONT_CAP,
    ownedFronts: Object.values(state.fronts)
      .filter((front): front is FrontState => front !== undefined)
      .map((front) => selectOwnedFrontView(state, front))
      .sort((left, right) => left.name.localeCompare(right.name)),
    opportunities: state.frontOpportunities
      .flatMap((opportunity) => {
        const definition = getFrontDefinition(opportunity.definitionId);

        if (!definition) {
          return [];
        }

        return [
          {
            id: opportunity.id,
            name: definition.name,
            archetype: definition.archetype,
            roleTags: definition.roleTags,
            districtName: getDistrictDefinition(opportunity.districtId)?.name ?? opportunity.districtId,
            ...(opportunity.venueId
              ? {
                  venueName:
                    getVenueDefinition(opportunity.venueId)?.name ?? opportunity.venueId,
                }
              : {}),
            ...(opportunity.relatedRivalId
              ? {
                  relatedRivalName:
                    getRivalDefinition(opportunity.relatedRivalId)?.name ??
                    opportunity.relatedRivalId,
                }
              : {}),
            establish: toInvestmentPanelView(
              previewFrontInvestment(state, {
                type: 'front_opportunity',
                id: opportunity.id,
              }),
              state,
            ),
          },
        ];
      })
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function selectOwnedFrontView(state: GameState, front: FrontState): OwnedFrontView {
  const definition = getFrontDefinition(front.definitionId);

  if (!definition) {
    throw new Error(`Missing Front definition ${front.definitionId}`);
  }

  const weeklyYield = calculateFrontWeeklyYield(front, definition);
  const lastYield = front.yieldHistory.at(-1);

  return {
    id: front.id,
    name: definition.name,
    archetype: definition.archetype,
    roleTags: definition.roleTags,
    level: front.level,
    maxLevel: definition.maxLevel,
    status: deriveFrontStatus(front.exposure),
    exposure: front.exposure,
    active: front.active,
    compromised: front.compromised,
    districtName: getDistrictDefinition(front.districtId)?.name ?? front.districtId,
    ...(front.venueId
      ? { venueName: getVenueDefinition(front.venueId)?.name ?? front.venueId }
      : {}),
    ...(front.relatedRivalId
      ? {
          relatedRivalName:
            getRivalDefinition(front.relatedRivalId)?.name ?? front.relatedRivalId,
        }
      : {}),
    weeklyYield: pressureDeltaToView(weeklyYield),
    weeklyExposureGain: definition.exposurePerWeek,
    districtControlYield: definition.districtControlYield ?? 0,
    establishedWeek: front.establishedWeek,
    ...(lastYield
      ? {
          lastYieldSummary: {
            week: lastYield.week,
            effects: pressureDeltaToView(lastYield.effects),
            exposureDelta: lastYield.exposureDelta,
          },
        }
      : {}),
    upgrade: toInvestmentPanelView(
      previewFrontInvestment(state, {
        type: 'front',
        id: front.id,
      }),
      state,
    ),
  };
}

function toInvestmentPanelView(
  preview: FrontInvestmentPreview,
  state?: GameState,
): FrontInvestmentPanelView {
  if (!preview.ok) {
    return {
      available: false,
      mode: preview.mode ?? 'establish',
      immediateEffects: [],
      weeklyYield: [],
      districtControlYield: 0,
      unavailableReason: preview.unavailableReason,
    };
  }

  const affordable = state ? state.pressures.resources >= preview.cost : true;

  return {
    available: affordable,
    mode: preview.mode,
    cost: preview.cost,
    immediateEffects: pressureDeltaToView(preview.effects),
    weeklyYield: pressureDeltaToView(preview.weeklyYield),
    districtControlYield: preview.districtControlYield,
    exposureChange: preview.exposureChange,
    projectedExposure: preview.projectedExposure,
    projectedStatus: preview.projectedStatus,
    weeklyExposureGain: preview.weeklyExposureGain,
    ...(preview.rivalPressureWarning
      ? { rivalPressureWarning: preview.rivalPressureWarning }
      : {}),
    ...(!affordable ? { unavailableReason: 'not_enough_resources' as const } : {}),
  };
}
