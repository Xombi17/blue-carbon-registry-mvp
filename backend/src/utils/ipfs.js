const fs = require('fs');
const path = require('path');

class IPFSService {
  constructor() {
    this.ipfs = null;
    this.initialize();
  }

  async initialize() {
    try {
      // For development, we'll mock IPFS functionality
      // In production, you would use a proper IPFS client
      console.log('🌐 IPFS service initialized (mock mode for development)');
      this.ipfs = {
        add: async (content) => {
          // Mock IPFS hash generation
          const hash = `Qm${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          return { cid: { toString: () => hash }, size: content.content?.length || 1024 };
        },
        cat: async (hash) => {
          // Mock file retrieval
          return [Buffer.from('Mock file content')];
        },
        pin: {
          add: async (hash) => {
            console.log(`📌 Mock pinned: ${hash}`);
            return true;
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to initialize IPFS service:', error.message);
    }
  }

  /**
   * Upload a file to IPFS
   * @param {Buffer|string} content - File content or path
   * @param {string} filename - Original filename
   * @returns {Promise<{hash: string, size: number}>}
   */
  async uploadFile(content, filename = null) {
    if (!this.ipfs) {
      throw new Error('IPFS client not initialized');
    }

    try {
      let fileBuffer;
      
      if (typeof content === 'string') {
        // If content is a file path
        fileBuffer = fs.readFileSync(content);
        filename = filename || path.basename(content);
      } else {
        // If content is already a buffer
        fileBuffer = content;
      }

      const fileOptions = {
        path: filename,
        content: fileBuffer
      };

      const result = await this.ipfs.add(fileOptions);
      
      console.log(`📁 File uploaded to IPFS: ${result.cid.toString()}`);
      
      return {
        hash: result.cid.toString(),
        size: result.size,
        filename: filename
      };
    } catch (error) {
      console.error('❌ IPFS upload error:', error.message);
      throw new Error(`Failed to upload file to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to IPFS
   * @param {Array} files - Array of file objects {content, filename}
   * @returns {Promise<Array>}
   */
  async uploadMultipleFiles(files) {
    if (!this.ipfs) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const uploadPromises = files.map(file => 
        this.uploadFile(file.content, file.filename)
      );
      
      const results = await Promise.all(uploadPromises);
      console.log(`📁 ${files.length} files uploaded to IPFS`);
      
      return results;
    } catch (error) {
      console.error('❌ IPFS multiple upload error:', error.message);
      throw new Error(`Failed to upload multiple files to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON metadata to IPFS
   * @param {Object} metadata - JSON metadata object
   * @returns {Promise<{hash: string, size: number}>}
   */
  async uploadJSON(metadata) {
    if (!this.ipfs) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const jsonString = JSON.stringify(metadata, null, 2);
      const result = await this.ipfs.add({
        content: Buffer.from(jsonString),
        path: 'metadata.json'
      });

      console.log(`📄 JSON metadata uploaded to IPFS: ${result.cid.toString()}`);
      
      return {
        hash: result.cid.toString(),
        size: result.size,
        metadata
      };
    } catch (error) {
      console.error('❌ IPFS JSON upload error:', error.message);
      throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
    }
  }

  /**
   * Pin content to IPFS (keep it available)
   * @param {string} hash - IPFS hash to pin
   * @returns {Promise<boolean>}
   */
  async pinContent(hash) {
    if (!this.ipfs) {
      throw new Error('IPFS client not initialized');
    }

    try {
      await this.ipfs.pin.add(hash);
      console.log(`📌 Content pinned to IPFS: ${hash}`);
      return true;
    } catch (error) {
      console.error('❌ IPFS pin error:', error.message);
      return false;
    }
  }

  /**
   * Get file from IPFS
   * @param {string} hash - IPFS hash
   * @returns {Promise<Buffer>}
   */
  async getFile(hash) {
    if (!this.ipfs) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const chunks = [];
      
      for await (const chunk of this.ipfs.cat(hash)) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('❌ IPFS get file error:', error.message);
      throw new Error(`Failed to get file from IPFS: ${error.message}`);
    }
  }

  /**
   * Create metadata for carbon credit NFT
   * @param {Object} projectData - Project information
   * @param {Object} creditData - Credit information
   * @returns {Object} NFT metadata
   */
  createCarbonCreditMetadata(projectData, creditData) {
    const metadata = {
      name: `Blue Carbon Credit #${creditData.tokenId || 'TBD'}`,
      description: `Carbon credit from ${projectData.ecosystemType.toLowerCase()} restoration project: ${projectData.name}`,
      image: `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}${projectData.mainImageHash || ''}`,
      external_url: `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectData.id}`,
      attributes: [
        {
          trait_type: "Ecosystem Type",
          value: projectData.ecosystemType
        },
        {
          trait_type: "Carbon Amount",
          value: creditData.carbonAmount,
          display_type: "number"
        },
        {
          trait_type: "Vintage Year",
          value: creditData.vintageYear,
          display_type: "date"
        },
        {
          trait_type: "Location",
          value: projectData.location
        },
        {
          trait_type: "Area Size",
          value: projectData.areaSize,
          display_type: "number"
        },
        {
          trait_type: "Certification Standard",
          value: creditData.certificationStandard || "VCS"
        },
        {
          trait_type: "Project ID",
          value: projectData.id
        }
      ],
      properties: {
        projectId: projectData.id,
        blockchainId: projectData.blockchainId,
        coordinates: projectData.coordinates,
        evidenceHashes: projectData.evidenceFiles?.map(f => f.ipfsHash) || [],
        geoJsonHash: projectData.geoJsonHash,
        verificationTimestamp: projectData.verificationTimestamp,
        verificationNotes: projectData.verificationNotes
      }
    };

    return metadata;
  }

  /**
   * Create project evidence metadata
   * @param {Object} projectData - Project information
   * @param {Array} evidenceFiles - Array of evidence files
   * @returns {Object} Evidence metadata
   */
  createEvidenceMetadata(projectData, evidenceFiles) {
    const metadata = {
      projectId: projectData.id,
      projectName: projectData.name,
      submissionTimestamp: projectData.submissionTimestamp,
      location: projectData.location,
      ecosystemType: projectData.ecosystemType,
      coordinates: projectData.coordinates,
      geoJsonHash: projectData.geoJsonHash,
      evidenceFiles: evidenceFiles.map(file => ({
        filename: file.originalName,
        ipfsHash: file.ipfsHash,
        mimetype: file.mimetype,
        size: file.size,
        uploadTimestamp: file.uploadTimestamp
      })),
      estimatedCarbonCapture: projectData.estimatedCarbonCapture,
      areaSize: projectData.areaSize
    };

    return metadata;
  }

  /**
   * Get IPFS gateway URL for a hash
   * @param {string} hash - IPFS hash
   * @returns {string} Gateway URL
   */
  getGatewayUrl(hash) {
    const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    return `${gateway}${hash}`;
  }

  /**
   * Check if IPFS client is ready
   * @returns {boolean}
   */
  isReady() {
    return this.ipfs !== null;
  }
}

module.exports = new IPFSService();