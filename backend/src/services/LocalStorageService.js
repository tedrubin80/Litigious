const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class LocalStorageService {
  constructor() {
    // Base directory for local storage
    this.baseDir = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'documents');
    
    // Encryption settings
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || this.generateEncryptionKey();
    
    // Initialize storage directory
    this.initializeStorage();
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Initialize local storage directory
   */
  async initializeStorage() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      
      // Create subdirectories for organization
      const subdirs = ['temp', 'archived', 'encrypted'];
      for (const dir of subdirs) {
        await fs.mkdir(path.join(this.baseDir, dir), { recursive: true });
      }
      
      console.log('✅ Local storage initialized at:', this.baseDir);
    } catch (error) {
      console.error('Failed to initialize local storage:', error);
    }
  }

  /**
   * Upload (save) file to local storage
   */
  async uploadFile(filePath, metadata = {}) {
    try {
      // Read file
      const fileContent = await fs.readFile(filePath);
      const fileName = metadata.filename || path.basename(filePath);
      
      // Generate storage path
      const storagePath = this.generateStoragePath(fileName, metadata);
      const fullPath = path.join(this.baseDir, storagePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Encrypt if confidential
      let saveContent = fileContent;
      let encryptionMetadata = {};
      
      if (metadata.isConfidential) {
        const encrypted = this.encryptContent(fileContent);
        saveContent = encrypted.content;
        encryptionMetadata = {
          encrypted: true,
          iv: encrypted.iv,
          authTag: encrypted.authTag
        };
        
        // Save to encrypted directory
        const encryptedPath = path.join(this.baseDir, 'encrypted', path.basename(storagePath));
        await fs.writeFile(encryptedPath, saveContent);
      } else {
        // Save unencrypted file
        await fs.writeFile(fullPath, saveContent);
      }
      
      // Save metadata
      const metadataPath = `${fullPath}.meta.json`;
      await fs.writeFile(metadataPath, JSON.stringify({
        ...metadata,
        ...encryptionMetadata,
        originalName: fileName,
        storagePath: storagePath,
        uploadedAt: new Date().toISOString(),
        size: fileContent.length,
        checksum: this.generateChecksum(fileContent)
      }, null, 2));
      
      // Get file stats
      const stats = await fs.stat(metadata.isConfidential ? 
        path.join(this.baseDir, 'encrypted', path.basename(storagePath)) : 
        fullPath);
      
      return {
        success: true,
        key: storagePath,
        path: fullPath,
        size: stats.size,
        createdAt: stats.birthtime,
        encrypted: metadata.isConfidential || false
      };
    } catch (error) {
      console.error('Local storage upload error:', error);
      throw new Error(`Failed to save file to local storage: ${error.message}`);
    }
  }

  /**
   * Download (read) file from local storage
   */
  async downloadFile(fileKey, localPath = null) {
    try {
      const fullPath = path.join(this.baseDir, fileKey);
      const metadataPath = `${fullPath}.meta.json`;
      
      // Check if file is in encrypted directory
      let actualPath = fullPath;
      let isEncrypted = false;
      
      try {
        await fs.access(fullPath);
      } catch {
        // Try encrypted directory
        const encryptedPath = path.join(this.baseDir, 'encrypted', path.basename(fileKey));
        await fs.access(encryptedPath);
        actualPath = encryptedPath;
        isEncrypted = true;
      }
      
      // Read file
      let fileContent = await fs.readFile(actualPath);
      
      // Read metadata if exists
      let metadata = {};
      try {
        const metadataContent = await fs.readFile(
          isEncrypted ? 
          path.join(this.baseDir, 'encrypted', `${path.basename(fileKey)}.meta.json`) :
          metadataPath
        );
        metadata = JSON.parse(metadataContent);
      } catch {
        // Metadata file doesn't exist
      }
      
      // Decrypt if necessary
      if (metadata.encrypted && metadata.iv && metadata.authTag) {
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
        metadata: metadata
      };
    } catch (error) {
      console.error('Local storage download error:', error);
      throw new Error(`Failed to read file from local storage: ${error.message}`);
    }
  }

  /**
   * Generate shareable URL (creates a temporary symlink or returns file path)
   */
  async generateShareableUrl(fileKey, options = {}) {
    try {
      const fullPath = path.join(this.baseDir, fileKey);
      
      // For local storage, we'll create a temporary access token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + (options.expiresIn || 3600) * 1000);
      
      // Store access token (in production, use a database)
      const tokenPath = path.join(this.baseDir, 'temp', `${token}.json`);
      await fs.writeFile(tokenPath, JSON.stringify({
        fileKey,
        expiresAt,
        createdAt: new Date().toISOString()
      }));
      
      // In a real implementation, this would be a URL to your server
      const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
      
      return {
        success: true,
        url: `${baseUrl}/api/documents/shared/${token}`,
        token,
        expiresAt
      };
    } catch (error) {
      console.error('Local storage URL generation error:', error);
      throw new Error(`Failed to generate shareable URL: ${error.message}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(fileKey) {
    try {
      const fullPath = path.join(this.baseDir, fileKey);
      const metadataPath = `${fullPath}.meta.json`;
      
      // Try to delete from regular location
      try {
        await fs.unlink(fullPath);
        await fs.unlink(metadataPath).catch(() => {}); // Ignore if metadata doesn't exist
      } catch {
        // Try encrypted directory
        const encryptedPath = path.join(this.baseDir, 'encrypted', path.basename(fileKey));
        await fs.unlink(encryptedPath);
        await fs.unlink(`${encryptedPath}.meta.json`).catch(() => {});
      }
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Local storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * List files in local storage
   */
  async listFiles(dirPath = '', options = {}) {
    try {
      const searchDir = path.join(this.baseDir, dirPath);
      const files = [];
      const folders = [];
      
      const items = await fs.readdir(searchDir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          folders.push({
            name: item.name,
            path: path.join(dirPath, item.name)
          });
        } else if (!item.name.endsWith('.meta.json')) {
          const itemPath = path.join(searchDir, item.name);
          const stats = await fs.stat(itemPath);
          
          // Try to read metadata
          let metadata = {};
          try {
            const metadataContent = await fs.readFile(`${itemPath}.meta.json`, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch {
            // No metadata file
          }
          
          files.push({
            key: path.join(dirPath, item.name),
            name: item.name,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            metadata
          });
        }
      }
      
      // Apply pagination
      const start = options.offset || 0;
      const limit = options.limit || 100;
      const paginatedFiles = files.slice(start, start + limit);
      
      return {
        success: true,
        files: paginatedFiles,
        folders,
        total: files.length,
        hasMore: start + limit < files.length
      };
    } catch (error) {
      console.error('Local storage list error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Copy file within local storage
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const sourcePath = path.join(this.baseDir, sourceKey);
      const destPath = path.join(this.baseDir, destinationKey);
      
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      
      // Copy file
      await fs.copyFile(sourcePath, destPath);
      
      // Copy metadata if exists
      try {
        await fs.copyFile(`${sourcePath}.meta.json`, `${destPath}.meta.json`);
      } catch {
        // No metadata to copy
      }
      
      return {
        success: true,
        message: 'File copied successfully',
        destinationKey
      };
    } catch (error) {
      console.error('Local storage copy error:', error);
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Create version of file
   */
  async createVersion(fileKey, versionNumber) {
    try {
      const sourcePath = path.join(this.baseDir, fileKey);
      const versionKey = this.generateVersionKey(fileKey, versionNumber);
      const versionPath = path.join(this.baseDir, versionKey);
      
      // Ensure version directory exists
      await fs.mkdir(path.dirname(versionPath), { recursive: true });
      
      // Copy file to version
      await fs.copyFile(sourcePath, versionPath);
      
      // Update metadata
      const metadata = {
        originalKey: fileKey,
        versionNumber,
        createdAt: new Date().toISOString()
      };
      
      await fs.writeFile(`${versionPath}.meta.json`, JSON.stringify(metadata, null, 2));
      
      return {
        success: true,
        versionKey,
        versionNumber
      };
    } catch (error) {
      console.error('Local storage version error:', error);
      throw new Error(`Failed to create version: ${error.message}`);
    }
  }

  /**
   * Archive file
   */
  async archiveFile(fileKey) {
    try {
      const sourcePath = path.join(this.baseDir, fileKey);
      const archivePath = path.join(this.baseDir, 'archived', path.basename(fileKey));
      
      // Move file to archive
      await fs.rename(sourcePath, archivePath);
      
      // Move metadata if exists
      try {
        await fs.rename(`${sourcePath}.meta.json`, `${archivePath}.meta.json`);
      } catch {
        // No metadata
      }
      
      return {
        success: true,
        message: 'File archived successfully',
        archivedPath: archivePath
      };
    } catch (error) {
      console.error('Local storage archive error:', error);
      throw new Error(`Failed to archive file: ${error.message}`);
    }
  }

  /**
   * Search files by name or metadata
   */
  async searchFiles(query, options = {}) {
    try {
      const allFiles = await this.listFiles('', { limit: 10000 });
      
      const results = allFiles.files.filter(file => {
        // Search in filename
        if (file.name.toLowerCase().includes(query.toLowerCase())) {
          return true;
        }
        
        // Search in metadata
        if (file.metadata) {
          const metadataString = JSON.stringify(file.metadata).toLowerCase();
          if (metadataString.includes(query.toLowerCase())) {
            return true;
          }
        }
        
        return false;
      });
      
      return {
        success: true,
        results: results.slice(0, options.limit || 50)
      };
    } catch (error) {
      console.error('Local storage search error:', error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        encryptedFiles: 0,
        archivedFiles: 0
      };
      
      // Count regular files
      const regularFiles = await this.listFiles('', { limit: 10000 });
      stats.totalFiles = regularFiles.files.length;
      stats.totalSize = regularFiles.files.reduce((sum, file) => sum + file.size, 0);
      
      // Count encrypted files
      try {
        const encryptedFiles = await fs.readdir(path.join(this.baseDir, 'encrypted'));
        stats.encryptedFiles = encryptedFiles.filter(f => !f.endsWith('.meta.json')).length;
      } catch {
        // No encrypted directory
      }
      
      // Count archived files
      try {
        const archivedFiles = await fs.readdir(path.join(this.baseDir, 'archived'));
        stats.archivedFiles = archivedFiles.filter(f => !f.endsWith('.meta.json')).length;
      } catch {
        // No archived directory
      }
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Local storage stats error:', error);
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Helper: Generate storage path
   */
  generateStoragePath(filename, metadata = {}) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString('hex');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    // Organize by date and category
    const category = metadata.category || 'general';
    
    return path.join(
      year.toString(),
      month,
      day,
      category,
      `${basename}_${timestamp}_${randomString}${extension}`
    );
  }

  /**
   * Helper: Generate version key
   */
  generateVersionKey(originalKey, versionNumber) {
    const dir = path.dirname(originalKey);
    const filename = path.basename(originalKey);
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    return path.join(dir, 'versions', `${basename}_v${versionNumber}${extension}`);
  }

  /**
   * Helper: Generate checksum
   */
  generateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
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
module.exports = new LocalStorageService();