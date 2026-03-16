import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../../config/prisma';
import config from '../../config';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

const getRazorpay = () => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw ApiError.badRequest('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  }
  return new (Razorpay as any)({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
};

export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user!.id) throw ApiError.forbidden('Access denied');
  if (order.payment?.status === 'COMPLETED') throw ApiError.badRequest('Payment already completed');

  const razorpay = getRazorpay();
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(Number(order.total) * 100), // amount in paise
    currency: 'INR',
    receipt: order.orderNumber,
  });

  await prisma.payment.update({
    where: { orderId: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  sendResponse(res, {
    data: {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: config.razorpay.keyId,
    },
  });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw ApiError.badRequest('Payment verification failed');
  }

  // Update payment and order
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!payment) throw ApiError.notFound('Payment record not found');

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'COMPLETED',
      },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'CONFIRMED' },
    }),
  ]);

  sendResponse(res, { message: 'Payment verified successfully' });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSecret = config.razorpay.keySecret;
  const signature = req.headers['x-razorpay-signature'] as string;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) {
    throw ApiError.badRequest('Invalid webhook signature');
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const razorpayOrderId = payload.payment.entity.order_id;
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    if (payment) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', razorpayPaymentId: payload.payment.entity.id },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'CONFIRMED' },
        }),
      ]);
    }
  }

  if (event === 'payment.failed') {
    const razorpayOrderId = payload.payment.entity.order_id;
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }
  }

  res.json({ status: 'ok' });
});
