import type { RecentAssignment } from '../model';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import { applyIdleStressRecovery, pruneRecentAssignments } from './stress';

describe('operative weekly Stress maintenance', () => {
  it('recovers only operatives unused during the week', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const recovered = applyIdleStressRecovery(state, [
      {
        id: 'order_1_1',
        actionId: 'gather_intel',
        assignedOperativeId: state.operatives[0].id,
      },
    ]);

    expect(recovered.operatives[0].stress).toBe(state.operatives[0].stress);
    expect(recovered.operatives[1].stress).toBe(state.operatives[1].stress - 2);
  });

  it('logs an idle recovery only when it crosses a Stress tier', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const state = {
      ...base,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          stress: 40,
        },
        {
          ...materializeOperativeState('op_juno_hex'),
          stress: 42,
        },
      ],
    };
    const recovered = applyIdleStressRecovery(state, []);

    expect(recovered.operatives.map((operative) => operative.stress)).toEqual([38, 40]);
    expect(recovered.eventLog).toEqual([
      jasmine.objectContaining({
        type: 'operative_condition',
        title: 'Mara Voss Stabilizes',
        tags: ['OPERATIVE', 'op_mara_voss', 'strained', 'stable'],
      }),
    ]);
  });

  it('keeps the current and previous two weeks of assignment history', () => {
    const base = newGame({ seed: 'VIOLET-ASH-1047' });
    const state = {
      ...base,
      week: 5,
      operatives: [
        {
          ...materializeOperativeState('op_mara_voss'),
          recentAssignments: [1, 2, 3, 4, 5].map(assignment),
        },
      ],
    };

    expect(
      pruneRecentAssignments(state).operatives[0].recentAssignments.map(
        (recent) => recent.week,
      ),
    ).toEqual([3, 4, 5]);
  });
});

function assignment(week: number): RecentAssignment {
  return {
    id: `assignment_${week}_1`,
    week,
    actionId: 'gather_intel',
    targetTags: [],
    complication: false,
    stressDelta: 6,
  };
}
