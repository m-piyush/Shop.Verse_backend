import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  sendResponse(res, { data: addresses });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, label, isDefault } = req.body;

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({
    data: { userId: req.user!.id, fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, label, isDefault: isDefault || false },
  });

  sendResponse(res, { statusCode: 201, message: 'Address added', data: address });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const addressId = req.params.id as string;
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== req.user!.id) throw ApiError.notFound('Address not found');

  if (req.body.isDefault) {
    await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }

  const updated = await prisma.address.update({ where: { id: addressId }, data: req.body });
  sendResponse(res, { message: 'Address updated', data: updated });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const addressId = req.params.id as string;
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== req.user!.id) throw ApiError.notFound('Address not found');

  await prisma.address.delete({ where: { id: addressId } });
  sendResponse(res, { message: 'Address deleted' });
});

export const setDefault = asyncHandler(async (req: Request, res: Response) => {
  const addressId = req.params.id as string;
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== req.user!.id) throw ApiError.notFound('Address not found');

  await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });

  sendResponse(res, { message: 'Default address updated' });
});
