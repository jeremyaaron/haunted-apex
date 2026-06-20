import {
  AGGRESSIVE_BOT,
  CAUTIOUS_BOT,
  EXTENDED_STRATEGY_AGENTS,
  GREEDY_BOT,
  HANDLER_BOT,
  OPERATOR_BOT,
  RANDOM_BOT,
  STRATEGY_AGENTS,
  type AgentDecisionContext,
  type StrategyAgent,
  formatBatchReport,
  getLegalOrderOptions,
  getRosterCompositionKey,
  simulateBatch,
  simulateRun,
} from './index';
import { CAMPAIGN_TENSION_DEFINITIONS, CONTACT_DEFINITIONS, FACTION_DEFINITIONS } from '../content';
import { materializeContactState } from '../contacts';
import { materializeFactionState } from '../factions';
import { addLedgerEntry } from '../ledger';
import { materializeOperativeState } from '../roster';
import type {
  ActionTarget,
  ContactId,
  FrontDefinitionId,
  FrontOpportunity,
  FrontState,
  GameState,
  FactionId,
  CampaignTensionId,
} from '../model';
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
    expect(first.frontStats).toEqual(second.frontStats);
    expect(first.telemetry).toEqual(second.telemetry);
    expect(first.trace.length).toBeGreaterThan(0);
  });

  it('records local run telemetry for commands, pressure deltas, events, and drift', () => {
    const run = simulateRun({
      agent: AGGRESSIVE_BOT,
      seed: 'HARNESS-TELEMETRY-BASIC',
    });
    const commandEntries = run.telemetry.entries.filter((entry) => entry.kind === 'command_used');
    const eventEntries = run.telemetry.entries.filter((entry) => entry.kind === 'event_choice_used');
    const pressureEntries = run.telemetry.entries.filter((entry) => entry.kind === 'pressure_delta');

    expect(run.telemetry.actorType).toBe('bot');
    expect(run.telemetry.botId).toBe('aggressive');
    expect(run.telemetry.campaignTensionId).toBe(run.finalState.campaign.tensionId);
    expect(commandEntries.length).toBe(
      Object.values(run.actionUsage).reduce((total, count) => total + count, 0),
    );
    expect(eventEntries.length).toBe(
      Object.values(run.eventChoiceUsage).reduce((total, count) => total + count, 0),
    );
    expect(pressureEntries.some((entry) => entry.sourceKind === 'action')).toBeTrue();
    expect(pressureEntries.some((entry) => entry.sourceKind === 'event')).toBeTrue();
    expect(pressureEntries.some((entry) => entry.sourceKind === 'drift')).toBeTrue();
  });

  it('records system engagement telemetry for command families', () => {
    const run = simulateRun({
      agent: LAY_LOW_TEST_BOT,
      seed: 'HARNESS-TELEMETRY-LAY-LOW',
    });
    const systemEntries = run.telemetry.entries.filter((entry) => entry.kind === 'system_engaged');

    expect(systemEntries.some((entry) => entry.system === 'lay_low')).toBeTrue();
  });

  it('attributes front command pressure to the front source kind', () => {
    const run = simulateRun({
      agent: FRONT_TEST_BOT,
      seed: 'HARNESS-TELEMETRY-FRONT',
    });

    expect(
      run.telemetry.entries.some(
        (entry) => entry.kind === 'pressure_delta' && entry.sourceKind === 'front',
      ),
    ).toBeTrue();
  });

  it('can simulate a specific Campaign Tension directly', () => {
    const run = simulateRun({
      agent: RANDOM_BOT,
      seed: 'HARNESS-SPECIFIC-CAMPAIGN',
      campaignTensionId: 'campaign_ghostline_signal',
    });

    expect(run.finalState.campaign.tensionId).toBe('campaign_ghostline_signal');
    expect(run.finalState.campaign.cityProfile).toBe('ghost_market');
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

  it('makes OperatorBot target Gather Intel during Ghostline Signal', () => {
    const state = newGame({
      seed: 'HARNESS-OPERATOR-GHOSTLINE',
      campaignTensionId: 'campaign_ghostline_signal',
    });
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'gather_intel',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'ghostline'));

    expect(choice?.actionId).toBe('gather_intel');
    expect(choice?.target).toBeDefined();
  });

  it('makes CautiousBot value Ashline safety Accords during Corp Crackdown', () => {
    const state = newGame({
      seed: 'HARNESS-CAUTIOUS-CORP',
      campaignTensionId: 'campaign_corp_crackdown',
    });
    state.pressures.heat = 78;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'broker_accord',
    );
    const choice = CAUTIOUS_BOT.chooseOrder(state, options, createTestContext('CAUTIOUS', 'corp'));

    expect(choice?.actionId).toBe('broker_accord');
    expect(choice?.preview.brokerAccord?.ok ? choice.preview.brokerAccord.faction.id : undefined).toBe(
      'faction_ashline_bureau',
    );
  });

  it('makes GreedyBot push Front investment during Dirty Capital', () => {
    const state = newGame({
      seed: 'HARNESS-GREEDY-CAPITAL',
      campaignTensionId: 'campaign_dirty_capital',
    });
    state.pressures.resources = 5200;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front' || option.actionId === 'run_small_job',
    );
    const choice = GREEDY_BOT.chooseOrder(state, options, createTestContext('GREEDY', 'capital'));

    expect(choice?.actionId).toBe('invest_front');
    expect(choice?.preview.frontInvestment?.ok).toBeTrue();
  });

  it('makes AggressiveBot exploit Industrial Cut Front opportunities', () => {
    const state = newGame({
      seed: 'HARNESS-AGGRESSIVE-INDUSTRIAL',
      campaignTensionId: 'campaign_industrial_cut',
    });
    state.pressures.resources = 5200;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = AGGRESSIVE_BOT.chooseOrder(state, options, createTestContext('AGGRO', 'industrial'));
    const frontId = choice?.preview.frontInvestment?.ok
      ? choice.preview.frontInvestment.definition.id
      : undefined;

    expect(choice?.actionId).toBe('invest_front');
    expect(frontId).toBeDefined();
    expect(['front_zero_mercy_cut', 'front_courier_line']).toContain(frontId ?? '');
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

  it('lets RandomBot select front investment options when they are legal', () => {
    const state = withFrontOpportunitySet(
      withResources(newGame({ seed: 'HARNESS-RANDOM-FRONTS' }), 6000),
      ['front_shell_gallery', 'front_zero_mercy_cut'],
    );
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = RANDOM_BOT.chooseOrder(state, options, createTestContext('RANDOM-FRONT', 'bot'));

    expect(choice?.actionId).toBe('invest_front');
    expect(choice?.preview.frontInvestment?.ok).toBeTrue();
  });

  it('makes OperatorBot establish an early useful front when reserves allow', () => {
    const state = withFrontOpportunitySet(
      withResources(newGame({ seed: 'HARNESS-OPERATOR-FRONTS' }), 6500),
      ['front_shell_gallery', 'front_black_clinic', 'front_zero_mercy_cut'],
    );
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'front'));

    expect(choice?.actionId).toBe('invest_front');
    expect(choice?.target?.type).toBe('front_opportunity');
    expect(choice?.preview.frontInvestment?.ok ? choice.preview.frontInvestment.mode : undefined).toBe(
      'establish',
    );
  });

  it('makes CautiousBot avoid Zero Mercy Cut when safer front options exist', () => {
    const state = withFrontOpportunitySet(
      withResources(newGame({ seed: 'HARNESS-CAUTIOUS-FRONTS' }), 6500),
      ['front_shell_gallery', 'front_courier_line', 'front_zero_mercy_cut'],
    );
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = CAUTIOUS_BOT.chooseOrder(state, options, createTestContext('CAUTIOUS', 'front'));

    expect(choice?.target).not.toEqual({
      type: 'front_opportunity',
      id: 'front_opportunity_front_zero_mercy_cut',
    });
    expect(choice?.preview.frontInvestment?.ok).toBeTrue();
  });

  it('makes AggressiveBot prefer high-Dominion front options', () => {
    const state = withFrontOpportunitySet(
      withResources(newGame({ seed: 'HARNESS-AGGRESSIVE-FRONTS' }), 6500),
      ['front_shell_gallery', 'front_black_clinic', 'front_zero_mercy_cut'],
    );
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = AGGRESSIVE_BOT.chooseOrder(state, options, createTestContext('AGGRO', 'front'));

    expect(choice?.target).toEqual({
      type: 'front_opportunity',
      id: 'front_opportunity_front_zero_mercy_cut',
    });
  });

  it('makes GreedyBot prefer the strongest resource-yielding front', () => {
    const state = withFrontOpportunitySet(
      withResources(newGame({ seed: 'HARNESS-GREEDY-FRONTS' }), 6500),
      ['front_black_clinic', 'front_courier_line', 'front_zero_mercy_cut'],
    );
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'invest_front',
    );
    const choice = GREEDY_BOT.chooseOrder(state, options, createTestContext('GREEDY', 'front'));

    expect(choice?.target).toEqual({
      type: 'front_opportunity',
      id: 'front_opportunity_front_zero_mercy_cut',
    });
  });

  it('makes OperatorBot target front Lay Low when exposure is hot', () => {
    const state = withHotFront(
      withResources(newGame({ seed: 'HARNESS-FRONT-LAY-LOW' }), 6500),
      'front_pale_circuit',
      76,
    );
    state.pressures.heat = 76;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'lay_low',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'cool'));

    expect(choice?.actionId).toBe('lay_low');
    expect(choice?.target).toEqual({
      type: 'front',
      id: 'front_pale_circuit',
    });
    expect(choice?.preview.frontExposure?.projectedExposure).toBeLessThan(76);
  });

  it('lets RandomBot select legal Broker Accord options', () => {
    const state = withActiveFactions(withResources(newGame({ seed: 'HARNESS-RANDOM-ACCORD' }), 7000), [
      'faction_ashline_bureau',
      'faction_helix_meridian',
      'faction_velvet_house',
      'faction_chrome_maw',
    ]);
    state.pressures.intel = 40;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'broker_accord',
    );
    const choice = RANDOM_BOT.chooseOrder(state, options, createTestContext('RANDOM', 'accord'));

    expect(choice?.actionId).toBe('broker_accord');
    expect(choice?.target?.type).toBe('faction');
    expect(choice?.preview.brokerAccord?.ok).toBeTrue();
  });

  it('makes OperatorBot use a front safety Accord when exposure is severe', () => {
    const state = withActiveFactions(
      withHotFront(withResources(newGame({ seed: 'HARNESS-OPERATOR-ACCORD-FRONT' }), 7000), 'front_pale_circuit', 86),
      [
        'faction_ashline_bureau',
        'faction_helix_meridian',
        'faction_velvet_house',
        'faction_chrome_maw',
      ],
    );
    state.pressures.intel = 40;
    state.pressures.heat = 52;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'broker_accord',
    );
    const choice = OPERATOR_BOT.chooseOrder(state, options, createTestContext('OPERATOR', 'accord'));

    expect(choice?.target).toEqual({
      type: 'faction',
      factionId: 'faction_ashline_bureau',
      accordId: 'accord_ashline_inspection_delay',
    });
    expect(choice?.preview.brokerAccord?.ok ? choice.preview.brokerAccord.frontEffectsOnStart[0].projectedExposure : undefined).toBeLessThan(86);
  });

  it('makes AggressiveBot prefer Dominion-oriented Broker Accords', () => {
    const state = withActiveFactions(withResources(newGame({ seed: 'HARNESS-AGGRESSIVE-ACCORD' }), 7000), [
      'faction_ashline_bureau',
      'faction_helix_meridian',
      'faction_velvet_house',
      'faction_chrome_maw',
    ]);
    state.pressures.intel = 40;
    state.pressures.dominion = 46;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'broker_accord',
    );
    const choice = AGGRESSIVE_BOT.chooseOrder(state, options, createTestContext('AGGRO', 'accord'));

    expect(choice?.target).toEqual({
      type: 'faction',
      factionId: 'faction_chrome_maw',
      accordId: 'accord_chrome_muscle_retainer',
    });
  });

  it('makes GreedyBot prefer resource-oriented Broker Accords', () => {
    const state = withActiveFactions(withResources(newGame({ seed: 'HARNESS-GREEDY-ACCORD' }), 1800), [
      'faction_ashline_bureau',
      'faction_helix_meridian',
      'faction_velvet_house',
      'faction_chrome_maw',
    ]);
    state.pressures.intel = 40;
    const options = getLegalOrderOptions(state).filter(
      (option) => option.actionId === 'broker_accord',
    );
    const choice = GREEDY_BOT.chooseOrder(state, options, createTestContext('GREEDY', 'accord'));

    expect(choice?.target).toEqual({
      type: 'faction',
      factionId: 'faction_helix_meridian',
      accordId: 'accord_helix_quiet_capital',
    });
  });

  it('keeps HandlerBot outside legacy strategy batches while exposing an extended set', () => {
    expect(STRATEGY_AGENTS.map((agent) => agent.id)).not.toContain('handler');
    expect(EXTENDED_STRATEGY_AGENTS.map((agent) => agent.id)).toContain('handler');
  });

  it('lets HandlerBot choose queueable orders through the advisor policy', () => {
    const state = newGame({ seed: 'HARNESS-HANDLER-LEGAL' });
    const options = getLegalOrderOptions(state);
    const choice = HANDLER_BOT.chooseOrder(
      state,
      options,
      createTestContext('HANDLER', 'bot'),
    );

    expect(choice).toBeDefined();
    expect(choice ? options.includes(choice) : false).toBeTrue();
    expect(
      queueOrder(state, {
        actionId: choice?.actionId ?? 'gather_intel',
        assignedOperativeId: choice?.assignedOperativeId,
        target: choice?.target,
      }).ok,
    ).toBeTrue();
  });

  it('can complete a HandlerBot training run without invalid recommendations', () => {
    const run = simulateRun({
      agent: HANDLER_BOT,
      seed: 'HARNESS-HANDLER-COMPLETE',
      runMode: 'training',
      collectTrace: true,
    });

    expect(run.handlerStats).toBeDefined();
    expect(run.handlerStats?.invalidRecommendationCount)
      .withContext(run.trace.map((entry) => entry.message).join(' | '))
      .toBe(0);
    expect(run.reason).not.toBe('invalid_recommendation');
    expect(run.reason).not.toBe('agent_stalled');
    expect(run.reason).not.toBe('softlock');
    expect(run.outcome).not.toBe('incomplete');
    expect(run.trace.length).toBeGreaterThan(0);
  });

  it('reports HandlerBot validation sections when included in a batch', () => {
    const report = simulateBatch({
      agents: [HANDLER_BOT, OPERATOR_BOT],
      runsPerAgent: 1,
      runMode: 'training',
      seedPrefix: 'HARNESS-HANDLER-REPORT',
    });
    const output = formatBatchReport(report);

    expect(report.handlerValidationSummary.length).toBe(1);
    expect(report.handlerTrainingValidation.length).toBe(1);
    expect(report.handlerConfidenceDistribution.length).toBe(3);
    expect(output).toContain('handler_validation_summary');
    expect(output).toContain('handler_campaign_summary');
    expect(output).toContain('handler_loss_causes');
    expect(output).toContain('handler_invalid_recommendations');
    expect(output).toContain('handler_confidence_distribution');
    expect(output).toContain('handler_training_validation');
    expect(output).toContain('handler_operator_delta');
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
    expect(output).toContain('front_summary');
    expect(output).toContain('front_highlights');
    expect(output).toContain('front_outcomes');
    expect(output).toContain('front_events');
    expect(output).toContain('front_opportunity_sets');
    expect(output).toContain('front_exposure_bands');
    expect(output).toContain('faction_summary');
    expect(output).toContain('accord_usage');
    expect(output).toContain('faction_outcomes');
    expect(output).toContain('faction_events');
    expect(output).toContain('faction_sets');
    expect(output).toContain('roster_compositions');
    expect(output).toContain('operative_presence');
    expect(output).toContain('operative_recruitment');
    expect(output).toContain('operative_usage');
    expect(output).toContain('operative_stress');
    expect(output).toContain('operative_danger');
    expect(output).toContain('operative_events');
    expect(output).toContain('hire_pool_selection');
    expect(output).toContain('campaign_summary');
    expect(output).toContain('campaign_agent_summary');
    expect(output).toContain('campaign_loss_causes');
    expect(output).toContain('campaign_action_usage');
    expect(output).toContain('campaign_events');
    expect(output).toContain('campaign_system_usage');
    expect(report.campaignSummaries.length).toBeGreaterThan(0);
    expect(report.campaignAgentSummaries.length).toBeGreaterThan(0);
    expect(report.campaignSystemUsage.length).toBeGreaterThan(0);
    expect(
      report.campaignSummaries.reduce((total, summary) => total + summary.runs, 0),
    ).toBe(report.totalRuns);

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
      expect(summary.frontSummary.averageOwnedFronts).toBeGreaterThanOrEqual(1);
      expect(summary.frontSummary.establishmentRate).toBeGreaterThanOrEqual(0);
      expect(summary.frontSummary.upgradeRate).toBeGreaterThanOrEqual(0);
      expect(summary.frontSummary.averageYieldResources).toBeGreaterThanOrEqual(0);
      expect(summary.frontOutcomeReports.length).toBeGreaterThan(0);
      expect(summary.frontOpportunitySetReports.length).toBeGreaterThan(0);
      expect(summary.frontExposureBandReports.length).toBeGreaterThan(0);
      expect(summary.factionSummary.averageBrokerAccordUses).toBeGreaterThanOrEqual(0);
      expect(summary.factionOutcomeReports.length).toBeGreaterThan(0);
      expect(summary.factionSetReports.length).toBeGreaterThan(0);
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

  it('can expand a batch across every Campaign Tension for each agent', () => {
    const campaignTensionIds = CAMPAIGN_TENSION_DEFINITIONS.map(
      (campaign) => campaign.id,
    ) as CampaignTensionId[];
    const report = simulateBatch({
      agents: [RANDOM_BOT],
      runsPerAgent: 1,
      campaignTensionIds,
      seedPrefix: 'HARNESS-ALL-CAMPAIGNS',
    });
    const output = formatBatchReport(report);

    expect(report.totalRuns).toBe(campaignTensionIds.length);
    expect(report.campaignSummaries.map((summary) => summary.campaignId)).toEqual(
      campaignTensionIds,
    );
    expect(report.campaignAgentSummaries.length).toBe(campaignTensionIds.length);
    expect(report.campaignLossCauses.length).toBe(campaignTensionIds.length);
    expect(report.campaignSystemUsage.length).toBe(campaignTensionIds.length);

    for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
      expect(output).toContain(campaign.id);
      expect(output).toContain(campaign.name);
    }
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

const LAY_LOW_TEST_BOT: StrategyAgent = {
  id: 'test_lay_low',
  label: 'Test Lay Low',
  chooseOrder(_state, options) {
    return options.find((option) => option.actionId === 'lay_low') ?? options[0];
  },
  chooseEventChoice(_state, options) {
    return options[0];
  },
};

const FRONT_TEST_BOT: StrategyAgent = {
  id: 'test_front',
  label: 'Test Front',
  chooseOrder(_state, options) {
    return (
      options.find(
        (option) =>
          option.actionId === 'invest_front' && option.target?.type === 'front_opportunity',
      ) ??
      options.find((option) => option.actionId === 'lay_low') ??
      options[0]
    );
  },
  chooseEventChoice(_state, options) {
    return options[0];
  },
};

function targetKey(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `ledger:${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `contact:${target.contactId}:${target.optionId}`;
  }

  if (target.type === 'faction') {
    return `faction:${target.factionId}:${target.accordId}`;
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

function withActiveFactions(state: GameState, activeFactionIds: FactionId[]): GameState {
  return {
    ...state,
    activeFactionIds,
    factions: Object.fromEntries(
      activeFactionIds.flatMap((factionId) => {
        const definition = FACTION_DEFINITIONS.find((candidate) => candidate.id === factionId);

        return definition ? [[factionId, materializeFactionState(definition)]] : [];
      }),
    ) as GameState['factions'],
    activeAccords: {},
  };
}

function withResources(state: GameState, resources: number): GameState {
  return {
    ...state,
    pressures: {
      ...state.pressures,
      resources,
    },
  };
}

function withFrontOpportunitySet(
  state: GameState,
  definitionIds: FrontDefinitionId[],
): GameState {
  return {
    ...state,
    frontOpportunities: definitionIds.map(materializeFrontOpportunityForTest),
  };
}

function materializeFrontOpportunityForTest(
  definitionId: FrontDefinitionId,
): FrontOpportunity {
  const placement = getFrontPlacementForTest(definitionId);

  return {
    id: `front_opportunity_${definitionId}`,
    definitionId,
    districtId: placement.districtId,
    ...(placement.venueId ? { venueId: placement.venueId } : {}),
    ...(placement.relatedRivalId ? { relatedRivalId: placement.relatedRivalId } : {}),
  };
}

function getFrontPlacementForTest(
  definitionId: FrontDefinitionId,
): Pick<FrontOpportunity, 'districtId' | 'venueId' | 'relatedRivalId'> {
  switch (definitionId) {
    case 'front_black_clinic':
      return { districtId: 'district_ghostline_market' };
    case 'front_courier_line':
      return { districtId: 'district_chrome_narrows' };
    case 'front_shell_gallery':
      return {
        districtId: 'district_violet_ward',
        venueId: 'venue_glass_saint',
        relatedRivalId: 'rival_nyx_ardent',
      };
    case 'front_surveillance_den':
      return { districtId: 'district_ghostline_market' };
    case 'front_zero_mercy_cut':
      return {
        districtId: 'district_chrome_narrows',
        venueId: 'venue_zero_mercy',
        relatedRivalId: 'rival_knox_marrow',
      };
    case 'front_pale_circuit':
      return {
        districtId: 'district_violet_ward',
        venueId: 'venue_pale_circuit',
        relatedRivalId: 'rival_nyx_ardent',
      };
  }
}

function withHotFront(
  state: GameState,
  frontId: FrontDefinitionId,
  exposure: number,
): GameState {
  const existingFront = state.fronts[frontId];
  const placement = getFrontPlacementForTest(frontId);
  const front: FrontState = {
    id: frontId,
    definitionId: frontId,
    districtId: placement.districtId,
    ...(placement.venueId ? { venueId: placement.venueId } : {}),
    ...(placement.relatedRivalId ? { relatedRivalId: placement.relatedRivalId } : {}),
    level: existingFront?.level ?? 1,
    exposure,
    establishedWeek: existingFront?.establishedWeek ?? 1,
    compromised: false,
    active: true,
    flags: existingFront?.flags ?? {},
    yieldHistory: existingFront?.yieldHistory ?? [],
  };

  return {
    ...state,
    fronts: {
      ...state.fronts,
      [frontId]: front,
    },
  };
}
