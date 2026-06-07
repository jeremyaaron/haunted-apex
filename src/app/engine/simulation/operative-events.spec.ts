import { ROSTER_EVENTS } from '../content';
import type {
  ActionId,
  GameState,
  OperativeEventPredicate,
  OperativeEventTrigger,
  OperativeState,
} from '../model';
import { materializeOperativeState } from '../roster';
import { newGame } from './new-game';
import {
  evaluateOperativeEventPredicate,
  evaluateOperativeEventTrigger,
  getOperativeEventEligibility,
  isOperativeEventEligible,
} from './operative-events';

describe('operative event eligibility', () => {
  it('evaluates every authored predicate type', () => {
    const operative = withAssignments(materializeOperativeState('op_saint_calder'), [
      assignment(4, 'bribe_official', ['social']),
      assignment(5, 'bribe_official', ['nightlife']),
    ]);
    const state = withOperative(operative, {
      week: 5,
      pressures: {
        ...newGame().pressures,
        ruin: 30,
        resources: 1000,
      },
      rivals: {
        ...newGame().rivals,
        rival_nyx_ardent: {
          ...newGame().rivals.rival_nyx_ardent,
          pressure: 45,
        },
      },
    });
    operative.stress = 65;
    operative.loyalty = 35;

    const predicates: OperativeEventPredicate[] = [
      { type: 'operative_stress_at_least', amount: 60 },
      { type: 'operative_loyalty_at_most', amount: 40 },
      { type: 'operative_assigned_within_weeks', weeks: 2 },
      { type: 'operative_assignment_count', count: 2, actionId: 'bribe_official' },
      { type: 'recent_assignment_tag', tag: 'nightlife' },
      { type: 'global_pressure_at_least', pressure: 'ruin', amount: 25 },
      { type: 'global_pressure_at_most', pressure: 'resources', amount: 1200 },
      {
        type: 'rival_pressure_at_least',
        rivalId: 'rival_nyx_ardent',
        amount: 40,
      },
    ];

    expect(
      predicates.every((predicate) =>
        evaluateOperativeEventPredicate(state, operative, predicate),
      ),
    ).toBeTrue();
  });

  it('evaluates nested all and any trigger groups', () => {
    const operative = materializeOperativeState('op_mara_voss');
    operative.stress = 65;
    const state = withOperative(operative);
    const trigger: OperativeEventTrigger = {
      mode: 'all',
      predicates: [
        { type: 'operative_stress_at_least', amount: 60 },
        {
          mode: 'any',
          predicates: [
            { type: 'operative_loyalty_at_most', amount: 10 },
            { type: 'global_pressure_at_most', pressure: 'heat', amount: 30 },
          ],
        },
      ],
    };

    expect(evaluateOperativeEventTrigger(state, operative, trigger)).toBeTrue();
  });

  it('requires active roster membership rather than hire-pool presence', () => {
    const event = requireRosterEvent('event_mara_ghost_debt');
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    const hireOnly: GameState = {
      ...state,
      operatives: state.operatives.filter((operative) => operative.id !== event.operativeId),
      hirePool: [...state.hirePool.filter((id) => id !== event.operativeId), event.operativeId],
      pressures: {
        ...state.pressures,
        ruin: 30,
      },
    };

    expect(isOperativeEventEligible(hireOnly, event)).toBeFalse();
    expect(getOperativeEventEligibility(hireOnly, event).activeRosterMember).toBeFalse();
  });

  it('excludes signature events as soon as they have been seen', () => {
    const event = requireRosterEvent('event_mara_ghost_debt');
    const operative = materializeOperativeState(event.operativeId);
    operative.stress = 80;
    const eligible = withOperative(operative);
    const seen = {
      ...eligible,
      seenSignatureEventIds: [event.id],
    };

    expect(isOperativeEventEligible(eligible, event)).toBeTrue();
    expect(isOperativeEventEligible(seen, event)).toBeFalse();
    expect(getOperativeEventEligibility(seen, event).unseen).toBeFalse();
  });

  it('makes all six signature events reachable from their authored conditions', () => {
    const states: Record<string, GameState> = {
      event_mara_ghost_debt: eventState('op_mara_voss', (operative) => {
        operative.stress = 60;
      }),
      event_juno_static_in_her_voice: eventState('op_juno_hex', (operative) => {
        operative.stress = 60;
        operative.recentAssignments = [assignment(1, 'gather_intel', ['memory'])];
      }),
      event_saint_lie_comes_due: eventState(
        'op_saint_calder',
        undefined,
        (state) => {
          state.pressures.resources = 1200;
        },
      ),
      event_knox_blood_applause: eventState('op_knox_riven', (operative) => {
        operative.stress = 60;
      }),
      event_iris_velvet_access: eventState(
        'op_iris_vale',
        (operative) => {
          operative.recentAssignments = [assignment(1, 'gather_intel', ['nightlife'])];
        },
        (state) => {
          state.rivals.rival_nyx_ardent.pressure = 40;
        },
      ),
      event_orchid_route_memory: eventState('op_orchid_seven', (operative) => {
        operative.recentAssignments = [
          assignment(1, 'run_small_job', ['black_market']),
          assignment(2, 'gather_intel', ['black_market']),
        ];
      }),
    };

    for (const event of ROSTER_EVENTS) {
      expect(isOperativeEventEligible(states[event.id], event))
        .withContext(`${event.id} should be reachable`)
        .toBeTrue();
    }
  });
});

function requireRosterEvent(id: string) {
  const event = ROSTER_EVENTS.find((candidate) => candidate.id === id);

  if (!event) {
    throw new Error(`Missing roster event ${id}`);
  }

  return event;
}

function withOperative(
  operative: OperativeState,
  overrides: Partial<GameState> = {},
): GameState {
  const state = newGame({ seed: 'VIOLET-ASH-1047' });

  return {
    ...state,
    ...overrides,
    operatives: [operative],
  };
}

function withAssignments(
  operative: OperativeState,
  assignments: OperativeState['recentAssignments'],
): OperativeState {
  return {
    ...operative,
    recentAssignments: assignments,
  };
}

function assignment(
  week: number,
  actionId: ActionId,
  targetTags: string[],
): OperativeState['recentAssignments'][number] {
  return {
    id: `assignment_${week}_1`,
    week,
    actionId,
    targetTags,
    complication: false,
    stressDelta: 6,
  };
}

function eventState(
  operativeId: OperativeState['id'],
  configureOperative?: (operative: OperativeState) => void,
  configureState?: (state: GameState) => void,
): GameState {
  const operative = materializeOperativeState(operativeId);
  configureOperative?.(operative);
  const state = withOperative(operative);
  configureState?.(state);
  return state;
}
