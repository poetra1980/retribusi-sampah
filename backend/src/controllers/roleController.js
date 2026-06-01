const roleService = require('../services/roleService');

const buildContext = (req) => ({
  ...roleService.getRequestContext(req),
  userRoles: req.roles
});

const list = async (req, res) => {
  const result = await roleService.list();

  res.status(200).json({
    data: result.data,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getById = async (req, res) => {
  const result = await roleService.getById(parseInt(req.params.id, 10));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const updateUserRoles = async (req, res) => {
  const result = await roleService.updateUserRoles(
    req.params.id,
    req.body,
    req.user,
    buildContext(req)
  );

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = {
  list,
  getById,
  updateUserRoles
};
