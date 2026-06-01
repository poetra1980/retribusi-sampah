const path = require('path');
const fs = require('fs');
const service = require('../services/reportService');

const buildContext = (req) => ({ ...service.getRequestContext(req), userRoles: req.roles });

const getDailyPayments = async (req, res) => {
  const result = await service.getDailyPayments(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getMonthlyPayments = async (req, res) => {
  const result = await service.getMonthlyPayments(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getYearlyPayments = async (req, res) => {
  const result = await service.getYearlyPayments(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getArrears = async (req, res) => {
  const result = await service.getArrears(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getCollectionRate = async (req, res) => {
  const result = await service.getCollectionRate(req.query);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const getOfficerPerformance = async (req, res) => {
  const result = await service.getOfficerPerformance(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const createExport = async (req, res) => {
  const result = await service.createExport(req.body, req.user, buildContext(req));
  res.status(202).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const listExports = async (req, res) => {
  const result = await service.listExports(req.query);
  res.status(200).json({ data: result.data, meta: { pagination: result.pagination, requestId: req.headers['x-request-id'] || null } });
};

const getExportById = async (req, res) => {
  const result = await service.getExportById(req.params.id);
  res.status(200).json({ data: result, meta: { requestId: req.headers['x-request-id'] || null } });
};

const downloadExport = async (req, res) => {
  const result = await service.downloadExport(req.params.id);
  const filePath = path.resolve(__dirname, '../../exports', path.basename(result.fileUrl));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'File tidak ditemukan' }, meta: { requestId: req.headers['x-request-id'] || null } });
  }
  const ext = path.extname(filePath).slice(1);
  const mime = ext === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
  res.sendFile(filePath);
};

module.exports = {
  getDailyPayments, getMonthlyPayments, getYearlyPayments,
  getArrears, getCollectionRate, getOfficerPerformance,
  createExport, listExports, getExportById, downloadExport
};
