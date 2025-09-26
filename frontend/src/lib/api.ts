import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: string
  email: string
  name: string
  organization?: string
  role: 'COMMUNITY' | 'VERIFIER' | 'ADMIN' | 'OBSERVER'
  walletAddress?: string
  isEmailVerified: boolean
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  ecosystemType: 'MANGROVE' | 'SEAGRASS' | 'SALT_MARSH' | 'OTHER'
  location: string
  coordinates?: string
  geoJsonHash?: string
  estimatedCarbonCapture: number
  areaSize: number
  submissionTimestamp: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CREDITS_ISSUED'
  verificationTimestamp?: string
  verificationNotes?: string
  submitter: User
  verifier?: User
  evidenceFiles: EvidenceFile[]
  carbonCredits: CarbonCredit[]
}

export interface EvidenceFile {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  ipfsHash: string
  url?: string
  uploadTimestamp: string
}

export interface CarbonCredit {
  id: string
  tokenId?: number
  carbonAmount: number
  vintageYear: number
  issuanceDate: string
  status: 'ACTIVE' | 'RETIRED' | 'TRANSFERRED'
  retirementDate?: string
  retirementReason?: string
  certificationStandard: string
  ipfsMetadataHash?: string
  project: Project
  owner: User
}

export interface RegistryStats {
  overview: {
    totalProjects: number
    verifiedProjects: number
    pendingProjects: number
    totalCredits: number
    activeCredits: number
    retiredCredits: number
    totalCarbonIssued: number
    totalCarbonRetired: number
    averageCarbonPerProject: number
  }
  ecosystemDistribution: Record<string, number>
  recentProjects: Project[]
  lastUpdated: string
}

// Auth API
export const authAPI = {
  register: async (data: {
    email: string
    password: string
    name: string
    organization?: string
    role?: string
  }) => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/profile')
    return response.data
  },

  updateProfile: async (data: {
    name?: string
    organization?: string
    walletAddress?: string
  }) => {
    const response = await api.put('/api/auth/profile', data)
    return response.data
  },
}

// Projects API
export const projectsAPI = {
  getProjects: async (params?: {
    status?: string
    ecosystemType?: string
    page?: number
    limit?: number
    search?: string
  }) => {
    const response = await api.get('/api/projects', { params })
    return response.data
  },

  getProject: async (id: string) => {
    const response = await api.get(`/api/projects/${id}`)
    return response.data
  },

  submitProject: async (data: {
    name: string
    description: string
    ecosystemType: string
    location: string
    estimatedCarbonCapture: number
    areaSize: number
    coordinates?: object
    evidenceHashes: string[]
    geoJsonHash?: string
  }) => {
    const response = await api.post('/api/projects', data)
    return response.data
  },

  updateProject: async (id: string, data: any) => {
    const response = await api.put(`/api/projects/${id}`, data)
    return response.data
  },

  deleteProject: async (id: string) => {
    const response = await api.delete(`/api/projects/${id}`)
    return response.data
  },
}

// Upload API
export const uploadAPI = {
  uploadFiles: async (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await api.post('/api/upload/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  uploadGeoJSON: async (data: { geoJson: any; projectName?: string }) => {
    const response = await api.post('/api/upload/geojson', data)
    return response.data
  },
}

// Verification API
export const verificationAPI = {
  getPendingProjects: async () => {
    const response = await api.get('/api/verification/pending')
    return response.data
  },

  verifyProject: async (id: string, notes?: string) => {
    const response = await api.post(`/api/verification/${id}/verify`, { notes })
    return response.data
  },

  rejectProject: async (id: string, notes: string) => {
    const response = await api.post(`/api/verification/${id}/reject`, { notes })
    return response.data
  },
}

// Registry API
export const registryAPI = {
  getProjects: async (params?: {
    ecosystemType?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: string
  }) => {
    const response = await api.get('/api/registry/projects', { params })
    return response.data
  },

  getCredits: async (params?: {
    status?: string
    page?: number
    limit?: number
    ecosystemType?: string
  }) => {
    const response = await api.get('/api/registry/credits', { params })
    return response.data
  },

  getStats: async (): Promise<RegistryStats> => {
    const response = await api.get('/api/registry/stats')
    return response.data
  },

  getMapData: async () => {
    const response = await api.get('/api/registry/map-data')
    return response.data
  },
}

// Blockchain API
export const blockchainAPI = {
  getContracts: async () => {
    const response = await api.get('/api/blockchain/contracts')
    return response.data
  },

  mintCredits: async (data: {
    projectId: string
    carbonAmount: number
    vintageYear: number
    recipientAddress: string
    certificationStandard?: string
  }) => {
    const response = await api.post('/api/blockchain/mint-credits', data)
    return response.data
  },

  getTransactions: async (params?: {
    page?: number
    limit?: number
    type?: string
  }) => {
    const response = await api.get('/api/blockchain/transactions', { params })
    return response.data
  },

  retireCredit: async (creditId: string, reason: string) => {
    const response = await api.post('/api/blockchain/retire-credit', {
      creditId,
      reason,
    })
    return response.data
  },

  transferCredit: async (creditId: string, toAddress: string) => {
    const response = await api.post('/api/blockchain/transfer-credit', {
      creditId,
      toAddress,
    })
    return response.data
  },

  getNetworkStatus: async () => {
    const response = await api.get('/api/blockchain/network-status')
    return response.data
  },
}

export default api