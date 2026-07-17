const BaseAdapter = require('./BaseAdapter');

const MYCASE_BASE = 'https://api.mycase.com/v1';

class MyCaseAdapter extends BaseAdapter {
  constructor() {
    super('mycase', { supportsApi: true, supportsCsvFallback: true });
  }

  async authenticate(config) {
    const session = await super.authenticate(config);
    if (config.requiresTierCheck) {
      try {
        await this.apiGet(session, `${MYCASE_BASE}/account`);
      } catch (error) {
        const status = error.response?.status;
        if (status === 403 || status === 402) {
          throw new Error('MyCase API access requires a supported subscription tier');
        }
        throw error;
      }
    }
    return session;
  }

  async fetchRaw(session, entity, cursor) {
    const map = {
      contacts: '/clients',
      matters: '/cases',
      timeEntries: '/time_entries'
    };
    const path = map[entity];
    if (!path) this.entityNotSupported(entity);

    const page = cursor ? Number(cursor) : 1;
    const data = await this.apiGet(session, `${MYCASE_BASE}${path}`, { page, per_page: 100 });
    const records = data.data || data.clients || data.cases || data.time_entries || [];

    records.forEach((record) => {
      this.cacheRef(session, entity, String(record.id), record);
    });

    const hasMore = Array.isArray(records) && records.length === 100;
    return {
      records,
      nextCursor: hasMore ? String(page + 1) : undefined
    };
  }

  async resolve(raw, entity) {
    if (entity === 'contacts') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'mycase',
        type: row.company_name ? 'company' : 'person',
        firstName: row.first_name,
        lastName: row.last_name,
        companyName: row.company_name,
        emails: row.email ? [row.email] : [],
        phones: [row.phone, row.mobile].filter(Boolean),
        addresses: row.address
          ? [{ street: row.address, city: row.city, province: row.state, postalCode: row.zip }]
          : [],
        customFields: { mycaseId: row.id }
      }));
    }

    if (entity === 'matters') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'mycase',
        clientRef: row.client_id ? String(row.client_id) : String(row.clients?.[0]?.id || ''),
        name: row.name || row.case_number || `Case ${row.id}`,
        status: /closed|archived/i.test(row.status || '') ? 'closed' : 'open',
        practiceArea: row.practice_area,
        openedDate: row.opened_date || row.created_at,
        closedDate: row.closed_date,
        customFields: { caseNumber: row.case_number }
      }));
    }

    if (entity === 'timeEntries') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'mycase',
        matterRef: row.case_id ? String(row.case_id) : '',
        userRef: row.user_id ? String(row.user_id) : '',
        date: row.date || row.entry_date,
        quantity: Math.round(Number(row.hours || row.duration_hours || 0) * 3600),
        rate: row.rate ? Number(row.rate) : undefined,
        billed: Boolean(row.billed || row.is_billed),
        description: row.description || row.notes
      }));
    }

    this.entityNotSupported(entity);
    return [];
  }

  async parseCsvExport(fileBuffer, entity) {
    const { parseMyCaseCsv } = require('./csv/mycaseCsv');
    return parseMyCaseCsv(fileBuffer, entity);
  }
}

module.exports = MyCaseAdapter;
