import { Request, Response } from 'express';
import slugify from 'slugify';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  sendResponse(res, { data: brands });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const brand = await prisma.brand.findUnique({
    where: { id: req.params.id as string },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw ApiError.notFound('Brand not found');
  sendResponse(res, { data: brand });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, logoUrl } = req.body;
  const slug = slugify(name, { lower: true, strict: true });
  const brand = await prisma.brand.create({ data: { name, slug, logoUrl } });
  sendResponse(res, { statusCode: 201, message: 'Brand created', data: brand });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { name, logoUrl, isActive } = req.body;
  const data: any = {};
  if (name) { data.name = name; data.slug = slugify(name, { lower: true, strict: true }); }
  if (logoUrl !== undefined) data.logoUrl = logoUrl;
  if (isActive !== undefined) data.isActive = isActive;

  const brand = await prisma.brand.update({ where: { id: req.params.id as string }, data });
  sendResponse(res, { message: 'Brand updated', data: brand });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await prisma.brand.update({ where: { id: req.params.id as string }, data: { isActive: false } });
  sendResponse(res, { message: 'Brand deleted' });
});
