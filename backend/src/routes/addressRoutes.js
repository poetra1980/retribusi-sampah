const express = require('express');

const ctrl = require('../controllers/addressController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const { updateAddressSchema, deactivateAddressSchema } = require('../validators/addressValidator');

const router = express.Router();

router.get('/:id', authenticateJwt, asyncHandler(ctrl.getById));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateAddressSchema), asyncHandler(ctrl.update));
router.post('/:id/set-primary', authenticateJwt, authorizeRole('admin'), asyncHandler(ctrl.setPrimary));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivateAddressSchema), asyncHandler(ctrl.deactivate));

module.exports = router;
