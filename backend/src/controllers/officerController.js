const officerService = require('../services/officerService');

const buildContext = (req) => ({
  ...officerService.getRequestContext(req),
  userRoles: req.roles
});

const list = async (req, res) => {
  const result = await officerService.list(req.query);

  res.status(200).json({
    data: result.data,
    meta: {
      pagination: result.pagination,
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const create = async (req, res) => {
  const result = await officerService.create(req.body, req.user, buildContext(req));

  res.status(201).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getById = async (req, res) => {
  const result = await officerService.getById(req.params.id);

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getByUserId = async (req, res) => {
  const result = await officerService.getByUserId(req.params.userId);

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const update = async (req, res) => {
  const result = await officerService.update(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const deactivate = async (req, res) => {
  const result = await officerService.deactivate(req.params.id, req.body, req.user, buildContext(req));

  res.status(200).json({
    data: result,
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });
};

const getPayments = async (req, res) => {
  const result = await officerService.getPayments(req.params.id, req.query, req.user, req.roles);

  res.status(200).json({
    data: result.data,
    meta: {
      pagination: result.pagination,
      requestId: req.headers['x-request-id'] || null
    }
  });
};

module.exports = {
  list,
  create,
  getById,
  getByUserId,
  update,
  deactivate,
  getPayments
};
