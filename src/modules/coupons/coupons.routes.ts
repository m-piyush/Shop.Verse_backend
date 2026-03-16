import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth';
import { couponValidation } from '../../utils/validators';
import * as ctrl from './coupons.controller';

const router = Router();

router.post('/validate', authenticate, [body('code').trim().notEmpty(), body('orderAmount').isFloat({ min: 0 })], ctrl.validate);

router.get('/', authenticate, authorize('ADMIN'), ctrl.getAll);
router.post('/', authenticate, authorize('ADMIN'), couponValidation, ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.remove);

export default router;
