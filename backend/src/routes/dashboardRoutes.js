const express = require('express');

const ctrl = require('../controllers/dashboardController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const { overviewSchema, dailySchema, latestSchema, regionsSchema, officersSchema } = require('../validators/dashboardValidator');

const router = express.Router();

router.get('/overview', authenticateJwt, authorizeRole('admin'), validateRequest(overviewSchema, 'query'), asyncHandler(ctrl.overview));
router.get('/payments/daily', authenticateJwt, authorizeRole('admin'), validateRequest(dailySchema, 'query'), asyncHandler(ctrl.dailyPayments));
router.get('/payments/latest', authenticateJwt, validateRequest(latestSchema, 'query'), asyncHandler(ctrl.latestPayments));
router.get('/regions', authenticateJwt, authorizeRole('admin'), validateRequest(regionsSchema, 'query'), asyncHandler(ctrl.regions));
router.get('/officers', authenticateJwt, authorizeRole('admin'), validateRequest(officersSchema, 'query'), asyncHandler(ctrl.officers));

module.exports = router;
