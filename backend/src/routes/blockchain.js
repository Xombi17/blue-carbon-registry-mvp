const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/blockchain/contracts
 * Get deployed contract addresses
 */
router.get('/contracts', asyncHandler(async (req, res) => {
  // In a real implementation, these would be stored in database or config
  const contracts = {
    registry: process.env.CARBON_REGISTRY_CONTRACT,
    credits: process.env.CARBON_CREDIT_CONTRACT,
    network: process.env.BLOCKCHAIN_NETWORK || 'mumbai',
    chainId: process.env.CHAIN_ID || '80001'
  };

  res.json({ contracts });
}));

/**
 * POST /api/blockchain/mint-credits
 * Mint carbon credits for a verified project (Admin only)
 */
router.post('/mint-credits', requireAdmin, [
  body('projectId').isUUID('4').withMessage('Valid project ID required'),
  body('carbonAmount').isInt({ min: 1 }).withMessage('Carbon amount must be positive'),
  body('vintageYear').isInt({ min: 2000, max: 2030 }).withMessage('Invalid vintage year'),
  body('recipientAddress').isLength({ min: 42, max: 42 }).withMessage('Invalid recipient address')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { 
    projectId, 
    carbonAmount, 
    vintageYear, 
    recipientAddress,
    certificationStandard = 'VCS'
  } = req.body;

  // Verify project exists and is verified
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      submitter: true,
      evidenceFiles: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.status !== 'VERIFIED') {
    throw new AppError('Project must be verified before minting credits', 400, 'PROJECT_NOT_VERIFIED');
  }

  // Check if credits already exist for this project
  const existingCredit = await prisma.carbonCredit.findFirst({
    where: { projectId }
  });

  if (existingCredit) {
    throw new AppError('Credits already exist for this project', 400, 'CREDITS_EXIST');
  }

  try {
    // In a real implementation, this would interact with smart contracts
    // For MVP, we'll simulate the minting process
    
    // Create carbon credit record
    const carbonCredit = await prisma.carbonCredit.create({
      data: {
        projectId,
        carbonAmount: parseInt(carbonAmount),
        vintageYear: parseInt(vintageYear),
        certificationStandard,
        ownerId: project.submitterId, // Initially owned by project submitter
        // tokenId would be set after actual blockchain minting
      },
      include: {
        project: {
          select: {
            name: true,
            ecosystemType: true,
            location: true
          }
        },
        owner: {
          select: {
            name: true,
            organization: true
          }
        }
      }
    });

    // Update project status to CREDITS_ISSUED
    await prisma.project.update({
      where: { id: projectId },
      data: { 
        status: 'CREDITS_ISSUED'
      }
    });

    // Log transaction (would be actual blockchain transaction)
    await prisma.creditTransaction.create({
      data: {
        creditId: carbonCredit.id,
        toAddress: recipientAddress,
        transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`, // Mock hash
        transactionType: 'MINT'
      }
    });

    console.log(`🪙 Carbon credits minted: ${carbonAmount} tons for project ${project.name}`);

    res.status(201).json({
      message: 'Carbon credits minted successfully',
      credit: carbonCredit,
      transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`
    });

  } catch (error) {
    console.error('Minting error:', error);
    throw new AppError('Failed to mint carbon credits', 500, 'MINTING_FAILED');
  }
}));

/**
 * GET /api/blockchain/transactions
 * Get transaction history
 */
router.get('/transactions', authenticateToken, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  
  const where = {};
  if (type) where.transactionType = type;
  
  // If not admin, only show user's transactions
  if (req.user.role !== 'ADMIN') {
    const userCredits = await prisma.carbonCredit.findMany({
      where: { ownerId: req.user.id },
      select: { id: true }
    });
    
    where.creditId = {
      in: userCredits.map(c => c.id)
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      include: {
        credit: {
          include: {
            project: {
              select: {
                name: true,
                ecosystemType: true,
                location: true
              }
            },
            owner: {
              select: {
                name: true,
                organization: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.creditTransaction.count({ where })
  ]);

  res.json({
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * POST /api/blockchain/retire-credit
 * Retire carbon credit
 */
router.post('/retire-credit', authenticateToken, [
  body('creditId').isUUID('4').withMessage('Valid credit ID required'),
  body('reason').isLength({ min: 10, max: 500 }).withMessage('Retirement reason required (10-500 chars)')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { creditId, reason } = req.body;

  // Find credit and verify ownership
  const credit = await prisma.carbonCredit.findUnique({
    where: { id: creditId },
    include: {
      project: true,
      owner: true
    }
  });

  if (!credit) {
    throw new AppError('Carbon credit not found', 404, 'CREDIT_NOT_FOUND');
  }

  if (credit.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
    throw new AppError('Not authorized to retire this credit', 403, 'UNAUTHORIZED');
  }

  if (credit.status === 'RETIRED') {
    throw new AppError('Credit already retired', 400, 'ALREADY_RETIRED');
  }

  try {
    // Update credit status
    const retiredCredit = await prisma.carbonCredit.update({
      where: { id: creditId },
      data: {
        status: 'RETIRED',
        retirementDate: new Date(),
        retirementReason: reason
      },
      include: {
        project: true,
        owner: true
      }
    });

    // Log retirement transaction
    await prisma.creditTransaction.create({
      data: {
        creditId,
        fromAddress: req.user.walletAddress || 'N/A',
        toAddress: '0x0000000000000000000000000000000000000000', // Burn address
        transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`,
        transactionType: 'RETIRE'
      }
    });

    console.log(`🔥 Carbon credit retired: ${credit.carbonAmount} tons by ${req.user.name}`);

    res.json({
      message: 'Carbon credit retired successfully',
      credit: retiredCredit,
      retirementDate: retiredCredit.retirementDate
    });

  } catch (error) {
    console.error('Retirement error:', error);
    throw new AppError('Failed to retire carbon credit', 500, 'RETIREMENT_FAILED');
  }
}));

/**
 * GET /api/blockchain/network-status
 * Get blockchain network status
 */
router.get('/network-status', asyncHandler(async (req, res) => {
  // In a real implementation, this would check actual blockchain connectivity
  const status = {
    network: process.env.BLOCKCHAIN_NETWORK || 'mumbai',
    chainId: process.env.CHAIN_ID || '80001',
    rpcUrl: process.env.MUMBAI_URL,
    connected: true, // Mock connection status
    blockHeight: Math.floor(Math.random() * 1000000) + 30000000, // Mock block height
    gasPrice: '35', // Mock gas price in gwei
    contracts: {
      registry: process.env.CARBON_REGISTRY_CONTRACT || 'Not deployed',
      credits: process.env.CARBON_CREDIT_CONTRACT || 'Not deployed'
    },
    lastUpdated: new Date().toISOString()
  };

  res.json({ status });
}));

/**
 * POST /api/blockchain/transfer-credit
 * Transfer carbon credit to another address
 */
router.post('/transfer-credit', authenticateToken, [
  body('creditId').isUUID('4').withMessage('Valid credit ID required'),
  body('toAddress').isLength({ min: 42, max: 42 }).withMessage('Valid recipient address required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { creditId, toAddress } = req.body;

  // Find credit and verify ownership
  const credit = await prisma.carbonCredit.findUnique({
    where: { id: creditId },
    include: {
      project: true,
      owner: true
    }
  });

  if (!credit) {
    throw new AppError('Carbon credit not found', 404, 'CREDIT_NOT_FOUND');
  }

  if (credit.ownerId !== req.user.id) {
    throw new AppError('Not authorized to transfer this credit', 403, 'UNAUTHORIZED');
  }

  if (credit.status !== 'ACTIVE') {
    throw new AppError('Only active credits can be transferred', 400, 'INVALID_STATUS');
  }

  // Find recipient user by wallet address
  const recipient = await prisma.user.findUnique({
    where: { walletAddress: toAddress }
  });

  if (!recipient) {
    throw new AppError('Recipient not found in system', 404, 'RECIPIENT_NOT_FOUND');
  }

  try {
    // Transfer credit
    const transferredCredit = await prisma.carbonCredit.update({
      where: { id: creditId },
      data: {
        ownerId: recipient.id,
        status: 'TRANSFERRED'
      },
      include: {
        project: true,
        owner: true
      }
    });

    // Log transfer transaction
    await prisma.creditTransaction.create({
      data: {
        creditId,
        fromAddress: req.user.walletAddress,
        toAddress,
        transactionHash: `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`,
        transactionType: 'TRANSFER'
      }
    });

    console.log(`↔️ Carbon credit transferred: ${credit.carbonAmount} tons from ${req.user.name} to ${recipient.name}`);

    res.json({
      message: 'Carbon credit transferred successfully',
      credit: transferredCredit,
      recipient: {
        name: recipient.name,
        organization: recipient.organization
      }
    });

  } catch (error) {
    console.error('Transfer error:', error);
    throw new AppError('Failed to transfer carbon credit', 500, 'TRANSFER_FAILED');
  }
}));

module.exports = router;