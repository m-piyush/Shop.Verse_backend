import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './payments.controller';

const router = Router();

router.post('/create-order', authenticate, [body('orderId').isUUID()], ctrl.createRazorpayOrder);
router.post('/verify', authenticate, [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
], ctrl.verifyPayment);
router.post('/webhook', ctrl.webhook);

export default router;
