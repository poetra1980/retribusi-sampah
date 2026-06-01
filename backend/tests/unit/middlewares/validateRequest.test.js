const Joi = require('joi');
const validateRequest = require('../../../src/middlewares/validateRequest');
const AppError = require('../../../src/utils/AppError');

describe('validateRequest middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
  });

  it('passes validation and strips unknown fields', () => {
    const schema = Joi.object({
      name: Joi.string().required()
    });
    req.body = { name: 'Test', extraField: 'should-be-removed' };

    validateRequest(schema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Test' });
    expect(req.body.extraField).toBeUndefined();
  });

  it('calls next with AppError on validation failure', () => {
    const schema = Joi.object({
      email: Joi.string().email().required()
    });
    req.body = { email: 'not-an-email' };

    validateRequest(schema, 'body')(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.length).toBeGreaterThan(0);
  });

  it('validates query parameters', () => {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).default(10)
    });
    req.query = {};

    validateRequest(schema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query.limit).toBe(10);
  });

  it('reports multiple validation errors', () => {
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required()
    });
    req.body = { name: '', email: 'bad' };

    validateRequest(schema, 'body')(req, res, next);

    const error = next.mock.calls[0][0];
    expect(error.details.length).toBeGreaterThanOrEqual(2);
  });
});
