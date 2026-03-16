import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const validate = asyncHandler(async (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon || !coupon.isActive) throw ApiError.notFound('Invalid coupon code');

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    throw ApiError.badRequest('Coupon has expired');
  }
  if (coupon.startsAt && new Date() < coupon.startsAt) {
    throw ApiError.badRequest('Coupon is not yet active');
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest('Coupon usage limit reached');
  }
  if (orderAmount < Number(coupon.minOrderAmount)) {
    throw ApiError.badRequest(`Minimum order amount is ₹${coupon.minOrderAmount}`);
  }

  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = (orderAmount * Number(coupon.value)) / 100;
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
  } else {
    discount = Number(coupon.value);
  }

  sendResponse(res, {
    data: { couponId: coupon.id, code: coupon.code, type: coupon.type, discount: Math.round(discount * 100) / 100 },
  });
});

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const [coupons, total] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.coupon.count(),
  ]);

  sendResponse(res, { data: coupons, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body, code: req.body.code.toUpperCase() };
  const coupon = await prisma.coupon.create({ data });
  sendResponse(res, { statusCode: 201, message: 'Coupon created', data: coupon });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = { ...req.body };
  if (data.code) data.code = data.code.toUpperCase();
  const coupon = await prisma.coupon.update({ where: { id: req.params.id as string }, data });
  sendResponse(res, { message: 'Coupon updated', data: coupon });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.coupon.delete({ where: { id: req.params.id as string } });
  sendResponse(res, { message: 'Coupon deleted' });
});
