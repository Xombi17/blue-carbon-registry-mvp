const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const ipfsService = require('../utils/ipfs');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, documents
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'application/pdf',
      'application/json',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not allowed', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

/**
 * POST /api/upload/files
 * Upload evidence files to IPFS
 */
router.post('/files', authenticateToken, upload.array('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files provided', 400, 'NO_FILES');
  }

  const uploadPromises = req.files.map(async (file) => {
    let processedBuffer = file.buffer;
    
    // Optimize images if they're too large
    if (file.mimetype.startsWith('image/')) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        
        // Resize if image is too large (> 2MB or dimensions > 2000px)
        if (file.size > 2 * 1024 * 1024 || metadata.width > 2000 || metadata.height > 2000) {
          processedBuffer = await sharp(file.buffer)
            .resize(2000, 2000, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer();
            
          console.log(`📸 Image optimized: ${file.originalname} (${file.size} → ${processedBuffer.length} bytes)`);
        }
      } catch (error) {
        console.log('Image processing failed, using original:', error.message);
      }
    }

    // Upload to IPFS
    const result = await ipfsService.uploadFile(processedBuffer, file.originalname);
    
    return {
      originalName: file.originalname,
      filename: result.filename,
      mimetype: file.mimetype,
      size: processedBuffer.length,
      ipfsHash: result.hash,
      url: ipfsService.getGatewayUrl(result.hash)
    };
  });

  const uploadedFiles = await Promise.all(uploadPromises);

  console.log(`📁 ${uploadedFiles.length} files uploaded to IPFS by ${req.user.name}`);

  res.json({
    message: `${uploadedFiles.length} files uploaded successfully`,
    files: uploadedFiles
  });
}));

/**
 * POST /api/upload/geojson
 * Upload GeoJSON data to IPFS
 */
router.post('/geojson', authenticateToken, asyncHandler(async (req, res) => {
  const { geoJson, projectName } = req.body;

  if (!geoJson) {
    throw new AppError('GeoJSON data is required', 400, 'GEOJSON_REQUIRED');
  }

  // Validate GeoJSON structure
  try {
    if (typeof geoJson === 'string') {
      JSON.parse(geoJson);
    } else if (typeof geoJson === 'object') {
      // Already parsed
    } else {
      throw new Error('Invalid format');
    }
  } catch (error) {
    throw new AppError('Invalid GeoJSON format', 400, 'INVALID_GEOJSON');
  }

  // Upload to IPFS
  const metadata = {
    type: 'GeoJSON',
    projectName: projectName || 'Blue Carbon Project',
    uploadedBy: req.user.name,
    uploadTimestamp: new Date().toISOString(),
    data: geoJson
  };

  const result = await ipfsService.uploadJSON(metadata);

  console.log(`🗺️  GeoJSON uploaded to IPFS: ${result.hash} by ${req.user.name}`);

  res.json({
    message: 'GeoJSON uploaded successfully',
    hash: result.hash,
    size: result.size,
    url: ipfsService.getGatewayUrl(result.hash)
  });
}));

/**
 * POST /api/upload/metadata
 * Create and upload metadata to IPFS
 */
router.post('/metadata', authenticateToken, asyncHandler(async (req, res) => {
  const { projectData, creditData } = req.body;

  if (!projectData) {
    throw new AppError('Project data is required', 400, 'PROJECT_DATA_REQUIRED');
  }

  let metadata;
  
  if (creditData) {
    // Create carbon credit NFT metadata
    metadata = ipfsService.createCarbonCreditMetadata(projectData, creditData);
  } else {
    // Create project evidence metadata
    metadata = ipfsService.createEvidenceMetadata(projectData, projectData.evidenceFiles || []);
  }

  const result = await ipfsService.uploadJSON(metadata);

  console.log(`📄 Metadata uploaded to IPFS: ${result.hash}`);

  res.json({
    message: 'Metadata uploaded successfully',
    hash: result.hash,
    size: result.size,
    metadata: result.metadata,
    url: ipfsService.getGatewayUrl(result.hash)
  });
}));

/**
 * GET /api/upload/ipfs/:hash
 * Get file from IPFS
 */
router.get('/ipfs/:hash', asyncHandler(async (req, res) => {
  const { hash } = req.params;

  try {
    const fileBuffer = await ipfsService.getFile(hash);
    
    // Try to determine content type from the hash or default to octet-stream
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    res.send(fileBuffer);
  } catch (error) {
    throw new AppError('File not found on IPFS', 404, 'IPFS_FILE_NOT_FOUND');
  }
}));

/**
 * POST /api/upload/pin/:hash
 * Pin content to IPFS (admin only)
 */
router.post('/pin/:hash', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
  }

  const { hash } = req.params;
  const pinned = await ipfsService.pinContent(hash);

  if (pinned) {
    res.json({ message: 'Content pinned successfully', hash });
  } else {
    throw new AppError('Failed to pin content', 500, 'PIN_FAILED');
  }
}));

/**
 * GET /api/upload/status
 * Check IPFS service status
 */
router.get('/status', (req, res) => {
  res.json({
    ipfsReady: ipfsService.isReady(),
    gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    apiUrl: process.env.IPFS_API_URL
  });
});

module.exports = router;