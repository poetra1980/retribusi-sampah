import api from './axios';

export const reportApi = {
  paymentsDaily: (params) => api.get('/reports/payments/daily', { params }),
  paymentsMonthly: (params) => api.get('/reports/payments/monthly', { params }),
  paymentsYearly: (params) => api.get('/reports/payments/yearly', { params }),
  arrears: (params) => api.get('/reports/arrears', { params }),
  collectionRate: (params) => api.get('/reports/collection-rate', { params }),
  officerPerformance: (params) => api.get('/reports/officer-performance', { params }),
  exports: {
    create: (data) => api.post('/reports/exports', data),
    list: (params) => api.get('/reports/exports', { params }),
    getById: (id) => api.get(`/reports/exports/${id}`),
    download: (id) => api.get(`/reports/exports/${id}/download`, { responseType: 'blob' })
  }
};
