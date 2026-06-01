const express = require('express');

const ctrl = require('../controllers/billController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema, generateSchema, listBatchesQuerySchema,
  cancelBillSchema, listPaymentsQuerySchema
} = require('../validators/billValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));

router.post('/generate', authenticateJwt, authorizeRole('admin'), validateRequest(generateSchema), asyncHandler(ctrl.generate));
router.get('/generation-batches', authenticateJwt, authorizeRole('admin'), validateRequest(listBatchesQuerySchema, 'query'), asyncHandler(ctrl.listBatches));
router.get('/generation-batches/:id', authenticateJwt, authorizeRole('admin'), asyncHandler(ctrl.getBatchById));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));
router.post('/:id/cancel', authenticateJwt, authorizeRole('admin'), validateRequest(cancelBillSchema), asyncHandler(ctrl.cancel));
router.get('/:id/payments', authenticateJwt, validateRequest(listPaymentsQuerySchema, 'query'), asyncHandler(ctrl.getPayments));

module.exports = router;
