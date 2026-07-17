const { parseCsv } = require('./parseCsv');

const mapClioContact = (row) => ({
  externalId: String(row.id),
  externalSource: 'csv:clio',
  type: row.type === 'Company' ? 'company' : 'person',
  firstName: row.first_name || row['First Name'] || undefined,
  lastName: row.last_name || row['Last Name'] || undefined,
  companyName: row.company || row['Company Name'] || undefined,
  emails: [row.primary_email || row['Primary Email']].filter(Boolean),
  phones: [row.primary_phone || row['Primary Phone']].filter(Boolean),
  addresses: row.street || row['Street Address']
    ? [{
        street: row.street || row['Street Address'],
        city: row.city || row.City,
        province: row.province || row.State,
        postalCode: row.postal_code || row['Postal Code'],
        country: row.country || row.Country
      }]
    : [],
  customFields: { raw: row }
});

const mapClioMatter = (row) => ({
  externalId: String(row.id || row['Matter ID']),
  externalSource: 'csv:clio',
  clientRef: String(row.client_id || row['Client ID'] || ''),
  name: row.display_number || row.description || row['Matter Name'] || 'Imported matter',
  status: /closed/i.test(row.status || row.Status || '') ? 'closed' : 'open',
  practiceArea: row.practice_area || row['Practice Area'],
  openedDate: row.open_date || row['Open Date'] || undefined,
  closedDate: row.close_date || row['Close Date'] || undefined,
  customFields: { raw: row }
});

const parseClioCsv = async (fileBuffer, entity) => {
  const rows = parseCsv(fileBuffer);
  if (entity === 'contacts') return rows.map(mapClioContact).filter((c) => c.externalId);
  if (entity === 'matters') return rows.map(mapClioMatter).filter((m) => m.externalId && m.clientRef);
  return [];
};

module.exports = { parseClioCsv, mapClioContact, mapClioMatter };
