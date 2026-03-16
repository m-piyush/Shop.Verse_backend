import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './orders.controller';

const router = Router();

router.use(authenticate);

router.post('/', [body('shippingAddress').isObject().withMessage('Shipping address is required')], ctrl.create);
router.get('/', ctrl.getAll);
router.get('/admin/all', authorize('ADMIN'), ctrl.getAllAdmin);
router.get('/:id', ctrl.getById);
router.put('/:id/cancel', [body('reason').optional().trim()], ctrl.cancel);
router.put('/:id/return', [
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('type').isIn(['RETURN', 'EXCHANGE']).withMessage('Type must be RETURN or EXCHANGE'),
], ctrl.requestReturn);
router.put('/:id/status', authorize('ADMIN'), [body('status').notEmpty()], ctrl.updateStatus);

export default router;
