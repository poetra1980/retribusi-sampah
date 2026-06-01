const service = require('../services/customerCategoryService');

const buildContext = (req) => ({ ...service.getRequestContext(req), userRoles: req.roles });

const list = async (req, res) => {
  const result = await service.list(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const create = async (req, res) => {
  const result = await service.create(req.body, req.user, buildContext(req));
  res.status(201).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getById = async (req, res) => {
  const result = await service.getById(req.params.id);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const update = async (req, res) => {
  const result = await service.update(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const deactivate = async (req, res) => {
  const result = await service.deactivate(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

module.exports = { list, create, getById, update, deactivate };
