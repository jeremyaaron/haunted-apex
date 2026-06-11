import { TestBed } from '@angular/core/testing';
import {
  addLedgerEntry,
  CONTACT_DEFINITIONS,
  getOperativeDefinition,
  materializeOperativeState,
  newGame,
  type GameState,
} from './engine';
import {
  CURRENT_GAME_VERSION,
  CURRENT_RUN_STORAGE_KEY,
  CURRENT_SAVE_SCHEMA_VERSION,
  LEGACY_V03_STORAGE_KEY,
} from './game';
import { App } from './app';

describe('App', () => {
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
    expect(compiled.textContent).toContain('Stable');
    expect(compiled.textContent).toContain('Pleasure District');
    expect(compiled.textContent).toContain('Failing Lounge');
    expect(compiled.textContent).toContain('Velvet Tyrant');
    expect(compiled.textContent).not.toContain('pleasure_district');
    expect(compiled.textContent).not.toContain('failing_lounge');
    expect(compiled.textContent).not.toContain('velvet_tyrant');
    expect(compiled.querySelectorAll('.operative-card').length).toBe(3);
    expect(compiled.querySelectorAll('.hire-card').length).toBe(4);
    expect(compiled.textContent).toContain('Contact Network');
    expect(compiled.textContent).toContain('Available Recruits');
    expect(compiled.textContent).toContain('Dominion target 90');
    expect(compiled.textContent).toContain('Win at 90');
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

  it('renders active Contacts with display labels, metrics, and services', () => {
    const state = newGame({ seed: 'PHASE-7-CONTACT-PANEL' });
    state.activeContactIds = [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const contactPanel = compiled.querySelector<HTMLElement>('.contact-network');

    expect(contactPanel?.textContent).toContain('Contact Network');
    expect(contactPanel?.textContent).toContain('Entanglements');
    expect(contactPanel?.querySelectorAll('.contact-card')).toHaveSize(3);
    expect(contactPanel?.textContent).toContain('Veyra Lux');
    expect(contactPanel?.textContent).toContain('Captain Rafe Hollis');
    expect(contactPanel?.textContent).toContain('Father Static');
    expect(contactPanel?.textContent).toContain('Liaison');
    expect(contactPanel?.textContent).toContain('Official');
    expect(contactPanel?.textContent).toContain('Confessor');
    expect(contactPanel?.textContent).toContain('Useful');
    expect(contactPanel?.textContent).toContain('Trust');
    expect(contactPanel?.textContent).toContain('Leverage');
    expect(contactPanel?.textContent).toContain('Volatility');
    expect(contactPanel?.textContent).toContain('Exposure');
    expect(contactPanel?.textContent).toContain('Private Room Access');
    expect(contactPanel?.textContent).toContain('Clean Passage');
    expect(contactPanel?.textContent).toContain('Absolution Protocol');
    expect(contactPanel?.textContent).toContain('Requires 25 Leverage - Current 18');
    expect(contactPanel?.textContent).not.toContain('contact_mina_glass');
    expect(contactPanel?.textContent).not.toContain('Mina Glass');

    const inactive = CONTACT_DEFINITIONS.find(
      (definition) => !state.activeContactIds.includes(definition.id),
    );
    expect(inactive).toBeTruthy();
    expect(contactPanel?.textContent).not.toContain(inactive?.name ?? 'inactive contact');
  });

  it('renders burned Contact state, related Ledger entries, and recent interactions', () => {
    const base = newGame({ seed: 'PHASE-7-CONTACT-DETAILS' });
    base.activeContactIds = [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    const contactId = 'contact_veyra_lux';
    const withContactState: GameState = {
      ...base,
      contacts: {
        ...base.contacts,
        [contactId]: {
          ...base.contacts[contactId],
          burned: true,
          recentInteractions: [
            {
              week: 1,
              optionId: 'cultivate',
              kind: 'cultivate',
              label: 'Cultivate',
              effectsSummary: {
                trust: 10,
                volatility: -6,
              },
            },
          ],
        },
      },
    };
    const state = addLedgerEntry(withContactState, {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'action',
        actionId: 'manage_contact',
        target: {
          type: 'contact',
          contactId,
          optionId: 'cultivate',
        },
      },
      relatedContactId: contactId,
    });
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const veyraCard = findCard(compiled, '.contact-card', 'Veyra Lux');

    expect(veyraCard.classList).toContain('burned');
    expect(veyraCard.textContent).toContain('Burned');
    expect(veyraCard.textContent).toContain('Contact burned');
    expect(veyraCard.textContent).toContain('Owes the Liaison');
    expect(veyraCard.textContent).toContain('Active');
    expect(veyraCard.textContent).toContain('Week 1 · Cultivate');
    expect(veyraCard.textContent).toContain('+10 Trust');
    expect(veyraCard.textContent).toContain('-6 Volatility');
  });

  it('renders Manage Contact target options and rich service previews', () => {
    const state = newGame({ seed: 'PHASE-8-MANAGE-CONTACT' });
    state.activeContactIds = [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const contactCard = findCard(compiled, '.action-card', 'Manage Contact');

    expect(contactCard.querySelector('.assignment-control')).toBeNull();
    expect(contactCard.textContent).toContain('Select a target to queue this order.');
    expect(contactCard.textContent).toContain('Veyra Lux - Cultivate');
    expect(contactCard.textContent).toContain('Veyra Lux - Private Room Access');
    expect(contactCard.textContent).not.toContain('Mina Glass');

    selectValue(
      contactCard,
      '.target-control select',
      'contact:contact_veyra_lux:private_room_access',
    );
    fixture.detectChanges();

    expect(contactCard.textContent).toContain('Contact option');
    expect(contactCard.textContent).toContain('Veyra Lux');
    expect(contactCard.textContent).toContain('Private Room Access');
    expect(contactCard.textContent).toContain('Request Service');
    expect(contactCard.textContent).toContain('+3 Dominion');
    expect(contactCard.textContent).toContain('+8 Intel');
    expect(contactCard.textContent).toContain('-6 Trust');
    expect(contactCard.textContent).toContain('+8 Volatility');
    expect(contactCard.textContent).toContain('Creates Debt: Owes the Liaison');
    expect(contactCard.textContent).toContain('Nyx Ardent Pressure +6');
    expect(contactCard.querySelector('.rival-warning')?.textContent).toContain('Nyx Ardent');
    expect(contactCard.querySelector('.rival-warning')?.textContent).toContain('Pressure +6');
    expect(findButton(contactCard, 'Queue Order').disabled).toBeFalse();
  });

  it('keeps unavailable Contact options visible but disabled with explanatory copy', () => {
    const state = newGame({ seed: 'PHASE-8-CONTACT-DISABLED' });
    state.activeContactIds = [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    state.contacts.contact_captain_hollis.burned = true;
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const contactCard = findCard(compiled, '.action-card', 'Manage Contact');
    const disabledOption = Array.from(
      contactCard.querySelectorAll<HTMLOptionElement>('.target-control option'),
    ).find((option) => option.value === 'contact:contact_father_static:confession_leak');

    expect(disabledOption).toBeTruthy();
    expect(disabledOption?.disabled).toBeTrue();
    expect(disabledOption?.textContent).toContain('Father Static - Confession Leak');
    expect(disabledOption?.textContent).toContain(
      'This contact option requirement is not met.',
    );
    expect(contactCard.textContent).not.toContain('Captain Rafe Hollis - Clean Passage');
  });

  it('shows Quiet Treatment target details in Contact previews', () => {
    const state = newGame({ seed: 'PHASE-8-QUIET-TREATMENT' });
    state.activeContactIds = [
      'contact_dr_mercy_iram',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    state.operatives[0].stress = 45;
    const stressedName =
      getOperativeDefinition(state.operatives[0].id)?.name ?? state.operatives[0].id;
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const contactCard = findCard(compiled, '.action-card', 'Manage Contact');

    selectValue(
      contactCard,
      '.target-control select',
      'contact:contact_dr_mercy_iram:quiet_treatment',
    );
    fixture.detectChanges();

    expect(contactCard.textContent).toContain('Dr. Mercy Iram');
    expect(contactCard.textContent).toContain('Quiet Treatment');
    expect(contactCard.textContent).toContain(`${stressedName} Stress -10`);
  });

  it('renders Contact effects in queued order summaries and the Event Feed', () => {
    const state = newGame({ seed: 'PHASE-8-CONTACT-QUEUE-FEED' });
    state.activeContactIds = [
      'contact_veyra_lux',
      'contact_captain_hollis',
      'contact_father_static',
    ];
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const contactCard = findCard(compiled, '.action-card', 'Manage Contact');

    selectValue(contactCard, '.target-control select', 'contact:contact_veyra_lux:cultivate');
    fixture.detectChanges();
    clickButton(contactCard, 'Queue Order');
    fixture.detectChanges();

    expect(compiled.querySelector('.queued-order')?.textContent).toContain('Manage Contact');
    expect(compiled.querySelector('.queued-order')?.textContent).toContain('Veyra Lux - Cultivate');
    expect(compiled.querySelector('.queued-order')?.textContent).toContain('+10 Trust');
    expect(compiled.querySelector('.queued-order')?.textContent).toContain('-6 Volatility');

    clickButton(compiled, 'Advance Week');
    fixture.detectChanges();

    expect(compiled.querySelector('.fallout-panel')?.textContent).toContain(
      'Manage Contact: Veyra Lux',
    );
    expect(compiled.querySelector('.fallout-panel')?.textContent).toContain(
      'Veyra Lux: trust +10, volatility -6, exposure +2.',
    );
  });

  it('renders Contact effects on event choices and documents Entanglements', () => {
    const state: GameState = {
      ...newGame({ seed: 'PHASE-8-CONTACT-EVENT-CHOICE' }),
      activeContactIds: [
        'contact_veyra_lux',
        'contact_captain_hollis',
        'contact_father_static',
      ],
      phase: 'EVENT_CHOICE',
      pendingEvent: {
        id: 'event_1_1',
        definitionId: 'contact_wants_assurance',
        week: 1,
        selectedContactId: 'contact_veyra_lux',
      },
    };
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.choice-list')?.textContent).toContain('Veyra Lux +6 Trust');
    expect(compiled.querySelector('.choice-list')?.textContent).toContain('Veyra Lux -4 Volatility');
    expect(compiled.querySelector('.guide-panel')?.textContent).toContain(
      'Entanglements and contacts',
    );
    expect(compiled.querySelector('.guide-panel')?.textContent).toContain(
      'Use Manage Contact to cultivate trust',
    );
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
    expect(
      Array.from(summary?.querySelectorAll('.modifier-effects span') ?? []).some(
        (effect) => effect.textContent?.trim() === '+300 Resources',
      ),
    ).toBeTrue();
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
    localStorage.setItem(LEGACY_V03_STORAGE_KEY, '{}');
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
    expect(output).toContain('ledger_summary');
    expect(output).toContain('ledger_usage');
    expect(output).toContain('ledger_outcomes');
    expect(output).toContain('secret_discovery');
    expect(output).toContain('ledger_events');
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

  it('renders a victory run summary on the game-over panel', () => {
    storeState(buildGameOverState('victory'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gameOverPanel = compiled.querySelector<HTMLElement>('.game-over-panel');

    expect(gameOverPanel?.textContent).toContain('Run Closed');
    expect(gameOverPanel?.textContent).toContain('Victory');
    expect(gameOverPanel?.textContent).toContain('Outcome');
    expect(gameOverPanel?.textContent).toContain('Final Pressures');
    expect(gameOverPanel?.textContent).toContain('Roster');
    expect(gameOverPanel?.textContent).toContain('Ledger');
    expect(gameOverPanel?.textContent).toContain('Copy Run Report');
    expect(gameOverPanel?.textContent).toContain('Seed: UI-RUN-SUMMARY-VICTORY');
  });

  it('renders a loss run summary on the game-over panel', () => {
    storeState(buildGameOverState('loss'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gameOverPanel = compiled.querySelector<HTMLElement>('.game-over-panel');

    expect(gameOverPanel?.textContent).toContain('Loss');
    expect(gameOverPanel?.textContent).toContain('Heat Lockdown');
    expect(gameOverPanel?.textContent).toContain('The city looked back');
  });

  it('copies the run report through the clipboard path', async () => {
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    storeState(buildGameOverState('victory'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(compiled, 'Copy Run Report');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith(
      jasmine.stringContaining('Seed: UI-RUN-SUMMARY-VICTORY'),
    );
    expect(compiled.querySelector('.run-report-copy')?.textContent).toContain('Report copied');
  });

  it('shows copy failure state without crashing', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jasmine
          .createSpy('writeText')
          .and.returnValue(Promise.reject(new Error('denied'))),
      },
    });
    storeState(buildGameOverState('victory'));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    clickButton(compiled, 'Copy Run Report');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.run-report-copy')?.textContent).toContain('Copy failed');
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

  it('renders an empty Black Ledger panel cleanly', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const ledgerPanel = compiled.querySelector<HTMLElement>('.black-ledger-panel');

    expect(ledgerPanel?.textContent).toContain('Black Ledger');
    expect(ledgerPanel?.textContent).toContain('0 Secrets');
    expect(ledgerPanel?.textContent).toContain('0 Debts');
    expect(ledgerPanel?.textContent).toContain('0 Favors');
    expect(ledgerPanel?.textContent).toContain('No active Secrets');
    expect(ledgerPanel?.textContent).toContain('No spent or resolved entries yet');
  });

  it('renders active Secrets, Debts, Favors, and spent entries in the Ledger panel', () => {
    const withEntries = addLedgerEntry(
      addLedgerEntry(
        addLedgerEntry(newGame({ seed: 'PHASE-8-LEDGER-PANEL' }), {
          definitionId: 'secret_patrol_schedule',
          source: {
            type: 'action',
            actionId: 'gather_intel',
          },
        }),
        {
          definitionId: 'debt_owes_liaison',
          source: {
            type: 'event',
            eventId: 'liaison_favor',
            choiceId: 'accept_the_favor',
          },
        },
      ),
      {
        definitionId: 'favor_hidden_route',
        source: {
          type: 'event',
          eventId: 'blackmail_lead',
          choiceId: 'save_it_for_later',
        },
      },
    );
    const state = consumeLedgerEntry(withEntries, withEntries.ledger.entries[0].id);
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const ledgerPanel = compiled.querySelector<HTMLElement>('.black-ledger-panel');

    expect(ledgerPanel?.textContent).toContain('Owes the Liaison');
    expect(ledgerPanel?.textContent).toContain('Pay in Credits');
    expect(ledgerPanel?.textContent).toContain('Offer Information');
    expect(ledgerPanel?.textContent).toContain('-5 Intel');
    expect(ledgerPanel?.textContent).toContain('Hidden Route');
    expect(ledgerPanel?.textContent).toContain('Patrol Schedule');
    expect(ledgerPanel?.textContent).toContain('Resolved');
    expect(ledgerPanel?.textContent).toContain('Spent / Resolved Ledger Entries');
    expect(ledgerPanel?.querySelectorAll('.ledger-entry-card.kind-debt')).toHaveSize(1);
    expect(ledgerPanel?.querySelectorAll('.ledger-entry-card.kind-favor')).toHaveSize(1);
    expect(ledgerPanel?.querySelectorAll('.ledger-entry-card.consumed')).toHaveSize(1);
  });

  it('shows Work the Ledger targets and updates use previews when selected', () => {
    const state = addLedgerEntry(newGame({ seed: 'PHASE-8-WORK-LEDGER' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const entryId = state.ledger.entries[0].id;
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const workCard = findCard(compiled, '.action-card', 'Work the Ledger');

    expect(workCard.textContent).toContain('Select a target to queue this order.');
    expect(workCard.textContent).toContain('Owes the Liaison - Pay in Credits');
    expect(workCard.querySelector('.assignment-control')).toBeNull();

    selectValue(workCard, '.target-control select', `ledger:${entryId}:pay_in_credits`);
    fixture.detectChanges();

    expect(workCard.textContent).toContain('Ledger use');
    expect(workCard.textContent).toContain('Owes the Liaison');
    expect(workCard.textContent).toContain('Pay in Credits');
    expect(workCard.textContent).toContain('-900 Resources');
    expect(workCard.textContent).toContain('+2 Loyalty');
    expect(workCard.textContent).toContain('Consumes Entry');
    expect(findButton(workCard, 'Queue Order').disabled).toBeFalse();
  });

  it('disables unaffordable Work the Ledger uses with clear copy', () => {
    const withDebt = addLedgerEntry(newGame({ seed: 'PHASE-8-LEDGER-BROKE' }), {
      definitionId: 'debt_owes_liaison',
      source: {
        type: 'event',
        eventId: 'liaison_favor',
        choiceId: 'accept_the_favor',
      },
    });
    const state: GameState = {
      ...withDebt,
      pressures: {
        ...withDebt.pressures,
        resources: 100,
      },
    };
    const entryId = state.ledger.entries[0].id;
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const workCard = findCard(compiled, '.action-card', 'Work the Ledger');

    selectValue(workCard, '.target-control select', `ledger:${entryId}:pay_in_credits`);
    fixture.detectChanges();

    expect(findButton(workCard, 'Queue Order').disabled).toBeTrue();
    expect(workCard.textContent).toContain('Insufficient Resources');
    expect(compiled.querySelector('.black-ledger-panel')?.textContent).toContain(
      'Insufficient Resources',
    );
    expect(compiled.querySelector('.black-ledger-panel')?.textContent).toContain(
      'Offer Information',
    );
  });

  it('shows Secret Chance for targeted Gather Intel only', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const gatherCard = findCard(compiled, '.action-card', 'Gather Intel');

    expect(gatherCard.textContent).not.toContain('Secret Chance');

    selectValue(gatherCard, '.target-control select', 'district:district_ghostline_market');
    fixture.detectChanges();

    expect(gatherCard.textContent).toContain('Secret Chance');
    expect(gatherCard.querySelector('.secret-preview')?.textContent).toContain(
      'possible Ledger leads',
    );
  });

  it('shows exact Ledger effects on event choices', () => {
    const state: GameState = {
      ...newGame({ seed: 'PHASE-8-EVENT-LEDGER' }),
      phase: 'EVENT_CHOICE',
      pendingEvent: {
        id: 'event_1_1',
        definitionId: 'unexpected_windfall',
        week: 1,
      },
    };
    storeState(state);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Intercepted Transmission');
    expect(compiled.textContent).toContain('Creates Debt: Contaminated Money');
    expect(compiled.textContent).toContain(
      'Creates Secret: Dead Channel Trace',
    );
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

function consumeLedgerEntry(state: GameState, entryId: string): GameState {
  return {
    ...state,
    ledger: {
      ...state.ledger,
      entries: state.ledger.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              consumed: true,
              consumedWeek: state.week,
              consumedBy: {
                type: 'action',
                actionId: 'work_the_ledger',
                useOptionId: 'test_use',
              },
            }
          : entry,
      ),
      consumedCount: state.ledger.consumedCount + 1,
    },
  };
}

function buildGameOverState(result: 'victory' | 'loss'): GameState {
  const withLedger = addLedgerEntry(newGame({ seed: `UI-RUN-SUMMARY-${result.toUpperCase()}` }), {
    definitionId: 'debt_owes_liaison',
    source: {
      type: 'event',
      eventId: 'liaison_favor',
      choiceId: 'accept_the_favor',
    },
  });

  return {
    ...withLedger,
    week: result === 'victory' ? 7 : 5,
    phase: 'GAME_OVER',
    gameOver:
      result === 'victory'
        ? {
            result: 'victory',
            reason: 'dominion_victory',
          }
        : {
            result: 'loss',
            reason: 'heat_lockdown',
          },
    pressures:
      result === 'victory'
        ? {
            dominion: 92,
            heat: 62,
            loyalty: 48,
            resources: 1700,
            intel: 18,
            ruin: 16,
          }
        : {
            dominion: 58,
            heat: 100,
            loyalty: 39,
            resources: 900,
            intel: 12,
            ruin: 22,
          },
    operatives: withLedger.operatives.map((operative, index) => ({
      ...operative,
      weeksAssigned: index === 0 ? 4 : operative.weeksAssigned,
    })),
    rivals: {
      ...withLedger.rivals,
      rival_nyx_ardent: {
        ...withLedger.rivals.rival_nyx_ardent,
        pressure: 55,
      },
    },
    eventLog: [
      ...withLedger.eventLog,
      {
        id: 'ui_report_major_event',
        week: 4,
        type: 'event_presented',
        title: 'Debt Comes Due: Owes the Liaison',
      },
    ],
  };
}
