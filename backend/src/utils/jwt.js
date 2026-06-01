const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const env = require('../config/env');
const AppError = require('./AppError');

const signAccessToken = (user, roles) => jwt.sign(
  {
    sub: user.id,
    type: 'access',
    roles
  },
  env.jwt.accessSecret,
  {
    expiresIn: env.jwt.accessExpiresIn,
    jwtid: randomUUID()
  }
);

const signRefreshToken = (user) => jwt.sign(
  {
    sub: user.id,
    type: 'refresh'
  },
  env.jwt.refreshSecret,
  {
    expiresIn: env.jwt.refreshExpiresIn,
    jwtid: randomUUID()
  }
);

const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);

    if (payload.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired access token', 401, 'INVALID_TOKEN');
  }
};

const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, env.jwt.refreshSecret);

    if (payload.type !== 'refresh') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
  }
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
