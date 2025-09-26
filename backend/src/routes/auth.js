const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('organization')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Organization name too long'),
  body('role')
    .optional()
    .isIn(['COMMUNITY', 'VERIFIER', 'ADMIN', 'OBSERVER'])
    .withMessage('Invalid role'),
  body('walletAddress')
    .optional()
    .isLength({ min: 42, max: 42 })
    .withMessage('Invalid wallet address')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }

  const { email, password, name, organization, role, walletAddress } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 400, 'USER_EXISTS');
  }

  // Check wallet address if provided
  if (walletAddress) {
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (existingWallet) {
      throw new AppError('User with this wallet address already exists', 400, 'WALLET_EXISTS');
    }
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      organization: organization || null,
      role: role || 'COMMUNITY',
      walletAddress: walletAddress || null
    },
    select: {
      id: true,
      email: true,
      name: true,
      organization: true,
      role: true,
      walletAddress: true,
      isEmailVerified: true,
      createdAt: true
    }
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log(`👤 New user registered: ${user.email} as ${user.role}`);

  res.status(201).json({
    message: 'User registered successfully',
    user,
    token
  });
}));

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Update last login (optional)
  await prisma.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() }
  });

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  console.log(`🔐 User logged in: ${user.email}`);

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
}));

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  // Get fresh user data with statistics
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      organization: true,
      role: true,
      walletAddress: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          submittedProjects: true,
          verifiedProjects: true,
          carbonCredits: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ user });
}));

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('organization')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Organization name too long'),
  body('walletAddress')
    .optional()
    .isLength({ min: 42, max: 42 })
    .withMessage('Invalid wallet address')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { name, organization, walletAddress } = req.body;
  const updateData = {};

  if (name) updateData.name = name;
  if (organization !== undefined) updateData.organization = organization;
  if (walletAddress) {
    // Check if wallet address is already taken
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress }
    });

    if (existingWallet && existingWallet.id !== req.user.id) {
      throw new AppError('Wallet address already in use', 400, 'WALLET_IN_USE');
    }
    
    updateData.walletAddress = walletAddress;
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      organization: true,
      role: true,
      walletAddress: true,
      isEmailVerified: true,
      updatedAt: true
    }
  });

  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  });
}));

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  
  if (!isValidPassword) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  res.json({ message: 'Password changed successfully' });
}));

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT implementation, logout is handled client-side
  // by removing the token from local storage
  res.json({ message: 'Logout successful' });
});

/**
 * GET /api/auth/users (Admin only)
 * Get all users
 */
router.get('/users', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
  }

  const { role, page = 1, limit = 20 } = req.query;
  const where = role ? { role } : {};
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        walletAddress: true,
        isEmailVerified: true,
        createdAt: true,
        _count: {
          select: {
            submittedProjects: true,
            verifiedProjects: true,
            carbonCredits: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

module.exports = router;