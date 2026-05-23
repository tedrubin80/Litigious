const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { ClientSecretCredential } = require('@azure/identity');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class MicrosoftStorageService {
  constructor() {
    // Initialize Microsoft Graph client with Azure AD authentication
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });

    this.client = Client.initWithMiddleware({
      authProvider: authProvider
    });

    // Storage configuration
    this.driveId = process.env.MICROSOFT_DRIVE_ID; // OneDrive or SharePoint drive ID
    this.siteId = process.env.SHAREPOINT_SITE_ID; // For SharePoint
    this.storageType = process.env.MICROSOFT_STORAGE_TYPE || 'onedrive'; // 'onedrive' or 'sharepoint'
    
    // Root folder path
    this.rootPath = process.env.MICROSOFT_ROOT_PATH || '/Legal Estate Documents';
    
    // Encryption settings
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get the appropriate drive endpoint
   */
  getDriveEndpoint() {
    if (this.storageType === 'sharepoint' && this.siteId) {
      return `/sites/${this.siteId}/drive`;
    } else if (this.driveId) {
      return `/drives/${this.driveId}`;
    } else {
      return '/me/drive'; // Default to user's OneDrive
    }
  }

  /**
   * Upload file to OneDrive/SharePoint
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

      // Generate unique filename and path
      const uniqueFileName = this.generateUniqueFileName(fileName);
      const uploadPath = this.buildUploadPath(uniqueFileName, metadata.folderPath);
      
      // Determine upload method based on file size
      const fileSize = uploadContent.length;
      let uploadResult;
      
      if (fileSize < 4 * 1024 * 1024) { // Less than 4MB - simple upload
        uploadResult = await this.simpleUpload(uploadPath, uploadContent);
      } else { // Large file - use resumable upload session
        uploadResult = await this.largeFileUpload(uploadPath, uploadContent);
      }

      // Add custom metadata
      if (Object.keys(encryptionMetadata).length > 0 || metadata.customMetadata) {
        await this.updateFileMetadata(uploadResult.id, {
          ...encryptionMetadata,
          ...metadata.customMetadata,
          uploadedAt: new Date().toISOString(),
          uploadedBy: metadata.userId || 'system'
        });
      }

      // Set retention if specified
      if (metadata.retentionDate) {
        await this.setRetentionLabel(uploadResult.id, metadata.retentionDate);
      }

      return {
        success: true,
        fileId: uploadResult.id,
        fileName: uploadResult.name,
        size: uploadResult.size,
        createdAt: uploadResult.createdDateTime,
        webUrl: uploadResult.webUrl,
        downloadUrl: uploadResult['@microsoft.graph.downloadUrl']
      };
    } catch (error) {
      console.error('Microsoft storage upload error:', error);
      throw new Error(`Failed to upload file to Microsoft storage: ${error.message}`);
    }
  }

  /**
   * Simple upload for small files
   */
  async simpleUpload(uploadPath, content) {
    const driveEndpoint = this.getDriveEndpoint();
    const endpoint = `${driveEndpoint}/root:${uploadPath}:/content`;
    
    return await this.client.api(endpoint)
      .put(content);
  }

  /**
   * Large file upload using upload session
   */
  async largeFileUpload(uploadPath, content) {
    const driveEndpoint = this.getDriveEndpoint();
    const createSessionEndpoint = `${driveEndpoint}/root:${uploadPath}:/createUploadSession`;
    
    // Create upload session
    const uploadSession = await this.client.api(createSessionEndpoint)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'rename'
        }
      });
    
    // Upload file in chunks
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const chunks = Math.ceil(content.length / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      
      const response = await fetch(uploadSession.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': chunk.length,
          'Content-Range': `bytes ${start}-${end - 1}/${content.length}`
        },
        body: chunk
      });
      
      if (i === chunks - 1) {
        // Last chunk - return the file metadata
        return await response.json();
      }
    }
  }

  /**
   * Download file from OneDrive/SharePoint
   */
  async downloadFile(fileId, localPath = null) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      // Get file metadata
      const fileInfo = await this.client.api(`${driveEndpoint}/items/${fileId}`)
        .select('id,name,size,@microsoft.graph.downloadUrl')
        .get();
      
      // Download file content
      const response = await fetch(fileInfo['@microsoft.graph.downloadUrl']);
      let fileContent = Buffer.from(await response.arrayBuffer());
      
      // Get custom metadata
      const metadata = await this.getFileMetadata(fileId);
      
      // Decrypt if necessary
      if (metadata && metadata.encrypted === 'true') {
        fileContent = this.decryptContent(fileContent, {
          iv: metadata.iv,
          authTag: metadata.authTag
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
        fileInfo: fileInfo,
        metadata: metadata
      };
    } catch (error) {
      console.error('Microsoft storage download error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Create sharing link
   */
  async createSharingLink(fileId, options = {}) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      const sharingOptions = {
        type: options.type || 'view', // view, edit, embed
        scope: options.scope || 'anonymous', // anonymous, organization
        password: options.password,
        expirationDateTime: options.expiresAt
      };
      
      const result = await this.client.api(`${driveEndpoint}/items/${fileId}/createLink`)
        .post(sharingOptions);
      
      return {
        success: true,
        sharingUrl: result.link.webUrl,
        sharingId: result.id,
        expiresAt: result.expirationDateTime
      };
    } catch (error) {
      console.error('Microsoft storage sharing error:', error);
      throw new Error(`Failed to create sharing link: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      await this.client.api(`${driveEndpoint}/items/${fileId}`)
        .delete();
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Microsoft storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId = null, options = {}) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      let endpoint;
      
      if (folderId) {
        endpoint = `${driveEndpoint}/items/${folderId}/children`;
      } else {
        // List files in root folder
        endpoint = `${driveEndpoint}/root:${this.rootPath}:/children`;
      }
      
      const result = await this.client.api(endpoint)
        .select('id,name,size,file,folder,createdDateTime,lastModifiedDateTime,webUrl')
        .top(options.limit || 100)
        .skip(options.offset || 0)
        .get();
      
      return {
        success: true,
        files: result.value.filter(item => item.file).map(file => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.file.mimeType,
          createdAt: file.createdDateTime,
          modifiedAt: file.lastModifiedDateTime,
          webUrl: file.webUrl
        })),
        folders: result.value.filter(item => item.folder).map(folder => ({
          id: folder.id,
          name: folder.name,
          childCount: folder.folder.childCount,
          createdAt: folder.createdDateTime
        })),
        nextLink: result['@odata.nextLink']
      };
    } catch (error) {
      console.error('Microsoft storage list error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Copy file
   */
  async copyFile(fileId, destinationFolderId, newName = null) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      const copyOptions = {
        parentReference: {
          id: destinationFolderId
        }
      };
      
      if (newName) {
        copyOptions.name = newName;
      }
      
      const result = await this.client.api(`${driveEndpoint}/items/${fileId}/copy`)
        .post(copyOptions);
      
      // Copy operation is async, monitor the operation
      const operationUrl = result.headers.location;
      let operation;
      
      do {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        operation = await this.client.api(operationUrl).get();
      } while (operation.status === 'inProgress');
      
      return {
        success: true,
        fileId: operation.resourceId,
        status: operation.status
      };
    } catch (error) {
      console.error('Microsoft storage copy error:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(fileId) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      const versions = await this.client.api(`${driveEndpoint}/items/${fileId}/versions`)
        .get();
      
      return {
        success: true,
        versions: versions.value.map(version => ({
          id: version.id,
          lastModifiedDateTime: version.lastModifiedDateTime,
          lastModifiedBy: version.lastModifiedBy,
          size: version.size
        }))
      };
    } catch (error) {
      console.error('Microsoft storage versions error:', error);
      throw new Error(`Failed to get file versions: ${error.message}`);
    }
  }

  /**
   * Restore file version
   */
  async restoreVersion(fileId, versionId) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      await this.client.api(`${driveEndpoint}/items/${fileId}/versions/${versionId}/restoreVersion`)
        .post({});
      
      return { success: true, message: 'Version restored successfully' };
    } catch (error) {
      console.error('Microsoft storage restore error:', error);
      throw new Error(`Failed to restore version: ${error.message}`);
    }
  }

  /**
   * Search files
   */
  async searchFiles(query, options = {}) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      let searchEndpoint = `${driveEndpoint}/root/search(q='${encodeURIComponent(query)}')`;
      
      const result = await this.client.api(searchEndpoint)
        .select('id,name,size,file,folder,createdDateTime,lastModifiedDateTime,webUrl')
        .top(options.limit || 50)
        .get();
      
      return {
        success: true,
        results: result.value.map(item => ({
          id: item.id,
          name: item.name,
          type: item.file ? 'file' : 'folder',
          size: item.size,
          createdAt: item.createdDateTime,
          modifiedAt: item.lastModifiedDateTime,
          webUrl: item.webUrl
        }))
      };
    } catch (error) {
      console.error('Microsoft storage search error:', error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Set permissions on file/folder
   */
  async setPermissions(itemId, userEmail, role = 'read') {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      const permission = await this.client.api(`${driveEndpoint}/items/${itemId}/invite`)
        .post({
          recipients: [{
            email: userEmail
          }],
          message: 'You have been granted access to this document',
          requireSignIn: true,
          sendInvitation: true,
          roles: [role] // read, write, owner
        });
      
      return {
        success: true,
        permissionId: permission.value[0].id
      };
    } catch (error) {
      console.error('Microsoft storage permission error:', error);
      throw new Error(`Failed to set permissions: ${error.message}`);
    }
  }

  /**
   * Update file metadata (custom properties)
   */
  async updateFileMetadata(fileId, metadata) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      // Microsoft Graph doesn't directly support custom metadata like Box
      // We can use the description field or create a hidden file with metadata
      const metadataString = JSON.stringify(metadata);
      
      await this.client.api(`${driveEndpoint}/items/${fileId}`)
        .patch({
          description: metadataString
        });
      
      return { success: true };
    } catch (error) {
      console.error('Microsoft storage metadata error:', error);
      // Non-critical error
      return { success: false, error: error.message };
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      
      const file = await this.client.api(`${driveEndpoint}/items/${fileId}`)
        .select('description')
        .get();
      
      if (file.description) {
        try {
          return JSON.parse(file.description);
        } catch {
          return { description: file.description };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Microsoft storage get metadata error:', error);
      return null;
    }
  }

  /**
   * Set retention label (requires compliance features)
   */
  async setRetentionLabel(fileId, retentionDate) {
    try {
      // This requires Microsoft 365 compliance features
      // Simplified implementation using metadata
      await this.updateFileMetadata(fileId, {
        retentionDate: retentionDate.toISOString(),
        retentionSet: true
      });
      
      return {
        success: true,
        message: 'Retention date set in metadata',
        retentionDate
      };
    } catch (error) {
      console.error('Microsoft storage retention error:', error);
      throw new Error(`Failed to set retention: ${error.message}`);
    }
  }

  /**
   * Create folder
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      const driveEndpoint = this.getDriveEndpoint();
      let endpoint;
      
      if (parentFolderId) {
        endpoint = `${driveEndpoint}/items/${parentFolderId}/children`;
      } else {
        endpoint = `${driveEndpoint}/root:${this.rootPath}:/children`;
      }
      
      const folder = await this.client.api(endpoint)
        .post({
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });
      
      return {
        success: true,
        folderId: folder.id,
        folderName: folder.name
      };
    } catch (error) {
      console.error('Microsoft storage folder creation error:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Helper: Build upload path
   */
  buildUploadPath(fileName, folderPath = '') {
    const basePath = this.rootPath;
    const fullPath = folderPath ? `${basePath}/${folderPath}` : basePath;
    return `${fullPath}/${fileName}`;
  }

  /**
   * Helper: Generate unique filename
   */
  generateUniqueFileName(filename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    // Organize by year/month
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${year}/${month}/${basename}_${timestamp}_${randomString}${extension}`;
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
module.exports = new MicrosoftStorageService();