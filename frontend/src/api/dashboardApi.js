import api from './axios';

export const dashboardApi = {
  overview: (params) => api.get('/dashboard/overview', { params }),
  dailyPayments: (params) => api.get('/dashboard/payments/daily', { params }),
  latestPayments: (params) => api.get('/dashboard/payments/latest', { params }),
  regionsSummary: (params) => api.get('/dashboard/regions', { params }),
  officersSummary: (params) => api.get('/dashboard/officers', { params })
};
