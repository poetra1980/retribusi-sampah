import api from './axios';

export const tariffApi = {
  list: (params) => api.get('/tariffs', { params }),
  getById: (id) => api.get(`/tariffs/${id}`),
  create: (data) => api.post('/tariffs', data),
  update: (id, data) => api.patch(`/tariffs/${id}`, data),
  deactivate: (id, data) => api.post(`/tariffs/${id}/deactivate`, data),
  getHistories: (id, params) => api.get(`/tariffs/${id}/histories`, { params })
};
