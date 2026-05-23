const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;
const { 
  documentUpload, 
  medicalUpload, 
  generalUpload,
  validateFile, 
  cleanupFile, 
  getFileInfo, 
  scanFile 
} = require('../middleware/uploadMiddleware');
const { activityTracker } = require('../services/ActivityTrackerService');

const prisma = new PrismaClient();

// Upload document with comprehensive validation and processing
exports.uploadDocument = async (req, res) => {
  try {
    // Determine upload type based on category
    const category = req.body.category || 'general';
    let uploadMiddleware;

    switch (category.toLowerCase()) {
      case 'medical':
      case 'medical_record':
        uploadMiddleware = medicalUpload.single;
        break;
      case 'legal':
      case 'contract':
      case 'court_filing':
        uploadMiddleware = documentUpload.single;
        break;
      default:
        uploadMiddleware = generalUpload.single;
    }

    // Apply upload middleware
    uploadMiddleware('file')(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: uploadError.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
          error: 'Please select a file to upload'
        });
      }

      try {
        // Validate file
        const validation = validateFile(req.file, category === 'medical' ? 'medical' : 'documents');
        if (!validation.isValid) {
          await cleanupFile(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'File validation failed',
            errors: validation.errors
          });
        }

        // Scan file for viruses/malware
        const scanResult = await scanFile(req.file.path);
        if (!scanResult.clean) {
          await cleanupFile(req.file.path);
          return res.status(400).json({
            success: false,
            message: 'File security scan failed',
            error: 'File contains potential threats: ' + scanResult.threats.join(', ')
          });
        }

        // Extract additional data from request
        const {
          category: fileCategory,
          description,
          caseId,
          clientId,
          tags,
          isConfidential,
          expirationDate,
          version
        } = req.body;

        // Get file information
        const fileInfo = getFileInfo(req.file);

        // Create document record in database
        const document = await prisma.document.create({
          data: {
            title: fileInfo.originalName,
            filename: fileInfo.originalName,
            originalName: fileInfo.originalName,
            fileType: fileInfo.mimetype,
            fileSize: fileInfo.size,
            filePath: fileInfo.path,
            type: 'OTHER', // Default document type
            description: description || '',
            uploadedBy: req.user.id,
            caseId: caseId ? parseInt(caseId) : null,
            clientId: clientId ? parseInt(clientId) : null,
            version: version ? parseInt(version) : 1,
            metadata: { 
              category: fileCategory || 'general',
              tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
              isConfidential: isConfidential === 'true',
              expirationDate: expirationDate || null
            }
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            case: {
              select: {
                id: true,
                title: true
              }
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        });

        // Track document upload activity with comprehensive tracking
        await activityTracker.trackActivity({
          caseId: caseId || null,
          userId: req.user.id,
          activityType: 'DOCUMENT_UPLOAD',
          action: 'Document Upload',
          description: `Uploaded document: ${fileInfo.originalName}`,
          entityType: 'DOCUMENT',
          entityId: document.id.toString(),
          metadata: {
            documentId: document.id,
            filename: fileInfo.originalName,
            originalName: fileInfo.originalName,
            fileSize: fileInfo.size,
            mimeType: fileInfo.mimetype,
            category: fileCategory || 'general',
            isConfidential: isConfidential === 'true',
            uploadPath: fileInfo.path
          },
          duration: 2, // Estimate 2 minutes for document upload process
          isBillable: true,
          request: req
        });

        res.status(201).json({
          success: true,
          message: 'Document uploaded successfully',
          document: {
            ...document,
            url: `/api/documents/${document.id}/download`,
            previewUrl: `/api/documents/${document.id}/preview`
          }
        });

      } catch (dbError) {
        // Cleanup file if database operation fails
        await cleanupFile(req.file.path);
        console.error('Database error during document upload:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to save document information',
          error: 'Database error occurred'
        });
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload multiple documents
exports.uploadMultipleDocuments = async (req, res) => {
  try {
    const category = req.body.category || 'general';
    let uploadMiddleware;

    switch (category.toLowerCase()) {
      case 'medical':
        uploadMiddleware = medicalUpload.multiple;
        break;
      case 'legal':
        uploadMiddleware = documentUpload.multiple;
        break;
      default:
        uploadMiddleware = generalUpload.multiple;
    }

    uploadMiddleware('files')(req, res, async (uploadError) => {
      if (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'File upload failed',
          error: uploadError.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
          error: 'Please select files to upload'
        });
      }

      const uploadedDocuments = [];
      const failedUploads = [];

      try {
        // Process each file
        for (const file of req.files) {
          try {
            // Validate file
            const validation = validateFile(file, category === 'medical' ? 'medical' : 'documents');
            if (!validation.isValid) {
              await cleanupFile(file.path);
              failedUploads.push({
                filename: file.originalname,
                errors: validation.errors
              });
              continue;
            }

            // Scan file
            const scanResult = await scanFile(file.path);
            if (!scanResult.clean) {
              await cleanupFile(file.path);
              failedUploads.push({
                filename: file.originalname,
                errors: [`Security scan failed: ${scanResult.threats.join(', ')}`]
              });
              continue;
            }

            const fileInfo = getFileInfo(file);

            // Create document record
            const document = await prisma.document.create({
              data: {
                title: fileInfo.originalName,
                filename: fileInfo.originalName,
                originalName: fileInfo.originalName,
                fileType: fileInfo.mimetype,
                fileSize: fileInfo.size,
                filePath: fileInfo.path,
                type: 'OTHER',
                description: req.body.description || '',
                uploadedBy: req.user.id,
                caseId: req.body.caseId ? parseInt(req.body.caseId) : null,
                clientId: req.body.clientId ? parseInt(req.body.clientId) : null,
                metadata: { 
                  category: req.body.category || 'general'
                }
              },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            });

            uploadedDocuments.push(document);

          } catch (fileError) {
            await cleanupFile(file.path);
            failedUploads.push({
              filename: file.originalname,
              errors: [fileError.message]
            });
          }
        }

        res.status(201).json({
          success: true,
          message: `${uploadedDocuments.length} documents uploaded successfully`,
          uploadedDocuments,
          failedUploads,
          summary: {
            successful: uploadedDocuments.length,
            failed: failedUploads.length,
            total: req.files.length
          }
        });

      } catch (error) {
        // Cleanup all uploaded files on error
        for (const file of req.files) {
          await cleanupFile(file.path);
        }
        throw error;
      }
    });

  } catch (error) {
    console.error('Multiple document upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all documents with filtering and pagination
exports.getDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      caseId,
      clientId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      tags,
      dateFrom,
      dateTo,
      confidential
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};

    if (category) {
      where.category = category;
    }

    if (caseId) {
      where.caseId = parseInt(caseId);
    }

    if (clientId) {
      where.clientId = parseInt(clientId);
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tags) {
      where.tags = {
        hasSome: tags.split(',').map(tag => tag.trim())
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Note: Document model doesn't have isConfidential field yet
    // if (confidential !== undefined) {
    //   where.isConfidential = confidential === 'true';
    // }

    // Check user permissions - only show documents user has access to
    if (req.user.role !== 'ADMIN') {
      where.OR = [
        { uploadedBy: req.user.id },
        { 
          case: {
            OR: [
              { attorneyId: req.user.id },
              { paralegalId: req.user.id }
            ]
          }
        }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          case: {
            select: {
              id: true,
              title: true
            }
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.document.count({ where })
    ]);

    // Add URLs to documents
    const documentsWithUrls = documents.map(doc => ({
      ...doc,
      url: `/api/documents/${doc.id}/download`,
      previewUrl: `/api/documents/${doc.id}/preview`
    }));

    res.json({
      success: true,
      documents: documentsWithUrls,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents',
      error: error.message
    });
  }
};

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        case: {
          select: {
            id: true,
            title: true
          }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Note: isConfidential field not in schema yet
    // Check permissions (simplified since isConfidential not available)
    if (req.user.role !== 'ADMIN' && 
        document.uploadedBy !== req.user.id) {
      // For now, allow access if user has case access
      // TODO: Implement isConfidential field in schema
    }

    // Track document view activity
    await activityTracker.trackActivity({
      caseId: document.caseId?.toString() || null,
      userId: req.user.id,
      activityType: 'DOCUMENT_VIEW',
      action: 'Document View',
      description: `Viewed document: ${document.filename}`,
      entityType: 'DOCUMENT',
      entityId: document.id.toString(),
      metadata: {
        documentId: document.id,
        filename: document.filename,
        originalName: document.originalName,
        fileSize: document.fileSize,
        viewMethod: 'api-details'
      },
      duration: 1, // Quick view action
      isBillable: false, // Document views typically not billable
      request: req
    });

    res.json({
      success: true,
      document: {
        ...document,
        url: `/api/documents/${document.id}/download`,
        previewUrl: `/api/documents/${document.id}/preview`
      }
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document',
      error: error.message
    });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Note: isConfidential field not in schema yet
    // Check permissions (simplified since isConfidential not available)
    if (req.user.role !== 'ADMIN' && 
        document.uploadedBy !== req.user.id) {
      // For now, allow access if user has case access
      // TODO: Implement isConfidential field in schema
    }

    // Check if file exists
    try {
      await fs.access(document.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Track document download activity
    await activityTracker.trackActivity({
      caseId: document.caseId?.toString() || null,
      userId: req.user.id,
      activityType: 'DOCUMENT_DOWNLOAD',
      action: 'Document Download',
      description: `Downloaded document: ${document.filename}`,
      entityType: 'DOCUMENT',
      entityId: document.id.toString(),
      metadata: {
        documentId: document.id,
        filename: document.filename,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.fileType
      },
      duration: 1, // Quick download action
      isBillable: false, // Downloads typically not billable
      request: req
    });

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.size);

    // Stream file to response
    const fileStream = require('fs').createReadStream(document.path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error.message
    });
  }
};

// Update document metadata
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      filename,
      description,
      category,
      tags,
      isConfidential,
      expirationDate
    } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && document.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(id) },
      data: {
        filename: filename || document.filename,
        description: description !== undefined ? description : document.description,
        // category: category || document.category, // Field not in current schema
        // tags: tags ? tags.split(',').map(tag => tag.trim()) : document.tags, // Field not in schema
        // isConfidential: isConfidential !== undefined ? isConfidential : document.isConfidential, // Field not in schema yet
        // expirationDate: expirationDate ? new Date(expirationDate) : document.expirationDate, // Field not in schema
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: updatedDocument
    });

  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: error.message
    });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && document.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Delete file from disk
    await cleanupFile(document.path);

    // Delete from database
    await prisma.document.delete({
      where: { id: parseInt(id) }
    });

    // Track document deletion activity
    await activityTracker.trackActivity({
      caseId: document.caseId?.toString() || null,
      userId: req.user.id,
      activityType: 'SYSTEM_ACCESS', // Using system access since we don't have delete type
      action: 'Document Deletion',
      description: `Deleted document: ${document.filename}`,
      entityType: 'DOCUMENT',
      entityId: document.id.toString(),
      metadata: {
        documentId: document.id,
        filename: document.filename,
        originalName: document.originalName,
        fileSize: document.fileSize,
        deletionReason: req.body.reason || 'User initiated deletion'
      },
      duration: 1, // Quick delete action
      isBillable: false, // Deletions not billable
      request: req
    });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
};

// Helper function to calculate file checksum
const calculateFileChecksum = async (filePath) => {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest('hex');
};

// Get document statistics
exports.getDocumentStatistics = async (req, res) => {
  try {
    const { caseId, clientId, timeframe = '30' } = req.query;
    
    const timeframeDate = new Date();
    timeframeDate.setDate(timeframeDate.getDate() - parseInt(timeframe));

    const where = {
      createdAt: {
        gte: timeframeDate
      }
    };

    if (caseId) where.caseId = parseInt(caseId);
    if (clientId) where.clientId = parseInt(clientId);

    const [
      totalDocuments,
      totalSize,
      categoryStats,
      recentDocuments
    ] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.aggregate({
        where,
        _sum: { size: true }
      }),
      prisma.document.groupBy({
        by: ['category'],
        where,
        _count: true
      }),
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          filename: true,
          category: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ]);

    res.json({
      success: true,
      statistics: {
        totalDocuments,
        totalSize: totalSize._sum.size || 0,
        averageSize: totalDocuments > 0 ? Math.round((totalSize._sum.size || 0) / totalDocuments) : 0,
        categoryDistribution: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = stat._count;
          return acc;
        }, {}),
        recentDocuments
      }
    });

  } catch (error) {
    console.error('Error fetching document statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch document statistics',
      error: error.message
    });
  }
};