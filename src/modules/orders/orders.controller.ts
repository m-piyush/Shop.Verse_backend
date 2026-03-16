import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';
import generateOrderNumber from '../../utils/generateOrderNumber';

// Helper: add a status entry to history
const addHistory = (existing: any[], status: string, note?: string) => {
  return [...(existing || []), { status, timestamp: new Date().toISOString(), note }];
};

// ─── CREATE ORDER ────────────────────────────────────────────────────────────

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { shippingAddress, couponCode, notes, paymentMethod } = req.body;
  const isCOD = paymentMethod === 'COD';

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Cart is empty');

  for (const item of cart.items) {
    if (!item.product.isActive) throw ApiError.badRequest(`${item.product.name} is no longer available`);
    if (item.product.stock < item.quantity) throw ApiError.badRequest(`Insufficient stock for ${item.product.name}`);
  }

  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  let discount = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (coupon && coupon.isActive) {
      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      } else {
        discount = Number(coupon.value);
      }
      couponId = coupon.id;
    }
  }

  const shippingFee = subtotal >= 500 ? 0 : 40;
  const taxableAmount = subtotal - discount;
  const tax = Math.round(taxableAmount * 0.18 * 100) / 100;
  const total = Math.round((taxableAmount + shippingFee + tax) * 100) / 100;

  const initialStatus = isCOD ? 'CONFIRMED' : 'PENDING';
  const statusHistory = isCOD
    ? [
        { status: 'PENDING', timestamp: new Date().toISOString(), note: 'Order placed' },
        { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'COD order auto-confirmed' },
      ]
    : [{ status: 'PENDING', timestamp: new Date().toISOString(), note: 'Order placed, awaiting payment' }];

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(), userId: req.user!.id, status: initialStatus,
        subtotal, discount, shippingFee, tax, total, couponId, shippingAddress, notes, statusHistory,
        items: {
          create: cart.items.map((item) => ({
            productId: item.product.id, productName: item.product.name,
            price: item.product.price, quantity: item.quantity,
            total: Number(item.product.price) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await tx.payment.create({
      data: { orderId: newOrder.id, amount: total, method: isCOD ? 'COD' : 'CARD', status: 'PENDING' },
    });

    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity }, soldCount: { increment: item.quantity } },
      });
    }

    if (couponId) await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return newOrder;
  });

  sendResponse(res, { statusCode: 201, message: 'Order placed successfully', data: order });
});

// ─── LIST ORDERS (CUSTOMER) ─────────────────────────────────────────────────

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  const where: any = { userId: req.user!.id };
  if (status) where.status = status.toUpperCase();

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { slug: true, images: { where: { isPrimary: true }, take: 1 } } } } },
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  sendResponse(res, { data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ─── GET ORDER DETAIL ───────────────────────────────────────────────────────

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: {
      items: { include: { product: { select: { slug: true, images: { where: { isPrimary: true }, take: 1 } } } } },
      payment: true,
      coupon: { select: { code: true, type: true, value: true } },
    },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') throw ApiError.forbidden('Access denied');

  sendResponse(res, { data: order });
});

// ─── CANCEL ORDER (CUSTOMER) ────────────────────────────────────────────────
// Allowed: PENDING, CONFIRMED, PROCESSING (before shipping)

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user!.id) throw ApiError.forbidden('Access denied');

  if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
    throw ApiError.badRequest('Order cannot be cancelled once it has been shipped');
  }

  const history = addHistory(order.statusHistory as any[], 'CANCELLED', reason || 'Cancelled by customer');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelReason: reason || 'Cancelled by customer', statusHistory: history },
    });
    await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: 'FAILED' } });

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity }, soldCount: { decrement: item.quantity } },
      });
    }
  });

  sendResponse(res, { message: 'Order cancelled successfully' });
});

// ─── REQUEST RETURN (CUSTOMER) ──────────────────────────────────────────────
// Only after DELIVERED, within 7 days

export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  const { reason, type } = req.body; // type: 'RETURN' or 'EXCHANGE'

  const order = await prisma.order.findUnique({ where: { id: req.params.id as string } });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.userId !== req.user!.id) throw ApiError.forbidden('Access denied');
  if (order.status !== 'DELIVERED') throw ApiError.badRequest('Only delivered orders can be returned or exchanged');

  // Check 7-day window
  const deliveredEntry = ((order.statusHistory as any[]) || []).find((h: any) => h.status === 'DELIVERED');
  if (deliveredEntry) {
    const days = (Date.now() - new Date(deliveredEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 7) throw ApiError.badRequest('Return/exchange window has expired (7 days from delivery)');
  }

  if (!reason) throw ApiError.badRequest('Please provide a reason');

  const retType = type === 'EXCHANGE' ? 'EXCHANGE' : 'RETURN';
  const newStatus = retType === 'EXCHANGE' ? 'EXCHANGE_REQUESTED' : 'RETURN_REQUESTED';
  const history = addHistory(order.statusHistory as any[], newStatus, `${retType} requested: ${reason}`);

  await prisma.order.update({
    where: { id: order.id },
    data: { status: newStatus as any, returnType: retType, returnReason: reason, statusHistory: history } as any,
  });

  sendResponse(res, {
    message: retType === 'EXCHANGE'
      ? 'Exchange request submitted. We will send the replacement first.'
      : 'Return request submitted. We will process it within 2-3 business days.',
  });
});

// ─── ADMIN: UPDATE STATUS ───────────────────────────────────────────────────

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: req.params.id as string },
    include: { items: true },
  });
  if (!order) throw ApiError.notFound('Order not found');

  const history = addHistory(order.statusHistory as any[], status, note || `Status updated to ${status}`);
  const updateData: any = { status: status as any, statusHistory: history };

  if (note) updateData.adminNote = note;

  // COD: mark payment completed when delivered (cash collected)
  if (status === 'DELIVERED') {
    await prisma.payment.updateMany({
      where: { orderId: order.id, method: 'COD', status: 'PENDING' },
      data: { status: 'COMPLETED' },
    });
  }

  // Handle stock restoration for returns/refunds
  const restoreStatuses = ['RETURNED', 'REFUNDED', 'CANCELLED'];
  const alreadyRestored = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);

  if (restoreStatuses.includes(status) && !alreadyRestored) {
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity }, soldCount: { decrement: item.quantity } },
      });
    }
  }

  if (status === 'REFUNDED') {
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: 'REFUNDED' } });
  }

  // For rejected returns/exchanges, revert to DELIVERED
  if (status === 'RETURN_REJECTED' || status === 'EXCHANGE_REJECTED') {
    updateData.adminNote = note || `${(order as any).returnType || 'Return'} request rejected`;
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id as string },
    data: updateData,
  });

  sendResponse(res, { message: 'Order status updated', data: updated });
});

// ─── ADMIN: LIST ALL ORDERS ─────────────────────────────────────────────────

export const getAllAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const where: any = {};
  if (status) where.status = status.toUpperCase();
  if (search) where.orderNumber = { contains: search, mode: 'insensitive' };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  sendResponse(res, { data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});
