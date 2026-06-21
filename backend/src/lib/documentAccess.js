const prisma = require('./prisma');

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

const userCanAccessDocument = async (user, document) => {
  if (!user || !document) {
    return false;
  }

  if (ADMIN_ROLES.has(user.role)) {
    return true;
  }

  if (document.uploadedBy === user.id || document.uploadedBy === user.userId) {
    return true;
  }

  if (!document.caseId) {
    return false;
  }

  const caseAccess = await prisma.case.findFirst({
    where: {
      id: document.caseId,
      OR: [
        { attorneyId: user.id || user.userId },
        { paralegalId: user.id || user.userId },
        ...(user.role === 'ATTORNEY' ? [{
          paralegal: {
            assignedCases: {
              some: { attorneyId: user.id || user.userId }
            }
          }
        }] : [])
      ]
    },
    select: { id: true }
  });

  return Boolean(caseAccess);
};

module.exports = {
  userCanAccessDocument
};
