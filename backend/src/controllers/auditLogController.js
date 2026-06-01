const service = require('../services/auditLogService');

const list = async (req, res) => {
  const result = await service.list(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getById = async (req, res) => {
  const result = await service.getById(req.params.id);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getByEntity = async (req, res) => {
  const result = await service.getByEntity({ ...req.params, ...req.query });
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

module.exports = { list, getById, getByEntity };
