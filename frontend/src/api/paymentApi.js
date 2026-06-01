import api from './axios';

export const paymentMethodApi = {
  list: (params) => api.get('/payment-methods', { params }),
  getById: (id) => api.get(`/payment-methods/${id}`),
  create: (data) => api.post('/payment-methods', data),
  update: (id, data) => api.patch(`/payment-methods/${id}`, data),
  deactivate: (id, data) => api.post(`/payment-methods/${id}/deactivate`, data)
};

export const paymentApi = {
  list: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  create: (data, idempotencyKey) =>
    api.post('/payments', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  void: (id, data) => api.post(`/payments/${id}/void`, data),
  getReceipt: (id) => api.get(`/payments/${id}/receipt`),
  getAllocations: (id) => api.get(`/payments/${id}/allocations`)
};
