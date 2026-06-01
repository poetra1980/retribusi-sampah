const service = require('../services/customerService');

const buildContext = (req) => ({ ...service.getRequestContext(req), userRoles: req.roles });

const list = async (req, res) => {
  const result = await service.list(req.query, req.user, buildContext(req));
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const create = async (req, res) => {
  const result = await service.create(req.body, req.user, buildContext(req));
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

const deactivate = async (req, res) => {
  const result = await service.deactivate(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const linkUser = async (req, res) => {
  const result = await service.linkUser(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const unlinkUser = async (req, res) => {
  const result = await service.unlinkUser(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getBills = async (req, res) => {
  const result = await service.getBills(req.params.id, req.query, req.user, req.roles);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getPayments = async (req, res) => {
  const result = await service.getPayments(req.params.id, req.query, req.user, req.roles);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

module.exports = { list, create, getById, update, deactivate, linkUser, unlinkUser, getBills, getPayments };
