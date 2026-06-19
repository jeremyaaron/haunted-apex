import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GameFacade } from './game';

describe('App Advisor UI', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('renders Advisor panel modes and hides the panel when Off is selected', () => {
    const fixture = TestBed.createComponent(App);
    const facade = TestBed.inject(GameFacade);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.advisor-mode-control')).toBeTruthy();
    expect(compiled.querySelector('.advisor-panel')?.textContent).toContain('Strategic Coach');
    expect(compiled.querySelector('.advisor-panel')?.textContent).toContain('Dominion Pace');
    expect(compiled.querySelector('.advisor-panel')?.textContent).not.toContain('Handler Pick');

    facade.setAdvisorMode('off');
    fixture.detectChanges();

    expect(compiled.querySelector('.advisor-panel')).toBeNull();
    expect(compiled.querySelector('.advisor-mode-control')).toBeTruthy();
  });

  it('renders exact Handler Pick highlights without queueing orders', () => {
    const fixture = TestBed.createComponent(App);
    const facade = TestBed.inject(GameFacade);
    facade.startTrainingRun();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const stateBeforeRead = facade.state();

    expect(compiled.querySelector('.advisor-panel.mode-handler')?.textContent).toContain(
      'Handler Pick',
    );
    expect(compiled.querySelector('.action-card.handler-pick')).toBeTruthy();
    expect(compiled.querySelector('.action-card.handler-pick')?.textContent).toContain(
      'Handler Pick',
    );
    expect(facade.state()).toBe(stateBeforeRead);
    expect(facade.state().queuedOrders).toEqual([]);
  });

  it('renders Handler Pick event choice highlights without resolving fallout', () => {
    const fixture = TestBed.createComponent(App);
    const facade = TestBed.inject(GameFacade);
    facade.startTrainingRun();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(findCard(compiled, '.action-card', 'Gather Intel'), 'Queue Order');
    fixture.detectChanges();
    clickButton(compiled, 'Advance Week');
    fixture.detectChanges();

    const pendingEvent = facade.state().pendingEvent;

    expect(facade.state().phase).toBe('EVENT_CHOICE');
    expect(compiled.querySelector('.choice-card.handler-pick')).toBeTruthy();
    expect(compiled.querySelector('.choice-card.handler-pick')?.textContent).toContain(
      'Handler Pick',
    );
    expect(facade.state().pendingEvent).toEqual(pendingEvent);
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
