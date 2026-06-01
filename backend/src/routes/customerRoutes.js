const express = require('express');

const ctrl = require('../controllers/customerController');
const addrCtrl = require('../controllers/addressController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema, createSchema, updateSchema, deactivateSchema,
  linkUserSchema, unlinkUserSchema, listBillsQuerySchema, listPaymentsQuerySchema
} = require('../validators/customerValidator');
const { createAddressSchema } = require('../validators/addressValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createSchema), asyncHandler(ctrl.create));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateSchema), asyncHandler(ctrl.update));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivateSchema), asyncHandler(ctrl.deactivate));
router.post('/:id/link-user', authenticateJwt, authorizeRole('admin'), validateRequest(linkUserSchema), asyncHandler(ctrl.linkUser));
router.post('/:id/unlink-user', authenticateJwt, authorizeRole('admin'), validateRequest(unlinkUserSchema), asyncHandler(ctrl.unlinkUser));
router.get('/:id/bills', authenticateJwt, validateRequest(listBillsQuerySchema, 'query'), asyncHandler(ctrl.getBills));
router.get('/:id/payments', authenticateJwt, validateRequest(listPaymentsQuerySchema, 'query'), asyncHandler(ctrl.getPayments));

router.get('/:customerId/addresses', authenticateJwt, asyncHandler(addrCtrl.listByCustomer));
router.post('/:customerId/addresses', authenticateJwt, authorizeRole('admin'), validateRequest(createAddressSchema), asyncHandler(addrCtrl.create));

module.exports = router;
