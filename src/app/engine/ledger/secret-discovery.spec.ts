import { addLedgerEntry } from './add-ledger-entry';
import { previewSecretDiscovery } from './secret-discovery';
import { newGame, resolveQueuedOrder } from '../simulation';
import { materializeOperativeState } from '../roster';
import type { ActionTarget, GameState, LedgerEntryDefinitionId, QueuedOrder } from '../model';

describe('Secret discovery', () => {
  const ghostlineTarget = {
    type: 'district',
    id: 'district_ghostline_market',
  } as const satisfies ActionTarget;
  const chromeTarget = {
    type: 'district',
    id: 'district_chrome_narrows',
  } as const satisfies ActionTarget;
  const nyxTarget = {
    type: 'rival',
    id: 'rival_nyx_ardent',
  } as const satisfies ActionTarget;

  it('does not preview a Secret chance for untargeted Gather Intel', () => {
    const preview = previewSecretDiscovery(newGame({ seed: 'SECRET-UNTARGETED' }), {
      actionId: 'gather_intel',
    });

    expect(preview).toEqual({
      eligible: false,
      chance: 0,
      candidateDefinitionIds: [],
      candidates: [],
    });
  });

  it('previews an exact targeted Gather Intel Secret chance', () => {
    const preview = previewSecretDiscovery(newGame({ seed: 'SECRET-TARGETED' }), {
      actionId: 'gather_intel',
      target: ghostlineTarget,
    });

    expect(preview).toEqual(
      jasmine.objectContaining({
        eligible: true,
        chance: 23,
      }),
    );
    expect(preview.candidateDefinitionIds).toContain('secret_ghostline_buyer_list');
    expect(preview.candidateDefinitionIds).toContain('secret_dead_channel_trace');
  });

  it('responds to target context and assigned operative Stress', () => {
    const base = newGame({ seed: 'SECRET-STRESS' });
    const state = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          stress: 90,
        },
      ],
    };
    const calm = previewSecretDiscovery(base, {
      actionId: 'gather_intel',
      target: ghostlineTarget,
    });
    const stressed = previewSecretDiscovery(state, {
      actionId: 'gather_intel',
      assignedOperativeId: 'op_mara_voss',
      target: ghostlineTarget,
    });
    const rival = previewSecretDiscovery(base, {
      actionId: 'gather_intel',
      target: nyxTarget,
    });

    expect(calm.chance).toBe(23);
    expect(stressed.chance).toBe(8);
    expect(rival.chance).toBe(22);
  });

  it('reduces duplicate candidate weight without blocking non-unique repeats', () => {
    const base = newGame({ seed: 'SECRET-DUPLICATE' });
    const duplicate = addLedgerEntry(base, {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: chromeTarget,
      },
    });
    const basePreview = previewSecretDiscovery(base, {
      actionId: 'gather_intel',
      target: chromeTarget,
    });
    const duplicatePreview = previewSecretDiscovery(duplicate, {
      actionId: 'gather_intel',
      target: chromeTarget,
    });
    const basePatrol = basePreview.candidates.find(
      (candidate) => candidate.definitionId === 'secret_patrol_schedule',
    );
    const duplicatePatrol = duplicatePreview.candidates.find(
      (candidate) => candidate.definitionId === 'secret_patrol_schedule',
    );

    expect(basePatrol?.weight).toBeGreaterThan(duplicatePatrol?.weight ?? 0);
    expect(duplicatePatrol?.duplicateCount).toBe(1);
  });

  it('does not rediscover active unique definitions', () => {
    const state = addLedgerEntry(newGame({ seed: 'SECRET-UNIQUE' }), {
      definitionId: 'secret_nyx_velvet_ledger',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: nyxTarget,
      },
    });
    const preview = previewSecretDiscovery(state, {
      actionId: 'gather_intel',
      target: nyxTarget,
    });

    expect(preview.candidateDefinitionIds).not.toContain('secret_nyx_velvet_ledger');
  });

  it('can discover a deterministic Secret with source and target context', () => {
    const seeded = findDiscoverySeed(ghostlineTarget);
    const order = createGatherIntelOrder(ghostlineTarget);
    const preview = previewSecretDiscovery(seeded, order);
    const result = resolveQueuedOrder(seeded, order);
    const entry = result.state.ledger.entries.at(-1);

    expect(preview.eligible).toBeTrue();
    expect(result.state.ledger.entries).toHaveSize(1);
    expect(entry).toEqual(
      jasmine.objectContaining({
        kind: 'secret',
        source: {
          type: 'action',
          actionId: 'gather_intel',
          target: ghostlineTarget,
        },
        relatedTarget: ghostlineTarget,
        flags: jasmine.objectContaining({
          discoveryChance: preview.chance,
        }),
      }),
    );
  });

  it('does not reduce raw Intel gain when discovery succeeds', () => {
    const seeded = findDiscoverySeed(ghostlineTarget);
    const order = createGatherIntelOrder(ghostlineTarget);
    const result = resolveQueuedOrder(seeded, order);

    expect(result.state.ledger.entries.length).toBeGreaterThan(0);
    expect(result.state.pressures.intel).toBeGreaterThan(seeded.pressures.intel);
  });

  function createGatherIntelOrder(target: ActionTarget): QueuedOrder {
    return {
      id: 'order_1_1',
      actionId: 'gather_intel',
      target,
    };
  }

  function findDiscoverySeed(
    target: ActionTarget,
    expectedDefinitionId?: LedgerEntryDefinitionId,
  ): GameState {
    for (let index = 1; index <= 500; index += 1) {
      const state = newGame({ seed: `SECRET-FIND-${index}` });
      const result = resolveQueuedOrder(state, createGatherIntelOrder(target));
      const entry = result.state.ledger.entries[0];

      if (!entry) {
        continue;
      }

      if (!expectedDefinitionId || entry.definitionId === expectedDefinitionId) {
        return state;
      }
    }

    throw new Error('Expected to find a deterministic Secret discovery seed.');
  }
});
