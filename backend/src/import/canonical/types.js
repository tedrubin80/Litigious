/**
 * Canonical import model — source-agnostic internal schema.
 * All adapters produce these shapes; quantity for time is in SECONDS.
 *
 * @typedef {'clio'|'mycase'|'practicepanther'|'csv:clio'|'csv:mycase'} ExternalSource
 * @typedef {'contacts'|'matters'|'timeEntries'|'invoices'|'documents'} EntityType
 * @typedef {'open'|'closed'|'pending'} CanonicalMatterStatus
 *
 * @typedef {Object} CanonicalAddress
 * @property {string} [street]
 * @property {string} [city]
 * @property {string} [province]
 * @property {string} [postalCode]
 * @property {string} [country]
 *
 * @typedef {Object} CanonicalContact
 * @property {string} externalId
 * @property {ExternalSource} externalSource
 * @property {'person'|'company'} type
 * @property {string} [firstName]
 * @property {string} [lastName]
 * @property {string} [companyName]
 * @property {string[]} emails
 * @property {string[]} phones
 * @property {CanonicalAddress[]} addresses
 * @property {Record<string, unknown>} customFields
 *
 * @typedef {Object} CanonicalMatter
 * @property {string} externalId
 * @property {string} externalSource
 * @property {string} clientRef — externalId of CanonicalContact
 * @property {string} name
 * @property {CanonicalMatterStatus} status
 * @property {string} [practiceArea]
 * @property {string} [openedDate] ISO date
 * @property {string} [closedDate] ISO date
 * @property {Record<string, unknown>} customFields
 *
 * @typedef {Object} CanonicalTimeEntry
 * @property {string} externalId
 * @property {string} externalSource
 * @property {string} matterRef
 * @property {string} userRef
 * @property {string} date ISO date
 * @property {number} quantity — duration in SECONDS
 * @property {number} [rate]
 * @property {boolean} billed
 * @property {string} [description]
 *
 * @typedef {CanonicalContact|CanonicalMatter|CanonicalTimeEntry} CanonicalRecord
 */

const ENTITY_TYPES = ['contacts', 'matters', 'timeEntries', 'invoices', 'documents'];

const IMPORT_STATUSES = [
  'pending',
  'fetching',
  'resolving',
  'validating',
  'dry_run_ready',
  'committing',
  'done',
  'failed'
];

const TIME_QUANTITY_UNIT = 'seconds';

const emptyProgress = () =>
  Object.fromEntries(ENTITY_TYPES.map((entity) => [entity, { fetched: 0, resolved: 0, total: undefined }]));

const isCanonicalContact = (record) =>
  record && typeof record.externalId === 'string' && Array.isArray(record.emails);

const isCanonicalMatter = (record) =>
  record && typeof record.clientRef === 'string' && typeof record.name === 'string';

const isCanonicalTimeEntry = (record) =>
  record && typeof record.matterRef === 'string' && typeof record.quantity === 'number';

module.exports = {
  ENTITY_TYPES,
  IMPORT_STATUSES,
  TIME_QUANTITY_UNIT,
  emptyProgress,
  isCanonicalContact,
  isCanonicalMatter,
  isCanonicalTimeEntry
};
