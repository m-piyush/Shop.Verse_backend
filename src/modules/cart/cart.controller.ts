import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

const getOrCreateCart = async (userId: string) => {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
};

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await getOrCreateCart(req.user!.id);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        select: {
          id: true, name: true, slug: true, price: true, comparePrice: true,
          stock: true, isActive: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      variant: {
        select: { id: true, size: true, color: true, colorCode: true, imageUrl: true, stock: true, price: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const subtotal = items.reduce((sum, item) => {
    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  sendResponse(res, {
    data: {
      id: cart.id,
      items,
      itemCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
    },
  });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity = 1, variantId } = req.body;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { where: { isActive: true } } },
  });
  if (!product || !product.isActive) throw ApiError.notFound('Product not found');

  // If product has variants, require variantId
  if (product.variants.length > 0 && !variantId) {
    throw ApiError.badRequest('Please select a variant (size/color)');
  }

  // Check variant stock if provided
  let stockToCheck = product.stock;
  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw ApiError.badRequest('Invalid variant');
    stockToCheck = variant.stock;
  }
  if (stockToCheck < quantity) throw ApiError.badRequest('Insufficient stock');

  const cart = await getOrCreateCart(req.user!.id);

  // Find existing cart item with same product + variant combo
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId || null },
  });

  let item;
  if (existing) {
    const newQty = existing.quantity + quantity;
    if (stockToCheck < newQty) throw ApiError.badRequest('Insufficient stock');
    item = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
      include: { product: { select: { id: true, name: true, price: true } } },
    });
  } else {
    item = await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity, variantId: variantId || null },
      include: { product: { select: { id: true, name: true, price: true } } },
    });
  }

  sendResponse(res, { statusCode: 201, message: 'Item added to cart', data: item });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = req.body;
  const itemId = req.params.itemId as string;

  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, product: true },
  });

  if (!cartItem || cartItem.cart.userId !== req.user!.id) {
    throw ApiError.notFound('Cart item not found');
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    sendResponse(res, { message: 'Item removed from cart' });
    return;
  }

  if (cartItem.product.stock < quantity) {
    throw ApiError.badRequest('Insufficient stock');
  }

  const updated = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  sendResponse(res, { message: 'Cart updated', data: updated });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!cartItem || cartItem.cart.userId !== req.user!.id) {
    throw ApiError.notFound('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  sendResponse(res, { message: 'Item removed from cart' });
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  sendResponse(res, { message: 'Cart cleared' });
});
