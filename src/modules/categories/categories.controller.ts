import { Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const { active, parent } = req.query;

  const where: any = {};
  if (active === 'true') where.isActive = true;
  if (parent === 'root') where.parentId = null;
  else if (parent) where.parentId = parent as string;

  const categories = await prisma.category.findMany({
    where,
    include: {
      children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  sendResponse(res, { data: categories });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id as string },
    include: {
      parent: true,
      children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { products: true } },
    },
  });

  if (!category) throw ApiError.notFound('Category not found');
  sendResponse(res, { data: category });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, imageUrl, parentId, sortOrder } = req.body;
  const slug = slugify(name, { lower: true, strict: true });

  const category = await prisma.category.create({
    data: { name, slug, description, imageUrl, parentId, sortOrder: sortOrder || 0 },
  });

  sendResponse(res, { statusCode: 201, message: 'Category created', data: category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, imageUrl, parentId, sortOrder, isActive } = req.body;

  const data: any = {};
  if (name) { data.name = name; data.slug = slugify(name, { lower: true, strict: true }); }
  if (description !== undefined) data.description = description;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (parentId !== undefined) data.parentId = parentId;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (isActive !== undefined) data.isActive = isActive;

  const category = await prisma.category.update({
    where: { id: req.params.id as string },
    data,
  });

  sendResponse(res, { message: 'Category updated', data: category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.category.update({
    where: { id: req.params.id as string },
    data: { isActive: false },
  });

  sendResponse(res, { message: 'Category deleted' });
});
