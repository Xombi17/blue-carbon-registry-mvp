require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { PrismaClient } = require('@prisma/client');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const verificationRoutes = require('./routes/verification');
const blockchainRoutes = require('./routes/blockchain');
const uploadRoutes = require('./routes/upload');
const registryRoutes = require('./routes/registry');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma client
const prisma = new PrismaClient();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/registry', registryRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Blue Carbon Registry API',
    version: '1.0.0',
    description: 'API for Blue Carbon Registry & MRV System',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/profile': 'Get user profile'
      },
      projects: {
        'GET /api/projects': 'Get all projects',
        'POST /api/projects': 'Submit new project',
        'GET /api/projects/:id': 'Get project details',
        'PUT /api/projects/:id': 'Update project',
        'DELETE /api/projects/:id': 'Delete project'
      },
      verification: {
        'GET /api/verification/pending': 'Get pending verifications',
        'POST /api/verification/:id/verify': 'Verify project',
        'POST /api/verification/:id/reject': 'Reject project'
      },
      blockchain: {
        'POST /api/blockchain/mint-credits': 'Mint carbon credits',
        'GET /api/blockchain/contracts': 'Get contract addresses',
        'GET /api/blockchain/transactions': 'Get transaction history'
      },
      upload: {
        'POST /api/upload/files': 'Upload evidence files',
        'POST /api/upload/geojson': 'Upload GeoJSON data'
      },
      registry: {
        'GET /api/registry/projects': 'Get public registry',
        'GET /api/registry/credits': 'Get carbon credits',
        'GET /api/registry/stats': 'Get system statistics'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
🌊 Blue Carbon Registry API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Server running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📡 API Base URL: http://localhost:${PORT}/api
📚 Documentation: http://localhost:${PORT}/api/docs
❤️  Health Check: http://localhost:${PORT}/health

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready to build a transparent Blue Carbon MRV system! 🌊
  `);
});

// Export for testing
module.exports = app;