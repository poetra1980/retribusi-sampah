const express = require('express');

const authController = require('../controllers/authController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema
} = require('../validators/authValidator');

const router = express.Router();

router.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(authController.refreshToken));
router.post('/logout', authenticateJwt, validateRequest(logoutSchema), asyncHandler(authController.logout));
router.get('/me', authenticateJwt, asyncHandler(authController.me));
router.post(
  '/change-password',
  authenticateJwt,
  validateRequest(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

module.exports = router;
