const errorHandler = require('../../../src/middlewares/errorHandler');
const AppError = require('../../../src/utils/AppError');

describe('errorHandler middleware', () => {
  let req, res;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles an AppError (operational)', () => {
    const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', [
      { field: 'name', message: 'required' }
    ]);

    errorHandler(error, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ field: 'name', message: 'required' }]
      },
      meta: { requestId: null }
    });
  });

  it('hides internal error details for non-operational errors', () => {
    const error = new Error('Unexpected internal failure');
    error.statusCode = 500;

    errorHandler(error, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: []
      },
      meta: { requestId: null }
    });
  });

  it('includes requestId in response meta', () => {
    req.headers['x-request-id'] = 'abc-123';
    const error = new AppError('Not found', 404, 'NOT_FOUND');

    errorHandler(error, req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      meta: { requestId: 'abc-123' }
    }));
  });
});
