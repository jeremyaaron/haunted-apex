import { newGame } from '../simulation';
import {
  selectHirePoolViews,
  selectOperativeDetail,
  selectRosterViews,
} from './roster';

describe('roster selectors', () => {
  it('materializes active roster identity, traits, and Stress tiers', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    state.operatives[0].stress = 65;
    const views = selectRosterViews(state);

    expect(views.length).toBe(3);
    expect(views[0]).toEqual(
      jasmine.objectContaining({
        id: state.operatives[0].id,
        name: jasmine.any(String),
        rarity: jasmine.any(String),
        stress: 65,
        stressTier: 'unstable',
        signatureTrait: jasmine.objectContaining({
          name: jasmine.any(String),
        }),
      }),
    );
  });

  it('returns active and candidate detail without exposing hidden flags', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const active = selectOperativeDetail(state, state.operatives[0].id);
    const candidate = selectOperativeDetail(state, state.hirePool[0]);

    expect(active?.candidate).toBeFalse();
    expect(active?.baseStats.subtlety).toEqual(jasmine.any(Number));
    expect(active?.affinities.length).toBeGreaterThanOrEqual(0);
    expect(candidate?.candidate).toBeTrue();
    expect(candidate?.recentAssignments).toEqual([]);
    expect(candidate).not.toEqual(jasmine.objectContaining({ hiddenFlags: jasmine.anything() }));
  });

  it('reports adjusted recruitment costs and current queue legality', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    state.hirePool = ['op_mother_neon', 'op_mara_voss'];
    const views = selectHirePoolViews(state);

    expect(views.find((candidate) => candidate.id === 'op_mother_neon')?.recruitCost).toBe(1300);
    expect(views.every((candidate) => candidate.recruitable)).toBeTrue();

    state.operatives = [
      ...state.operatives,
      {
        ...state.operatives[0],
        id: 'op_knox_riven',
      },
      {
        ...state.operatives[0],
        id: 'op_iris_vale',
      },
    ];

    expect(selectHirePoolViews(state).every((candidate) => !candidate.recruitable)).toBeTrue();
    expect(
      selectHirePoolViews(state).every(
        (candidate) => candidate.unavailableReason === 'roster_full',
      ),
    ).toBeTrue();
  });

  it('returns no detail for an operative outside the active roster and hire pool', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const outsideId = [
      'op_mara_voss',
      'op_juno_hex',
      'op_saint_calder',
      'op_iris_vale',
      'op_knox_riven',
      'op_orchid_seven',
      'op_vant_black',
      'op_echo_saint',
      'op_rook_vale',
      'op_mother_neon',
    ].find(
      (operativeId) =>
        !state.operatives.some((operative) => operative.id === operativeId) &&
        !state.hirePool.includes(operativeId as never),
    );

    expect(outsideId).toBeDefined();
    expect(selectOperativeDetail(state, outsideId as never)).toBeUndefined();
  });
});
