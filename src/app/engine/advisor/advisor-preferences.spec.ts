import { getDefaultAdvisorMode, loadUserPreferences, saveUserPreferences } from './advisor-preferences';

describe('advisor preferences', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = window.localStorage;
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
  });

  it('defaults Training to Handler regardless of saved preference', () => {
    expect(getDefaultAdvisorMode('training', undefined)).toBe('handler');
    expect(getDefaultAdvisorMode('training', 'off')).toBe('handler');
  });

  it('defaults Standard to saved preference or Coach', () => {
    expect(getDefaultAdvisorMode('standard', 'hints')).toBe('hints');
    expect(getDefaultAdvisorMode('standard', undefined)).toBe('coach');
  });

  it('loads malformed preferences as an empty preference object', () => {
    storage.setItem('haunted-apex:user-preferences:v1', '{bad');

    expect(loadUserPreferences(storage)).toEqual({});

    storage.setItem(
      'haunted-apex:user-preferences:v1',
      JSON.stringify({ advisorMode: 'turbo', hasSeenTrainingPrompt: 'yes' }),
    );

    expect(loadUserPreferences(storage)).toEqual({});
  });

  it('saves and loads small versioned preferences', () => {
    saveUserPreferences({ advisorMode: 'handler', hasSeenTrainingPrompt: true }, storage);

    expect(loadUserPreferences(storage)).toEqual({
      advisorMode: 'handler',
      hasSeenTrainingPrompt: true,
    });
  });
});
