const prisma = require('./prisma');

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

const getUserId = (reqOrUser) => {
  if (reqOrUser?.user) {
    return reqOrUser.user?.userId || reqOrUser.user?.id;
  }
  return reqOrUser?.userId || reqOrUser?.id;
};

const resolveClientForUser = async (user) => {
  if (!user?.email) return null;
  return prisma.client.findFirst({
    where: { email: user.email.toLowerCase() },
    select: { id: true, firstName: true, lastName: true, email: true }
  });
};

const buildCaseScope = async (req) => {
  const userId = getUserId(req);
  const userRole = req.user?.role;
  const userEmail = req.user?.email;

  if (ADMIN_ROLES.has(userRole)) {
    return {};
  }

  if (userRole === 'ATTORNEY') {
    return {
      OR: [
        { attorneyId: userId },
        { secondAttorneyId: userId },
        { referringAttorneyId: userId }
      ]
    };
  }

  if (userRole === 'PARALEGAL') {
    return {
      OR: [
        { paralegalId: userId },
        { attorneyId: userId }
      ]
    };
  }

  if (userRole === 'CLIENT') {
    const client = await resolveClientForUser(req.user);
    return client ? { clientId: client.id } : { id: '__none__' };
  }

  return { id: '__none__' };
};

const buildActivityScope = async (req) => {
  const userId = getUserId(req);
  const userRole = req.user?.role;

  if (ADMIN_ROLES.has(userRole)) {
    return {};
  }

  return { userId };
};

const buildDocumentListScope = async (req) => {
  const userId = getUserId(req);
  const role = req.user?.role;

  if (ADMIN_ROLES.has(role)) {
    return {};
  }

  if (role === 'CLIENT') {
    const client = await resolveClientForUser(req.user);
    if (!client) {
      return { id: '__none__' };
    }
    return {
      case: { clientId: client.id }
    };
  }

  return {
    OR: [
      { uploadedBy: userId },
      {
        case: {
          OR: [
            { attorneyId: userId },
            { paralegalId: userId },
            { secondAttorneyId: userId },
            { referringAttorneyId: userId }
          ]
        }
      }
    ]
  };
};

const userCanAccessCase = async (user, caseData) => {
  if (!user || !caseData) {
    return false;
  }

  if (ADMIN_ROLES.has(user.role)) {
    return true;
  }

  const userId = getUserId(user);

  if (user.role === 'ATTORNEY') {
    return [caseData.attorneyId, caseData.secondAttorneyId, caseData.referringAttorneyId].includes(userId);
  }

  if (user.role === 'PARALEGAL') {
    return caseData.paralegalId === userId || caseData.attorneyId === userId;
  }

  if (user.role === 'CLIENT') {
    const client = await resolveClientForUser(user);
    return Boolean(client && caseData.clientId === client.id);
  }

  return false;
};

const sanitizeCaseForClient = (caseData) => {
  const {
    internalNotes,
    timeEntries,
    expenses,
    ...clientSafe
  } = caseData;

  return {
    ...clientSafe,
    notes: Array.isArray(caseData.notes)
      ? caseData.notes.filter((note) => !note.isPrivate)
      : [],
    tasks: Array.isArray(caseData.tasks)
      ? caseData.tasks.map(({ internalNotes: _ignored, ...task }) => task)
      : []
  };
};

module.exports = {
  ADMIN_ROLES,
  getUserId,
  resolveClientForUser,
  buildCaseScope,
  buildActivityScope,
  buildDocumentListScope,
  userCanAccessCase,
  sanitizeCaseForClient
};
