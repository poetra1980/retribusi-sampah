const express = require('express');

const roleController = require('../controllers/roleController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticateJwt, authorizeRole('admin'));

router.get('/', asyncHandler(roleController.list));
router.get('/:id', asyncHandler(roleController.getById));

module.exports = router;
