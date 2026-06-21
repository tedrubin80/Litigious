const isProduction = () => process.env.NODE_ENV === 'production';

const buildAllowedOrigins = () => {
  const configured = [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim())
  ].filter(Boolean);

  if (isProduction()) {
    return [...new Set(configured.filter((origin) => origin.startsWith('https://')))];
  }

  return [...new Set([
    ...configured,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://legalestate.tech',
    'https://www.legalestate.tech',
    process.env.HTTP_FALLBACK_URL
  ].filter(Boolean))];
};

const createCorsOptions = () => {
  const allowedOrigins = buildAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        if (isProduction()) {
          return callback(new Error('Origin header required'));
        }
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (!isProduction() && origin.includes('localhost')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
  };
};

module.exports = {
  createCorsOptions,
  buildAllowedOrigins
};
