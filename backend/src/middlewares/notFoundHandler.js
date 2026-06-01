const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: []
    },
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = notFoundHandler;
