const express = require('express');

const ctrl = require('../controllers/auditLogController');
const { authenticateJwt } = require('../middlewares/authMiddleware');
const authorizeRole = require('../middlewares/authorizeRole');
const validateRequest = require('../middlewares/validateRequest');
const asyncHandler = require('../utils/asyncHandler');
const { listSchema, idSchema, entityListSchema } = require('../validators/auditLogValidator');

const router = express.Router();

router.use(authenticateJwt, authorizeRole('admin'));

const validateEntityQuery = (req, res, next) => {
  const { error: paramsError, value: paramsValue } = entityListSchema.validate(
    { ...req.params, ...req.query },
    { abortEarly: false, allowUnknown: false, stripUnknown: true }
  );
  if (paramsError) {
    const details = paramsError.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return next(new (require('../utils/AppError'))('Invalid request', 400, 'VALIDATION_ERROR', details));
  }
  req.query = paramsValue;
  next();
};

router.get('/', validateRequest(listSchema, 'query'), asyncHandler(ctrl.list));
router.get('/entity/:entityTable/:entityId', validateEntityQuery, asyncHandler(ctrl.getByEntity));
router.get('/:id', validateRequest(idSchema, 'params'), asyncHandler(ctrl.getById));

module.exports = router;
