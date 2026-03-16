import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { addressValidation } from '../../utils/validators';
import * as ctrl from './addresses.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.getAll);
router.post('/', addressValidation, ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.put('/:id/default', ctrl.setDefault);

export default router;
