const prisma = require('./prisma');
const { ADMIN_ROLES, getUserId, resolveClientForUser } = require('./accessScope');

const userCanAccessDocument = async (user, document) => {
  if (!user || !document) {
    return false;
  }

  if (ADMIN_ROLES.has(user.role)) {
    return true;
  }

  const userId = getUserId(user);

  if (document.uploadedBy === userId) {
    return true;
  }

  if (!document.caseId) {
    return false;
  }

  if (user.role === 'CLIENT') {
    const client = await resolveClientForUser(user);
    if (!client) {
      return false;
    }

    const linkedCase = await prisma.case.findFirst({
      where: { id: document.caseId, clientId: client.id },
      select: { id: true }
    });
    return Boolean(linkedCase);
  }

  const caseAccess = await prisma.case.findFirst({
    where: {
      id: document.caseId,
      OR: [
        { attorneyId: userId },
        { paralegalId: userId },
        { secondAttorneyId: userId },
        { referringAttorneyId: userId }
      ]
    },
    select: { id: true }
  });

  return Boolean(caseAccess);
};

module.exports = {
  userCanAccessDocument
};
