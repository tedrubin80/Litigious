const mapCaseStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'closed') return 'CLOSED';
  if (value === 'pending') return 'INTAKE';
  return 'ACTIVE';
};

const mapCaseType = (practiceArea) => {
  const area = String(practiceArea || '').toLowerCase();
  if (!area) return 'PERSONAL_INJURY';

  const rules = [
    { match: /auto|motor|vehicle|car accident/, type: 'AUTO_ACCIDENT' },
    { match: /medical|malpractice/, type: 'MEDICAL_MALPRACTICE' },
    { match: /worker|comp/, type: 'WORKERS_COMP' },
    { match: /premises|slip|fall/, type: 'PREMISES_LIABILITY' },
    { match: /product/, type: 'PRODUCT_LIABILITY' },
    { match: /contract/, type: 'CONTRACT_DISPUTE' },
    { match: /employ/, type: 'EMPLOYMENT_LAW' },
    { match: /family|divorce|custody/, type: 'FAMILY_LAW' },
    { match: /criminal/, type: 'CRIMINAL_DEFENSE' },
    { match: /estate|probate|will/, type: 'ESTATE_PLANNING' },
    { match: /real estate|property/, type: 'REAL_ESTATE' },
    { match: /bankrupt/, type: 'BANKRUPTCY' },
    { match: /business|corporate/, type: 'BUSINESS_LAW' },
    { match: /immigrat/, type: 'IMMIGRATION' }
  ];

  const hit = rules.find((rule) => rule.match.test(area));
  return hit?.type || 'PERSONAL_INJURY';
};

const generateCaseNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}-${random}`;
};

const contactToClientFields = (contact) => {
  if (contact.type === 'company') {
    return {
      firstName: contact.companyName || 'Unknown Company',
      lastName: '(Company)',
      email: contact.emails?.[0] || null,
      phone: contact.phones?.[0] || null
    };
  }

  return {
    firstName: contact.firstName || 'Unknown',
    lastName: contact.lastName || 'Client',
    email: contact.emails?.[0] || null,
    phone: contact.phones?.[0] || null
  };
};

const addressToClientFields = (address) => {
  if (!address) return {};
  return {
    address: address.street || null,
    city: address.city || null,
    state: address.province?.slice(0, 2) || null,
    zipCode: address.postalCode || null
  };
};

const secondsToHours = (seconds) => {
  const hours = Number(seconds || 0) / 3600;
  return Math.round(hours * 100) / 100;
};

module.exports = {
  mapCaseStatus,
  mapCaseType,
  generateCaseNumber,
  contactToClientFields,
  addressToClientFields,
  secondsToHours
};
