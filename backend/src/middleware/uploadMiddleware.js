const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Ensure upload directories exist
const createUploadDirectories = async () => {
  const directories = [
    'uploads',
    'uploads/documents',
    'uploads/medical',
    'uploads/images',
    'uploads/temp'
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
};

// Initialize upload directories
createUploadDirectories().catch(console.error);

// File type configurations
const FILE_CONFIGS = {
  documents: {
    allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    destination: 'uploads/documents'
  },
  medical: {
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.tiff', '.dicom'],
    maxSize: 25 * 1024 * 1024, // 25MB
    destination: 'uploads/medical'
  },
  images: {
    allowedTypes: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    destination: 'uploads/images'
  },
  general: {
    allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.csv', '.xlsx'],
    maxSize: 50 * 1024 * 1024, // 50MB
    destination: 'uploads/documents'
  }
};

// Generate unique filename
const generateFileName = (originalName, mimetype) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName).toLowerCase();
  return `${timestamp}-${randomString}${extension}`;
};

// Storage configuration
const createStorage = (uploadType = 'general') => {
  const config = FILE_CONFIGS[uploadType] || FILE_CONFIGS.general;
  
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.access(config.destination);
        cb(null, config.destination);
      } catch (error) {
        await fs.mkdir(config.destination, { recursive: true });
        cb(null, config.destination);
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = generateFileName(file.originalname, file.mimetype);
      cb(null, uniqueName);
    }
  });
};

// File filter function
const createFileFilter = (uploadType = 'general') => {
  const config = FILE_CONFIGS[uploadType] || FILE_CONFIGS.general;
  
  return (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check file type
    if (!config.allowedTypes.includes(fileExtension)) {
      const error = new Error(`File type ${fileExtension} is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    // Additional MIME type validation
    const allowedMimeTypes = {
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.txt': ['text/plain'],
      '.rtf': ['application/rtf', 'text/rtf'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.bmp': ['image/bmp'],
      '.webp': ['image/webp'],
      '.tiff': ['image/tiff'],
      '.zip': ['application/zip'],
      '.csv': ['text/csv'],
      '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    };
    
    const expectedMimeTypes = allowedMimeTypes[fileExtension];
    if (expectedMimeTypes && !expectedMimeTypes.includes(file.mimetype)) {
      const error = new Error(`Invalid MIME type for ${fileExtension} file`);
      error.code = 'INVALID_MIME_TYPE';
      return cb(error, false);
    }
    
    cb(null, true);
  };
};

// Create multer instances for different upload types
const createUploadMiddleware = (uploadType = 'general', fieldName = 'file') => {
  const config = FILE_CONFIGS[uploadType] || FILE_CONFIGS.general;
  
  const upload = multer({
    storage: createStorage(uploadType),
    fileFilter: createFileFilter(uploadType),
    limits: {
      fileSize: config.maxSize,
      files: 10, // Maximum 10 files per upload
      fieldNameSize: 100,
      fieldSize: 1024 * 1024 // 1MB for text fields
    }
  });

  return {
    single: upload.single(fieldName),
    multiple: upload.array(fieldName, 10),
    fields: upload.fields
  };
};

// Error handling middleware for multer errors
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large',
          error: 'File size exceeds the maximum allowed limit'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files',
          error: 'Number of files exceeds the maximum allowed limit'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field',
          error: 'Unexpected file field name'
        });
      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many parts',
          error: 'Too many parts in the multipart form'
        });
      case 'LIMIT_FIELD_KEY':
        return res.status(400).json({
          success: false,
          message: 'Field name too long',
          error: 'Field name is too long'
        });
      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          message: 'Field value too long',
          error: 'Field value is too long'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many fields',
          error: 'Too many fields in the form'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Upload error',
          error: error.message
        });
    }
  }

  if (error && error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      error: error.message
    });
  }

  if (error && error.code === 'INVALID_MIME_TYPE') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file format',
      error: error.message
    });
  }

  next(error);
};

// File validation helper
const validateFile = (file, uploadType = 'general') => {
  const config = FILE_CONFIGS[uploadType] || FILE_CONFIGS.general;
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!config.allowedTypes.includes(fileExtension)) {
    errors.push(`File type ${fileExtension} is not allowed`);
  }

  if (file.size > config.maxSize) {
    errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(config.maxSize / 1024 / 1024)}MB)`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// File cleanup utility
const cleanupFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error);
    return false;
  }
};

// Get file info helper
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    extension: path.extname(file.originalname).toLowerCase(),
    uploadDate: new Date()
  };
};

// Virus scanning placeholder (integrate with actual antivirus solution)
const scanFile = async (filePath) => {
  // This is a placeholder for virus scanning
  // In production, integrate with antivirus solutions like ClamAV
  try {
    // Simulate virus scan
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check for potentially dangerous files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js'];
    const fileExt = path.extname(filePath).toLowerCase();
    
    if (dangerousExtensions.includes(fileExt)) {
      throw new Error('Potentially dangerous file type detected');
    }
    
    return { clean: true, threats: [] };
  } catch (error) {
    return { clean: false, threats: [error.message] };
  }
};

module.exports = {
  createUploadMiddleware,
  handleUploadErrors,
  validateFile,
  cleanupFile,
  getFileInfo,
  scanFile,
  FILE_CONFIGS,
  
  // Pre-configured middleware instances
  documentUpload: createUploadMiddleware('documents'),
  medicalUpload: createUploadMiddleware('medical'),
  imageUpload: createUploadMiddleware('images'),
  generalUpload: createUploadMiddleware('general')
};