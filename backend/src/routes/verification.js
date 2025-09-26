const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const { authenticateToken, requireVerifier } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/verification/pending
 * Get all pending projects for verification
 */
router.get('/pending', requireVerifier, asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { status: 'PENDING' },
    include: {
      submitter: {
        select: { id: true, name: true, organization: true, email: true }
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
      }
    },
    orderBy: { submissionTimestamp: 'asc' }
  });

  res.json({ projects });
}));

/**
 * POST /api/verification/:id/verify
 * Verify a project
 */
router.post('/:id/verify', requireVerifier, [
  param('id').isUUID('4').withMessage('Invalid project ID'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { notes } = req.body;

  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.status !== 'PENDING') {
    throw new AppError('Project has already been processed', 400, 'ALREADY_PROCESSED');
  }

  const updatedProject = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      status: 'VERIFIED',
      verifierId: req.user.id,
      verificationTimestamp: new Date(),
      verificationNotes: notes || 'Project verified successfully'
    },
    include: {
      submitter: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  console.log(`✅ Project verified: ${updatedProject.name} by ${req.user.name}`);

  res.json({
    message: 'Project verified successfully',
    project: updatedProject
  });
}));

/**
 * POST /api/verification/:id/reject
 * Reject a project
 */
router.post('/:id/reject', requireVerifier, [
  param('id').isUUID('4').withMessage('Invalid project ID'),
  body('notes')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { notes } = req.body;

  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (project.status !== 'PENDING') {
    throw new AppError('Project has already been processed', 400, 'ALREADY_PROCESSED');
  }

  const updatedProject = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      status: 'REJECTED',
      verifierId: req.user.id,
      verificationTimestamp: new Date(),
      verificationNotes: notes
    },
    include: {
      submitter: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  console.log(`❌ Project rejected: ${updatedProject.name} by ${req.user.name}`);

  res.json({
    message: 'Project rejected',
    project: updatedProject
  });
}));

module.exports = router;