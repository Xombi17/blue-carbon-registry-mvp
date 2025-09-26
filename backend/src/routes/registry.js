const express = require('express');
const { PrismaClient } = require('@prisma/client');

const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ipfsService = require('../utils/ipfs');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/registry/projects
 * Get public registry of verified projects
 */
router.get('/projects', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    ecosystemType, 
    page = 1, 
    limit = 12,
    sortBy = 'verificationTimestamp',
    sortOrder = 'desc'
  } = req.query;

  const where = {
    status: { in: ['VERIFIED', 'CREDITS_ISSUED'] }
  };

  if (ecosystemType) {
    where.ecosystemType = ecosystemType;
  }

  const orderBy = {};
  orderBy[sortBy] = sortOrder;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        ecosystemType: true,
        location: true,
        coordinates: true,
        estimatedCarbonCapture: true,
        areaSize: true,
        submissionTimestamp: true,
        verificationTimestamp: true,
        status: true,
        submitter: {
          select: {
            name: true,
            organization: true
          }
        },
        evidenceFiles: {
          select: {
            id: true,
            originalName: true,
            mimetype: true,
            ipfsHash: true,
            uploadTimestamp: true
          },
          take: 3 // Only show first 3 evidence files
        },
        carbonCredits: {
          select: {
            id: true,
            tokenId: true,
            carbonAmount: true,
            issuanceDate: true,
            status: true
          }
        },
        _count: {
          select: {
            evidenceFiles: true,
            carbonCredits: true
          }
        }
      },
      orderBy,
      skip,
      take: parseInt(limit)
    }),
    prisma.project.count({ where })
  ]);

  // Add IPFS URLs to evidence files
  const projectsWithUrls = projects.map(project => ({
    ...project,
    evidenceFiles: project.evidenceFiles.map(file => ({
      ...file,
      url: ipfsService.getGatewayUrl(file.ipfsHash)
    }))
  }));

  res.json({
    projects: projectsWithUrls,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * GET /api/registry/credits
 * Get public registry of carbon credits
 */
router.get('/credits', optionalAuth, asyncHandler(async (req, res) => {
  const { 
    status = 'ACTIVE', 
    page = 1, 
    limit = 12,
    ecosystemType 
  } = req.query;

  const where = { status };
  
  if (ecosystemType) {
    where.project = { ecosystemType };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [credits, total] = await Promise.all([
    prisma.carbonCredit.findMany({
      where,
      select: {
        id: true,
        tokenId: true,
        carbonAmount: true,
        vintageYear: true,
        issuanceDate: true,
        status: true,
        certificationStandard: true,
        ipfsMetadataHash: true,
        project: {
          select: {
            id: true,
            name: true,
            ecosystemType: true,
            location: true,
            submitter: {
              select: {
                name: true,
                organization: true
              }
            }
          }
        },
        owner: {
          select: {
            name: true,
            organization: true
          }
        }
      },
      orderBy: { issuanceDate: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.carbonCredit.count({ where })
  ]);

  // Add metadata URLs
  const creditsWithUrls = credits.map(credit => ({
    ...credit,
    metadataUrl: credit.ipfsMetadataHash 
      ? ipfsService.getGatewayUrl(credit.ipfsMetadataHash)
      : null
  }));

  res.json({
    credits: creditsWithUrls,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

/**
 * GET /api/registry/stats
 * Get system statistics
 */
router.get('/stats', optionalAuth, asyncHandler(async (req, res) => {
  const [
    totalProjects,
    verifiedProjects,
    totalCredits,
    retiredCredits,
    totalCarbonIssued,
    totalCarbonRetired,
    projectsByType,
    recentProjects
  ] = await Promise.all([
    // Total projects
    prisma.project.count(),
    
    // Verified projects
    prisma.project.count({
      where: { status: { in: ['VERIFIED', 'CREDITS_ISSUED'] } }
    }),
    
    // Total credits
    prisma.carbonCredit.count(),
    
    // Retired credits
    prisma.carbonCredit.count({
      where: { status: 'RETIRED' }
    }),
    
    // Total carbon issued
    prisma.carbonCredit.aggregate({
      _sum: { carbonAmount: true },
      where: { status: { in: ['ACTIVE', 'RETIRED', 'TRANSFERRED'] } }
    }),
    
    // Total carbon retired
    prisma.carbonCredit.aggregate({
      _sum: { carbonAmount: true },
      where: { status: 'RETIRED' }
    }),
    
    // Projects by ecosystem type
    prisma.project.groupBy({
      by: ['ecosystemType'],
      where: { status: { in: ['VERIFIED', 'CREDITS_ISSUED'] } },
      _count: { ecosystemType: true }
    }),
    
    // Recent projects
    prisma.project.findMany({
      where: { status: { in: ['VERIFIED', 'CREDITS_ISSUED'] } },
      select: {
        id: true,
        name: true,
        ecosystemType: true,
        location: true,
        verificationTimestamp: true,
        estimatedCarbonCapture: true,
        areaSize: true
      },
      orderBy: { verificationTimestamp: 'desc' },
      take: 5
    })
  ]);

  // Calculate ecosystem distribution
  const ecosystemDistribution = projectsByType.reduce((acc, item) => {
    acc[item.ecosystemType] = item._count.ecosystemType;
    return acc;
  }, {});

  res.json({
    overview: {
      totalProjects,
      verifiedProjects,
      pendingProjects: totalProjects - verifiedProjects,
      totalCredits,
      activeCredits: totalCredits - retiredCredits,
      retiredCredits,
      totalCarbonIssued: totalCarbonIssued._sum?.carbonAmount || 0,
      totalCarbonRetired: totalCarbonRetired._sum?.carbonAmount || 0,
      averageCarbonPerProject: verifiedProjects > 0 
        ? Math.round((totalCarbonIssued._sum?.carbonAmount || 0) / verifiedProjects)
        : 0
    },
    ecosystemDistribution,
    recentProjects,
    lastUpdated: new Date().toISOString()
  });
}));

/**
 * GET /api/registry/ecosystem-stats/:type
 * Get statistics for specific ecosystem type
 */
router.get('/ecosystem-stats/:type', optionalAuth, asyncHandler(async (req, res) => {
  const { type } = req.params;
  const validTypes = ['MANGROVE', 'SEAGRASS', 'SALT_MARSH', 'OTHER'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid ecosystem type',
      validTypes
    });
  }

  const [
    projectCount,
    totalCarbonCapture,
    totalArea,
    projects
  ] = await Promise.all([
    // Project count for this ecosystem
    prisma.project.count({
      where: { 
        ecosystemType: type,
        status: { in: ['VERIFIED', 'CREDITS_ISSUED'] }
      }
    }),
    
    // Total carbon capture
    prisma.project.aggregate({
      _sum: { estimatedCarbonCapture: true },
      where: { 
        ecosystemType: type,
        status: { in: ['VERIFIED', 'CREDITS_ISSUED'] }
      }
    }),
    
    // Total area
    prisma.project.aggregate({
      _sum: { areaSize: true },
      where: { 
        ecosystemType: type,
        status: { in: ['VERIFIED', 'CREDITS_ISSUED'] }
      }
    }),
    
    // Recent projects
    prisma.project.findMany({
      where: { 
        ecosystemType: type,
        status: { in: ['VERIFIED', 'CREDITS_ISSUED'] }
      },
      select: {
        id: true,
        name: true,
        location: true,
        estimatedCarbonCapture: true,
        areaSize: true,
        verificationTimestamp: true
      },
      orderBy: { verificationTimestamp: 'desc' },
      take: 10
    })
  ]);

  res.json({
    ecosystemType: type,
    stats: {
      projectCount,
      totalCarbonCapture: totalCarbonCapture._sum?.estimatedCarbonCapture || 0,
      totalArea: totalArea._sum?.areaSize || 0,
      averageArea: projectCount > 0 
        ? Math.round((totalArea._sum?.areaSize || 0) / projectCount)
        : 0,
      averageCarbonPerHectare: (totalArea._sum?.areaSize || 0) > 0
        ? Math.round((totalCarbonCapture._sum?.estimatedCarbonCapture || 0) / (totalArea._sum?.areaSize || 1))
        : 0
    },
    projects
  });
}));

/**
 * GET /api/registry/map-data
 * Get project data for map visualization
 */
router.get('/map-data', optionalAuth, asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ['VERIFIED', 'CREDITS_ISSUED'] },
      coordinates: { not: null }
    },
    select: {
      id: true,
      name: true,
      ecosystemType: true,
      location: true,
      coordinates: true,
      estimatedCarbonCapture: true,
      areaSize: true,
      verificationTimestamp: true,
      status: true,
      carbonCredits: {
        select: {
          tokenId: true,
          carbonAmount: true,
          status: true
        },
        take: 1
      }
    }
  });

  // Format for GeoJSON
  const geoJsonFeatures = projects.map(project => ({
    type: 'Feature',
    geometry: project.coordinates,
    properties: {
      id: project.id,
      name: project.name,
      ecosystemType: project.ecosystemType,
      location: project.location,
      carbonCapture: project.estimatedCarbonCapture,
      areaSize: project.areaSize,
      verificationDate: project.verificationTimestamp,
      status: project.status,
      hasCredits: project.carbonCredits.length > 0
    }
  }));

  res.json({
    type: 'FeatureCollection',
    features: geoJsonFeatures
  });
}));

module.exports = router;