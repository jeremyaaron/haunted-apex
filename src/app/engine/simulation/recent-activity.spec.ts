import type { RecentActivityEntry } from '../model';
import { newGame } from './new-game';
import { pruneRecentActivity, recordRecentActivity } from './recent-activity';

describe('recent activity', () => {
  it('records structured target context and final deltas', () => {
    const state = recordRecentActivity(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'gather_intel',
      {
        type: 'venue',
        id: 'venue_glass_saint',
      },
      {
        heat: 5,
        dominion: 2,
      },
    );

    expect(state.recentActivity).toEqual([
      {
        id: 'activity_1_1',
        week: 1,
        actionId: 'gather_intel',
        target: {
          type: 'venue',
          id: 'venue_glass_saint',
        },
        targetTags: [
          'nightlife',
          'liaison',
          'social',
          'elite',
          'memory',
          'seduction',
        ],
        rivalId: 'rival_nyx_ardent',
        heatDelta: 5,
        dominionDelta: 2,
      },
    ]);
  });

  it('records untargeted actions with empty target context', () => {
    const state = recordRecentActivity(
      newGame({ seed: 'VIOLET-ASH-1047' }),
      'lay_low',
      undefined,
      {
        heat: -12,
      },
    );

    expect(state.recentActivity[0]).toEqual({
      id: 'activity_1_1',
      week: 1,
      actionId: 'lay_low',
      targetTags: [],
      heatDelta: -12,
      dominionDelta: 0,
    });
  });

  it('prunes entries older than the current two-week window', () => {
    const state = {
      ...newGame({ seed: 'VIOLET-ASH-1047' }),
      week: 5,
      recentActivity: [
        activity(1),
        activity(2),
        activity(3),
        activity(4),
        activity(5),
      ],
    };

    expect(pruneRecentActivity(state).recentActivity.map((entry) => entry.week)).toEqual([
      3, 4, 5,
    ]);
  });
});

function activity(week: number): RecentActivityEntry {
  return {
    id: `activity_${week}_1`,
    week,
    actionId: 'gather_intel',
    targetTags: [],
    heatDelta: 0,
    dominionDelta: 0,
  };
}
