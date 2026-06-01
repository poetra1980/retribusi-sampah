import api from './axios';

export const userApi = {
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  deactivate: (id, data) => api.post(`/users/${id}/deactivate`, data),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  updateRoles: (id, data) => api.put(`/users/${id}/roles`, data)
};

export const roleApi = {
  list: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`)
};
