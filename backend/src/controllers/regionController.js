const regionService = require('../services/regionService');

const buildContext = (req) => ({
  ...regionService.getRequestContext(req),
  userRoles: req.roles
});

const list = async (req, res) => {
  const result = await regionService.list(req.query, req.user, buildContext(req));

  res.status(200).json({
    data: result.data,
    meta: {
      pagination: result.pagination,
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getTree = async (req, res) => {
  const result = await regionService.getTree(req.query);

  res.status(200).json({
    data: result.data,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const create = async (req, res) => {
  const result = await regionService.create(req.body, req.user, buildContext(req));

  res.status(201).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getById = async (req, res) => {
  const result = await regionService.getById(req.params.id);

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const update = async (req, res) => {
  const result = await regionService.update(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const deactivate = async (req, res) => {
  const result = await regionService.deactivate(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = {
  list,
  getTree,
  create,
  getById,
  update,
  deactivate
};
