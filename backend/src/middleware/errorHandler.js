const logger = require('./logger');

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.path} — ${status}: ${message}`, {
    stack: err.stack,
    user: req.user?.id,
  });

  if (process.env.NODE_ENV === 'production') {
    return res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : message });
  }

  res.status(status).json({ error: message, stack: err.stack });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
