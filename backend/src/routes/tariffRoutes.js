const express = require('express');

const ctrl = require('../controllers/tariffController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema, createSchema, updateSchema, deactivateSchema, listHistoriesQuerySchema
} = require('../validators/tariffValidator');

const router = express.Router();

router.use(authenticateJwt, authorizeRole('admin'));

router.get('/', validateRequest(listQuerySchema, 'query'), asyncHandler(ctrl.list));
router.post('/', validateRequest(createSchema), asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.getById));
router.patch('/:id', validateRequest(updateSchema), asyncHandler(ctrl.update));
router.post('/:id/deactivate', validateRequest(deactivateSchema), asyncHandler(ctrl.deactivate));
router.get('/:id/histories', validateRequest(listHistoriesQuerySchema, 'query'), asyncHandler(ctrl.getHistories));

module.exports = router;
