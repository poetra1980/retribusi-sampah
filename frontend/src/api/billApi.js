import api from './axios';

export const billApi = {
  list: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  generate: (data) => api.post('/bills/generate', data),
  cancel: (id, data) => api.post(`/bills/${id}/cancel`, data),
  getGenerationBatches: (params) => api.get('/bills/generation-batches', { params }),
  getGenerationBatch: (id) => api.get(`/bills/generation-batches/${id}`),
  getPayments: (id, params) => api.get(`/bills/${id}/payments`, { params })
};
