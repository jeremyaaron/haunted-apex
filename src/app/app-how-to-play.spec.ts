import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GameFacade } from './game';

describe('App How To Play and run controls', () => {
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

  it('opens and closes the visible How To Play drawer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(findButton(compiled, 'How To Play')).toBeTruthy();
    expect(compiled.querySelector('.how-to-play-drawer')).toBeNull();

    clickButton(compiled, 'How To Play');
    fixture.detectChanges();

    const drawer = compiled.querySelector<HTMLElement>('.how-to-play-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer?.textContent).toContain('Reach');
    expect(drawer?.textContent).toContain('Command points');
    expect(drawer?.textContent).toContain('Advisor Modes');
    expect(drawer?.textContent).toContain('Training and Standard Runs');
    expect(drawer?.textContent).toContain('Pressure Glossary');

    clickButton(drawer as HTMLElement, 'Close');
    fixture.detectChanges();

    expect(compiled.querySelector('.how-to-play-drawer')).toBeNull();
  });

  it('starts Training from the header with the Training target and validated label', () => {
    const fixture = TestBed.createComponent(App);
    const facade = TestBed.inject(GameFacade);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(compiled, 'Training Run');
    fixture.detectChanges();

    expect(facade.state().run.mode).toBe('training');
    expect(facade.state().run.dominionTarget).toBe(80);
    expect(facade.state().run.validationStatus).toBe('validated');
    expect(compiled.querySelector('.status-strip')?.textContent).toContain('Training Run');
    expect(compiled.querySelector('.status-strip')?.textContent).toContain('Validated');
    expect(compiled.querySelector('.status-strip')?.textContent).toContain('Dominion target 80');
  });

  it('starts Standard custom-seed runs from the header with Unvalidated copy', () => {
    const fixture = TestBed.createComponent(App);
    const facade = TestBed.inject(GameFacade);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(compiled, 'Standard Run');
    fixture.detectChanges();

    expect(facade.state().run.mode).toBe('standard');
    expect(facade.state().run.dominionTarget).toBe(90);
    expect(facade.state().run.validationStatus).toBe('unvalidated');
    expect(compiled.querySelector('.status-strip')?.textContent).toContain('Standard Run');
    expect(compiled.querySelector('.status-strip')?.textContent).toContain(
      'Unvalidated Custom Seed',
    );
    expect(compiled.querySelector('.status-strip')?.textContent).toContain('Dominion target 90');
  });
});

function clickButton(root: HTMLElement, text: string): void {
  findButton(root, text).click();
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
