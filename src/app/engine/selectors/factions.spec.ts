import type { ActiveAccordId, GameState } from '../model';
import { newGame } from '../simulation';
import { selectFactionPanelView } from './factions';

describe('faction selectors', () => {
  it('returns active Factions with metrics, related entities, Accord previews, and history', () => {
    const base = newGame({ seed: 'FACTION-PANEL' });
    const activeAccordId: ActiveAccordId = 'active_accord_ashline_clean_corridor_1';
    const state: GameState = {
      ...base,
      activeAccords: {
        [activeAccordId]: {
          id: activeAccordId,
          definitionId: 'accord_ashline_clean_corridor',
          factionId: 'faction_ashline_bureau',
          startedWeek: 2,
          remainingWeeks: 1,
          firstWeeklyEffectWeek: 3,
          source: {
            type: 'broker_accord',
          },
        },
      },
      factions: {
        ...base.factions,
        faction_ashline_bureau: {
          ...base.factions.faction_ashline_bureau!,
          standing: 52,
          suspicion: 48,
          obligation: 14,
          activeAccordIds: [activeAccordId],
          usedAccordIds: ['accord_ashline_clean_corridor'],
          recentInteractions: [
            {
              week: 2,
              sourceType: 'accord',
              sourceId: 'accord_ashline_clean_corridor',
              standingDelta: 3,
              suspicionDelta: 8,
              obligationDelta: 8,
            },
          ],
        },
      },
    };

    const panel = selectFactionPanelView(state);
    const ashline = panel.factions.find((faction) => faction.id === 'faction_ashline_bureau');

    expect(panel.activeCount).toBe(4);
    expect(panel.activeAccordCount).toBe(1);
    expect(panel.availableAccordCount).toBeGreaterThan(0);
    expect(ashline).toEqual(
      jasmine.objectContaining({
        name: 'Ashline Bureau',
        archetype: 'security_bureau',
        status: 'neutral',
        standing: 52,
        suspicion: 48,
        obligation: 14,
      }),
    );
    expect(ashline?.metrics.map((metric) => metric.label)).toEqual([
      'Standing',
      'Suspicion',
      'Obligation',
    ]);
    expect(ashline?.relatedEntities.map((entity) => entity.label)).toContain('Chrome Narrows');
    expect(ashline?.relatedEntities.map((entity) => entity.label)).toContain('The Pale Circuit');
    expect(ashline?.accordOptions.map((accord) => accord.label)).toEqual([
      'Clean Corridor',
      'Inspection Delay',
    ]);
    expect(ashline?.accordOptions[0]).toEqual(
      jasmine.objectContaining({
        available: false,
        unavailableReason: 'accord_already_used',
        costSummary: '700 Resources',
        weeklySummary: '-3 Heat',
        factionStartSummary: '+3 Standing · +8 Suspicion · +8 Obligation',
      }),
    );
    expect(ashline?.activeAccords[0]).toEqual(
      jasmine.objectContaining({
        label: 'Clean Corridor',
        remainingWeeks: 1,
        timingLabel: '1 weekly tick remaining',
        weeklySummary: '-3 Heat',
        factionWeeklySummary: '+3 Suspicion',
      }),
    );
    expect(ashline?.recentInteractions[0]).toEqual(
      jasmine.objectContaining({
        week: 2,
        sourceLabel: 'Clean Corridor',
      }),
    );
  });
});
