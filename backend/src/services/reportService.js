const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const repo = require('../repositories/reportRepository');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const getDailyPayments = async (query) => {
  const { payments, nextCursor } = await repo.getDailyPayments(query);
  return { data: payments, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getMonthlyPayments = async (query) => {
  const { payments, nextCursor } = await repo.getMonthlyPayments(query);
  return { data: payments, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getYearlyPayments = async (query) => {
  const { payments, nextCursor } = await repo.getYearlyPayments(query);
  return { data: payments, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getArrears = async (query) => {
  const { arrears, nextCursor } = await repo.getArrears(query);
  return { data: arrears, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getCollectionRate = async (query) => {
  return repo.getCollectionRate(query);
};

const getOfficerPerformance = async (query) => {
  const { officers, nextCursor } = await repo.getOfficerPerformance(query);
  return { data: officers, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const EXPORTS_DIR = path.resolve(__dirname, '../../exports');

const fetchExportData = async (reportType, params) => {
  switch (reportType) {
    case 'payments_daily': {
      const { payments } = await repo.getDailyPayments({ ...params, limit: 100000 });
      return payments;
    }
    case 'payments_monthly': {
      const { payments } = await repo.getMonthlyPayments({ ...params, limit: 100000 });
      return payments;
    }
    case 'payments_yearly': {
      const { payments } = await repo.getYearlyPayments({ ...params, limit: 100000 });
      return payments;
    }
    case 'arrears': {
      const { arrears } = await repo.getArrears({ ...params, limit: 100000 });
      return arrears;
    }
    case 'collection-rate': {
      const data = await repo.getCollectionRate(params);
      return data ? [data] : [];
    }
    case 'officer-performance': {
      const { officers } = await repo.getOfficerPerformance({ ...params, limit: 100000 });
      return officers;
    }
    default:
      throw new AppError('Invalid report type', 400, 'INVALID_REPORT_TYPE');
  }
};

const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.map(escapeCsv).join(',');
  const body = rows.map((r) => keys.map((k) => escapeCsv(formatValue(r[k]))).join(','));
  return [header, ...body].join('\r\n');
};

const escapeCsv = (val) => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const formatValue = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
};

const createExport = async (body, currentUser, context) => {
  const { reportType, format = 'csv', parameters } = body;

  const id = randomUUID();
  const job = await repo.createExportJob({ id, requestedBy: currentUser.id, reportType, parameters });

  try {
    await repo.updateExportJob(id, { status: 'processing', startedAt: new Date().toISOString() });

    const rows = await fetchExportData(reportType, parameters || {});
    const rowCount = rows.length;
    const csv = toCsv(rows);

    if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

    const filename = `${reportType}_${id.slice(0, 8)}.${format}`;
    const filePath = path.join(EXPORTS_DIR, filename);
    fs.writeFileSync(filePath, csv, 'utf8');

    const fileUrl = `/exports/${filename}`;

    await repo.updateExportJob(id, {
      status: 'completed',
      file_url: fileUrl,
      rowCount,
      finishedAt: new Date().toISOString()
    });
  } catch (err) {
    await repo.updateExportJob(id, {
      status: 'failed',
      errorMessage: err.message,
      finishedAt: new Date().toISOString()
    });
  }

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'report.export_requested', entityTable: 'export_jobs', entityId: id,
    newValues: { reportType, format, parameters },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  const updatedJob = await repo.findExportJobById(id);
  return { id: updatedJob.id, status: updatedJob.status, reportType, format, rowCount: updatedJob.row_count, fileUrl: updatedJob.file_url };
};

const listExports = async (query) => {
  const { jobs, nextCursor } = await repo.findExportJobs(query);
  return { data: jobs, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getExportById = async (id) => {
  const job = await repo.findExportJobById(id);
  if (!job) throw new AppError('Export job not found', 404, 'EXPORT_JOB_NOT_FOUND');
  return job;
};

const downloadExport = async (id) => {
  const job = await repo.findExportJobById(id);
  if (!job) throw new AppError('Export job not found', 404, 'EXPORT_JOB_NOT_FOUND');
  if (job.status !== 'completed') throw new AppError('Export is not ready yet', 422, 'EXPORT_NOT_READY');
  if (!job.file_url) throw new AppError('Export file not available', 404, 'EXPORT_FILE_NOT_FOUND');

  return { fileUrl: job.file_url, reportType: job.report_type };
};

module.exports = {
  getRequestContext,
  getDailyPayments, getMonthlyPayments, getYearlyPayments,
  getArrears, getCollectionRate, getOfficerPerformance,
  createExport, listExports, getExportById, downloadExport
};
