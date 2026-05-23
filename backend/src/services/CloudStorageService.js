const AWS = require('aws-sdk');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class CloudStorageService {
  constructor() {
    // Initialize S3 client with credentials from environment
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.bucket = process.env.AWS_S3_BUCKET || 'legal-estate-documents';
    this.cloudFrontUrl = process.env.CLOUDFRONT_URL;
    
    // Encryption settings
    this.encryptionAlgorithm = 'aes-256-gcm';
    this.encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    // Generate a secure encryption key if not provided
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Upload file to S3 with encryption
   */
  async uploadFile(filePath, metadata = {}) {
    try {
      // Read file
      const fileContent = await fs.readFile(filePath);
      
      // Generate unique key for S3
      const fileKey = this.generateFileKey(metadata.filename || path.basename(filePath));
      
      // Encrypt file content if sensitive
      let uploadContent = fileContent;
      let encryptionMetadata = {};
      
      if (metadata.isConfidential) {
        const encrypted = this.encryptContent(fileContent);
        uploadContent = encrypted.content;
        encryptionMetadata = {
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          encrypted: 'true'
        };
      }

      // Prepare S3 upload parameters
      const uploadParams = {
        Bucket: this.bucket,
        Key: fileKey,
        Body: uploadContent,
        ContentType: metadata.mimeType || 'application/octet-stream',
        ServerSideEncryption: 'AES256',
        Metadata: {
          ...metadata,
          ...encryptionMetadata,
          uploadedAt: new Date().toISOString(),
          uploadedBy: metadata.userId || 'system'
        }
      };

      // Add tags for better organization
      if (metadata.tags) {
        uploadParams.Tagging = metadata.tags.join('&');
      }

      // Upload to S3
      const result = await this.s3.upload(uploadParams).promise();

      return {
        success: true,
        location: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        etag: result.ETag,
        versionId: result.VersionId,
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${fileKey}` : null
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to cloud storage: ${error.message}`);
    }
  }

  /**
   * Download file from S3 with decryption
   */
  async downloadFile(fileKey, localPath = null) {
    try {
      const downloadParams = {
        Bucket: this.bucket,
        Key: fileKey
      };

      const data = await this.s3.getObject(downloadParams).promise();
      
      // Check if file is encrypted
      let fileContent = data.Body;
      
      if (data.Metadata && data.Metadata.encrypted === 'true') {
        fileContent = this.decryptContent(data.Body, {
          iv: data.Metadata.iv,
          authTag: data.Metadata.authTag
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
        metadata: data.Metadata,
        contentType: data.ContentType
      };
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download file from cloud storage: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async generatePresignedUrl(fileKey, expiresIn = 3600) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: fileKey,
        Expires: expiresIn // seconds
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      
      return {
        success: true,
        url,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileKey) {
    try {
      const deleteParams = {
        Bucket: this.bucket,
        Key: fileKey
      };

      await this.s3.deleteObject(deleteParams).promise();
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from cloud storage: ${error.message}`);
    }
  }

  /**
   * List files with pagination
   */
  async listFiles(prefix = '', maxKeys = 100, continuationToken = null) {
    try {
      const listParams = {
        Bucket: this.bucket,
        MaxKeys: maxKeys,
        Prefix: prefix
      };

      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }

      const data = await this.s3.listObjectsV2(listParams).promise();
      
      return {
        success: true,
        files: data.Contents.map(file => ({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          etag: file.ETag,
          storageClass: file.StorageClass
        })),
        isTruncated: data.IsTruncated,
        nextContinuationToken: data.NextContinuationToken
      };
    } catch (error) {
      console.error('S3 list error:', error);
      throw new Error(`Failed to list files from cloud storage: ${error.message}`);
    }
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourceKey, destinationKey) {
    try {
      const copyParams = {
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        ServerSideEncryption: 'AES256'
      };

      const result = await this.s3.copyObject(copyParams).promise();
      
      return {
        success: true,
        etag: result.CopyObjectResult.ETag,
        lastModified: result.CopyObjectResult.LastModified
      };
    } catch (error) {
      console.error('S3 copy error:', error);
      throw new Error(`Failed to copy file in cloud storage: ${error.message}`);
    }
  }

  /**
   * Create versioned copy for document versioning
   */
  async createVersion(originalKey, versionNumber) {
    const versionKey = this.generateVersionKey(originalKey, versionNumber);
    return await this.copyFile(originalKey, versionKey);
  }

  /**
   * Enable bucket versioning
   */
  async enableVersioning() {
    try {
      const versioningParams = {
        Bucket: this.bucket,
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      };

      await this.s3.putBucketVersioning(versioningParams).promise();
      
      return { success: true, message: 'Versioning enabled for bucket' };
    } catch (error) {
      console.error('S3 versioning error:', error);
      throw new Error(`Failed to enable versioning: ${error.message}`);
    }
  }

  /**
   * Set lifecycle policy for automatic archival
   */
  async setLifecyclePolicy(rules) {
    try {
      const lifecycleParams = {
        Bucket: this.bucket,
        LifecycleConfiguration: {
          Rules: rules || [
            {
              Id: 'ArchiveOldDocuments',
              Status: 'Enabled',
              Transitions: [
                {
                  Days: 90,
                  StorageClass: 'GLACIER'
                }
              ]
            },
            {
              Id: 'DeleteOldVersions',
              Status: 'Enabled',
              NoncurrentVersionExpiration: {
                NoncurrentDays: 365
              }
            }
          ]
        }
      };

      await this.s3.putBucketLifecycleConfiguration(lifecycleParams).promise();
      
      return { success: true, message: 'Lifecycle policy set successfully' };
    } catch (error) {
      console.error('S3 lifecycle error:', error);
      throw new Error(`Failed to set lifecycle policy: ${error.message}`);
    }
  }

  /**
   * Helper: Generate unique file key
   */
  generateFileKey(filename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    // Organize by year/month for better structure
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `documents/${year}/${month}/${basename}_${timestamp}_${randomString}${extension}`;
  }

  /**
   * Helper: Generate version key
   */
  generateVersionKey(originalKey, versionNumber) {
    const parts = originalKey.split('/');
    const filename = parts.pop();
    const directory = parts.join('/');
    const extension = path.extname(filename);
    const basename = path.basename(filename, extension);
    
    return `${directory}/versions/${basename}_v${versionNumber}${extension}`;
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

  /**
   * Initialize bucket with proper configuration
   */
  async initializeBucket() {
    try {
      // Check if bucket exists
      try {
        await this.s3.headBucket({ Bucket: this.bucket }).promise();
        console.log(`Bucket ${this.bucket} already exists`);
      } catch (error) {
        if (error.statusCode === 404) {
          // Create bucket if it doesn't exist
          await this.s3.createBucket({ Bucket: this.bucket }).promise();
          console.log(`Bucket ${this.bucket} created`);
        } else {
          throw error;
        }
      }

      // Enable versioning
      await this.enableVersioning();
      
      // Set lifecycle policy
      await this.setLifecyclePolicy();
      
      // Enable server-side encryption by default
      await this.s3.putBucketEncryption({
        Bucket: this.bucket,
        ServerSideEncryptionConfiguration: {
          Rules: [{
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }]
        }
      }).promise();

      return { success: true, message: 'Bucket initialized successfully' };
    } catch (error) {
      console.error('Bucket initialization error:', error);
      throw new Error(`Failed to initialize bucket: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new CloudStorageService();