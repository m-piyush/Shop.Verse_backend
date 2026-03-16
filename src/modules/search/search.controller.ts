import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { isActive: true };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { shortDescription: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (req.query.category) {
    const cat = await prisma.category.findUnique({ where: { slug: req.query.category as string } });
    if (cat) where.categoryId = cat.id;
  }
  if (req.query.brand) {
    const brand = await prisma.brand.findUnique({ where: { slug: req.query.brand as string } });
    if (brand) where.brandId = brand.id;
  }
  if (req.query.minPrice || req.query.maxPrice) {
    where.price = {};
    if (req.query.minPrice) where.price.gte = parseFloat(req.query.minPrice as string);
    if (req.query.maxPrice) where.price.lte = parseFloat(req.query.maxPrice as string);
  }
  if (req.query.rating) {
    where.avgRating = { gte: parseFloat(req.query.rating as string) };
  }

  let orderBy: any = { soldCount: 'desc' };
  switch (req.query.sort) {
    case 'price_asc': orderBy = { price: 'asc' }; break;
    case 'price_desc': orderBy = { price: 'desc' }; break;
    case 'newest': orderBy = { createdAt: 'desc' }; break;
    case 'rating': orderBy = { avgRating: 'desc' }; break;
    case 'popular': orderBy = { soldCount: 'desc' }; break;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  sendResponse(res, {
    data: products,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), query: q },
  });
});

export const suggestions = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q || q.length < 2) {
    sendResponse(res, { data: { categories: [], brands: [], products: [] } });
    return;
  }

  const [categories, brands, products] = await Promise.all([
    // Match categories
    prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { name: true, slug: true, _count: { select: { products: true } } },
      take: 4,
    }),
    // Match brands
    prisma.brand.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
      },
      select: { name: true, slug: true, _count: { select: { products: true } } },
      take: 4,
    }),
    // Match products
    prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { shortDescription: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        name: true, slug: true, price: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        brand: { select: { name: true } },
      },
      take: 6,
      orderBy: { soldCount: 'desc' },
    }),
  ]);

  sendResponse(res, {
    data: { categories, brands, products },
  });
});
