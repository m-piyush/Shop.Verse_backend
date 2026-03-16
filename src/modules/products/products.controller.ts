import { Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { isActive: true };

  // Filters
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
  if (req.query.featured === 'true') where.isFeatured = true;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search as string, mode: 'insensitive' } },
      { description: { contains: req.query.search as string, mode: 'insensitive' } },
    ];
  }

  // Sorting
  let orderBy: any = { createdAt: 'desc' };
  switch (req.query.sort) {
    case 'price_asc': orderBy = { price: 'asc' }; break;
    case 'price_desc': orderBy = { price: 'desc' }; break;
    case 'newest': orderBy = { createdAt: 'desc' }; break;
    case 'popular': orderBy = { soldCount: 'desc' }; break;
    case 'rating': orderBy = { avgRating: 'desc' }; break;
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
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug as string },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      reviews: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  if (!product || !product.isActive) throw ApiError.notFound('Product not found');
  sendResponse(res, { data: product });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, shortDescription, price, comparePrice, costPrice, sku,
    stock, categoryId, brandId, isFeatured, weight, attributes, lowStockThreshold } = req.body;

  const slug = slugify(name, { lower: true, strict: true }) + '-' + Date.now().toString(36);

  const product = await prisma.product.create({
    data: {
      name, slug, description, shortDescription, price, comparePrice, costPrice,
      sku, stock: stock || 0, categoryId, brandId, isFeatured: isFeatured || false,
      weight, attributes: attributes || {}, lowStockThreshold: lowStockThreshold || 5,
    },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
  });

  sendResponse(res, { statusCode: 201, message: 'Product created', data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id as string } });
  if (!existing) throw ApiError.notFound('Product not found');

  const data: any = { ...req.body };
  if (data.name && data.name !== existing.name) {
    data.slug = slugify(data.name, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  delete data.id;

  const product = await prisma.product.update({
    where: { id: req.params.id as string },
    data,
    include: {
      images: true,
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
    },
  });

  sendResponse(res, { message: 'Product updated', data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.product.update({
    where: { id: req.params.id as string },
    data: { isActive: false },
  });
  sendResponse(res, { message: 'Product deleted' });
});

export const addImages = asyncHandler(async (req: Request, res: Response) => {
  const { images } = req.body; // [{ url, altText, isPrimary, sortOrder }]

  const product = await prisma.product.findUnique({ where: { id: req.params.id as string } });
  if (!product) throw ApiError.notFound('Product not found');

  const created = await prisma.productImage.createMany({
    data: images.map((img: any, index: number) => ({
      productId: product.id,
      url: img.url,
      altText: img.altText || product.name,
      isPrimary: img.isPrimary || false,
      sortOrder: img.sortOrder ?? index,
    })),
  });

  sendResponse(res, { statusCode: 201, message: 'Images added', data: { count: created.count } });
});

export const removeImage = asyncHandler(async (req: Request, res: Response) => {
  await prisma.productImage.delete({ where: { id: req.params.imageId as string } });
  sendResponse(res, { message: 'Image removed' });
});
