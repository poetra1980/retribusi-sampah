const authorizeRole = require('../../../src/middlewares/authorizeRole');
const AppError = require('../../../src/utils/AppError');

describe('authorizeRole middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { roles: [] };
    res = {};
    next = jest.fn();
  });

  it('allows access when user has required role', () => {
    req.roles = ['admin'];

    authorizeRole('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows access when user has one of multiple required roles', () => {
    req.roles = ['petugas'];

    authorizeRole('admin', 'petugas')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('denies access when user lacks required role', () => {
    req.roles = ['warga'];

    authorizeRole('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('ACCESS_DENIED');
    expect(error.message).toMatch(/insufficient/i);
  });

  it('denies access when user has no roles', () => {
    req.roles = [];

    authorizeRole('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(next.mock.calls[0][0].message).toMatch(/no roles/i);
  });
});
