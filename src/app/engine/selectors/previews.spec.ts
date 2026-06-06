import { getActionDefinition } from '../content';
import { newGame } from '../simulation';
import {
  calculateRiskChance,
  getActionPreview,
  getOrderAvailability,
  pressureDeltaToView,
  riskLabel,
  selectActionCards,
} from './previews';

describe('action previews', () => {
  it('includes resource cost and pressure effects', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel');

    expect(preview).toEqual(
      jasmine.objectContaining({
        actionId: 'gather_intel',
        commandCost: 1,
        resourceCost: 400,
        adjustedResourceCost: 400,
        baseEffects: {
          intel: 10,
          heat: 2,
        },
        adjustedEffects: {
          intel: 10,
          heat: 2,
        },
      }),
    );
  });

  it('applies Mara Voss Gather Intel modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel', 'op_mara_voss');

    expect(preview?.adjustedEffects).toEqual({
      heat: 1,
      intel: 10,
    });
    expect(preview?.riskLabel).toBe('Very Low');
  });

  it('applies Juno Hex Gather Intel modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'gather_intel', 'op_juno_hex');

    expect(preview?.adjustedEffects).toEqual({
      heat: 2,
      intel: 13,
      ruin: 1,
    });
  });

  it('applies Saint Calder Bribe Official modifier', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const preview = getActionPreview(state, 'bribe_official', 'op_saint_calder');

    expect(preview?.resourceCost).toBe(1200);
    expect(preview?.adjustedResourceCost).toBe(900);
    expect(preview?.adjustedEffects).toEqual({
      heat: -12,
      intel: 2,
      ruin: 2,
    });
  });

  it('maps qualitative risk labels at configured thresholds', () => {
    expect(riskLabel(3)).toBe('Very Low');
    expect(riskLabel(6)).toBe('Very Low');
    expect(riskLabel(7)).toBe('Low');
    expect(riskLabel(14)).toBe('Low');
    expect(riskLabel(15)).toBe('Moderate');
    expect(riskLabel(24)).toBe('Moderate');
    expect(riskLabel(25)).toBe('High');
    expect(riskLabel(34)).toBe('High');
    expect(riskLabel(35)).toBe('Severe');
  });

  it('calculates risk from skill, stress, and loyalty', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const action = getActionDefinition('expand_influence');
    const saint = state.operatives.find((operative) => operative.id === 'op_saint_calder');

    if (!action || !saint) {
      fail('Expected action and operative to exist');
      return;
    }

    expect(calculateRiskChance(action, saint)).toBe(10);
  });

  it('marks unaffordable actions unavailable', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const brokeState = {
      ...state,
      pressures: {
        ...state.pressures,
        resources: 300,
      },
    };

    expect(getOrderAvailability(brokeState, { actionId: 'gather_intel' })).toEqual({
      available: false,
      reason: 'not_enough_resources',
    });
  });

  it('marks action cards with availability and operative options', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const cards = selectActionCards(state);
    const recruitCard = cards.find((card) => card.actionId === 'recruit_operative');

    expect(cards.length).toBe(6);
    expect(recruitCard?.state).toBe('available');
    expect(recruitCard?.availableOperatives.every((operative) => operative.disabled)).toBeTrue();
    expect(recruitCard?.availableOperatives[0].reason).toBe('operative_not_allowed');
  });

  it('converts pressure deltas into stable display rows', () => {
    expect(pressureDeltaToView({ heat: -2, intel: 4 })).toEqual([
      {
        id: 'heat',
        value: -2,
      },
      {
        id: 'intel',
        value: 4,
      },
    ]);
  });
});
