import { TestBed } from '@angular/core/testing';
import { getOperativeDefinition, materializeOperativeState, newGame } from './engine';
import {
  CURRENT_GAME_VERSION,
  CURRENT_RUN_STORAGE_KEY,
  CURRENT_SAVE_SCHEMA_VERSION,
  LEGACY_V02_STORAGE_KEY,
} from './game';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Black Ledger shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('The Black Ledger');
  });

  it('should render the playable dashboard panels', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Pressure Meters');
    expect(compiled.textContent).toContain('Command Board');
    expect(compiled.textContent).toContain('Operative Roster');
    expect(compiled.textContent).toContain('Event Feed');
    expect(compiled.textContent).toContain('The Roster');
    expect(compiled.textContent).toContain('Field Guide');
    expect(compiled.textContent).toContain('Risk: Low 10%');
    expect(compiled.textContent).toContain('Gather Intel');
    expect(compiled.querySelectorAll('.operative-card').length).toBe(3);
    expect(compiled.querySelectorAll('.hire-card').length).toBe(4);
    expect(compiled.textContent).toContain('Available Contacts');
    expect(compiled.textContent).toContain('Dominion target 85');
    expect(compiled.textContent).toContain('Win at 85');
    expect(compiled.textContent).toContain('Warning at 25');
    expect(compiled.textContent).not.toContain('Debug Panel');
    expect(compiled.textContent).toContain('Each week begins on the Command Board');
    expect(compiled.textContent).toContain('Unspent Command does not carry forward');
    expect(compiled.textContent).toContain('Control is your network foothold');
    expect(compiled.textContent).toContain('Watching (0-24)');
    expect(compiled.textContent).toContain('do not modify actions in this release');
    expect(compiled.textContent).toContain('Rarity changes how often an operative appears');
    expect(compiled.textContent).not.toContain('operative_stress_at_least');
  });

  it('renders roster identity, role, trait, liability, and Stress information', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = Array.from(compiled.querySelectorAll<HTMLElement>('.operative-card'));

    expect(cards).toHaveSize(3);
    expect(cards.every((card) => card.textContent?.includes('Signature'))).toBeTrue();
    expect(cards.every((card) => card.textContent?.includes('Stress'))).toBeTrue();
    expect(cards.some((card) => card.textContent?.includes('Liability'))).toBeTrue();
    expect(compiled.querySelector('.rarity-tag')).toBeTruthy();
  });

  it('opens the shared operative detail for roster and hire entries and closes with Escape', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('.operative-card')?.click();
    fixture.detectChanges();

    let dialog = compiled.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Active Operative');
    expect(dialog?.textContent).toContain('Visible Traits');
    expect(dialog?.textContent).toContain('Affinities');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();

    compiled.querySelector<HTMLButtonElement>('.hire-card')?.click();
    fixture.detectChanges();
    dialog = compiled.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.textContent).toContain('Hire Candidate');

    clickButton(dialog as HTMLElement, 'Close');
    fixture.detectChanges();
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
  });

  it('matches Recruit target options to the visible hire pool', () => {
    const state = newGame({ seed: 'PHASE-8-RECRUIT-OPTIONS' });
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const recruitCard = findCard(compiled, '.action-card', 'Recruit an Operative');
    const optionValues = Array.from(
      recruitCard.querySelectorAll<HTMLOptionElement>('.target-control option'),
    )
      .map((option) => option.value)
      .filter(Boolean);

    expect(optionValues).toEqual(state.hirePool.map((id) => `recruit:${id}`));
  });

  it('recruits a non-first candidate through the Command loop', () => {
    const state = newGame({ seed: 'PHASE-8-RECRUIT-MOVE' });
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const recruitCard = findCard(compiled, '.action-card', 'Recruit an Operative');
    const recruitedId = state.hirePool[1];
    const recruitedName = getOperativeDefinition(recruitedId)?.name ?? recruitedId;

    selectValue(recruitCard, '.target-control select', `recruit:${recruitedId}`);
    fixture.detectChanges();
    expect(recruitCard.querySelector('.recruit-summary')?.textContent).toContain(
      'Projected roster: 4 / 5',
    );

    clickButton(recruitCard, 'Queue Order');
    fixture.detectChanges();
    clickButton(compiled, 'Advance Week');
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.operative-card')).toHaveSize(4);
    expect(compiled.querySelectorAll('.hire-card')).toHaveSize(3);
    expect(compiled.querySelector('.operative-list')?.textContent).toContain(recruitedName);
    expect(compiled.querySelector('.hire-list')?.textContent).not.toContain(recruitedName);
  });

  it('keeps remaining candidates visible and explains a full roster', () => {
    const state = newGame({ seed: 'PHASE-8-FULL-ROSTER' });
    const recruitedIds = state.hirePool.slice(0, 2);
    state.operatives.push(...recruitedIds.map(materializeOperativeState));
    state.hirePool = state.hirePool.slice(2);
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.operative-card')).toHaveSize(5);
    expect(compiled.querySelectorAll('.hire-card')).toHaveSize(2);
    expect(compiled.querySelector('.hire-pool')?.textContent).toContain(
      'Roster full: five active operatives is the current limit.',
    );
  });

  it('shows matched visible assignment sources and target-specific effects', () => {
    const state = newGame({ seed: 'VIOLET-ASH-MQ4OCVTK' });
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gatherCard = findCard(compiled, '.action-card', 'Gather Intel');

    selectValue(gatherCard, '.assignment-control select', 'op_orchid_seven');
    selectValue(gatherCard, '.target-control select', 'district:district_ghostline_market');
    fixture.detectChanges();

    const summary = gatherCard.querySelector('.assignment-summary');
    expect(summary?.textContent).toContain('Orchid Seven');
    expect(summary?.textContent).toContain('Orchid Ghostline');
    expect(summary?.textContent).toContain('+300 Resources');
    expect(summary?.textContent).toContain('Risk');
  });

  it('keeps a Breaking operative selectable while showing the danger state', () => {
    const state = newGame({ seed: 'PHASE-8-BREAKING' });
    const breakingOperative = state.operatives[0];
    breakingOperative.stress = 85;
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gatherCard = findCard(compiled, '.action-card', 'Gather Intel');
    const option = gatherCard.querySelector<HTMLOptionElement>(
      `.assignment-control option[value="${breakingOperative.id}"]`,
    );

    expect(option?.disabled).toBeFalse();
    selectValue(gatherCard, '.assignment-control select', breakingOperative.id);
    fixture.detectChanges();
    expect(gatherCard.querySelector('.assignment-summary.breaking')).toBeTruthy();
  });

  it('renders and dismisses the legacy-save compatibility notice', () => {
    localStorage.setItem(LEGACY_V02_STORAGE_KEY, '{}');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.compatibility-notice')?.textContent).toContain(
      'Save compatibility update',
    );
    clickButton(compiled.querySelector('.compatibility-notice') as HTMLElement, 'Dismiss');
    fixture.detectChanges();
    expect(compiled.querySelector('.compatibility-notice')).toBeNull();
  });

  it('should expose expanded target and territory harness reporting', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, shiftKey: true }));
    fixture.detectChanges();

    clickButton(compiled, 'Run Harness');
    fixture.detectChanges();

    const output = compiled.querySelector('.harness-output pre')?.textContent ?? '';
    expect(output).toContain('target_highlights');
    expect(output).toContain('target_details');
    expect(output).toContain('rival_pressure');
    expect(output).toContain('district_state');
    expect(output).toContain('loss_causes');
    expect(output).toContain('contextual_events');
    expect(output).toContain('Operator / Sane');
  });

  it('should keep debug tooling hidden behind the keyboard toggle', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).not.toContain('Debug Panel');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', metaKey: true, shiftKey: true }));
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Debug Panel');
    expect(compiled.textContent).toContain('Run Harness');
    expect(compiled.textContent).toContain('Generated Starting Roster IDs');
    expect(compiled.textContent).toContain('Matched Modifier Sources');
    expect(compiled.textContent).toContain('Eligible Operative Events and Weights');
    expect(compiled.textContent).toContain('Save Schema');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', metaKey: true, shiftKey: true }));
    fixture.detectChanges();
    expect(compiled.textContent).not.toContain('Debug Panel');
  });

  it('should queue an action from the dashboard', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gatherCard = findCard(compiled, '.action-card', 'Gather Intel');

    clickButton(gatherCard, 'Queue Order');
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Queued Orders');
    expect(compiled.querySelector('.queued-order')?.textContent).toContain('Gather Intel');
    expect(compiled.textContent).toContain('1 Command');
  });

  it('should advance to an event choice from the dashboard', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(findCard(compiled, '.action-card', 'Gather Intel'), 'Queue Order');
    fixture.detectChanges();
    clickButton(compiled, 'Advance Week');
    fixture.detectChanges();

    expect(compiled.textContent).toContain('EVENT_CHOICE');
    expect(compiled.textContent).toContain('Intercepted Transmission');
    expect(compiled.querySelector('.choice-card')).toBeTruthy();
  });

  it('should resolve an event choice from the dashboard', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(findCard(compiled, '.action-card', 'Gather Intel'), 'Queue Order');
    fixture.detectChanges();
    clickButton(compiled, 'Advance Week');
    fixture.detectChanges();

    const availableChoice = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.choice-card'),
    ).find((button) => !button.disabled);

    expect(availableChoice).toBeTruthy();
    availableChoice?.click();
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('EVENT_CHOICE');
    expect(compiled.textContent).toContain('Week 2 / 8');
  });

  it('renders target options with district, venue, and rival labels', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gatherCard = findCard(compiled, '.action-card', 'Gather Intel');
    const options = Array.from(
      gatherCard.querySelectorAll<HTMLOptionElement>('.target-control option'),
    ).map((option) => option.textContent?.trim());

    expect(options).toContain('No target');
    expect(options).toContain('Violet Ward');
    expect(options).toContain('Violet Ward / The Glass Saint');
    expect(options).toContain('Nyx Ardent');
  });

  it('disables required-target actions until a target is selected', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const jobCard = findCard(compiled, '.action-card', 'Run a Small Job');
    const queueButton = findButton(jobCard, 'Queue Order');

    expect(queueButton.disabled).toBeTrue();
    expect(jobCard.textContent).toContain('Select a target to queue this order.');

    selectValue(jobCard, '.target-control select', 'venue:venue_zero_mercy');
    fixture.detectChanges();

    expect(findButton(jobCard, 'Queue Order').disabled).toBeFalse();
  });

  it('updates effects, exact risk, and rival warning for a controlled target', () => {
    const state = newGame({ seed: 'VIOLET-ASH-1047' });
    state.districts.district_chrome_narrows.heat = 68;
    localStorage.setItem(
      CURRENT_RUN_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        gameVersion: CURRENT_GAME_VERSION,
        savedAt: '2026-06-07T00:00:00.000Z',
        state,
      }),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const jobCard = findCard(compiled, '.action-card', 'Run a Small Job');

    selectValue(jobCard, '.target-control select', 'venue:venue_zero_mercy');
    fixture.detectChanges();

    expect(jobCard.textContent).toContain('+1950 Resources');
    expect(jobCard.textContent).toContain('High 26%');
    expect(jobCard.querySelector('.rival-warning')?.textContent).toContain('Knox Marrow');
    expect(jobCard.querySelector('.rival-warning')?.textContent).toContain('Pressure +10');
    expect(jobCard.querySelector('.local-impact')?.textContent).toContain('Chrome Narrows');
  });

  it('queues and renders a selected target', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const jobCard = findCard(compiled, '.action-card', 'Run a Small Job');

    selectValue(jobCard, '.target-control select', 'venue:venue_zero_mercy');
    fixture.detectChanges();
    clickButton(jobCard, 'Queue Order');
    fixture.detectChanges();

    expect(compiled.querySelector('.queued-order')?.textContent).toContain('Zero Mercy');
  });

  it('renders all districts, venues, and rivals', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.district-row').length).toBe(3);
    expect(compiled.querySelectorAll('.venue-row').length).toBe(4);
    expect(compiled.querySelectorAll('.rival-row').length).toBe(2);
    expect(compiled.querySelector('.territory-panel')?.textContent).toContain('Ghostline Market');
    expect(compiled.querySelector('.territory-panel')?.textContent).toContain('Dominion -2');
    expect(compiled.querySelector('.territory-panel')?.textContent).toContain('Dominion +2');
    expect(compiled.querySelector('.rival-panel')?.textContent).toContain('Nyx Ardent');
    expect(compiled.querySelector('.rival-panel')?.textContent).toContain('Knox Marrow');
  });

  it('clears transient target selection when starting a new run', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const jobCard = findCard(compiled, '.action-card', 'Run a Small Job');

    selectValue(jobCard, '.target-control select', 'venue:venue_zero_mercy');
    fixture.detectChanges();
    expect(jobCard.querySelector<HTMLSelectElement>('.target-control select')?.value).toBe(
      'venue:venue_zero_mercy',
    );

    clickButton(compiled, 'New Run');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const refreshedJobCard = findCard(compiled, '.action-card', 'Run a Small Job');
    expect(refreshedJobCard.querySelector<HTMLSelectElement>('.target-control select')?.value).toBe(
      '',
    );
  });
});

function findCard(root: HTMLElement, selector: string, text: string): HTMLElement {
  const card = Array.from(root.querySelectorAll<HTMLElement>(selector)).find((candidate) =>
    candidate.textContent?.includes(text),
  );

  if (!card) {
    throw new Error(`Could not find ${selector} containing ${text}`);
  }

  return card;
}

function clickButton(root: HTMLElement, text: string): void {
  const button = findButton(root, text);

  button.click();
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );

  if (!button) {
    throw new Error(`Could not find button containing ${text}`);
  }

  return button;
}

function selectValue(root: HTMLElement, selector: string, value: string): void {
  const select = root.querySelector<HTMLSelectElement>(selector);

  if (!select) {
    throw new Error(`Could not find select ${selector}`);
  }

  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function storeState(state: ReturnType<typeof newGame>): void {
  localStorage.setItem(
    CURRENT_RUN_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      gameVersion: CURRENT_GAME_VERSION,
      savedAt: '2026-06-08T00:00:00.000Z',
      state,
    }),
  );
}
