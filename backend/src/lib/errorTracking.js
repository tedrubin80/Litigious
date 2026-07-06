const initErrorTracking = (app) => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return null;
  }

  try {
    // Optional dependency — install @sentry/node when SENTRY_DSN is configured
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
    });

    app.use(Sentry.Handlers.requestHandler());
    console.log('📡 Sentry error tracking enabled');
    return Sentry;
  } catch (error) {
    console.warn('SENTRY_DSN is set but @sentry/node is not installed:', error.message);
    return null;
  }
};

const registerErrorHandler = (app, Sentry) => {
  if (Sentry?.Handlers?.errorHandler) {
    app.use(Sentry.Handlers.errorHandler());
  }
};

module.exports = {
  initErrorTracking,
  registerErrorHandler
};
