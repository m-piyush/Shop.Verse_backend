import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './admin.controller';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUser);
router.put('/users/:id/status', [body('isActive').isBoolean()], ctrl.updateUserStatus);
router.put('/users/:id/reset-password', [body('newPassword').isString().isLength({ min: 6 })], ctrl.resetUserPassword);

router.get('/admins', ctrl.getAdmins);
router.post('/admins', ctrl.createAdmin);
router.delete('/admins/:id', ctrl.removeAdmin);

export default router;
