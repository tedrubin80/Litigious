const express = require('express');
const client = require('prom-client');
const router = express.Router();

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'legalestate_' });

const httpRequestDuration = new client.Histogram({
  name: 'legalestate_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'legalestate_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path || 'unknown';
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    };
    httpRequestDuration.observe(labels, elapsed);
    httpRequestTotal.inc(labels);
  });

  next();
};

router.get('/', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = {
  metricsRouter: router,
  metricsMiddleware,
  register
};
