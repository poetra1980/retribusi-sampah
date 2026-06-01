const repo = require('../repositories/dashboardRepository');

const getOverview = async (query) => {
  return repo.getOverview(query);
};

const getDailyPayments = async (query) => {
  return repo.getDailyPayments(query);
};

const getLatestPayments = async (query, currentUser, userRoles) => {
  const effectiveQuery = { ...query };

  if (userRoles && userRoles.includes('petugas') && !userRoles.includes('admin')) {
    effectiveQuery.officerId = currentUser.id;
  }

  return repo.getLatestPayments(effectiveQuery);
};

const getRegionSummaries = async (query) => {
  return repo.getRegionSummaries(query);
};

const getOfficerPerformance = async (query) => {
  const { officers, nextCursor } = await repo.getOfficerPerformance(query);

  return { data: officers, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

module.exports = { getOverview, getDailyPayments, getLatestPayments, getRegionSummaries, getOfficerPerformance };
