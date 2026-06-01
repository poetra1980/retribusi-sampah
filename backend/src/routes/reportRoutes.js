const express = require('express');

const ctrl = require('../controllers/reportController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  dailySchema, monthlySchema, yearlySchema, arrearsSchema,
  collectionRateSchema, officerPerformanceSchema,
  createExportSchema, listExportsQuerySchema
} = require('../validators/reportValidator');

const router = express.Router();

router.use(authenticateJwt, authorizeRole('admin'));

router.get('/payments/daily', validateRequest(dailySchema, 'query'), asyncHandler(ctrl.getDailyPayments));
router.get('/payments/monthly', validateRequest(monthlySchema, 'query'), asyncHandler(ctrl.getMonthlyPayments));
router.get('/payments/yearly', validateRequest(yearlySchema, 'query'), asyncHandler(ctrl.getYearlyPayments));
router.get('/arrears', validateRequest(arrearsSchema, 'query'), asyncHandler(ctrl.getArrears));
router.get('/collection-rate', validateRequest(collectionRateSchema, 'query'), asyncHandler(ctrl.getCollectionRate));
router.get('/officer-performance', validateRequest(officerPerformanceSchema, 'query'), asyncHandler(ctrl.getOfficerPerformance));
router.post('/exports', validateRequest(createExportSchema), asyncHandler(ctrl.createExport));
router.get('/exports', validateRequest(listExportsQuerySchema, 'query'), asyncHandler(ctrl.listExports));
router.get('/exports/:id', asyncHandler(ctrl.getExportById));
router.get('/exports/:id/download', asyncHandler(ctrl.downloadExport));

module.exports = router;
