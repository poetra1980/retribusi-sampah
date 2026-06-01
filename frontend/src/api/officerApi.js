import api from './axios';

export const officerApi = {
  list: (params) => api.get('/officers', { params }),
  getById: (id) => api.get(`/officers/${id}`),
  create: (data) => api.post('/officers', data),
  update: (id, data) => api.patch(`/officers/${id}`, data),
  deactivate: (id, data) => api.post(`/officers/${id}/deactivate`, data),
  getPayments: (id, params) => api.get(`/officers/${id}/payments`, { params })
};
