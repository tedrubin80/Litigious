const {
  mapCaseStatus,
  mapCaseType,
  generateCaseNumber,
  contactToClientFields,
  addressToClientFields,
  secondsToHours
} = require('./mapHelpers');

const generateClientNumber = async (tx, year = new Date().getFullYear()) => {
  const prefix = `CL${year}`;
  const lastClient = await tx.client.findFirst({
    where: { clientNumber: { startsWith: prefix } },
    orderBy: { clientNumber: 'desc' }
  });

  let nextNumber = 1;
  if (lastClient?.clientNumber) {
    nextNumber = parseInt(lastClient.clientNumber.replace(prefix, ''), 10) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

const writeImportPreview = async (preview, { prisma, userId, jobId, defaultRate = 250 }) => {
  const clientMap = new Map();
  const matterMap = new Map();
  const mappings = [];

  await prisma.$transaction(async (tx) => {
    for (const contact of preview.contacts || []) {
      const fields = contactToClientFields(contact);
      const address = addressToClientFields(contact.addresses?.[0]);
      const clientNumber = await generateClientNumber(tx);

      const client = await tx.client.create({
        data: {
          ...fields,
          ...address,
          clientNumber,
          createdById: userId,
          notes: `Imported from ${contact.externalSource} (external ID: ${contact.externalId})`
        }
      });

      clientMap.set(contact.externalId, client.id);
      mappings.push({
        importJobId: jobId,
        entityType: 'contacts',
        externalId: contact.externalId,
        externalSource: contact.externalSource,
        internalId: client.id
      });
    }

    for (const matter of preview.matters || []) {
      const clientId = clientMap.get(matter.clientRef);
      if (!clientId) continue;

      const caseRecord = await tx.case.create({
        data: {
          caseNumber: generateCaseNumber(),
          title: matter.name,
          description: matter.customFields?.clioStatus
            ? `Imported matter (${matter.customFields.clioStatus})`
            : 'Imported matter',
          type: mapCaseType(matter.practiceArea),
          status: mapCaseStatus(matter.status),
          clientId,
          attorneyId: userId,
          dateOpened: matter.openedDate ? new Date(matter.openedDate) : new Date(),
          dateClosed: matter.closedDate ? new Date(matter.closedDate) : null
        }
      });

      matterMap.set(matter.externalId, caseRecord.id);
      mappings.push({
        importJobId: jobId,
        entityType: 'matters',
        externalId: matter.externalId,
        externalSource: matter.externalSource,
        internalId: caseRecord.id
      });
    }

    for (const entry of preview.timeEntries || []) {
      const caseId = matterMap.get(entry.matterRef);
      if (!caseId) continue;

      const hours = secondsToHours(entry.quantity);
      const rate = entry.rate ?? defaultRate;
      const amount = Math.round(hours * rate * 100) / 100;

      const timeEntry = await tx.timeEntry.create({
        data: {
          description: entry.description || 'Imported time entry',
          hours,
          rate,
          amount,
          date: entry.date ? new Date(entry.date) : new Date(),
          billable: true,
          billed: Boolean(entry.billed),
          caseId,
          userId,
          sourceType: 'import',
          sourceId: entry.externalId,
          metadata: {
            externalSource: entry.externalSource,
            externalId: entry.externalId,
            userRef: entry.userRef || null
          }
        }
      });

      mappings.push({
        importJobId: jobId,
        entityType: 'timeEntries',
        externalId: entry.externalId,
        externalSource: entry.externalSource,
        internalId: timeEntry.id
      });
    }

    if (mappings.length > 0) {
      await tx.importExternalMapping.createMany({ data: mappings });
    }
  });

  return {
    clients: clientMap.size,
    matters: matterMap.size,
    timeEntries: (preview.timeEntries || []).filter((e) => matterMap.has(e.matterRef)).length,
    mappings: mappings.length
  };
};

module.exports = { writeImportPreview, generateClientNumber };
