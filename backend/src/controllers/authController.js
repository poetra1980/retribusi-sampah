const authService = require('../services/authService');

const login = async (req, res) => {
  const result = await authService.login(req.body, authService.getRequestContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const refreshToken = async (req, res) => {
  const result = await authService.refreshToken(req.body, authService.getRequestContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const logout = async (req, res) => {
  const result = await authService.logout(req.body, req.user, authService.getRequestContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const me = async (req, res) => {
  const result = await authService.getCurrentUserProfile(req.user.id);

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const changePassword = async (req, res) => {
  const result = await authService.changePassword(req.body, req.user, authService.getRequestContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = {
  login,
  refreshToken,
  logout,
  me,
  changePassword
};
