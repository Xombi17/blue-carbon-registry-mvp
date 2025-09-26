# 🌊 Blue Carbon Registry & MRV System

A blockchain-powered Monitoring, Reporting, and Verification (MRV) system for Blue Carbon ecosystems (mangroves, seagrasses, salt marshes) with tokenized carbon credits.

## 🎯 MVP Objective

Build a prototype registry system that:
- Stores verified plantation/restoration data immutably
- Uses smart contracts to tokenize carbon credits
- Provides mobile/web interface for field uploads
- Includes admin tools for verification and approval

## 🏗️ Architecture

```
├── frontend/          # Next.js React application
├── backend/           # Node.js Express API server
├── contracts/         # Smart contracts (Hardhat)
├── mobile/           # React Native mobile app (future)
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask wallet
- Git

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd new-bluecarbon
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

## 🔧 Development Commands

```bash
# Install all dependencies
npm run install:all

# Start all services
npm run dev

# Start individual services
npm run dev:frontend
npm run dev:backend
npm run dev:contracts

# Build for production
npm run build

# Deploy contracts
npm run deploy:testnet

# Run tests
npm run test
```

## 📱 Features

### Core Features ✅
- **Blockchain Registry**: Immutable project data storage
- **Smart Contracts**: ERC-721/ERC-1155 carbon credit tokens
- **Mobile Upload**: Geo-tagged evidence submission
- **Admin Panel**: Verification and approval workflow
- **Public Dashboard**: Registry and token display

### Stretch Goals 🎯
- Drone integration with orthomosaic images
- Satellite layer overlay (Global Mangrove Watch)
- ML-based biomass/carbon estimation
- Marketplace for token trading

## 👥 User Roles

1. **Community/NGO Field User**: Submit plantation data
2. **Verifier/Admin**: Review and approve submissions
3. **Buyer/Observer**: View verified credits and registry

## 🌊 Blue Carbon Flow

1. **Field Upload** → Photos + GPS + metadata → IPFS storage
2. **Registry Entry** → Immutable hash storage on blockchain
3. **Verification** → Admin review and approval
4. **Tokenization** → Smart contract mints carbon credits
5. **Display** → Public registry with provenance trail

## 🛠️ Technology Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Mapbox GL JS for maps
- Web3.js for blockchain interaction

### Backend
- Node.js with Express
- PostgreSQL database
- Prisma ORM
- IPFS integration
- JWT authentication

### Blockchain
- Hardhat development environment
- Polygon Mumbai testnet
- ERC-721/ERC-1155 standards
- OpenZeppelin contracts

### DevOps
- Docker containerization
- Vercel deployment (frontend)
- Railway deployment (backend)

## 🌍 Environmental Impact

This system addresses critical gaps in Blue Carbon MRV by:
- Creating transparent, verifiable restoration tracking
- Enabling trusted carbon credit generation
- Channeling climate finance to local communities
- Supporting India's climate strategy goals

## 📊 Demo Data

The MVP includes sample data for:
- Mangrove restoration projects in Gujarat and Kerala
- Seagrass conservation in Tamil Nadu
- Salt marsh rehabilitation in Odisha

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Ministry of Environment, Forest and Climate Change (MoEFCC)
- National Centre for Coastal Research (NCCR)
- Global Mangrove Watch
- Local communities and NGOs

---

**"Creating a transparent, immutable, and scalable Blue Carbon MRV system for India"**