const { isCanonicalContact, isCanonicalMatter, isCanonicalTimeEntry } = require('../canonical/types');

const validateRecords = (records, entity, context = {}) => {
  const valid = [];
  const errors = [];
  const contactIds = new Set((context.contacts || []).map((c) => c.externalId));
  const matterIds = new Set((context.matters || []).map((m) => m.externalId));

  for (const record of records) {
    if (entity === 'contacts') {
      if (!isCanonicalContact(record)) {
        errors.push({
          entity,
          externalId: record?.externalId || 'unknown',
          stage: 'validate',
          message: 'Invalid contact shape',
          raw: record
        });
        continue;
      }

      const hasName =
        record.type === 'company'
          ? Boolean(record.companyName)
          : Boolean(record.firstName || record.lastName);

      if (!hasName) {
        errors.push({
          entity,
          externalId: record.externalId,
          stage: 'validate',
          message: 'Contact missing name',
          raw: record
        });
        continue;
      }

      valid.push(record);
      continue;
    }

    if (entity === 'matters') {
      if (!isCanonicalMatter(record)) {
        errors.push({
          entity,
          externalId: record?.externalId || 'unknown',
          stage: 'validate',
          message: 'Invalid matter shape',
          raw: record
        });
        continue;
      }

      if (!record.clientRef) {
        errors.push({
          entity,
          externalId: record.externalId,
          stage: 'validate',
          message: 'Matter missing clientRef',
          raw: record
        });
        continue;
      }

      if (contactIds.size > 0 && !contactIds.has(record.clientRef)) {
        errors.push({
          entity,
          externalId: record.externalId,
          stage: 'validate',
          message: `Unresolved clientRef: ${record.clientRef}`,
          raw: record
        });
        continue;
      }

      valid.push(record);
      continue;
    }

    if (entity === 'timeEntries') {
      if (!isCanonicalTimeEntry(record)) {
        errors.push({
          entity,
          externalId: record?.externalId || 'unknown',
          stage: 'validate',
          message: 'Invalid time entry shape',
          raw: record
        });
        continue;
      }

      if (!record.matterRef) {
        errors.push({
          entity,
          externalId: record.externalId,
          stage: 'validate',
          message: 'Time entry missing matterRef',
          raw: record
        });
        continue;
      }

      if (matterIds.size > 0 && !matterIds.has(record.matterRef)) {
        errors.push({
          entity,
          externalId: record.externalId,
          stage: 'validate',
          message: `Unresolved matterRef: ${record.matterRef}`,
          raw: record
        });
        continue;
      }

      valid.push(record);
    }
  }

  return { valid, errors };
};

module.exports = { validateRecords };
