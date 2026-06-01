const express = require('express');

const ctrl = require('../controllers/customerCategoryController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const { listQuerySchema, createSchema, updateSchema, deactivateSchema } = require('../validators/customerCategoryValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));

router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createSchema), asyncHandler(ctrl.create));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateSchema), asyncHandler(ctrl.update));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivateSchema), asyncHandler(ctrl.deactivate));

module.exports = router;
