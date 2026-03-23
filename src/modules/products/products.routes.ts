import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { productCreateValidation } from '../../utils/validators';
import * as ctrl from './products.controller';

const router = Router();

router.get('/', ctrl.getAll);
router.get('/:slug', ctrl.getBySlug);

router.post('/', authenticate, authorize('ADMIN'), productCreateValidation, ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.remove);

router.post('/:id/images', authenticate, authorize('ADMIN'), ctrl.addImages);
router.delete('/images/:imageId', authenticate, authorize('ADMIN'), ctrl.removeImage);

router.get('/:id/variants', ctrl.getVariants);
router.post('/:id/variants', authenticate, authorize('ADMIN'), ctrl.addVariant);
router.put('/variants/:variantId', authenticate, authorize('ADMIN'), ctrl.updateVariant);
router.delete('/variants/:variantId', authenticate, authorize('ADMIN'), ctrl.removeVariant);

export default router;
