import api from './axios';

export const billingPeriodApi = {
  list: (params) => api.get('/billing-periods', { params }),
  getById: (id) => api.get(`/billing-periods/${id}`),
  create: (data) => api.post('/billing-periods', data),
  update: (id, data) => api.patch(`/billing-periods/${id}`, data),
  close: (id, data) => api.post(`/billing-periods/${id}/close`, data),
  reopen: (id, data) => api.post(`/billing-periods/${id}/reopen`, data)
};
