const userService = require('../services/userService');

const buildContext = (req) => ({
  ...userService.getRequestContext(req),
  userRoles: req.roles
});

const list = async (req, res) => {
  const result = await userService.list(req.query, req.user, buildContext(req));

  res.status(200).json({
    data: result.data,
    meta: {
      pagination: result.pagination,
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const create = async (req, res) => {
  const result = await userService.create(req.body, req.user, buildContext(req));

  res.status(201).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getById = async (req, res) => {
  const result = await userService.getById(req.params.id);

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const update = async (req, res) => {
  const result = await userService.update(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const deactivate = async (req, res) => {
  const result = await userService.deactivate(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const resetPassword = async (req, res) => {
  const result = await userService.resetPassword(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = {
  list,
  create,
  getById,
  update,
  deactivate,
  resetPassword
};
