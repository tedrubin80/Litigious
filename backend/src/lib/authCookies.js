const AUTH_COOKIE_NAME = 'auth_token';

const isProduction = () => process.env.NODE_ENV === 'production';
const useSecureCookies = () => isProduction() || process.env.FORCE_HTTPS === 'true';

const getCookieOptions = (maxAgeMs = 24 * 60 * 60 * 1000) => ({
  httpOnly: true,
  secure: useSecureCookies(),
  sameSite: isProduction() ? 'strict' : 'lax',
  path: '/',
  maxAge: maxAgeMs
});

const setAuthCookie = (res, token, maxAgeMs) => {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(maxAgeMs));
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: useSecureCookies(),
    sameSite: isProduction() ? 'strict' : 'lax',
    path: '/'
  });
};

const getTokenFromRequest = (req) => {
  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
};

const sendAuthResponse = (res, { token, user, loginType, statusCode = 200, extra = {} }) => {
  setAuthCookie(res, token);

  const body = {
    success: true,
    user,
    loginType,
    ...extra
  };

  if (process.env.EXPOSE_AUTH_TOKEN_IN_RESPONSE === 'true') {
    body.token = token;
  }

  return res.status(statusCode).json(body);
};

module.exports = {
  AUTH_COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
  sendAuthResponse,
  getCookieOptions
};
