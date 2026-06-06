import { TestBed } from '@angular/core/testing';
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
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );

  if (!button) {
    throw new Error(`Could not find button containing ${text}`);
  }

  button.click();
}
