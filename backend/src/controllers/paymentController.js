const service = require('../services/paymentService');

const buildContext = (req) => ({
  ...service.getRequestContext(req),
  userRoles: req.roles,
  idempotencyKey: req.headers['idempotency-key'] || null
});

const list = async (req, res) => {
  const result = await service.list(req.query, req.user, req.roles);
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

const voidPayment = async (req, res) => {
  const result = await service.voidPayment(req.params.id, req.body, req.user, buildContext(req));
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getReceipt = async (req, res) => {
  const result = await service.getReceipt(req.params.id, req.user, req.roles);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getAllocations = async (req, res) => {
  const result = await service.getAllocations(req.params.id, req.user, req.roles);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

module.exports = { list, create, getById, voidPayment, getReceipt, getAllocations };
