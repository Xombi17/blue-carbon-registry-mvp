const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const ipfsService = require('../utils/ipfs');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/projects
 * Get all projects with optional filters
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    status, 
    ecosystemType, 
    submitterId, 
    page = 1, 
    limit = 10,
    search 
  } = req.query;

  const where = {};
  
  if (status) where.status = status;
  if (ecosystemType) where.ecosystemType = ecosystemType;
  if (submitterId) where.submitterId = submitterId;
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        submitter: {
          select: { id: true, name: true, organization: true, email: true }
        },
        verifier: {
          select: { id: true, name: true, organization: true }
        },
        evidenceFiles: true,
        carbonCredits: {
          select: {
            id: true,
            tokenId: true,
            carbonAmount: true,
            status: true,
            issuanceDate: true
          }
        },
        _count: {
          select: { evidenceFiles: true, carbonCredits: true }
        }
      },
      orderBy: { submissionTimestamp: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.project.count({ where })
  ]);

  res.json({
    projects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * GET /api/projects/:id
 * Get project details by ID
 */
router.get('/:id', optionalAuth, [
  param('id').isUUID('4').withMessage('Invalid project ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      submitter: {
        select: { 
          id: true, 
          name: true, 
          organization: true, 
          email: true,
          walletAddress: true 
        }
      },
      verifier: {
        select: { 
          id: true, 
          name: true, 
          organization: true 
        }
      },
      evidenceFiles: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimetype: true,
          size: true,
          ipfsHash: true,
          uploadTimestamp: true
        }
      },
      carbonCredits: {
        include: {
          owner: {
            select: { id: true, name: true, organization: true }
          },
          transactions: true
        }
      }
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Add IPFS gateway URLs
  project.evidenceFiles = project.evidenceFiles.map(file => ({
    ...file,
    url: ipfsService.getGatewayUrl(file.ipfsHash)
  }));

  res.json({ project });
}));

/**
 * POST /api/projects
 * Submit a new project
 */
router.post('/', authenticateToken, [
  body('name')
    .isLength({ min: 3, max: 200 })
    .withMessage('Project name must be between 3 and 200 characters'),
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('ecosystemType')
    .isIn(['MANGROVE', 'SEAGRASS', 'SALT_MARSH', 'OTHER'])
    .withMessage('Invalid ecosystem type'),
  body('location')
    .isLength({ min: 5, max: 500 })
    .withMessage('Location must be between 5 and 500 characters'),
  body('estimatedCarbonCapture')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Carbon capture must be between 1 and 1,000,000 tons'),
  body('areaSize')
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Area size must be between 1 and 1,000,000 hectares'),
  body('coordinates')
    .optional()
    .isObject()
    .withMessage('Coordinates must be an object'),
  body('evidenceHashes')
    .isArray({ min: 1 })
    .withMessage('At least one evidence file is required'),
  body('geoJsonHash')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Invalid GeoJSON hash')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }

  const {
    name,
    description,
    ecosystemType,
    location,
    estimatedCarbonCapture,
    areaSize,
    coordinates,
    evidenceHashes,
    geoJsonHash
  } = req.body;

  // Create the project
  const project = await prisma.project.create({
    data: {
      name,
      description,
      ecosystemType,
      location,
      estimatedCarbonCapture: parseInt(estimatedCarbonCapture),
      areaSize: parseInt(areaSize),
      coordinates: coordinates ? JSON.stringify(coordinates) : null,
      geoJsonHash: geoJsonHash || null,
      submitterId: req.user.id
    },
    include: {
      submitter: {
        select: { id: true, name: true, organization: true, email: true }
      }
    }
  });

  // Create evidence file records if they exist
  if (evidenceHashes && evidenceHashes.length > 0) {
    const evidenceFiles = evidenceHashes.map(hash => ({
      filename: `evidence_${Date.now()}.file`,
      originalName: 'Evidence File',
      mimetype: 'application/octet-stream',
      size: 0,
      ipfsHash: hash,
      projectId: project.id
    }));

    await prisma.evidenceFile.createMany({
      data: evidenceFiles
    });
  }

  console.log(`📋 New project submitted: ${project.name} by ${req.user.name}`);

  res.status(201).json({
    message: 'Project submitted successfully',
    project: {
      ...project,
      evidenceFiles: evidenceHashes || []
    }
  });
}));

/**
 * PUT /api/projects/:id
 * Update project (only by submitter, only if pending)
 */
router.put('/:id', authenticateToken, [
  param('id').isUUID('4').withMessage('Invalid project ID'),
  body('name').optional().isLength({ min: 3, max: 200 }),
  body('description').optional().isLength({ min: 10, max: 2000 }),
  body('location').optional().isLength({ min: 5, max: 500 }),
  body('estimatedCarbonCapture').optional().isInt({ min: 1, max: 1000000 }),
  body('areaSize').optional().isInt({ min: 1, max: 1000000 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.submitterId !== req.user.id) {
    throw new AppError('Not authorized to update this project', 403, 'UNAUTHORIZED');
  }

  if (project.status !== 'PENDING') {
    throw new AppError('Cannot update project that has been processed', 400, 'INVALID_STATUS');
  }

  const updatedProject = await prisma.project.update({
    where: { id: req.params.id },
    data: req.body,
    include: {
      submitter: {
        select: { id: true, name: true, organization: true }
      },
      evidenceFiles: true
    }
  });

  res.json({
    message: 'Project updated successfully',
    project: updatedProject
  });
}));

/**
 * DELETE /api/projects/:id
 * Delete project (only by submitter, only if pending)
 */
router.delete('/:id', authenticateToken, [
  param('id').isUUID('4').withMessage('Invalid project ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.submitterId !== req.user.id) {
    throw new AppError('Not authorized to delete this project', 403, 'UNAUTHORIZED');
  }

  if (project.status !== 'PENDING') {
    throw new AppError('Cannot delete project that has been processed', 400, 'INVALID_STATUS');
  }

  await prisma.project.delete({
    where: { id: req.params.id }
  });

  res.json({ message: 'Project deleted successfully' });
}));

/**
 * GET /api/projects/:id/evidence
 * Get project evidence files
 */
router.get('/:id/evidence', optionalAuth, [
  param('id').isUUID('4').withMessage('Invalid project ID')
], asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      evidenceFiles: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const evidenceFiles = project.evidenceFiles.map(file => ({
    ...file,
    url: ipfsService.getGatewayUrl(file.ipfsHash)
  }));

  res.json({ evidenceFiles });
}));

/**
 * POST /api/projects/:id/evidence
 * Add evidence to existing project (only by submitter, only if pending)
 */
router.post('/:id/evidence', authenticateToken, [
  param('id').isUUID('4').withMessage('Invalid project ID'),
  body('evidenceHashes')
    .isArray({ min: 1 })
    .withMessage('At least one evidence hash is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.submitterId !== req.user.id) {
    throw new AppError('Not authorized to add evidence to this project', 403, 'UNAUTHORIZED');
  }

  if (project.status !== 'PENDING') {
    throw new AppError('Cannot add evidence to processed project', 400, 'INVALID_STATUS');
  }

  const { evidenceHashes } = req.body;
  const evidenceFiles = evidenceHashes.map(hash => ({
    filename: `evidence_${Date.now()}.file`,
    originalName: 'Additional Evidence',
    mimetype: 'application/octet-stream',
    size: 0,
    ipfsHash: hash,
    projectId: project.id
  }));

  await prisma.evidenceFile.createMany({
    data: evidenceFiles
  });

  res.json({ 
    message: 'Evidence added successfully',
    count: evidenceFiles.length
  });
}));

module.exports = router;