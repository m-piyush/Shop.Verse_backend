import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './cart.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getCart);
router.post('/items', [body('productId').isUUID(), body('quantity').optional().isInt({ min: 1 })], ctrl.addItem);
router.put('/items/:itemId', [body('quantity').isInt({ min: 0 })], ctrl.updateItem);
router.delete('/items/:itemId', ctrl.removeItem);
router.delete('/', ctrl.clearCart);

export default router;
