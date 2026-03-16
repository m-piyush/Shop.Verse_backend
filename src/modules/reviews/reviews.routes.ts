import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { reviewValidation } from '../../utils/validators';
import * as ctrl from './reviews.controller';

const router = Router();

router.get('/product/:productId', ctrl.getProductReviews);
router.get('/can-review/:productId', authenticate, ctrl.canReview);
router.post('/', authenticate, reviewValidation, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
