const prisma = require('./prisma');
const AuthUtils = require('./authUtils');

const logDocumentAccess = async ({
  req,
  document,
  action,
  description
}) => {
  if (!req?.user || !document) return;

  try {
    await prisma.activity.create({
      data: {
        id: AuthUtils.generateToken(16),
        action,
        description: description || `${action} ${document.filename || document.originalName || document.id}`,
        entityType: 'DOCUMENT',
        entityId: String(document.id),
        userId: req.user.userId || req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
  } catch (error) {
    console.error('Document audit logging failed:', error.message);
  }
};

module.exports = {
  logDocumentAccess
};
