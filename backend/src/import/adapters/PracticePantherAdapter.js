const BaseAdapter = require('./BaseAdapter');

const PP_BASE = 'https://app.practicepanther.com/api/v2';

const deref = (ref, session, type) => {
  if (!ref) return null;
  if (typeof ref === 'object' && ref.id && ref.name) return ref;
  const id = typeof ref === 'object' ? ref.id : ref;
  return session.refCache?.get(`${type}:${id}`) || (typeof ref === 'object' ? ref : { id });
};

class PracticePantherAdapter extends BaseAdapter {
  constructor() {
    super('practicepanther', { supportsApi: true, supportsCsvFallback: false });
  }

  async fetchRaw(session, entity, cursor) {
    const paths = {
      contacts: '/accounts',
      matters: '/matters',
      timeEntries: '/timeentries'
    };
    const path = paths[entity];
    if (!path) this.entityNotSupported(entity);

    const page = cursor ? Number(cursor) : 1;
    const data = await this.apiGet(session, `${PP_BASE}${path}`, { page, per_page: 100 });
    const records = data.results || data.data || [];

    records.forEach((record) => {
      const type = entity === 'contacts' ? 'account' : entity.slice(0, -1);
      this.cacheRef(session, type, String(record.id), record);

      if (record.account_ref?.id) {
        this.cacheRef(session, 'account', String(record.account_ref.id), record.account_ref);
      }
      if (record.matter_ref?.id) {
        this.cacheRef(session, 'matter', String(record.matter_ref.id), record.matter_ref);
      }
    });

    const hasMore = Boolean(data.next || records.length === 100);
    return {
      records,
      nextCursor: hasMore ? String(page + 1) : undefined
    };
  }

  async resolve(raw, entity, session) {
    if (entity === 'contacts') {
      return raw.map((row) => {
        const account = deref(row.account_ref || row, session, 'account') || row;
        return {
          externalId: String(account.id || row.id),
          externalSource: 'practicepanther',
          type: account.is_company || account.company_name ? 'company' : 'person',
          firstName: account.first_name,
          lastName: account.last_name,
          companyName: account.company_name,
          emails: [account.email, account.email_address].filter(Boolean),
          phones: [account.phone, account.mobile_phone].filter(Boolean),
          addresses: account.address_line1
            ? [{
                street: account.address_line1,
                city: account.city,
                province: account.state,
                postalCode: account.zip_code,
                country: account.country
              }]
            : [],
          customFields: { ppAccountId: account.id }
        };
      });
    }

    if (entity === 'matters') {
      return raw.map((row) => {
        const account = deref(row.account_ref, session, 'account');
        return {
          externalId: String(row.id),
          externalSource: 'practicepanther',
          clientRef: account?.id ? String(account.id) : String(row.account_ref?.id || ''),
          name: row.name || row.display_name || `Matter ${row.id}`,
          status: row.is_open === false ? 'closed' : 'open',
          practiceArea: row.practice_area,
          openedDate: row.date_opened,
          closedDate: row.date_closed,
          customFields: { matterNumber: row.number }
        };
      });
    }

    if (entity === 'timeEntries') {
      return raw.map((row) => {
        const matter = deref(row.matter_ref, session, 'matter');
        return {
          externalId: String(row.id),
          externalSource: 'practicepanther',
          matterRef: matter?.id ? String(matter.id) : String(row.matter_ref?.id || ''),
          userRef: row.user_ref?.id ? String(row.user_ref.id) : String(row.user_id || ''),
          date: row.date || row.entry_date,
          quantity: Math.round(Number(row.hours || 0) * 3600),
          rate: row.rate ? Number(row.rate) : undefined,
          billed: Boolean(row.is_billed),
          description: row.description
        };
      });
    }

    this.entityNotSupported(entity);
    return [];
  }
}

module.exports = PracticePantherAdapter;
