const notFoundHandler = require('../../../src/middlewares/notFoundHandler');

describe('notFoundHandler middleware', () => {
  it('returns 404 with standard error format', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: []
      },
      meta: { requestId: null }
    });
  });
});
