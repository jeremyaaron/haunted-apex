import { getActionDefinition } from '../content';
import type {
  ActionId,
  ActionTarget,
  GameState,
  ModifierCondition,
  OperativeId,
} from '../model';
import { getActionPreview } from '../selectors';
import { newGame } from '../simulation';
import { materializeOperativeState } from './operative-state';
import {
  calculateOperativeModifiers,
  matchesModifierCondition,
} from './operative-modifiers';

describe('operative modifiers', () => {
  it('applies Mara Voss action and nightlife modifiers together', () => {
    const result = modifiersFor('op_mara_voss', 'gather_intel', {
      type: 'venue',
      id: 'venue_pale_circuit',
    });

    expect(result.effects).toEqual({ heat: -1, intel: 2 });
    expect(result.riskModifier).toBe(-4);
    expect(result.appliedSources.map((source) => source.sourceId)).toEqual([
      'clean_entry_gather_intel',
      'mara_nightlife',
    ]);
  });

  it('stacks Juno Hex action and memory modifiers', () => {
    const result = modifiersFor('op_juno_hex', 'gather_intel', {
      type: 'venue',
      id: 'venue_glass_saint',
    });

    expect(result.effects).toEqual({ intel: 7, ruin: 3 });
    expect(result.stressModifier).toBe(4);
  });

  it('applies Saint Calder bribe and influence anchors', () => {
    expect(modifiersFor('op_saint_calder', 'bribe_official').resourceCostModifier).toBe(-300);
    expect(modifiersFor('op_saint_calder', 'expand_influence').effects).toEqual({
      dominion: 3,
    });
  });

  it('applies Iris Vale nightlife and Nyx leverage anchors', () => {
    const nightlife = modifiersFor('op_iris_vale', 'gather_intel', {
      type: 'venue',
      id: 'venue_pale_circuit',
    });
    const directNyx = modifiersFor('op_iris_vale', 'bribe_official', {
      type: 'rival',
      id: 'rival_nyx_ardent',
    });
    const controlledByNyx = modifiersFor('op_iris_vale', 'expand_influence', {
      type: 'district',
      id: 'district_violet_ward',
    });

    expect(nightlife.effects).toEqual({ dominion: 1, intel: 2 });
    expect(nightlife.riskModifier).toBe(-2);
    expect(nightlife.rivalPressureModifier).toBe(2);
    expect(directNyx.effects).toEqual({ dominion: 1 });
    expect(directNyx.rivalPressureModifier).toBe(2);
    expect(controlledByNyx.effects).toEqual({ dominion: 1, intel: 2 });
    expect(controlledByNyx.rivalPressureModifier).toBe(2);
  });

  it('stacks Knox Riven small-job and violence modifiers', () => {
    const result = modifiersFor('op_knox_riven', 'run_small_job', {
      type: 'venue',
      id: 'venue_zero_mercy',
    });

    expect(result.effects).toEqual({
      dominion: 2,
      heat: 5,
      resources: 700,
    });
  });

  it('applies Orchid Seven to Ghostline and smuggling contexts', () => {
    expect(
      modifiersFor('op_orchid_seven', 'gather_intel', {
        type: 'district',
        id: 'district_ghostline_market',
      }).effects,
    ).toEqual({ heat: -1, intel: 2, resources: 300 });
    expect(
      modifiersFor('op_orchid_seven', 'run_small_job', {
        type: 'district',
        id: 'district_chrome_narrows',
      }).effects,
    ).toEqual({ heat: -1, intel: 2, resources: 300 });
  });

  it('applies Vant Black action and industrial anchors', () => {
    const result = modifiersFor('op_vant_black', 'gather_intel', {
      type: 'district',
      id: 'district_chrome_narrows',
    });

    expect(result.effects).toEqual({ heat: -1, intel: 3 });
    expect(result.riskModifier).toBe(-4);
  });

  it('applies Echo Saint recovery and memory anchors', () => {
    const recovery = modifiersFor('op_echo_saint', 'lay_low');
    const memory = modifiersFor('op_echo_saint', 'gather_intel', {
      type: 'venue',
      id: 'venue_black_halo_exchange',
    });

    expect(recovery.effects).toEqual({ ruin: -2 });
    expect(recovery.stressModifier).toBe(-4);
    expect(memory.effects).toEqual({ heat: 1, intel: 2, ruin: -1 });
    expect(memory.stressModifier).toBe(-2);
  });

  it('applies Rook Vale cost, Control, and high Local Heat anchors', () => {
    const state = stateWithOperative('op_rook_vale');
    const heatedState: GameState = {
      ...state,
      districts: {
        ...state.districts,
        district_violet_ward: {
          ...state.districts.district_violet_ward,
          heat: 60,
        },
      },
    };
    const target = {
      type: 'venue',
      id: 'venue_pale_circuit',
    } as const;
    const influence = calculateFor(
      heatedState,
      'op_rook_vale',
      'expand_influence',
      target,
    );

    expect(modifiersFor('op_rook_vale', 'bribe_official').resourceCostModifier).toBe(-300);
    expect(influence.districtControlModifier).toBe(2);
    expect(influence.effects).toEqual({ heat: 2 });
    expect(influence.riskModifier).toBe(3);
  });

  it('applies Mother Neon recruitment modifiers from the selected candidate', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const target = {
      type: 'recruit',
      id: 'op_mother_neon',
    } as const;
    const preview = getActionPreview(state, 'recruit_operative', undefined, target);

    expect(preview?.adjustedResourceCost).toBe(1300);
    expect(preview?.adjustedEffects).toEqual({
      dominion: 3,
      loyalty: 2,
      ruin: 2,
    });
    expect(preview?.selectedOperative).toEqual(
      jasmine.objectContaining({
        operativeId: 'op_mother_neon',
        name: 'Mother Neon',
        recruitCandidate: true,
        stress: 18,
        projectedStress: 18,
      }),
    );
  });

  it('applies Mother Neon recovery modifiers when she is active', () => {
    const result = modifiersFor('op_mother_neon', 'lay_low');

    expect(result.effects).toEqual({ loyalty: 2 });
    expect(result.stressModifier).toBe(-2);
  });

  it('requires all condition fields while using any-match array semantics', () => {
    const state = stateWithOperative('op_mara_voss');
    const action = requireAction('gather_intel');
    const operative = state.operatives[0];
    const context = {
      state,
      action,
      operative,
      target: {
        type: 'venue',
        id: 'venue_pale_circuit',
      } as const,
    };
    const matching: ModifierCondition = {
      actionIds: ['gather_intel', 'bribe_official'],
      targetTags: ['nightlife', 'memory'],
      rivalIds: ['rival_nyx_ardent'],
      minPressure: { heat: 10 },
      maxPressure: { heat: 50 },
      maxStressTier: 'strained',
    };

    expect(matchesModifierCondition(matching, context)).toBeTrue();
    expect(
      matchesModifierCondition(
        {
          ...matching,
          minLocalHeat: 21,
        },
        context,
      ),
    ).toBeFalse();
  });

  it('does not expose non-matching or hidden condition data in applied sources', () => {
    const result = modifiersFor('op_mara_voss', 'bribe_official');

    expect(result.appliedSources).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('breakingEventIds');
    expect(JSON.stringify(result)).not.toContain('condition');
  });
});

function modifiersFor(
  operativeId: OperativeId,
  actionId: ActionId,
  target?: ActionTarget,
) {
  const state = stateWithOperative(operativeId);
  return calculateFor(state, operativeId, actionId, target);
}

function calculateFor(
  state: GameState,
  operativeId: OperativeId,
  actionId: ActionId,
  target?: ActionTarget,
) {
  const action = requireAction(actionId);
  const operative = state.operatives.find((candidate) => candidate.id === operativeId);

  if (!operative) {
    throw new Error(`Missing operative state for ${operativeId}`);
  }

  return calculateOperativeModifiers({
    state,
    action,
    operative,
    target,
  });
}

function stateWithOperative(operativeId: OperativeId): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

  return {
    ...state,
    operatives: [materializeOperativeState(operativeId)],
  };
}

function requireAction(actionId: ActionId) {
  const action = getActionDefinition(actionId);

  if (!action) {
    throw new Error(`Missing action ${actionId}`);
  }

  return action;
}
