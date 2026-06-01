const repo = require('../repositories/auditLogRepository');
const AppError = require('../utils/AppError');

const list = async (query) => {
  const { auditLogs, nextCursor } = await repo.findAll(query);
  return { data: auditLogs, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getById = async (id) => {
  const log = await repo.findById(id);
  if (!log) throw new AppError('Audit log not found', 404, 'AUDIT_LOG_NOT_FOUND');
  return log;
};

const getByEntity = async (query) => {
  const { auditLogs, nextCursor } = await repo.findByEntity(query);
  return { data: auditLogs, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

module.exports = { list, getById, getByEntity };
