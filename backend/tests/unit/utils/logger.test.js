const logger = require('../../../src/utils/logger');

describe('Logger', () => {
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs info messages', () => {
    logger.info('Server started');
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const logged = consoleLogSpy.mock.calls[0][0];
    expect(logged).toContain('INFO');
    expect(logged).toContain('Server started');
  });

  it('logs warn messages', () => {
    logger.warn('Low disk space', { used: '90%' });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logged = consoleWarnSpy.mock.calls[0][0];
    expect(logged).toContain('WARN');
    expect(logged).toContain('Low disk space');
    expect(logged).toContain('{"used":"90%"}');
  });

  it('logs error messages', () => {
    logger.error('Connection failed', { db: 'postgres' });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logged = consoleErrorSpy.mock.calls[0][0];
    expect(logged).toContain('ERROR');
    expect(logged).toContain('Connection failed');
    expect(logged).toContain('{"db":"postgres"}');
  });
});
