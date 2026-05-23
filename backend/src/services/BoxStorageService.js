const BoxSDK = require('box-node-sdk');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class BoxStorageService {
  constructor() {
    // Initialize Box SDK with JWT authentication
    this.sdk = new BoxSDK({
      clientID: process.env.BOX_CLIENT_ID,
      clientSecret: process.env.BOX_CLIENT_SECRET,
      appAuth: {
        keyID: process.env.BOX_PUBLIC_KEY_ID,
        privateKey: process.env.BOX_PRIVATE_KEY,
        passphrase: process.env.BOX_PASSPHRASE
      }
    });

    // Get service account client
    this.client = this.sdk.getAppAuthClient('enterprise', process.env.BOX_ENTERPRISE_ID);
    
    // Default folder for documents
    this.rootFolderId = process.env.BOX_ROOT_FOLDER_ID || '0'; // '0' is the root folder
    
    // Encryption settings
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Upload file to Box
   */
  async uploadFile(filePath, metadata = {}) {
    try {
      // Read file
      const fileContent = await fs.readFile(filePath);
      const fileName = metadata.filename || path.basename(filePath);
      
      // Encrypt if confidential
      let uploadContent = fileContent;
      let encryptionMetadata = {};
      
      if (metadata.isConfidential) {
        const encrypted = this.encryptContent(fileContent);
        uploadContent = encrypted.content;
        encryptionMetadata = {
          encrypted: 'true',
          iv: encrypted.iv,
          authTag: encrypted.authTag
        };
      }

      // Create a unique filename to avoid conflicts
      const uniqueFileName = this.generateUniqueFileName(fileName);
      
      // Determine parent folder
      const parentFolderId = metadata.folderId || await this.getOrCreateFolder(metadata.folderPath);
      
      // Upload file to Box
      const uploadedFile = await this.client.files.uploadFile(
        parentFolderId,
        uniqueFileName,
        uploadContent,
        {
          description: metadata.description || '',
          tags: metadata.tags || []
        }
      );

      // Add metadata to file
      if (Object.keys(encryptionMetadata).length > 0 || metadata.customMetadata) {
        await this.addFileMetadata(uploadedFile.entries[0].id, {
          ...encryptionMetadata,
          ...metadata.customMetadata,
          uploadedAt: new Date().toISOString(),
          uploadedBy: metadata.userId || 'system'
        });
      }

      // Set retention policy if specified
      if (metadata.retentionDate) {
        await this.setRetentionPolicy(uploadedFile.entries[0].id, metadata.retentionDate);
      }

      return {
        success: true,
        fileId: uploadedFile.entries[0].id,
        fileName: uploadedFile.entries[0].name,
        size: uploadedFile.entries[0].size,
        createdAt: uploadedFile.entries[0].created_at,
        downloadUrl: uploadedFile.entries[0].download_url,
        sharedLink: null
      };
    } catch (error) {
      console.error('Box upload error:', error);
      throw new Error(`Failed to upload file to Box: ${error.message}`);
    }
  }

  /**
   * Download file from Box
   */
  async downloadFile(fileId, localPath = null) {
    try {
      // Get file stream
      const stream = await this.client.files.getReadStream(fileId);
      
      // Collect stream data
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      let fileContent = Buffer.concat(chunks);
      
      // Get file info for metadata
      const fileInfo = await this.client.files.get(fileId, { fields: 'metadata' });
      
      // Decrypt if necessary
      if (fileInfo.metadata && fileInfo.metadata.enterprise && 
          fileInfo.metadata.enterprise.encryptionInfo && 
          fileInfo.metadata.enterprise.encryptionInfo.encrypted === 'true') {
        fileContent = this.decryptContent(fileContent, {
          iv: fileInfo.metadata.enterprise.encryptionInfo.iv,
          authTag: fileInfo.metadata.enterprise.encryptionInfo.authTag
        });
      }

      // Save to local path if provided
      if (localPath) {
        await fs.writeFile(localPath, fileContent);
        return { success: true, path: localPath };
      }

      return {
        success: true,
        content: fileContent,
        fileInfo: fileInfo
      };
    } catch (error) {
      console.error('Box download error:', error);
      throw new Error(`Failed to download file from Box: ${error.message}`);
    }
  }

  /**
   * Create shared link for file
   */
  async createSharedLink(fileId, options = {}) {
    try {
      const sharedLinkSettings = {
        access: options.access || 'open', // open, company, collaborators
        password: options.password,
        unshared_at: options.expiresAt,
        can_download: options.canDownload !== false,
        can_preview: options.canPreview !== false
      };

      const file = await this.client.files.update(fileId, {
        shared_link: sharedLinkSettings
      });

      return {
        success: true,
        sharedLink: file.shared_link.url,
        downloadUrl: file.shared_link.download_url,
        expiresAt: file.shared_link.unshared_at
      };
    } catch (error) {
      console.error('Box shared link error:', error);
      throw new Error(`Failed to create shared link: ${error.message}`);
    }
  }

  /**
   * Delete file from Box
   */
  async deleteFile(fileId) {
    try {
      await this.client.files.delete(fileId);
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Box delete error:', error);
      throw new Error(`Failed to delete file from Box: ${error.message}`);
    }
  }

  /**
   * Create folder structure
   */
  async getOrCreateFolder(folderPath) {
    if (!folderPath) return this.rootFolderId;
    
    try {
      const folders = folderPath.split('/').filter(f => f);
      let currentFolderId = this.rootFolderId;
      
      for (const folderName of folders) {
        // Check if folder exists
        const items = await this.client.folders.getItems(currentFolderId, {
          fields: 'name,id',
          limit: 1000
        });
        
        let folder = items.entries.find(item => 
          item.type === 'folder' && item.name === folderName
        );
        
        if (!folder) {
          // Create folder if it doesn't exist
          const newFolder = await this.client.folders.create(currentFolderId, folderName);
          currentFolderId = newFolder.id;
        } else {
          currentFolderId = folder.id;
        }
      }
      
      return currentFolderId;
    } catch (error) {
      console.error('Box folder creation error:', error);
      throw new Error(`Failed to create folder structure: ${error.message}`);
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId = null, options = {}) {
    try {
      const targetFolderId = folderId || this.rootFolderId;
      const items = await this.client.folders.getItems(targetFolderId, {
        fields: 'name,id,size,created_at,modified_at,parent,description',
        limit: options.limit || 100,
        offset: options.offset || 0
      });

      return {
        success: true,
        files: items.entries.filter(item => item.type === 'file').map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          createdAt: file.created_at,
          modifiedAt: file.modified_at,
          description: file.description
        })),
        folders: items.entries.filter(item => item.type === 'folder').map(folder => ({
          id: folder.id,
          name: folder.name,
          createdAt: folder.created_at
        })),
        totalCount: items.total_count,
        limit: items.limit,
        offset: items.offset
      };
    } catch (error) {
      console.error('Box list files error:', error);
      throw new Error(`Failed to list files from Box: ${error.message}`);
    }
  }

  /**
   * Copy file
   */
  async copyFile(fileId, destinationFolderId, newName = null) {
    try {
      const copyOptions = {
        parent: { id: destinationFolderId }
      };
      
      if (newName) {
        copyOptions.name = newName;
      }
      
      const copiedFile = await this.client.files.copy(fileId, copyOptions);
      
      return {
        success: true,
        fileId: copiedFile.id,
        fileName: copiedFile.name
      };
    } catch (error) {
      console.error('Box copy error:', error);
      throw new Error(`Failed to copy file in Box: ${error.message}`);
    }
  }

  /**
   * Create new version of file
   */
  async uploadNewVersion(fileId, filePath, versionComment = null) {
    try {
      const fileContent = await fs.readFile(filePath);
      
      const newVersion = await this.client.files.uploadNewFileVersion(
        fileId,
        fileContent,
        {
          comment: versionComment || `Version uploaded at ${new Date().toISOString()}`
        }
      );
      
      return {
        success: true,
        versionId: newVersion.entries[0].id,
        versionNumber: newVersion.entries[0].version_number
      };
    } catch (error) {
      console.error('Box version upload error:', error);
      throw new Error(`Failed to upload new version: ${error.message}`);
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(fileId) {
    try {
      const versions = await this.client.files.getVersions(fileId);
      
      return {
        success: true,
        versions: versions.entries.map(version => ({
          id: version.id,
          versionNumber: version.version_number,
          createdAt: version.created_at,
          modifiedAt: version.modified_at,
          modifiedBy: version.modified_by,
          size: version.size
        }))
      };
    } catch (error) {
      console.error('Box versions error:', error);
      throw new Error(`Failed to get file versions: ${error.message}`);
    }
  }

  /**
   * Add collaboration to file/folder
   */
  async addCollaboration(itemId, userEmail, role = 'viewer', itemType = 'file') {
    try {
      const collaboration = await this.client.collaborations.create({
        item: {
          id: itemId,
          type: itemType
        },
        accessible_by: {
          login: userEmail,
          type: 'user'
        },
        role: role // editor, viewer, previewer, uploader, previewer uploader, viewer uploader, co-owner
      });
      
      return {
        success: true,
        collaborationId: collaboration.id,
        status: collaboration.status
      };
    } catch (error) {
      console.error('Box collaboration error:', error);
      throw new Error(`Failed to add collaboration: ${error.message}`);
    }
  }

  /**
   * Set retention policy on file
   */
  async setRetentionPolicy(fileId, retentionDate) {
    try {
      // This would require Box Governance features
      // Simplified implementation
      await this.addFileMetadata(fileId, {
        retentionDate: retentionDate.toISOString(),
        retentionSet: true
      });
      
      return {
        success: true,
        message: 'Retention policy set',
        retentionDate
      };
    } catch (error) {
      console.error('Box retention error:', error);
      throw new Error(`Failed to set retention policy: ${error.message}`);
    }
  }

  /**
   * Add metadata to file
   */
  async addFileMetadata(fileId, metadata) {
    try {
      // First, create metadata template if it doesn't exist
      const templateKey = 'legalEstateMetadata';
      
      try {
        await this.client.metadata.createTemplate(templateKey, {
          displayName: 'Legal Estate Metadata',
          fields: Object.keys(metadata).map(key => ({
            key,
            displayName: key,
            type: 'string'
          }))
        });
      } catch (error) {
        // Template might already exist
      }
      
      // Add metadata to file
      await this.client.files.addMetadata(fileId, 'enterprise', templateKey, metadata);
      
      return { success: true };
    } catch (error) {
      console.error('Box metadata error:', error);
      // Non-critical error, don't throw
      return { success: false, error: error.message };
    }
  }

  /**
   * Search files
   */
  async searchFiles(query, options = {}) {
    try {
      const searchOptions = {
        query,
        limit: options.limit || 30,
        offset: options.offset || 0,
        file_extensions: options.extensions,
        created_at_range: options.createdAtRange,
        updated_at_range: options.updatedAtRange,
        size_range: options.sizeRange,
        owner_user_ids: options.ownerIds,
        ancestor_folder_ids: options.folderIds || [this.rootFolderId],
        content_types: options.contentTypes || ['name', 'description', 'file_content', 'comments', 'tags']
      };
      
      const results = await this.client.search.query(searchOptions);
      
      return {
        success: true,
        results: results.entries.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          description: item.description,
          size: item.size,
          createdAt: item.created_at,
          modifiedAt: item.modified_at,
          parent: item.parent
        })),
        totalCount: results.total_count
      };
    } catch (error) {
      console.error('Box search error:', error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Helper: Generate unique filename
   */
  generateUniqueFileName(filename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    return `${basename}_${timestamp}_${randomString}${extension}`;
  }

  /**
   * Helper: Encrypt content
   */
  encryptContent(content) {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(content),
      cipher.final()
    ]);
    
    return {
      content: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  /**
   * Helper: Decrypt content
   */
  decryptContent(encryptedContent, metadata) {
    const key = Buffer.from(this.encryptionKey, 'hex');
    const iv = Buffer.from(metadata.iv, 'hex');
    const authTag = Buffer.from(metadata.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);
    
    return decrypted;
  }
}

// Export singleton instance
module.exports = new BoxStorageService();