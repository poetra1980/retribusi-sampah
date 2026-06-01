const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');

const authenticateJwt = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required', 401, 'AUTHENTICATION_REQUIRED');
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = verifyAccessToken(token);
    const profile = await authService.getCurrentUserProfile(payload.sub);

    req.user = profile.user;
    req.roles = profile.roles;
    req.auth = {
      token,
      tokenId: payload.jti,
      userId: payload.sub
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  authenticateJwt
};
