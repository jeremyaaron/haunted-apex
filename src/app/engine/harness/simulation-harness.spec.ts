import {
  AGGRESSIVE_BOT,
  CAUTIOUS_BOT,
  GREEDY_BOT,
  OPERATOR_BOT,
  STRATEGY_AGENTS,
  type AgentDecisionContext,
  formatBatchReport,
  getLegalOrderOptions,
  getRosterCompositionKey,
  simulateBatch,
  simulateRun,
} from './index';
import { CONTACT_DEFINITIONS } from '../content';
import { materializeContactState } from '../contacts';
import { addLedgerEntry } from '../ledger';
import { materializeOperativeState } from '../roster';
import type { ActionTarget, ContactId, GameState } from '../model';
import { newGame, queueOrder } from '../simulation';

describe('simulation harness', () => {
  it('simulates a deterministic agent run without the Angular UI', () => {
    const first = simulateRun({
      agent: AGGRESSIVE_BOT,
      seed: 'HARNESS-SINGLE-1',
      collectTrace: true,
    });
    const second = simulateRun({
      agent: AGGRESSIVE_BOT,
      seed: 'HARNESS-SINGLE-1',
      collectTrace: true,
    });

    expect(first.outcome).not.toBe('incomplete');
    expect(first.finalState.pressures).toEqual(second.finalState.pressures);
    expect(first.actionUsage).toEqual(second.actionUsage);
    expect(first.targetUsage).toEqual(second.targetUsage);
    expect(first.contextualEvents).toEqual(second.contextualEvents);
    expect(first.startingRosterIds).toEqual(second.startingRosterIds);
    expect(first.initialHirePoolIds).toEqual(second.initialHirePoolIds);
    expect(first.operativeStats).toEqual(second.operativeStats);
    expect(first.operativeEventStats).toEqual(second.operativeEventStats);
    expect(first.contactStats).toEqual(second.contactStats);
    expect(first.trace.length).toBeGreaterThan(0);
  });

  it('normalizes roster composition keys independent of generation order', () => {
    expect(getRosterCompositionKey(['op_juno_hex', 'op_mara_voss', 'op_iris_vale'])).toBe(
      getRosterCompositionKey(['op_mara_voss', 'op_iris_vale', 'op_juno_hex']),
    );
  });

  it('records operative run stats for starting, recruited, and event-triggered operatives', () => {
    const run = simulateRun({
      agent: OPERATOR_BOT,
      seed: 'HARNESS-ROSTER-TELEMETRY',
    });
    const startingIds = new Set(run.startingRosterIds);
    const hirePoolIds = new Set(run.initialHirePoolIds);
    const stats = Object.values(run.operativeStats);

    expect(stats.length).toBeGreaterThanOrEqual(run.startingRosterIds.length + run.initialHirePoolIds.length);
    expect(stats.filter((operative) => operative.started).map((operative) => operative.operativeId).sort()).toEqual(
      [...startingIds].sort(),
    );
    expect(
      stats
        .filter((operative) => operative.hirePoolPresent)
        .map((operative) => operative.operativeId)
        .sort(),
    ).toEqual([...hirePoolIds].sort());
    expect(
      stats
        .filter((operative) => startingIds.has(operative.operativeId))
        .every((operative) => operative.finalStress !== undefined && operative.highestStress !== undefined),
    ).toBeTrue();
    expect(
      Object.values(run.operativeEventStats).every(
        (event) => event.selectedCount <= event.eligibleCount,
      ),
    ).toBeTrue();
  });

  it('provides agents with engine-validated action-operative-target combinations', () => {
    const options = getLegalOrderOptions(newGame({ seed: 'HARNESS-LEGAL-OPTIONS' }));
    const targetedOptions = options.filter((option) => option.target);

    expect(targetedOptions.length).toBeGreaterThan(0);
    expect(
      options
        .filter((option) => option.preview.requiresTarget)
        .every((option) => option.target !== undefined),
    ).toBeTrue();
    expect(
      targetedOptions.every(
        (option) =>
          option.preview.selectedTarget?.type === option.target?.type &&
          option.preview.selectedTarget !== undefined &&
          option.target !== undefined &&
          targetKey(option.preview.selectedTarget) === targetKey(option.target),
      ),
    ).toBeTrue();
  });

  it('generates complete legal operative and recruit combinations', () => {
    const state = newGame({ seed: 'HARNESS-COMPLETE-OPTIONS' });
    const options = getLegalOrderOptions(state);
    const gatherOptions = options.filter(
      (option) => option.actionId === 'gather_intel' && !option.target,
    );
    const recruitOptions = options.filter((option) => option.actionId === 'recruit_operative');

    expect(gatherOptions.length).toBe(state.operatives.length + 1);
    expect(
      recruitOptions.map((option) =>
        option.target?.type === 'recruit' ? option.target.id : undefined,
      ),
    ).toEqual(state.hirePool);
    expect(recruitOptions.every((option) => !option.assignedOperativeId)).toBeTrue();

    for (const option of options) {
      expect(
        queueOrder(state, {
          actionId: option.actionId,
          assignedOperativeId: option.assignedOperativeId,
          target: option.target,
        }).ok,
      ).toBeTrue();
    }
  });

  it('every agent chooses legal first orders across varied rosters', () => {
    const seeds = Array.from({ length: 24 }, (_value, index) => `HARNESS-VARIED-${index + 1}`);

    for (const seed of seeds) {
      const state = newGame({ seed });
      const options = getLegalOrderOptions(state);

      for (const agent of STRATEGY_AGENTS) {
        const choice = agent.chooseOrder(state, options, createTestContext(seed, agent.id));

        expect(choice).withContext(`${agent.id} should choose for ${seed}`).toBeDefined();
        if (!choice) {
          fail(`${agent.id} did not choose for ${seed}`);
          continue;
        }

        expect(options).toContain(choice);
        expect(
          queueOrder(state, {
            actionId: choice.actionId,
            assignedOperativeId: choice.assignedOperativeId,
            target: choice.target,
          }).ok,
        )
          .withContext(`${agent.id} should choose a queueable order for ${seed}`)
          .toBeTrue();
      }
    }
  });

  it('does not let agents target absent candidates or exceed the roster cap', () => {
    for (const agent of STRATEGY_AGENTS) {
      for (let index = 0; index < 12; index += 1) {
        const run = simulateRun({
          agent,
          seed: `HARNESS-RECRUIT-LEGAL-${agent.id}-${index + 1}`,
        });
        const initialHirePool = new Set(newGame({ seed: run.seed }).hirePool);
        const recruitedTargets = Object.values(run.targetUsage).filter(
          (target) => target.targetType === 'recruit',
        );

        expect(run.reason).not.toBe('agent_stalled');
        expect(run.finalState.operatives.length).toBeLessThanOrEqual(5);
        expect(
          recruitedTargets.every((target) => initialHirePool.has(target.targetId as never)),
        ).toBeTrue();
      }
    }
  });

  it('keeps Breaking operatives available to legal option generation', () => {
    const state = newGame({ seed: 'HARNESS-BREAKING-LEGAL' });
    state.operatives[0].stress = 85;
    const options = getLegalOrderOptions(state);

    expect(
      options.some(
        (option) =>
          option.assignedOperativeId === state.operatives[0].id &&
          option.preview.selectedOperative?.stressTier === 'breaking',
      ),
    ).toBeTrue();
  });

  it('makes CautiousBot avoid unnecessary Breaking assignments', () => {
    const state = newGame({ seed: 'HARNESS-CAUTIOUS-BREAKING' });
    state.operatives = [
      { ...materializeOperativeState('op_vant_black'), stress: 85 },
      materializeOperativeState('op_mara_voss'),
      materializeOperativeState('op_juno_hex'),
    ];
    const options = getLegalOrderOptions(state).filter(
      (option) =>
        option.actionId === 'gather_intel' && !option.target && option.assignedOperativeId,
    );
    const choice = CAUTIOUS_BOT.chooseOrder(state, options, createTestContext('CAUTIOUS', 'bot'));

    expect(choice?.assignedOperativeId).not.toBe('op_vant_black');
  });

  it('lets AggressiveBot accept justified Breaking Stress for Dominion progress', () => {
    const state = newGame({ seed: 'HARNESS-AGGRESSIVE-BREAKING' });
    state.pressures.dominion = 80;
    state.operatives = [
      { ...materializeOperativeState('op_knox_riven'), stress: 85 },
      materializeOperativeState('op_rook_vale'),
      materializeOperativeState('op_echo_saint'),
    ];
    const options = getLegalOrderOptions(state).filter(
      (option) =>
        option.actionId === 'run_small_job' &&
        option.target?.type === 'district' &&
        option.target.id === 'district_violet_ward' &&
        option.assignedOperativeId,
    );
    const choice = AGGRESSIVE_BOT.chooseOrder(state, options, createTestContext('AGGRO', 'bot'));

    expect(choice?.assignedOperativeId).toBe('op_knox_riven');
    expect(choice?.preview.selectedOperative?.projectedStressTier).toBe('breaking');
  });

  it('makes GreedyBot prefer cash recovery over thin-reserve recruitment', () => {
    const state = newGame({ seed: 'HARNESS-GREEDY-RESERVE' });
    state.pressures.resources = 2000;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'recruit_operative' || option.actionId === 'run_small_job',
    );
    const choice = GREEDY_BOT.chooseOrder(state, options, createTestContext('GREEDY', 'bot'));

    expect(choice?.actionId).toBe('run_small_job');
  });

  it('makes OperatorBot recruit for a missing role when the roster is stressed', () => {
    const state = newGame({ seed: 'HARNESS-OPERATOR-RECRUIT' });
    state.pressures.heat = 78;
    state.operatives = [
      { ...materializeOperativeState('op_mara_voss'), stress: 72 },
      { ...materializeOperativeState('op_knox_riven'), stress: 76 },
      { ...materializeOperativeState('op_juno_hex'), stress: 68 },
    ];
    state.hirePool = ['op_vant_black'];
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'recruit_operative' || option.actionId === 'run_small_job',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'bot'));

    expect(choice?.actionId).toBe('recruit_operative');
    expect(choice?.target).toEqual({ type: 'recruit', id: 'op_vant_black' });
  });

  it('includes engine-validated Ledger use options when active entries exist', () => {
    const state = addLedgerEntry(newGame({ seed: 'HARNESS-LEDGER-OPTIONS' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: { type: 'district', id: 'district_chrome_narrows' },
      },
    });
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'work_the_ledger',
    );

    expect(options.length).toBeGreaterThan(0);
    expect(
      options.every((option) => option.target?.type === 'ledger' && option.preview.ledgerUse?.ok),
    ).toBeTrue();

    for (const option of options) {
      expect(
        queueOrder(state, {
          actionId: option.actionId,
          target: option.target,
        }).ok,
      ).toBeTrue();
    }
  });

  it('includes engine-validated Contact options when active contacts exist', () => {
    const state = withActiveContacts(newGame({ seed: 'HARNESS-CONTACT-OPTIONS' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_dr_mercy_iram',
    ]);
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'manage_contact',
    );

    expect(options.length).toBeGreaterThan(0);
    expect(
      options.every((option) => option.target?.type === 'contact' && option.preview.contactUse?.ok),
    ).toBeTrue();

    for (const option of options) {
      expect(
        queueOrder(state, {
          actionId: option.actionId,
          target: option.target,
        }).ok,
      ).toBeTrue();
    }
  });

  it('lets every agent choose queueable Contact actions when Contact options are appropriate', () => {
    const state = withActiveContacts(newGame({ seed: 'HARNESS-CONTACT-AGENTS' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_dr_mercy_iram',
    ]);
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'manage_contact',
    );

    for (const agent of STRATEGY_AGENTS) {
      const choice = agent.chooseOrder(state, options, createTestContext('CONTACT', agent.id));

      expect(choice).withContext(`${agent.id} should choose a contact option`).toBeDefined();
      expect(choice?.actionId).toBe('manage_contact');
      expect(choice?.target?.type).toBe('contact');
      expect(
        queueOrder(state, {
          actionId: choice?.actionId ?? 'manage_contact',
          target: choice?.target,
        }).ok,
      )
        .withContext(`${agent.id} should choose a queueable contact option`)
        .toBeTrue();
    }
  });

  it('makes OperatorBot use Heat-saving Contacts under high Heat', () => {
    const withContacts = withActiveContacts(newGame({ seed: 'HARNESS-OPERATOR-CONTACT' }), [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_dr_mercy_iram',
    ]);
    const state = {
      ...withContacts,
      pressures: {
        ...withContacts.pressures,
        heat: 88,
        resources: 4000,
      },
    };
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'manage_contact',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'bot'));

    expect(choice?.actionId).toBe('manage_contact');
    expect(choice?.target).toEqual({
      type: 'contact',
      contactId: 'contact_captain_hollis',
      optionId: 'clean_passage',
    });
    expect(choice?.preview.contactUse?.ok ? choice.preview.contactUse.effects.heat : undefined).toBeLessThan(
      0,
    );
  });

  it('does not let agents select consumed or unaffordable Ledger uses', () => {
    const withSecret = addLedgerEntry(newGame({ seed: 'HARNESS-LEDGER-ILLEGAL' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: { type: 'district', id: 'district_chrome_narrows' },
      },
    });
    const consumed = {
      ...withSecret,
      pressures: {
        ...withSecret.pressures,
        resources: 100,
        intel: 0,
      },
      ledger: {
        ...withSecret.ledger,
        entries: withSecret.ledger.entries.map((entry) => ({
          ...entry,
          consumed: true,
          consumedWeek: withSecret.week,
        })),
        consumedCount: withSecret.ledger.entries.length,
      },
    };
    const state = addLedgerEntry(consumed, {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const options = getLegalOrderOptions(state);

    expect(options.some((option) => option.actionId === 'work_the_ledger')).toBeFalse();

    for (const agent of STRATEGY_AGENTS) {
      const choice = agent.chooseOrder(state, options, createTestContext('LEDGER-LEGAL', agent.id));

      expect(choice?.target?.type).not.toBe('ledger');
    }
  });

  it('makes OperatorBot use Heat-saving Ledger entries under high Heat', () => {
    const withSecret = addLedgerEntry(newGame({ seed: 'HARNESS-OPERATOR-LEDGER' }), {
      definitionId: 'secret_patrol_schedule',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: { type: 'district', id: 'district_chrome_narrows' },
      },
    });
    const state = {
      ...withSecret,
      pressures: {
        ...withSecret.pressures,
        heat: 84,
        intel: 12,
      },
    };
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'work_the_ledger',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'bot'));

    expect(choice?.actionId).toBe('work_the_ledger');
    expect(choice?.preview.ledgerUse?.ok ? choice.preview.ledgerUse.definition.kind : undefined).toBe(
      'secret',
    );
    expect(choice?.preview.ledgerUse?.ok ? choice.preview.ledgerUse.effects.heat : undefined).toBeLessThan(
      0,
    );
  });

  it('makes CautiousBot settle affordable old Debts', () => {
    const withDebt = addLedgerEntry(newGame({ seed: 'HARNESS-CAUTIOUS-LEDGER' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const state = {
      ...withDebt,
      week: 5,
      pressures: {
        ...withDebt.pressures,
        resources: 4000,
        intel: 12,
      },
    };
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'work_the_ledger',
    );
    const choice = CAUTIOUS_BOT.chooseOrder(state, options, createTestContext('CAUTIOUS', 'bot'));

    expect(choice?.actionId).toBe('work_the_ledger');
    expect(choice?.preview.ledgerUse?.ok ? choice.preview.ledgerUse.definition.kind : undefined).toBe(
      'debt',
    );
  });

  it('makes AggressiveBot exploit Dominion-positive Secrets', () => {
    const withSecret = addLedgerEntry(newGame({ seed: 'HARNESS-AGGRESSIVE-LEDGER' }), {
      definitionId: 'secret_nyx_velvet_ledger',
      source: {
        type: 'action',
        actionId: 'gather_intel',
        target: { type: 'district', id: 'district_violet_ward' },
      },
    });
    const state = {
      ...withSecret,
      pressures: {
        ...withSecret.pressures,
        dominion: 42,
      },
    };
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'work_the_ledger',
    );
    const choice = AGGRESSIVE_BOT.chooseOrder(state, options, createTestContext('AGGRO', 'bot'));

    expect(choice?.actionId).toBe('work_the_ledger');
    expect(
      choice?.preview.ledgerUse?.ok ? choice.preview.ledgerUse.effects.dominion : undefined,
    ).toBeGreaterThan(0);
  });

  it('runs 100 simulations per simple strategy and summarizes balance signals', () => {
    const report = simulateBatch({
      agents: STRATEGY_AGENTS,
      runsPerAgent: 100,
      seedPrefix: 'HARNESS-SPEC',
    });
    const output = formatBatchReport(report);

    expect(report.totalRuns).toBe(500);
    expect(report.summaries.length).toBe(5);
    expect(output).toContain('agent,runs,wins,losses,incomplete,winRate');
    expect(output).toContain('operator,100');
    expect(output).toContain('operator,Operator / Sane');
    expect(output).toContain('target_highlights');
    expect(output).toContain('target_details');
    expect(output).toContain('rival_pressure');
    expect(output).toContain('district_state');
    expect(output).toContain('loss_causes');
    expect(output).toContain('contextual_events');
    expect(output).toContain('ledger_summary');
    expect(output).toContain('ledger_usage');
    expect(output).toContain('ledger_outcomes');
    expect(output).toContain('secret_discovery');
    expect(output).toContain('ledger_events');
    expect(output).toContain('contact_summary');
    expect(output).toContain('contact_usage');
    expect(output).toContain('contact_outcomes');
    expect(output).toContain('contact_events');
    expect(output).toContain('contact_ledger');
    expect(output).toContain('contact_sets');
    expect(output).toContain('roster_compositions');
    expect(output).toContain('operative_presence');
    expect(output).toContain('operative_recruitment');
    expect(output).toContain('operative_usage');
    expect(output).toContain('operative_stress');
    expect(output).toContain('operative_danger');
    expect(output).toContain('operative_events');
    expect(output).toContain('hire_pool_selection');

    for (const summary of report.summaries) {
      const actionCount = Object.values(summary.actionUsage).reduce(
        (total, count) => total + count,
        0,
      );
      const targetCount = summary.targetReports.reduce(
        (total, target) => total + target.selections,
        0,
      );

      expect(summary.runs).toBe(100);
      expect(summary.wins + summary.losses + summary.incomplete).toBe(100);
      expect(summary.incomplete).toBe(0);
      expect(summary.averageWeeksPlayed).toBeGreaterThan(0);
      expect(summary.averageFinalPressures.dominion).toBeGreaterThanOrEqual(0);
      expect(actionCount).toBeGreaterThan(0);
      expect(targetCount).toBeGreaterThan(0);
      expect(summary.mostSelectedTarget).toBeDefined();
      expect(summary.averageFinalRivalPressures.rival_nyx_ardent).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalRivalPressures.rival_knox_marrow).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalDistricts.district_violet_ward.control).toBeGreaterThanOrEqual(0);
      expect(summary.averageFinalDistricts.district_violet_ward.heat).toBeGreaterThanOrEqual(0);
      expect(summary.contextualEvents.influencedSelections).toBeGreaterThanOrEqual(0);
      expect(summary.rosterCompositionReports.length).toBeGreaterThan(0);
      expect(summary.operativePresenceReports.length).toBeGreaterThan(0);
      expect(summary.operativeRecruitmentReports.length).toBeGreaterThan(0);
      expect(summary.operativeUsageReports.length).toBeGreaterThan(0);
      expect(summary.operativeStressReports.length).toBeGreaterThan(0);
      expect(summary.operativeDangerReports.length).toBeGreaterThan(0);
      expect(summary.hirePoolSelectionReports.length).toBeGreaterThan(0);
      expect(summary.ledgerSummary.averageEntriesCreated).toBeGreaterThanOrEqual(0);
      expect(summary.ledgerOutcomeReports.length).toBeGreaterThan(0);
      expect(summary.secretDiscoveryReport.targetedGatherIntelOrders).toBeGreaterThanOrEqual(0);
      expect(summary.contactSummary.averageManageContactUses).toBeGreaterThanOrEqual(0);
      expect(summary.contactSummary.averageBurnedContacts).toBeGreaterThanOrEqual(0);
      expect(summary.contactOutcomeReports.length).toBeGreaterThan(0);
      expect(summary.contactSetReports.length).toBeGreaterThan(0);
    }

    expect(
      report.summaries.reduce(
        (total, summary) => total + summary.contextualEvents.targetTagInfluenced,
        0,
      ),
    ).toBeGreaterThan(0);
    expect(
      report.summaries.reduce(
        (total, summary) => total + summary.contextualEvents.rivalPressureInfluenced,
        0,
      ),
    ).toBeGreaterThan(0);
  });

  it('produces identical expanded summaries for the same batch seed prefix', () => {
    const options = {
      agents: STRATEGY_AGENTS,
      runsPerAgent: 10,
      seedPrefix: 'HARNESS-DETERMINISM',
    };

    expect(simulateBatch(options)).toEqual(simulateBatch(options));
  });
});

function targetKey(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `ledger:${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `contact:${target.contactId}:${target.optionId}`;
  }

  return `${target.type}:${target.id}`;
}

function createTestContext(seed: string, agentId: string): AgentDecisionContext {
  let cursor = seed.length + agentId.length;

  return {
    nextInt: (minInclusive, maxInclusive) => {
      const span = maxInclusive - minInclusive + 1;
      const value = minInclusive + (cursor % span);
      cursor += 1;
      return value;
    },
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty list.');
      }

      const value = items[cursor % items.length];
      cursor += 1;
      return value;
    },
  };
}

function withActiveContacts(state: GameState, activeContactIds: ContactId[]): GameState {
  return {
    ...state,
    activeContactIds,
    contacts: {
      ...state.contacts,
      ...Object.fromEntries(
        activeContactIds.flatMap((contactId) => {
          const definition = CONTACT_DEFINITIONS.find((candidate) => candidate.id === contactId);

          return definition ? [[contactId, materializeContactState(definition)]] : [];
        }),
      ),
    },
  };
}
