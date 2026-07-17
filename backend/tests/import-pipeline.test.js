const { dedupeRecords } = require('../src/import/pipeline/dedup');
const { validateRecords } = require('../src/import/pipeline/validate');
const { parseClioCsv } = require('../src/import/adapters/csv/clioCsv');
const { mapCaseType, secondsToHours } = require('../src/import/pipeline/mapHelpers');

describe('Import pipeline — dedup', () => {
  test('dedupes contacts by email', () => {
    const records = [
      { externalId: '1', externalSource: 'csv:clio', type: 'person', emails: ['a@test.com'], phones: [], addresses: [], customFields: {} },
      { externalId: '2', externalSource: 'csv:clio', type: 'person', emails: ['a@test.com'], phones: [], addresses: [], customFields: {} }
    ];
    const result = dedupeRecords(records, 'contacts');
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('1');
  });

  test('dedupes matters by external id', () => {
    const records = [
      { externalId: '100', externalSource: 'clio', clientRef: '1', name: 'Matter A', status: 'open', customFields: {} },
      { externalId: '100', externalSource: 'clio', clientRef: '1', name: 'Matter A duplicate', status: 'open', customFields: {} }
    ];
    expect(dedupeRecords(records, 'matters')).toHaveLength(1);
  });
});

describe('Import pipeline — validate', () => {
  const contacts = [
    { externalId: 'c1', externalSource: 'csv:clio', type: 'person', firstName: 'Jane', lastName: 'Doe', emails: [], phones: [], addresses: [], customFields: {} }
  ];

  test('rejects matter with missing clientRef', () => {
    const { valid, errors } = validateRecords(
      [{ externalId: 'm1', externalSource: 'clio', clientRef: '', name: 'Case', status: 'open', customFields: {} }],
      'matters',
      { contacts }
    );
    expect(valid).toHaveLength(0);
    expect(errors[0].message).toMatch(/clientRef/);
  });

  test('accepts matter when client exists', () => {
    const { valid, errors } = validateRecords(
      [{ externalId: 'm1', externalSource: 'clio', clientRef: 'c1', name: 'Case', status: 'open', customFields: {} }],
      'matters',
      { contacts }
    );
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });
});

describe('Import pipeline — Clio CSV', () => {
  const contactsCsv = Buffer.from(
    'id,First Name,Last Name,Primary Email,Primary Phone\n42,Jane,Doe,jane@example.com,555-0100\n'
  );

  const mattersCsv = Buffer.from(
    'Matter ID,Client ID,Matter Name,Status,Practice Area\n900,42,Smith v Jones,Open,Personal Injury\n'
  );

  test('parses contact rows', async () => {
    const rows = await parseClioCsv(contactsCsv, 'contacts');
    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe('Jane');
    expect(rows[0].externalSource).toBe('csv:clio');
  });

  test('parses matter rows with clientRef', async () => {
    const rows = await parseClioCsv(mattersCsv, 'matters');
    expect(rows).toHaveLength(1);
    expect(rows[0].clientRef).toBe('42');
    expect(rows[0].practiceArea).toBe('Personal Injury');
  });
});

describe('Import pipeline — map helpers', () => {
  test('maps practice area to case type', () => {
    expect(mapCaseType('Auto Accident')).toBe('AUTO_ACCIDENT');
    expect(mapCaseType('Unknown Area')).toBe('PERSONAL_INJURY');
  });

  test('converts seconds to decimal hours', () => {
    expect(secondsToHours(3600)).toBe(1);
    expect(secondsToHours(5400)).toBe(1.5);
  });
});
