const { parseCsv } = require('./parseCsv');

const mapMyCaseContact = (row) => ({
  externalId: String(row.id || row['Contact ID'] || row['Client ID']),
  externalSource: 'csv:mycase',
  type: row.type === 'Company' || row['Contact Type'] === 'Company' ? 'company' : 'person',
  firstName: row.first_name || row['First Name'],
  lastName: row.last_name || row['Last Name'],
  companyName: row.company || row.Company,
  emails: [row.email || row.Email].filter(Boolean),
  phones: [row.phone || row.Phone || row.mobile || row.Mobile].filter(Boolean),
  addresses: [],
  customFields: { raw: row }
});

const mapMyCaseMatter = (row) => ({
  externalId: String(row.id || row['Case ID'] || row['Matter ID']),
  externalSource: 'csv:mycase',
  clientRef: String(row.client_id || row['Client ID'] || row['Contact ID'] || ''),
  name: row.name || row['Case Name'] || row['Matter Name'] || 'Imported case',
  status: /closed|archived/i.test(row.status || row.Status || '') ? 'closed' : 'open',
  practiceArea: row.practice_area || row['Practice Area'],
  openedDate: row.opened_date || row['Date Opened'],
  closedDate: row.closed_date || row['Date Closed'],
  customFields: { raw: row }
});

const parseMyCaseCsv = async (fileBuffer, entity) => {
  const rows = parseCsv(fileBuffer);
  if (entity === 'contacts') return rows.map(mapMyCaseContact).filter((c) => c.externalId);
  if (entity === 'matters') return rows.map(mapMyCaseMatter).filter((m) => m.externalId);
  return [];
};

module.exports = { parseMyCaseCsv };
