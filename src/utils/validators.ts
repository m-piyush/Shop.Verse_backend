import { body, query, param } from 'express-validator';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const productCreateValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  body('brandId').optional().isUUID().withMessage('Invalid brand ID'),
  body('description').optional().trim(),
  body('shortDescription').optional().trim(),
  body('comparePrice').optional().isFloat({ min: 0 }).withMessage('Compare price must be positive'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be positive'),
  body('sku').optional().trim(),
  body('lowStockThreshold').optional().isInt({ min: 0 }),
  body('isFeatured').optional().isBoolean(),
  body('weight').optional().isFloat({ min: 0 }),
  body('attributes').optional().isObject(),
];

export const productUpdateValidation = [
  param('id').isUUID().withMessage('Invalid product ID'),
  body('name').optional().trim().notEmpty().withMessage('Product name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('categoryId').optional().isUUID().withMessage('Invalid category ID'),
  body('brandId').optional().isUUID().withMessage('Invalid brand ID'),
];

export const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

export const uuidParam = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const reviewValidation = [
  body('productId').isUUID().withMessage('Invalid product ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().trim().isLength({ max: 255 }),
  body('comment').optional().trim(),
];

export const addressValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('addressLine2').optional().trim(),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
  body('country').optional().trim(),
  body('label').optional().trim(),
  body('isDefault').optional().isBoolean(),
];

export const couponValidation = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('type').isIn(['PERCENTAGE', 'FIXED']).withMessage('Type must be PERCENTAGE or FIXED'),
  body('value').isFloat({ min: 0 }).withMessage('Value must be positive'),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscount').optional().isFloat({ min: 0 }),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('startsAt').optional().isISO8601(),
  body('expiresAt').optional().isISO8601(),
];
