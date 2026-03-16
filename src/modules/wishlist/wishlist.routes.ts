import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './wishlist.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getWishlist);
router.post('/', [body('productId').isUUID()], ctrl.addItem);
router.delete('/:productId', ctrl.removeItem);
router.post('/toggle', [body('productId').isUUID()], ctrl.toggle);

export default router;
