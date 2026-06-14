import { newGame } from '../simulation';
import {
  selectCampaignActiveThisRunLabels,
  selectCampaignBriefingView,
  selectCampaignHeaderView,
  selectCampaignStartingEffectRows,
} from './campaign';

describe('campaign selectors', () => {
  it('builds the campaign header identity view', () => {
    const state = newGame({
      seed: 'CAMPAIGN-HEADER',
      campaignTensionId: 'campaign_nightlife_war',
    });
    const header = selectCampaignHeaderView(state);

    expect(header).toEqual({
      cityName: state.campaign.cityName,
      cityProfile: 'violet_nightlife',
      tensionId: 'campaign_nightlife_war',
      tensionName: 'Nightlife War',
      tensionSubtitle: 'Every invitation is a threat with better lighting.',
      label: `${state.campaign.cityName} · Nightlife War`,
    });
  });

  it('formats exact applied starting effect rows', () => {
    const state = newGame({
      seed: 'CAMPAIGN-EFFECTS',
      campaignTensionId: 'campaign_nightlife_war',
    });

    expect(selectCampaignStartingEffectRows(state)).toEqual([
      {
        id: 'pressure:dominion',
        kind: 'pressure',
        label: 'Dominion',
        amount: 3,
        value: '+3',
      },
      {
        id: 'pressure:loyalty',
        kind: 'pressure',
        label: 'Loyalty',
        amount: -4,
        value: '-4',
      },
      {
        id: 'pressure:heat',
        kind: 'pressure',
        label: 'Heat',
        amount: 4,
        value: '+4',
      },
      {
        id: 'rival:rival_nyx_ardent:pressure',
        kind: 'rival',
        label: 'Nyx Ardent Pressure',
        amount: 15,
        value: '+15',
      },
    ]);
  });

  it('separates active-this-run labels from favored tension labels', () => {
    const state = newGame({
      seed: 'CAMPAIGN-ACTIVE-FAVORED',
      campaignTensionId: 'campaign_ghostline_signal',
    });
    const briefing = selectCampaignBriefingView(state);
    const activeLabels = selectCampaignActiveThisRunLabels(state);

    expect(briefing.tensionName).toBe('Ghostline Signal');
    expect(briefing.description).toContain('A dead channel');
    expect(briefing.openingBriefing).toContain('The Ghostline is awake');
    expect(briefing.seed).toBe('CAMPAIGN-ACTIVE-FAVORED');
    expect(briefing.pressurePattern).toContain('Intel starts high.');
    expect(activeLabels).toContain('Ghostline Communion active');
    expect(activeLabels).toContain('The Pale Circuit owned');
    expect(activeLabels.some((label) => label.endsWith('starting'))).toBeTrue();
    expect(briefing.activeThisRun).toEqual(activeLabels);
    expect(briefing.favoredByTension).toContain('Ciro Moth');
    expect(briefing.favoredByTension).toContain('Surveillance Den');
    expect(briefing.activeThisRun).not.toContain('Ciro Moth');
  });
});
