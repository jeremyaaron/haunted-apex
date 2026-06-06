import { TestBed } from '@angular/core/testing';
import { newGame } from './engine';
import { CURRENT_RUN_STORAGE_KEY } from './game';
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
    expect(compiled.textContent).toContain('Gather Intel');
    expect(compiled.textContent).toContain('Mara Voss');
    expect(compiled.textContent).toContain('Dominion target 70');
    expect(compiled.textContent).toContain('Win at 70');
    expect(compiled.textContent).toContain('Warning at 25');
    expect(compiled.textContent).toContain('Debug Panel');
    expect(compiled.textContent).toContain('RNG Cursor');
    expect(compiled.textContent).toContain('Exact Risk');
    expect(compiled.textContent).toContain('Run Harness');
    expect(compiled.textContent).toContain('Run Harness to simulate 100 games per strategy.');
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

    const availableChoice = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.choice-card')).find(
      (button) => !button.disabled,
    );

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
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(state));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const jobCard = findCard(compiled, '.action-card', 'Run a Small Job');

    selectValue(jobCard, '.target-control select', 'venue:venue_zero_mercy');
    fixture.detectChanges();

    expect(jobCard.textContent).toContain('+1950 Resources');
    expect(jobCard.textContent).toContain('High 26%');
    expect(jobCard.querySelector('.rival-warning')?.textContent).toContain('Knox Marrow');
    expect(jobCard.querySelector('.rival-warning')?.textContent).toContain('Pressure +8');
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
    expect(
      jobCard.querySelector<HTMLSelectElement>('.target-control select')?.value,
    ).toBe('venue:venue_zero_mercy');

    clickButton(compiled, 'New Run');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const refreshedJobCard = findCard(compiled, '.action-card', 'Run a Small Job');
    expect(
      refreshedJobCard.querySelector<HTMLSelectElement>('.target-control select')?.value,
    ).toBe('');
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
