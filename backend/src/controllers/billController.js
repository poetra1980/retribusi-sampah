const service = require('../services/billService');

const buildContext = (req) => ({ ...service.getRequestContext(req), userRoles: req.roles });

const list = async (req, res) => {
  const result = await service.list(req.query, req.user, req.roles);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const generate = async (req, res) => {
  const result = await service.generate(req.body, req.user, buildContext(req));
  res.status(202).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getById = async (req, res) => {
  const result = await service.getById(req.params.id, req.user, req.roles);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const cancel = async (req, res) => {
  const result = await service.cancel(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getPayments = async (req, res) => {
  const result = await service.getPayments(req.params.id, req.query, req.user, req.roles);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const listBatches = async (req, res) => {
  const result = await service.listBatches(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getBatchById = async (req, res) => {
  const result = await service.getBatchById(req.params.id);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

module.exports = { list, generate, getById, cancel, getPayments, listBatches, getBatchById };
