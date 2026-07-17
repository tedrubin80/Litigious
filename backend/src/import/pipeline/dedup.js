const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const contactKey = (record) => {
  const email = record.emails?.find(Boolean);
  if (email) return `email:${normalizeEmail(email)}`;
  if (record.type === 'company' && record.companyName) {
    return `company:${record.companyName.trim().toLowerCase()}`;
  }
  const name = `${record.firstName || ''} ${record.lastName || ''}`.trim().toLowerCase();
  if (name) return `name:${name}`;
  return `id:${record.externalSource}:${record.externalId}`;
};

const dedupeRecords = (records, entity) => {
  const seen = new Set();
  const out = [];

  for (const record of records) {
    let key;
    if (entity === 'contacts') {
      key = contactKey(record);
    } else {
      key = `${record.externalSource}:${record.externalId}`;
    }

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }

  return out;
};

module.exports = { dedupeRecords, contactKey, normalizeEmail };
