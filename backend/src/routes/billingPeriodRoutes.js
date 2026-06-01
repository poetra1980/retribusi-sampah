const express = require('express');

const ctrl = require('../controllers/billingPeriodController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema, createSchema, updateSchema, closeSchema, reopenSchema
} = require('../validators/billingPeriodValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));

router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createSchema), asyncHandler(ctrl.create));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateSchema), asyncHandler(ctrl.update));
router.post('/:id/close', authenticateJwt, authorizeRole('admin'), validateRequest(closeSchema), asyncHandler(ctrl.close));
router.post('/:id/reopen', authenticateJwt, authorizeRole('admin'), validateRequest(reopenSchema), asyncHandler(ctrl.reopen));

module.exports = router;
