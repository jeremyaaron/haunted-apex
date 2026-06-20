import type { RunTelemetry, TelemetryEntry } from './telemetry-types';

describe('telemetry types', () => {
  it('supports local bot run telemetry entries without persistence fields', () => {
    const entries: TelemetryEntry[] = [
      {
        kind: 'command_used',
        week: 1,
        actionId: 'expand_influence',
        actionLabel: 'Expand Influence',
        targetKey: 'district:district_violet_ward',
        assignedOperativeId: 'op_mara_voss',
      },
      {
        kind: 'pressure_delta',
        week: 1,
        sourceKind: 'action',
        sourceId: 'expand_influence',
        sourceLabel: 'Expand Influence',
        pressure: 'dominion',
        delta: 8,
      },
      {
        kind: 'system_engaged',
        week: 1,
        system: 'lay_low',
        sourceId: 'lay_low',
      },
      {
        kind: 'operative_assigned',
        week: 1,
        operativeId: 'op_mara_voss',
        actionId: 'expand_influence',
      },
    ];

    const telemetry: RunTelemetry = {
      runId: 'run_1',
      actorType: 'bot',
      botId: 'handler',
      campaignTensionId: 'campaign_dirty_capital',
      seed: 'TEST-SEED',
      entries,
    };

    expect(telemetry.entries.length).toBe(4);
    expect(telemetry.entries.map((entry) => entry.kind)).toEqual([
      'command_used',
      'pressure_delta',
      'system_engaged',
      'operative_assigned',
    ]);
    expect('savedAt' in telemetry).toBeFalse();
  });
});
