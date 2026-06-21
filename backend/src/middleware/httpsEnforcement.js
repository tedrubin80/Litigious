const shouldEnforceHttps = () =>
  process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true';

const httpsEnforcement = (req, res, next) => {
  if (!shouldEnforceHttps()) {
    return next();
  }

  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isSecure) {
    return next();
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }

  return res.status(403).json({
    success: false,
    message: 'HTTPS is required'
  });
};

module.exports = {
  httpsEnforcement,
  shouldEnforceHttps
};
