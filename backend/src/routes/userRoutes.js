const express = require('express');

const userController = require('../controllers/userController');
const roleController = require('../controllers/roleController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  listQuerySchema,
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  resetPasswordSchema
} = require('../validators/userValidator');
const { updateUserRolesSchema } = require('../validators/roleValidator');

const router = express.Router();

router.use(authenticateJwt, authorizeRole('admin'));

router.get('/', validateRequest(listQuerySchema, 'query'), asyncHandler(userController.list));
router.post('/', validateRequest(createUserSchema), asyncHandler(userController.create));
router.get('/:id', asyncHandler(userController.getById));
router.patch('/:id', validateRequest(updateUserSchema), asyncHandler(userController.update));
router.put('/:id/roles', validateRequest(updateUserRolesSchema), asyncHandler(roleController.updateUserRoles));
router.post('/:id/deactivate', validateRequest(deactivateUserSchema), asyncHandler(userController.deactivate));
router.post('/:id/reset-password', validateRequest(resetPasswordSchema), asyncHandler(userController.resetPassword));

module.exports = router;
