const AppError = require('../../../src/utils/AppError');

describe('AppError', () => {
  it('creates an error with default values', () => {
    const error = new AppError('Something went wrong');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('APPLICATION_ERROR');
    expect(error.details).toEqual([]);
  });

  it('creates an error with custom status and code', () => {
    const error = new AppError('Not found', 404, 'NOT_FOUND');

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('creates an error with validation details', () => {
    const details = [
      { field: 'name', message: 'Name is required' }
    ];
    const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual(details);
  });

  it('captures stack trace', () => {
    const error = new AppError('Test error');
    expect(error.stack).toBeDefined();
  });
});
