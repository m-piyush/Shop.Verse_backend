import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import asyncHandler from '../../utils/asyncHandler';
import { sendResponse } from '../../utils/apiResponse';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers, totalOrders, totalProducts, revenueResult, ordersByStatus, topProducts, recentOrders] =
    await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { soldCount: 'desc' },
        take: 5,
        select: { id: true, name: true, slug: true, price: true, soldCount: true, stock: true,
          images: { where: { isPrimary: true }, take: 1 } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
          payment: { select: { status: true } },
        },
      }),
    ]);

  // Revenue last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentRevenue = await prisma.order.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
    },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dailyRevenue: Record<string, number> = {};
  recentRevenue.forEach((order) => {
    const date = order.createdAt.toISOString().split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.total);
  });

  // Low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: { isActive: true, stock: { lte: 5 } },
    select: { id: true, name: true, stock: true, lowStockThreshold: true },
    take: 10,
    orderBy: { stock: 'asc' },
  });

  sendResponse(res, {
    data: {
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: Number(revenueResult._sum.total) || 0,
      },
      ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count })),
      topProducts,
      recentOrders,
      dailyRevenue,
      lowStockProducts,
    },
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        isActive: true, createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  sendResponse(res, { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id as string },
    select: {
      id: true, name: true, email: true, role: true, phone: true,
      isActive: true, createdAt: true, avatarUrl: true,
      addresses: true,
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
      },
      _count: { select: { orders: true, reviews: true } },
    },
  });

  if (!user) throw ApiError.notFound('User not found');
  sendResponse(res, { data: user });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body;

  const user = await prisma.user.update({
    where: { id: req.params.id as string },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  sendResponse(res, { message: `User ${isActive ? 'activated' : 'deactivated'}`, data: user });
});
