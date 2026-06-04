/**
 * Global error handler middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler]', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      status: 400,
      message: 'Validasi database gagal',
      errors: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    status,
    message: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
