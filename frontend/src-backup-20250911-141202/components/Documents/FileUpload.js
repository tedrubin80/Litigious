import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '../Icons';
import { endpoints } from '../../utils/api';
import { useToast } from '../Common/Toast';
import { handleFormError } from '../../utils/errorHandler';

const FileUpload = ({ 
  onUploadComplete, 
  onUploadError,
  category = 'general',
  caseId,
  clientId,
  multiple = true,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif']
  }
}) => {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);
  const toast = useToast();
  const uploadQueue = useRef([]);

  // File validation
  const validateFile = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const acceptedExtensions = Object.values(acceptedTypes).flat();
    if (!acceptedExtensions.includes(fileExtension)) {
      errors.push(`File type ${fileExtension} is not supported. Accepted types: ${acceptedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Upload single file with progress tracking
  const uploadFile = async (file, fileId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('description', file.description || '');
      
      if (caseId) formData.append('caseId', caseId);
      if (clientId) formData.append('clientId', clientId);
      if (file.tags) formData.append('tags', file.tags);
      if (file.isConfidential) formData.append('isConfidential', file.isConfidential);

      // Update file status to uploading
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();

      // Update file status to completed
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      
      const completedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'completed',
        document: result.document
      };
      
      setUploadedFiles(prev => [...prev, completedFile]);

      if (onUploadComplete) {
        onUploadComplete(result.document);
      }

      toast.success(`${file.name} uploaded successfully`);

    } catch (error) {
      console.error('Upload error:', error);
      
      // Move file to failed list
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      
      const failedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        status: 'failed',
        error: error.message
      };
      
      setFailedFiles(prev => [...prev, failedFile]);

      if (onUploadError) {
        onUploadError(error, file);
      }

      toast.error(`Failed to upload ${file.name}: ${error.message}`);
    }
  };

  // Upload multiple files with progress tracking (using XMLHttpRequest for progress)
  const uploadFileWithProgress = (file, fileId) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      formData.append('category', category);
      formData.append('description', file.description || '');
      
      if (caseId) formData.append('caseId', caseId);
      if (clientId) formData.append('clientId', clientId);
      if (file.tags) formData.append('tags', file.tags);
      if (file.isConfidential) formData.append('isConfidential', file.isConfidential);

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadingFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress } : f
          ));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', '/api/documents/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    });
  };

  // Process upload queue
  const processUploadQueue = async () => {
    const filesToUpload = uploadQueue.current.splice(0);
    
    for (const fileData of filesToUpload) {
      const { file, fileId } = fileData;
      
      try {
        const result = await uploadFileWithProgress(file, fileId);
        
        // Update file status to completed
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        
        const completedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          status: 'completed',
          document: result.document
        };
        
        setUploadedFiles(prev => [...prev, completedFile]);

        if (onUploadComplete) {
          onUploadComplete(result.document);
        }

        toast.success(`${file.name} uploaded successfully`);

      } catch (error) {
        console.error('Upload error:', error);
        
        // Move file to failed list
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        
        const failedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          status: 'failed',
          error: error.message
        };
        
        setFailedFiles(prev => [...prev, failedFile]);

        if (onUploadError) {
          onUploadError(error, file);
        }

        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }
  };

  // Handle files dropped or selected
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      const errorMessages = errors.map(error => error.message).join(', ');
      toast.error(`${file.name}: ${errorMessages}`);
    });

    // Process accepted files
    const validFiles = [];
    
    acceptedFiles.forEach(file => {
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.errors.join(', ')}`);
        return;
      }

      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const fileData = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        progress: 0
      };

      validFiles.push({ file, fileId });
      setUploadingFiles(prev => [...prev, fileData]);
    });

    // Add to upload queue and start processing
    uploadQueue.current.push(...validFiles);
    processUploadQueue();

  }, [category, caseId, clientId, maxSize, acceptedTypes, toast, onUploadComplete, onUploadError]);

  // Configure dropzone
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxFiles: multiple ? maxFiles : 1,
    maxSize,
    multiple
  });

  // Remove file from any list
  const removeFile = (fileId, listType) => {
    switch (listType) {
      case 'uploading':
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        break;
      case 'uploaded':
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        break;
      case 'failed':
        setFailedFiles(prev => prev.filter(f => f.id !== fileId));
        break;
    }
  };

  // Retry failed upload
  const retryUpload = async (failedFile) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = Object.values(acceptedTypes).flat().join(',');
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file && file.name === failedFile.name) {
        removeFile(failedFile.id, 'failed');
        onDrop([file], []);
      }
    };
    
    fileInput.click();
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get dropzone border color based on state
  const getDropzoneBorderColor = () => {
    if (isDragAccept) return 'border-green-400';
    if (isDragReject) return 'border-red-400';
    if (isDragActive) return 'border-blue-400';
    return 'border-gray-300';
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200 hover:border-blue-400
          ${getDropzoneBorderColor()}
          ${isDragActive ? 'bg-blue-50' : 'bg-gray-50'}
        `}
      >
        <input {...getInputProps()} />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">
            Drop the files here...
          </p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop files here, or click to select
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {multiple ? `Upload up to ${maxFiles} files` : 'Upload a single file'} 
              (max {Math.round(maxSize / 1024 / 1024)}MB each)
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Supported formats: {Object.values(acceptedTypes).flat().join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploading Files</h4>
          {uploadingFiles.map(file => (
            <div key={file.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-blue-600">{file.progress}%</div>
                  <button
                    onClick={() => removeFile(file.id, 'uploading')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Successfully Uploaded</h4>
          {uploadedFiles.map(file => (
            <div key={file.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id, 'uploaded')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed Files */}
      {failedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Failed Uploads</h4>
          {failedFiles.map(file => (
            <div key={file.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-red-600">{file.error}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => retryUpload(file)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Retry upload"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeFile(file.id, 'failed')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary */}
      {(uploadedFiles.length > 0 || failedFiles.length > 0) && (
        <div className="text-sm text-gray-600 text-center py-2 border-t">
          <span className="text-green-600">{uploadedFiles.length} uploaded</span>
          {failedFiles.length > 0 && (
            <span>, <span className="text-red-600">{failedFiles.length} failed</span></span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;