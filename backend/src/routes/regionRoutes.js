const express = require('express');

const regionController = require('../controllers/regionController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema,
  treeQuerySchema,
  createRegionSchema,
  updateRegionSchema,
  deactivateRegionSchema
} = require('../validators/regionValidator');

const router = express.Router();

router.get('/', authenticateJwt, validateRequest(listQuerySchema, 'query'), asyncHandler(regionController.list));
router.get('/tree', authenticateJwt, validateRequest(treeQuerySchema, 'query'), asyncHandler(regionController.getTree));
router.get('/:id', authenticateJwt, asyncHandler(regionController.getById));

router.post('/', authenticateJwt, authorizeRole('admin'), validateRequest(createRegionSchema), asyncHandler(regionController.create));
router.patch('/:id', authenticateJwt, authorizeRole('admin'), validateRequest(updateRegionSchema), asyncHandler(regionController.update));
router.post('/:id/deactivate', authenticateJwt, authorizeRole('admin'), validateRequest(deactivateRegionSchema), asyncHandler(regionController.deactivate));

module.exports = router;
