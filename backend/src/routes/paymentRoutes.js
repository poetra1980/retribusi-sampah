const express = require('express');

const ctrl = require('../controllers/paymentController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const { listQuerySchema, createSchema, voidSchema } = require('../validators/paymentValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.post('/', authenticateJwt, validateRequest(createSchema), asyncHandler(ctrl.create));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));
router.post('/:id/void', authenticateJwt, authorizeRole('admin'), validateRequest(voidSchema), asyncHandler(ctrl.voidPayment));
router.get('/:id/receipt', authenticateJwt, asyncHandler(ctrl.getReceipt));
router.get('/:id/allocations', authenticateJwt, asyncHandler(ctrl.getAllocations));

module.exports = router;
