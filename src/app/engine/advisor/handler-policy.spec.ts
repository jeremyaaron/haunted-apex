import type { GameState } from '../model';
import { queueOrder, newGame } from '../simulation';
import {
  assessQueuedPlan,
  buildCommandPlans,
  isRecommendedAction,
  isRecommendedTarget,
  recommendHandlerCommand,
} from './handler-policy';
import { getActionTargetKey } from './legal-options';

describe('Handler command policy', () => {
  it('recommends a legal, explainable command plan', () => {
    const state = newGame({ seed: 'HANDLER-COMMAND-LEGAL' });
    const recommendation = recommendHandlerCommand({ state });

    expect(recommendation.phase).toBe('command');
    expect(recommendation.recommendedOrders.length).toBeGreaterThan(0);
    expect(recommendation.recommendedOrders.length).toBeLessThanOrEqual(2);
    expect(recommendation.invalidRecommendations).toEqual([]);
    expect(recommendation.planAssessment).toContain('Recommended plan');
    expect(recommendation.recommendedOrders.every((order) => order.reason.length > 30)).toBeTrue();
    expect(recommendation.recommendedOrders.every((order) => order.reasonCodes.length > 0))
      .toBeTrue();

    expect(queueRecommendedOrders(state, recommendation.recommendedOrders).ok).toBeTrue();
  });

  it('does not mutate the input state while building recommendations', () => {
    const state = newGame({ seed: 'HANDLER-COMMAND-NONMUTATING' });
    const before = structuredClone(state);

    recommendHandlerCommand({ state });

    expect(state).toEqual(before);
  });

  it('builds current-turn two-order combinations when command points allow', () => {
    const state = newGame({ seed: 'HANDLER-COMMAND-COMBOS' });
    const plans = buildCommandPlans(state);

    expect(plans.some((plan) => plan.orders.length === 2)).toBeTrue();
    expect(plans.every((plan) => plan.orders.length <= state.commandPointsPerWeek)).toBeTrue();
  });

  it('adapts to a partially queued order and recommends only remaining command', () => {
    const initial = newGame({ seed: 'HANDLER-COMMAND-PARTIAL' });
    const operativeId = initial.operatives[0].id;
    const queued = queueOrder(initial, {
      actionId: 'gather_intel',
      assignedOperativeId: operativeId,
    });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const recommendation = recommendHandlerCommand({ state: queued.state });

    expect(recommendation.recommendedOrders.length).toBeLessThanOrEqual(1);
    expect(
      recommendation.recommendedOrders.some((order) => order.assignedOperativeId === operativeId),
    ).toBeFalse();
    expect(queueRecommendedOrders(queued.state, recommendation.recommendedOrders).ok).toBeTrue();
  });

  it('includes existing queued orders when scoring partial-queue plans', () => {
    const initial = newGame({ seed: 'HANDLER-COMMAND-PARTIAL-PROJECTION' });
    const queued = queueOrder(initial, { actionId: 'gather_intel' });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const plans = buildCommandPlans(queued.state);
    const layLowPlan = plans.find((plan) =>
      plan.orders.some(
        (order) =>
          order.actionId === 'lay_low' &&
          order.target === undefined &&
          order.assignedOperativeId === undefined,
      ),
    );

    expect(plans.length).toBeGreaterThan(0);
    expect(layLowPlan).toBeDefined();
    expect(layLowPlan?.projectedPressures.heat).toBe(queued.state.pressures.heat - 10);
  });

  it('suggests removals and replacements for risky queued orders', () => {
    const base = newGame({ seed: 'HANDLER-COMMAND-RISKY-QUEUE' });
    const state = {
      ...base,
      pressures: {
        ...base.pressures,
        heat: 82,
      },
    };
    const queued = queueOrder(state, {
      actionId: 'run_small_job',
      target: { type: 'district', id: 'district_violet_ward' },
    });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const before = structuredClone(queued.state);
    const assessment = assessQueuedPlan(queued.state);

    expect(queued.state).toEqual(before);
    expect(assessment.status).toBe('risky');
    expect(assessment.suggestedRemovals).toContain(queued.order.id);
    expect(assessment.suggestedReplacements.length).toBeGreaterThan(0);
    expect(assessment.suggestedReplacements[0].removeOrderId).toBe(queued.order.id);
    expect(assessment.suggestedReplacements[0].replacementOrders.length).toBeGreaterThan(0);
    expect(assessment.suggestedReplacements[0].summary).toContain('Handler prefers');
  });

  it('assesses a full queue instead of recommending more orders', () => {
    const initial = newGame({ seed: 'HANDLER-COMMAND-FULL' });
    const first = queueOrder(initial, { actionId: 'gather_intel' });
    const second = first.ok ? queueOrder(first.state, { actionId: 'lay_low' }) : first;

    if (!first.ok || !second.ok) {
      fail('Expected queued orders to exhaust command points.');
      return;
    }

    const recommendation = recommendHandlerCommand({ state: second.state });

    expect(recommendation.recommendedOrders).toEqual([]);
    expect(recommendation.queuedPlanAssessment?.summary).toContain('Queued orders');
    expect(recommendation.invalidRecommendations).toEqual([]);
  });

  it('exposes stable highlight helpers for recommended actions and targets', () => {
    const state = newGame({ seed: 'HANDLER-COMMAND-HIGHLIGHTS' });
    const recommendation = recommendHandlerCommand({ state });
    const targeted = recommendation.recommendedOrders.find((order) => order.target);

    expect(
      recommendation.recommendedOrders.some((order) =>
        isRecommendedAction(recommendation, order.actionId),
      ),
    ).toBeTrue();

    if (targeted?.target) {
      expect(
        isRecommendedTarget(
          recommendation,
          targeted.actionId,
          getActionTargetKey(targeted.target),
        ),
      ).toBeTrue();
    }
  });

  it('flags dangerous queued plans for review', () => {
    const state = {
      ...newGame({ seed: 'HANDLER-COMMAND-DANGER' }),
      pressures: {
        ...newGame({ seed: 'HANDLER-COMMAND-DANGER' }).pressures,
        heat: 96,
      },
    };
    const queued = queueOrder(state, {
      actionId: 'run_small_job',
      target: { type: 'district', id: 'district_violet_ward' },
    });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const assessment = assessQueuedPlan(queued.state);

    expect(assessment.status).toBe('dangerous');
    expect(assessment.suggestedRemovals).toEqual(queued.state.queuedOrders.map((order) => order.id));
  });
});

function queueRecommendedOrders(
  state: GameState,
  orders: readonly ReturnType<typeof recommendHandlerCommand>['recommendedOrders'][number][],
): { ok: true } | { ok: false; error: string } {
  let next = state;

  for (const order of orders) {
    const queued = queueOrder(next, {
      actionId: order.actionId,
      assignedOperativeId: order.assignedOperativeId,
      target: order.target,
    });

    if (!queued.ok) {
      return { ok: false, error: queued.error };
    }

    next = queued.state;
  }

  return { ok: true };
}
