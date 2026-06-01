const asyncHandler = require('../../../src/utils/asyncHandler');

describe('asyncHandler', () => {
  it('calls the handler and passes result to response', async () => {
    const handler = async (req, res) => {
      res.status(200).json({ success: true });
    };
    const wrapped = asyncHandler(handler);
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('catches errors and passes to next', async () => {
    const handler = async () => {
      throw new Error('Async error');
    };
    const wrapped = asyncHandler(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Async error'
    }));
  });
});
