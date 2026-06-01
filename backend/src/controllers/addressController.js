const service = require('../services/addressService');

const buildContext = (req) => ({ ...service.getRequestContext(req), userRoles: req.roles });

const listByCustomer = async (req, res) => {
  const result = await service.listByCustomer(req.params.customerId, req.query, req.user, req.roles);
  res.status(200).json({ data: result.data, meta: { requestId: req.headers['x-request-id'] || null } });
};

const create = async (req, res) => {
  const result = await service.create(req.params.customerId, req.body, req.user, buildContext(req));
  res.status(201).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getById = async (req, res) => {
  const result = await service.getById(req.params.id, req.user, req.roles);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const update = async (req, res) => {
  const result = await service.update(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const setPrimary = async (req, res) => {
  const result = await service.setPrimary(req.params.id, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const deactivate = async (req, res) => {
  const result = await service.deactivate(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

module.exports = { listByCustomer, create, getById, update, setPrimary, deactivate };
