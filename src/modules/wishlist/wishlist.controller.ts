import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user!.id },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true, comparePrice: true,
          stock: true, isActive: true, avgRating: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendResponse(res, { data: items });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId } },
  });
  if (existing) throw ApiError.conflict('Product already in wishlist');

  const item = await prisma.wishlist.create({
    data: { userId: req.user!.id, productId },
  });

  sendResponse(res, { statusCode: 201, message: 'Added to wishlist', data: item });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  await prisma.wishlist.deleteMany({
    where: { userId: req.user!.id, productId: req.params.productId as string },
  });
  sendResponse(res, { message: 'Removed from wishlist' });
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body;

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    sendResponse(res, { message: 'Removed from wishlist', data: { wishlisted: false } });
  } else {
    await prisma.wishlist.create({ data: { userId: req.user!.id, productId } });
    sendResponse(res, { message: 'Added to wishlist', data: { wishlisted: true } });
  }
});
