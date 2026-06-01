const express = require('express');

const officerController = require('../controllers/officerController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema,
  createOfficerSchema,
  updateOfficerSchema,
  deactivateOfficerSchema
} = require('../validators/officerValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(officerController.list));
router.get('/by-user/:userId', authenticateJwt, asyncHandler(officerController.getByUserId));
router.get('/:id', authenticateJwt, asyncHandler(officerController.getById));

router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createOfficerSchema), asyncHandler(officerController.create));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateOfficerSchema), asyncHandler(officerController.update));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivateOfficerSchema), asyncHandler(officerController.deactivate));
router.get('/:id/payments', authenticateJwt, asyncHandler(officerController.getPayments));

module.exports = router;
