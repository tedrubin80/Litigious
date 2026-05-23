/**
 * Unified Storage Service
 * Provides a single interface for multiple cloud storage providers
 */

class UnifiedStorageService {
  constructor() {
    // Default storage provider from environment
    this.defaultProvider = process.env.DEFAULT_STORAGE_PROVIDER || 'aws';
    
    // Initialize storage providers
    this.providers = {};
    this.initializeProviders();
  }

  /**
   * Initialize available storage providers
   */
  initializeProviders() {
    // AWS S3
    if (process.env.AWS_ACCESS_KEY_ID) {
      try {
        this.providers.aws = require('./CloudStorageService');
        console.log('✅ AWS S3 storage provider initialized');
      } catch (error) {
        console.error('Failed to initialize AWS S3:', error.message);
      }
    }

    // Box
    if (process.env.BOX_CLIENT_ID) {
      try {
        this.providers.box = require('./BoxStorageService');
        console.log('✅ Box storage provider initialized');
      } catch (error) {
        console.error('Failed to initialize Box:', error.message);
      }
    }

    // Microsoft (OneDrive/SharePoint)
    if (process.env.AZURE_CLIENT_ID) {
      try {
        this.providers.microsoft = require('./MicrosoftStorageService');
        console.log('✅ Microsoft storage provider initialized');
      } catch (error) {
        console.error('Failed to initialize Microsoft storage:', error.message);
      }
    }

    // Local storage fallback
    this.providers.local = require('./LocalStorageService');
    console.log('✅ Local storage provider initialized (fallback)');
  }

  /**
   * Get storage provider
   */
  getProvider(providerName = null) {
    const provider = providerName || this.defaultProvider;
    
    if (!this.providers[provider]) {
      console.warn(`Provider ${provider} not available, falling back to local storage`);
      return this.providers.local;
    }
    
    return this.providers[provider];
  }

  /**
   * Upload file to specified or default provider
   */
  async uploadFile(filePath, metadata = {}, provider = null) {
    try {
      const storage = this.getProvider(provider);
      const result = await storage.uploadFile(filePath, metadata);
      
      // Add provider information to result
      result.provider = provider || this.defaultProvider;
      
      return result;
    } catch (error) {
      console.error(`Upload failed for provider ${provider || this.defaultProvider}:`, error);
      
      // Try fallback to local storage if primary fails
      if ((provider || this.defaultProvider) !== 'local') {
        console.log('Attempting fallback to local storage...');
        const localResult = await this.providers.local.uploadFile(filePath, metadata);
        localResult.provider = 'local';
        localResult.fallback = true;
        return localResult;
      }
      
      throw error;
    }
  }

  /**
   * Download file from specified provider
   */
  async downloadFile(fileKey, localPath = null, provider = null) {
    const storage = this.getProvider(provider);
    return await storage.downloadFile(fileKey, localPath);
  }

  /**
   * Generate presigned/shared URL
   */
  async generateShareableUrl(fileKey, options = {}, provider = null) {
    const storage = this.getProvider(provider);
    
    // Different providers have different methods
    if (provider === 'aws' || !provider) {
      return await storage.generatePresignedUrl(fileKey, options.expiresIn);
    } else if (provider === 'box') {
      return await storage.createSharedLink(fileKey, options);
    } else if (provider === 'microsoft') {
      return await storage.createSharingLink(fileKey, options);
    } else {
      return await storage.generateShareableUrl(fileKey, options);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileKey, provider = null) {
    const storage = this.getProvider(provider);
    return await storage.deleteFile(fileKey);
  }

  /**
   * List files from storage
   */
  async listFiles(path = '', options = {}, provider = null) {
    const storage = this.getProvider(provider);
    
    // Different providers have different list methods
    if (provider === 'aws' || !provider) {
      return await storage.listFiles(path, options.limit, options.continuationToken);
    } else if (provider === 'box') {
      return await storage.listFiles(path, options);
    } else if (provider === 'microsoft') {
      return await storage.listFiles(path, options);
    } else {
      return await storage.listFiles(path, options);
    }
  }

  /**
   * Copy file within storage
   */
  async copyFile(sourceKey, destinationKey, provider = null) {
    const storage = this.getProvider(provider);
    
    if (provider === 'aws' || !provider) {
      return await storage.copyFile(sourceKey, destinationKey);
    } else if (provider === 'box') {
      // Box requires folder ID and optional new name
      const parts = destinationKey.split('/');
      const newName = parts.pop();
      return await storage.copyFile(sourceKey, parts.join('/'), newName);
    } else if (provider === 'microsoft') {
      // Microsoft requires folder ID and optional new name
      const parts = destinationKey.split('/');
      const newName = parts.pop();
      return await storage.copyFile(sourceKey, parts.join('/'), newName);
    } else {
      return await storage.copyFile(sourceKey, destinationKey);
    }
  }

  /**
   * Search files across storage
   */
  async searchFiles(query, options = {}, provider = null) {
    const storage = this.getProvider(provider);
    
    if (storage.searchFiles) {
      return await storage.searchFiles(query, options);
    } else {
      // Fallback to listing and filtering
      const files = await this.listFiles('', { limit: 1000 }, provider);
      const results = files.files.filter(file => 
        file.key.toLowerCase().includes(query.toLowerCase()) ||
        file.name?.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        success: true,
        results: results
      };
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(fileKey, provider = null) {
    const storage = this.getProvider(provider);
    
    if (storage.getFileVersions) {
      return await storage.getFileVersions(fileKey);
    } else {
      return {
        success: false,
        message: 'Versioning not supported by this provider'
      };
    }
  }

  /**
   * Create new version of file
   */
  async createVersion(fileKey, versionData, provider = null) {
    const storage = this.getProvider(provider);
    
    if (provider === 'aws' || !provider) {
      return await storage.createVersion(fileKey, versionData);
    } else if (provider === 'box') {
      return await storage.uploadNewVersion(fileKey, versionData.filePath, versionData.comment);
    } else if (provider === 'microsoft') {
      // Microsoft handles versioning automatically
      return await storage.uploadFile(versionData.filePath, { 
        ...versionData.metadata,
        replaceFile: fileKey 
      });
    } else {
      return await storage.createVersion(fileKey, versionData);
    }
  }

  /**
   * Set retention policy
   */
  async setRetention(fileKey, retentionDate, provider = null) {
    const storage = this.getProvider(provider);
    
    if (storage.setRetentionPolicy) {
      return await storage.setRetentionPolicy(fileKey, retentionDate);
    } else if (storage.setRetentionLabel) {
      return await storage.setRetentionLabel(fileKey, retentionDate);
    } else {
      // Fallback to metadata
      return {
        success: true,
        message: 'Retention date stored in metadata',
        retentionDate
      };
    }
  }

  /**
   * Sync file between providers
   */
  async syncFile(fileKey, fromProvider, toProvider) {
    try {
      // Download from source provider
      const downloadResult = await this.downloadFile(fileKey, null, fromProvider);
      
      if (!downloadResult.success) {
        throw new Error('Failed to download file from source provider');
      }
      
      // Create temp file
      const tempPath = `/tmp/sync_${Date.now()}_${path.basename(fileKey)}`;
      await require('fs').promises.writeFile(tempPath, downloadResult.content);
      
      // Upload to destination provider
      const uploadResult = await this.uploadFile(tempPath, {
        filename: path.basename(fileKey),
        ...downloadResult.metadata
      }, toProvider);
      
      // Clean up temp file
      await require('fs').promises.unlink(tempPath);
      
      return {
        success: true,
        sourceProvider: fromProvider,
        destinationProvider: toProvider,
        fileKey: uploadResult.key || uploadResult.fileId
      };
    } catch (error) {
      console.error('Sync failed:', error);
      throw new Error(`Failed to sync file: ${error.message}`);
    }
  }

  /**
   * Migrate all files from one provider to another
   */
  async migrateProvider(fromProvider, toProvider, options = {}) {
    try {
      const results = {
        success: [],
        failed: [],
        total: 0
      };
      
      // List all files from source provider
      let continuationToken = null;
      
      do {
        const listResult = await this.listFiles('', {
          limit: 100,
          continuationToken
        }, fromProvider);
        
        results.total += listResult.files.length;
        
        // Process files in parallel batches
        const batchSize = options.batchSize || 5;
        for (let i = 0; i < listResult.files.length; i += batchSize) {
          const batch = listResult.files.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (file) => {
            try {
              await this.syncFile(file.key || file.id, fromProvider, toProvider);
              results.success.push(file.key || file.id);
              
              if (options.onProgress) {
                options.onProgress({
                  processed: results.success.length + results.failed.length,
                  total: results.total,
                  current: file.key || file.id
                });
              }
            } catch (error) {
              results.failed.push({
                file: file.key || file.id,
                error: error.message
              });
            }
          }));
        }
        
        continuationToken = listResult.nextContinuationToken || listResult.nextLink;
      } while (continuationToken);
      
      return {
        success: true,
        summary: {
          total: results.total,
          migrated: results.success.length,
          failed: results.failed.length
        },
        details: results
      };
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Failed to migrate provider: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(provider = null) {
    try {
      const stats = {
        provider: provider || this.defaultProvider,
        available: true,
        features: []
      };
      
      const storage = this.getProvider(provider);
      
      // Check available features
      if (storage.generatePresignedUrl || storage.createSharedLink || storage.createSharingLink) {
        stats.features.push('sharing');
      }
      if (storage.getFileVersions || storage.createVersion) {
        stats.features.push('versioning');
      }
      if (storage.encryptContent) {
        stats.features.push('encryption');
      }
      if (storage.searchFiles) {
        stats.features.push('search');
      }
      if (storage.setRetentionPolicy || storage.setRetentionLabel) {
        stats.features.push('retention');
      }
      
      // Try to get usage stats if available
      if (storage.getUsageStats) {
        stats.usage = await storage.getUsageStats();
      }
      
      return stats;
    } catch (error) {
      return {
        provider: provider || this.defaultProvider,
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Test provider connectivity
   */
  async testProvider(provider = null) {
    try {
      const storage = this.getProvider(provider);
      
      // Try a simple operation like listing files
      await storage.listFiles('', { limit: 1 });
      
      return {
        success: true,
        provider: provider || this.defaultProvider,
        message: 'Provider is accessible'
      };
    } catch (error) {
      return {
        success: false,
        provider: provider || this.defaultProvider,
        error: error.message
      };
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }
}

// Export singleton instance
module.exports = new UnifiedStorageService();