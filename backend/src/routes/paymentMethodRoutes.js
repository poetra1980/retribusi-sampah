const express = require('express');

const ctrl = require('../controllers/paymentMethodController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listPaymentMethodsQuerySchema, createPaymentMethodSchema,
  updatePaymentMethodSchema, deactivatePaymentMethodSchema
} = require('../validators/paymentValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listPaymentMethodsQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));

router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createPaymentMethodSchema), asyncHandler(ctrl.create));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updatePaymentMethodSchema), asyncHandler(ctrl.update));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivatePaymentMethodSchema), asyncHandler(ctrl.deactivate));

module.exports = router;
