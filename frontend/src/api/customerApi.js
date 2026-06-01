import api from './axios';

export const customerCategoryApi = {
  list: (params) => api.get('/customer-categories', { params }),
  getById: (id) => api.get(`/customer-categories/${id}`),
  create: (data) => api.post('/customer-categories', data),
  update: (id, data) => api.patch(`/customer-categories/${id}`, data),
  deactivate: (id, data) => api.post(`/customer-categories/${id}/deactivate`, data)
};

export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  deactivate: (id, data) => api.post(`/customers/${id}/deactivate`, data),
  getBills: (id, params) => api.get(`/customers/${id}/bills`, { params }),
  getPayments: (id, params) => api.get(`/customers/${id}/payments`, { params }),
  linkUser: (id, data) => api.post(`/customers/${id}/link-user`, data),
  unlinkUser: (id, data) => api.post(`/customers/${id}/unlink-user`, data),
  getAddresses: (customerId, params) => api.get(`/customers/${customerId}/addresses`, { params }),
  createAddress: (customerId, data) => api.post(`/customers/${customerId}/addresses`, data)
};

export const addressApi = {
  getById: (id) => api.get(`/customer-addresses/${id}`),
  update: (id, data) => api.patch(`/customer-addresses/${id}`, data),
  setPrimary: (id) => api.post(`/customer-addresses/${id}/set-primary`),
  deactivate: (id, data) => api.post(`/customer-addresses/${id}/deactivate`, data)
};
