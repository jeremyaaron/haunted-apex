import { getFrontDefinition } from '../content';
import { clampFrontExposure } from '../fronts';
import type { AccordFrontEffect, FrontState } from '../model';

export type AccordFrontEffectState = {
  fronts: Partial<Record<FrontState['id'], FrontState>>;
};

export type AccordFrontEffectPreview = {
  type: AccordFrontEffect['type'];
  frontId: FrontState['id'];
  frontName: string;
  currentExposure: number;
  exposureDelta: number;
  projectedExposure: number;
};

export function previewAccordFrontEffect(
  state: AccordFrontEffectState,
  effect: AccordFrontEffect,
): AccordFrontEffectPreview | undefined {
  if (effect.type !== 'cool_highest_exposure_front') {
    return undefined;
  }

  const front = selectHighestExposureFront(state);

  if (!front) {
    return undefined;
  }

  const definition = getFrontDefinition(front.definitionId);

  return {
    type: effect.type,
    frontId: front.id,
    frontName: definition?.name ?? front.id,
    currentExposure: front.exposure,
    exposureDelta: effect.exposureDelta,
    projectedExposure: clampFrontExposure(front.exposure + effect.exposureDelta),
  };
}

export function selectHighestExposureFront(state: AccordFrontEffectState): FrontState | undefined {
  return Object.values(state.fronts)
    .filter((front): front is FrontState => Boolean(front?.active))
    .sort(compareFrontExposurePriority)[0];
}

function compareFrontExposurePriority(left: FrontState, right: FrontState): number {
  if (left.exposure !== right.exposure) {
    return right.exposure - left.exposure;
  }

  const leftName = getFrontDefinition(left.definitionId)?.name ?? left.id;
  const rightName = getFrontDefinition(right.definitionId)?.name ?? right.id;
  const nameComparison = leftName.localeCompare(rightName);

  return nameComparison === 0 ? left.id.localeCompare(right.id) : nameComparison;
}
