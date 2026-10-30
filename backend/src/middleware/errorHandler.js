const env = require('../config/env');

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const isDev = env.NODE_ENV === 'development';

  // Do not expose internal database error strings or stack traces to end users
  const response = {
    success: false,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred. Please try again later.'
  };

  if (err.devices) {
    response.devices = err.devices;
  }

  // Only attach debug details in local dev if explicitly useful
  if (isDev && status === 500) {
    response.debugError = err.message;
  }

  return res.status(status).json(response);
}

module.exports = errorHandler;
