import { CONTACT_DEFINITIONS } from '../content';
import {
  ACTIVE_CONTACT_COUNT,
  generateContacts,
  materializeContactState,
  satisfiesContactCoverage,
} from './generate-contacts';

describe('generateContacts', () => {
  it('selects a deterministic active contact set by seed', () => {
    const first = generateContacts('VIOLET-ASH-1047');
    const second = generateContacts('violet-ash-1047');
    const other = generateContacts('VIOLET-ASH-1048');

    expect(first.activeContactIds).toEqual(second.activeContactIds);
    expect(first.activeContactIds).not.toEqual(other.activeContactIds);
  });

  it('selects exactly three active contacts with required role coverage', () => {
    const network = generateContacts('COVERAGE-SEED');

    expect(network.activeContactIds.length).toBe(ACTIVE_CONTACT_COUNT);
    expect(new Set(network.activeContactIds).size).toBe(ACTIVE_CONTACT_COUNT);
    expect(satisfiesContactCoverage(CONTACT_DEFINITIONS, network.activeContactIds)).toBeTrue();
  });

  it('initializes every contact state from base metrics', () => {
    const network = generateContacts('CONTACT-BASELINES');

    expect(Object.keys(network.contacts).length).toBe(CONTACT_DEFINITIONS.length);

    for (const definition of CONTACT_DEFINITIONS) {
      expect(network.contacts[definition.id]).toEqual(materializeContactState(definition));
    }
  });
});
