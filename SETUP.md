# 🌊 Blue Carbon Registry - Quick Setup Guide

This guide will help you set up the Blue Carbon Registry & MRV system for development.

## 🚀 Prerequisites

- **Node.js 18+** with npm
- **PostgreSQL 14+** database
- **Git**
- **MetaMask** wallet (for testing)

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Install root and all workspace dependencies
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
# At minimum, set:
# - DATABASE_URL (PostgreSQL connection string)
# - JWT_SECRET (generate a random string)
```

### 3. Database Setup

```bash
# Generate Prisma client
cd backend && npm run db:generate

# Push database schema (for development)
npm run db:push

# Optional: Seed with demo data
npm run db:seed
```

### 4. Smart Contract Setup (Optional)

```bash
# Compile contracts
cd contracts && npm run compile

# Deploy to local network (requires running Hardhat node)
npm run deploy:local
```

### 5. Start Development Servers

```bash
# Start all services (backend, frontend, blockchain node)
npm run dev

# Or start individual services:
npm run dev:backend  # API server on :3001
npm run dev:frontend # Web app on :3000 (when implemented)
npm run dev:contracts # Local blockchain on :8545
```

## 🔧 Individual Service Setup

### Backend API (Express + Prisma)

```bash
cd backend

# Install dependencies
npm install

# Set up database
npm run db:generate
npm run db:push

# Start development server
npm run dev
```

**API will be available at:** `http://localhost:3001`  
**API Documentation:** `http://localhost:3001/api/docs`

### Smart Contracts (Hardhat)

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to testnet (requires .env setup)
npm run deploy:mumbai
```

### Frontend (Next.js) - *Coming Next*

The frontend implementation will include:
- Project submission interface
- Admin verification panel  
- Public registry dashboard
- Map visualization
- Wallet integration

## 🌍 Environment Variables

### Essential Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bluecarbon"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"

# IPFS (optional for development)
IPFS_API_URL="http://localhost:5001"
# Or use Infura:
# IPFS_PROJECT_ID="your-infura-project-id"
# IPFS_PROJECT_SECRET="your-infura-project-secret"
```

### Optional Variables

```bash
# Blockchain (for production deployment)
PRIVATE_KEY="your-wallet-private-key"
MUMBAI_URL="https://polygon-mumbai.g.alchemy.com/v2/your-api-key"

# External Services
NEXT_PUBLIC_MAPBOX_TOKEN="your-mapbox-token"
AWS_S3_BUCKET="your-s3-bucket"
```

## 📊 Sample Data

The system includes demo data for:

- **3 ecosystem types**: Mangroves, Seagrasses, Salt Marshes
- **Sample projects** from Gujarat, Kerala, Tamil Nadu, Odisha
- **Mock evidence files** and GeoJSON data
- **Test carbon credits** and transactions

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Projects
- `GET /api/projects` - List projects (with filters)
- `POST /api/projects` - Submit new project
- `GET /api/projects/:id` - Get project details

### Verification (Admin/Verifier only)
- `GET /api/verification/pending` - Pending projects
- `POST /api/verification/:id/verify` - Approve project
- `POST /api/verification/:id/reject` - Reject project

### Upload
- `POST /api/upload/files` - Upload evidence to IPFS
- `POST /api/upload/geojson` - Upload GeoJSON data

### Registry (Public)
- `GET /api/registry/projects` - Public project registry
- `GET /api/registry/credits` - Carbon credits registry
- `GET /api/registry/stats` - System statistics

### Blockchain
- `POST /api/blockchain/mint-credits` - Mint carbon credits (Admin)
- `GET /api/blockchain/transactions` - Transaction history

## 🧪 Testing

### Backend Tests
```bash
cd backend && npm test
```

### Smart Contract Tests
```bash
cd contracts && npm test
```

### Manual Testing
1. Register a user: `POST /api/auth/register`
2. Submit a project: `POST /api/projects`
3. Upload evidence: `POST /api/upload/files`
4. Verify project (as admin): `POST /api/verification/:id/verify`
5. Mint credits: `POST /api/blockchain/mint-credits`

## 🎯 MVP Features Completed

✅ **Smart Contracts**: ERC-721 carbon credits + project registry  
✅ **Backend API**: Complete REST API with authentication  
✅ **Database Schema**: PostgreSQL with Prisma ORM  
✅ **IPFS Integration**: File upload and metadata storage  
✅ **Authentication**: JWT-based auth with roles  
✅ **Project Lifecycle**: Submit → Verify → Mint Credits  

## 🚧 Next Steps (Frontend Development)

1. **Upload Interface**: Mobile-responsive project submission
2. **Admin Panel**: Verification dashboard with map view
3. **Public Registry**: Browse projects and credits
4. **Wallet Integration**: MetaMask connectivity
5. **Map Visualization**: Interactive project locations

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL is running
brew services start postgresql
# Or using Docker:
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

**IPFS Upload Fails**
```bash
# Install and start local IPFS node
ipfs daemon
# Or configure Infura credentials in .env
```

**Smart Contract Deployment Fails**
```bash
# Make sure you have testnet ETH in your wallet
# Get Mumbai testnet MATIC from: https://faucet.polygon.technology/
```

## 📞 Support

For issues and questions:
- Check the API docs: `/api/docs`
- Review the database schema: `backend/prisma/schema.prisma`
- Test with Postman collection (coming soon)

---

**Ready to build the future of Blue Carbon MRV! 🌊**