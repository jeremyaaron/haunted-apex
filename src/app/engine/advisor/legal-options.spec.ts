import { newGame, queueOrder, advanceWeek } from '../simulation';
import {
  getActionTargetKey,
  getAssignmentKey,
  selectEventChoiceCandidateOptions,
  selectLegalEventChoiceOptions,
  selectLegalOrderOptions,
  selectOrderCandidateOptions,
} from './legal-options';

describe('legal option selectors', () => {
  it('enumerates legal targeted options with stable keys and previews', () => {
    const state = newGame({ seed: 'LEGAL-OPTIONS-TARGETS' });
    const options = selectLegalOrderOptions(state);
    const smallJobOptions = options.filter((option) => option.actionId === 'run_small_job');

    expect(smallJobOptions.length).toBeGreaterThan(0);
    expect(smallJobOptions.every((option) => option.target !== undefined)).toBeTrue();
    expect(
      smallJobOptions.every(
        (option) =>
          option.target &&
          option.targetKey === getActionTargetKey(option.target) &&
          option.key.includes(`target:${option.targetKey}`) &&
          option.preview.selectedTarget !== undefined,
      ),
    ).toBeTrue();
  });

  it('keeps unaffordable options visible as candidates but filters them from legal options', () => {
    const state = {
      ...newGame({ seed: 'LEGAL-OPTIONS-AFFORDABILITY' }),
      pressures: {
        ...newGame({ seed: 'LEGAL-OPTIONS-AFFORDABILITY' }).pressures,
        resources: 0,
      },
    };
    const bribeCandidates = selectOrderCandidateOptions(state).filter(
      (option) => option.actionId === 'bribe_official',
    );

    expect(bribeCandidates.length).toBeGreaterThan(0);
    expect(
      bribeCandidates.some((option) => option.availability.reason === 'not_enough_resources'),
    ).toBeTrue();
    expect(selectLegalOrderOptions(state).some((option) => option.actionId === 'bribe_official'))
      .toBeFalse();
  });

  it('respects operative availability after an operative is already queued', () => {
    const initial = newGame({ seed: 'LEGAL-OPTIONS-ASSIGNMENTS' });
    const operativeId = initial.operatives[0].id;
    const queued = queueOrder(initial, {
      actionId: 'gather_intel',
      assignedOperativeId: operativeId,
    });

    if (!queued.ok) {
      fail(`Expected queued order, got ${queued.error}`);
      return;
    }

    const candidatesForQueuedOperative = selectOrderCandidateOptions(queued.state).filter(
      (option) => option.assignedOperativeId === operativeId,
    );

    expect(candidatesForQueuedOperative.length).toBeGreaterThan(0);
    expect(getAssignmentKey(operativeId)).toBe(`operative:${operativeId}`);
    expect(
      candidatesForQueuedOperative.some(
        (option) => option.availability.reason === 'operative_already_assigned',
      ),
    ).toBeTrue();
    expect(
      selectLegalOrderOptions(queued.state).some(
        (option) => option.assignedOperativeId === operativeId,
      ),
    ).toBeFalse();
  });

  it('returns no legal order options when command points are exhausted', () => {
    const initial = newGame({ seed: 'LEGAL-OPTIONS-COMMAND' });
    const first = queueOrder(initial, { actionId: 'gather_intel' });
    const second = first.ok ? queueOrder(first.state, { actionId: 'lay_low' }) : first;

    if (!first.ok || !second.ok) {
      fail('Expected queued orders to exhaust command points.');
      return;
    }

    expect(selectLegalOrderOptions(second.state)).toEqual([]);
    expect(
      selectOrderCandidateOptions(second.state).some(
        (option) => option.availability.reason === 'not_enough_command_points',
      ),
    ).toBeTrue();
  });

  it('enumerates only available event choices as legal options', () => {
    const initial = newGame({ seed: 'LEGAL-OPTIONS-EVENT' });
    const queued = queueOrder(initial, { actionId: 'gather_intel' });
    const advanced = queued.ok ? advanceWeek(queued.state) : queued;

    if (!queued.ok || !advanced.ok) {
      fail('Expected run to advance into event choice.');
      return;
    }

    const candidates = selectEventChoiceCandidateOptions(advanced.state);
    const legalOptions = selectLegalEventChoiceOptions(advanced.state);

    expect(advanced.state.phase).toBe('EVENT_CHOICE');
    expect(candidates.length).toBeGreaterThan(0);
    expect(legalOptions.length).toBeGreaterThan(0);
    expect(legalOptions.every((option) => option.availability.available)).toBeTrue();
    expect(legalOptions.every((option) => option.preview.choiceId === option.choice.id)).toBeTrue();
    expect(legalOptions.every((option) => option.key.includes(`event:${option.eventId}`)))
      .toBeTrue();
  });
});
