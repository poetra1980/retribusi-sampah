import api from './axios';

export const auditLogApi = {
  list: (params) => api.get('/audit-logs', { params }),
  getById: (id) => api.get(`/audit-logs/${id}`),
  getByEntity: (entityTable, entityId, params) =>
    api.get(`/audit-logs/entity/${entityTable}/${entityId}`, { params })
};
