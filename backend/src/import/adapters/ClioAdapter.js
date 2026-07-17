const BaseAdapter = require('./BaseAdapter');

const CLIO_BASE = 'https://app.clio.com/api/v4';

const ENDPOINTS = {
  contacts: '/contacts.json',
  matters: '/matters.json',
  timeEntries: '/activities.json'
};

const mapStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('closed') || value.includes('settled')) return 'closed';
  if (value.includes('pending') || value.includes('intake')) return 'pending';
  return 'open';
};

class ClioAdapter extends BaseAdapter {
  constructor() {
    super('clio', { supportsApi: true, supportsCsvFallback: true });
  }

  async fetchRaw(session, entity, cursor) {
    if (entity === 'invoices' || entity === 'documents') {
      this.entityNotSupported(entity);
    }

    const path = ENDPOINTS[entity === 'timeEntries' ? 'timeEntries' : entity];
    const params = { limit: 200, fields: 'id,type,etag,updated_at' };
    if (cursor) params.page_token = cursor;

    if (entity === 'timeEntries') {
      params.type = 'TimeEntry';
      params.fields = 'id,type,date,quantity,price,note,matter{id},user{id},billed';
    }
    if (entity === 'contacts') {
      params.fields = 'id,type,first_name,last_name,name,primary_email_address,primary_phone_number,addresses';
    }
    if (entity === 'matters') {
      params.fields = 'id,display_number,description,status,open_date,close_date,client{id},practice_area{id,name}';
    }

    const data = await this.apiGet(session, `${CLIO_BASE}${path}`, params);
    const records = data.data || [];

    records.forEach((record) => {
      this.cacheRef(session, entity === 'timeEntries' ? 'timeEntry' : entity.slice(0, -1), String(record.id), record);
    });

    return {
      records,
      nextCursor: data.meta?.paging?.next ? data.meta.paging.next.split('page_token=')[1] : undefined
    };
  }

  async resolve(raw, entity, session) {
    if (entity === 'contacts') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'clio',
        type: row.type === 'Company' ? 'company' : 'person',
        firstName: row.first_name,
        lastName: row.last_name,
        companyName: row.type === 'Company' ? row.name : undefined,
        emails: row.primary_email_address ? [row.primary_email_address] : [],
        phones: row.primary_phone_number ? [row.primary_phone_number] : [],
        addresses: (row.addresses || []).map((a) => ({
          street: a.street,
          city: a.city,
          province: a.province,
          postalCode: a.postal_code,
          country: a.country
        })),
        customFields: { clioType: row.type, etag: row.etag }
      }));
    }

    if (entity === 'matters') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'clio',
        clientRef: row.client?.id ? String(row.client.id) : '',
        name: row.display_number || row.description || `Matter ${row.id}`,
        status: mapStatus(row.status),
        practiceArea: row.practice_area?.name,
        openedDate: row.open_date,
        closedDate: row.close_date,
        customFields: { clioStatus: row.status, etag: row.etag }
      }));
    }

    if (entity === 'timeEntries') {
      return raw.map((row) => ({
        externalId: String(row.id),
        externalSource: 'clio',
        matterRef: row.matter?.id ? String(row.matter.id) : '',
        userRef: row.user?.id ? String(row.user.id) : '',
        date: row.date,
        quantity: Math.round(Number(row.quantity || 0) * 3600),
        rate: row.price ? Number(row.price) : undefined,
        billed: Boolean(row.billed),
        description: row.note
      }));
    }

    this.entityNotSupported(entity);
    return [];
  }

  async parseCsvExport(fileBuffer, entity) {
    const { parseClioCsv } = require('./csv/clioCsv');
    return parseClioCsv(fileBuffer, entity);
  }
}

module.exports = ClioAdapter;
