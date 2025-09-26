// API Client for Blue Carbon Registry Backend
import { toast } from "sonner";

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  organization?: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  ecosystem: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  area: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  userId: number;
  verifierId?: number;
  carbonCreditsEstimated: number;
  carbonCreditsIssued: number;
  evidenceFiles: EvidenceFile[];
  tokenId?: string;
  blockchainTxHash?: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  verifier?: User;
}

export interface EvidenceFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  ipfsHash?: string;
  projectId: number;
  createdAt: string;
}

export interface CarbonCredit {
  id: number;
  projectId: number;
  amount: number;
  tokenId: string;
  status: 'MINTED' | 'TRADED' | 'RETIRED';
  currentOwner: string;
  blockchainTxHash: string;
  createdAt: string;
  project?: Project;
}

export interface RegistryStats {
  totalProjects: number;
  verifiedProjects: number;
  pendingProjects: number;
  rejectedProjects: number;
  totalCarbonCredits: number;
  totalUsers: number;
}

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth-token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text() as T;
    } catch (error) {
      console.error('API Request Error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      }
      throw error;
    }
  }

  private async uploadRequest<T>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    const token = localStorage.getItem('auth-token');
    
    const config: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('API Upload Error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials: { email: string; password: string }) {
    return this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    organization?: string;
    role?: string;
  }) {
    return this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getProfile() {
    return this.request<{ user: User }>('/api/auth/profile');
  }

  async updateProfile(profileData: {
    name?: string;
    organization?: string;
    walletAddress?: string;
  }) {
    return this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Projects
  async getProjects() {
    return this.request<{ projects: Project[] }>('/api/projects');
  }

  async getProject(id: number) {
    return this.request<{ project: Project }>(`/api/projects/${id}`);
  }

  async getUserProjects() {
    return this.request<{ projects: Project[] }>('/api/projects/user');
  }

  async createProject(projectData: {
    title: string;
    description: string;
    ecosystem: string;
    location: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    area: number;
    carbonCreditsEstimated: number;
  }) {
    return this.request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(id: number, projectData: Partial<Project>) {
    return this.request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: number) {
    return this.request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // File uploads
  async uploadFiles(projectId: number, files: File[]) {
    const formData = new FormData();
    formData.append('projectId', projectId.toString());
    
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    return this.uploadRequest<{ files: EvidenceFile[] }>('/api/upload/files', formData);
  }

  async getFile(fileId: number) {
    return this.request<Blob>(`/api/upload/files/${fileId}`, {
      headers: {
        'Accept': '*/*',
      },
    });
  }

  // Registry (Public endpoints)
  async getRegistryProjects(params?: {
    status?: string;
    ecosystem?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/registry/projects?${queryString}` : '/api/registry/projects';
    
    return this.request<{ projects: Project[]; pagination?: any }>(endpoint);
  }

  async getRegistryStats() {
    return this.request<RegistryStats>('/api/registry/stats');
  }

  async getPublicProject(id: number) {
    return this.request<{ project: Project }>(`/api/registry/projects/${id}`);
  }

  // Verification (Admin/Verifier endpoints)
  async getPendingProjects() {
    return this.request<{ projects: Project[] }>('/api/verification/pending');
  }

  async verifyProject(id: number, decision: {
    status: 'VERIFIED' | 'REJECTED';
    comments?: string;
    carbonCreditsIssued?: number;
  }) {
    return this.request<{ project: Project }>(`/api/verification/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(decision),
    });
  }

  // Blockchain
  async mintCarbonCredits(projectId: number, amount: number) {
    return this.request<{ transaction: any }>('/api/blockchain/mint-credits', {
      method: 'POST',
      body: JSON.stringify({ projectId, amount }),
    });
  }

  async getCarbonCredits(projectId?: number) {
    const endpoint = projectId 
      ? `/api/blockchain/credits?projectId=${projectId}`
      : '/api/blockchain/credits';
    
    return this.request<{ credits: CarbonCredit[] }>(endpoint);
  }

  async transferCredits(tokenId: string, to: string, amount: number) {
    return this.request<{ transaction: any }>('/api/blockchain/transfer-credits', {
      method: 'POST',
      body: JSON.stringify({ tokenId, to, amount }),
    });
  }

  // Utility methods
  getFileUrl(fileId: number) {
    return `${this.baseURL}/api/upload/files/${fileId}`;
  }

  getIPFSUrl(hash: string) {
    const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${ipfsGateway}${hash}`;
  }
}

// Create and export API client instance
export const api = new ApiClient(API_BASE_URL);

// Export individual API modules for cleaner imports
export const authAPI = {
  login: api.login.bind(api),
  register: api.register.bind(api),
  getProfile: api.getProfile.bind(api),
  updateProfile: api.updateProfile.bind(api),
};

export const projectsAPI = {
  getProjects: api.getProjects.bind(api),
  getProject: api.getProject.bind(api),
  getUserProjects: api.getUserProjects.bind(api),
  createProject: api.createProject.bind(api),
  updateProject: api.updateProject.bind(api),
  deleteProject: api.deleteProject.bind(api),
};

export const registryAPI = {
  getProjects: api.getRegistryProjects.bind(api),
  getStats: api.getRegistryStats.bind(api),
  getProject: api.getPublicProject.bind(api),
};

export const uploadAPI = {
  uploadFiles: api.uploadFiles.bind(api),
  getFile: api.getFile.bind(api),
  getFileUrl: api.getFileUrl.bind(api),
  getIPFSUrl: api.getIPFSUrl.bind(api),
};

export const verificationAPI = {
  getPendingProjects: api.getPendingProjects.bind(api),
  verifyProject: api.verifyProject.bind(api),
};

export const blockchainAPI = {
  mintCarbonCredits: api.mintCarbonCredits.bind(api),
  getCarbonCredits: api.getCarbonCredits.bind(api),
  transferCredits: api.transferCredits.bind(api),
};

export default api;