import api from './axios';

const cleanPayload = (data) => {
  const p = { ...data };
  if (!p.parentId) delete p.parentId;
  return p;
};

export const regionApi = {
  list: (params) => api.get('/regions', { params }),
  tree: (params) => api.get('/regions/tree', { params }),
  getById: (id) => api.get(`/regions/${id}`),
  create: (data) => api.post('/regions', cleanPayload(data)),
  update: (id, data) => api.patch(`/regions/${id}`, cleanPayload(data)),
  deactivate: (id, data) => api.post(`/regions/${id}/deactivate`, data)
};
