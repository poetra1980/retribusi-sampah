const service = require('../services/dashboardService');

const overview = async (req, res) => {
  const result = await service.getOverview(req.query);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const dailyPayments = async (req, res) => {
  const result = await service.getDailyPayments(req.query);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const latestPayments = async (req, res) => {
  const result = await service.getLatestPayments(req.query, req.user, req.roles);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const regions = async (req, res) => {
  const result = await service.getRegionSummaries(req.query);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const officers = async (req, res) => {
  const result = await service.getOfficerPerformance(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

module.exports = { overview, dailyPayments, latestPayments, regions, officers };
