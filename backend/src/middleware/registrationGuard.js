const { authenticateToken, requireAdmin } = require('./auth');

const isPublicRegistrationEnabled = () => process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

const registrationGuard = (req, res, next) => {
  if (isPublicRegistrationEnabled()) {
    return next();
  }

  authenticateToken(req, res, () => {
    requireAdmin(req, res, next);
  });
};

module.exports = {
  registrationGuard,
  isPublicRegistrationEnabled
};
