import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

const updateProductRating = async (productId: string) => {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.product.update({
    where: { id: productId },
    data: { avgRating: agg._avg.rating || 0, reviewCount: agg._count },
  });
};

// GET reviews for a product (public)
export const getProductReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sort = req.query.sort as string;

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'highest') orderBy = { rating: 'desc' };
  if (sort === 'lowest') orderBy = { rating: 'asc' };
  if (sort === 'images') orderBy = { createdAt: 'desc' }; // filter below

  const where: any = { productId: req.params.productId as string };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  // Rating distribution
  const distribution = await prisma.review.groupBy({
    by: ['rating'],
    where,
    _count: true,
  });

  // Average rating
  const avgRating = await prisma.review.aggregate({
    where,
    _avg: { rating: true },
  });

  sendResponse(res, {
    data: reviews,
    meta: {
      page, limit, total, totalPages: Math.ceil(total / limit),
      avgRating: avgRating._avg.rating || 0,
      distribution: distribution.map((d) => ({ rating: d.rating, count: d._count })),
    },
  });
});

// CREATE review — ONLY if user has a DELIVERED order containing this product
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { productId, rating, title, comment, images } = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw ApiError.notFound('Product not found');

  // Check if user already reviewed
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId } },
  });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  // Check if user has purchased AND received this product
  const deliveredOrder = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: req.user!.id,
        status: { in: ['DELIVERED', 'RETURN_REQUESTED', 'EXCHANGE_REQUESTED'] as any },
      },
    },
    include: { order: { select: { id: true } } },
  });

  if (!deliveredOrder) {
    throw ApiError.forbidden('You can only review products you have purchased and received');
  }

  const review = await prisma.review.create({
    data: {
      userId: req.user!.id,
      productId,
      orderId: deliveredOrder.order.id,
      rating,
      title: title || undefined,
      comment: comment || undefined,
      images: images || [],
      isVerified: true,
    } as any,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await updateProductRating(productId);

  sendResponse(res, { statusCode: 201, message: 'Review submitted!', data: review });
});

// UPDATE own review
export const update = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.userId !== req.user!.id) throw ApiError.forbidden('Access denied');

  const { rating, title, comment, images } = req.body;

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(rating && { rating }),
      ...(title !== undefined && { title }),
      ...(comment !== undefined && { comment }),
      ...(images !== undefined && { images }),
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await updateProductRating(review.productId);
  sendResponse(res, { message: 'Review updated', data: updated });
});

// DELETE own review (or admin)
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw ApiError.notFound('Review not found');
  if (review.userId !== req.user!.id && req.user!.role !== 'ADMIN') throw ApiError.forbidden('Access denied');

  await prisma.review.delete({ where: { id: reviewId } });
  await updateProductRating(review.productId);

  sendResponse(res, { message: 'Review deleted' });
});

// Check if user can review a product
export const canReview = asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;

  // Check if already reviewed
  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: req.user!.id, productId } },
  });

  if (existing) {
    sendResponse(res, { data: { canReview: false, reason: 'already_reviewed', existingReview: existing } });
    return;
  }

  // Check if has a delivered order with this product
  const deliveredOrder = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId: req.user!.id,
        status: { in: ['DELIVERED', 'RETURN_REQUESTED', 'EXCHANGE_REQUESTED'] as any },
      },
    },
  });

  if (!deliveredOrder) {
    sendResponse(res, { data: { canReview: false, reason: 'not_purchased' } });
    return;
  }

  sendResponse(res, { data: { canReview: true } });
});
