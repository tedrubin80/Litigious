import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock FileUpload component
const FileUpload = ({ onUpload, maxSize = 10485760, acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.png'] }) => {
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState([]);
  const [uploadProgress, setUploadProgress] = React.useState({});

  const validateFile = (file) => {
    const errors = [];
    
    // Check file size (10MB default)
    if (file.size > maxSize) {
      errors.push(`${file.name} exceeds maximum size of ${maxSize / 1048576}MB`);
    }
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!acceptedTypes.some(type => fileExtension === type)) {
      errors.push(`Invalid file type: ${file.name}`);
    }
    
    return errors;
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validationErrors = [];
    const validFiles = [];

    selectedFiles.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        validationErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(validationErrors);
    if (validFiles.length > 0) {
      setFiles(validFiles);
      if (onUpload) {
        handleUpload(validFiles);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validationErrors = [];
    const validFiles = [];

    droppedFiles.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        validationErrors.push(...fileErrors);
      } else {
        validFiles.push(file);
      }
    });

    setErrors(validationErrors);
    if (validFiles.length > 0) {
      setFiles(validFiles);
      if (onUpload) {
        handleUpload(validFiles);
      }
    }
  };

  const handleUpload = async (filesToUpload) => {
    setUploading(true);
    
    for (const file of filesToUpload) {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
      }
    }
    
    if (onUpload) {
      await onUpload(filesToUpload);
    }
    
    setUploading(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="p-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
      >
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        
        <p className="text-gray-600 mb-4">Drag and drop files here or click to browse</p>
        
        <label htmlFor="file-upload" className="cursor-pointer">
          <span className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block">
            Choose Files
          </span>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="sr-only"
            aria-label="Choose files"
          />
        </label>
        
        <p className="text-xs text-gray-500 mt-2">
          Accepted: {acceptedTypes.join(', ')} | Max size: {maxSize / 1048576}MB
        </p>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          {errors.map((error, index) => (
            <p key={index} className="text-red-600 text-sm">{error}</p>
          ))}
        </div>
      )}

      {/* File list with progress */}
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Files to upload:</h3>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                {uploadProgress[file.name] !== undefined && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {uploadProgress[file.name]}%
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploading && (
        <p className="mt-4 text-center text-gray-600">Uploading files...</p>
      )}
    </div>
  );
};

describe('FileUpload Component', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays upload area correctly', () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByText('Drag and drop files here or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Choose Files')).toBeInTheDocument();
    expect(screen.getByText(/Accepted:.*\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/Max size:.*10MB/)).toBeInTheDocument();
  });

  test('handles file selection via input', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose files/i);
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/0\.01 KB/)).toBeInTheDocument();
    });
  });

  test('handles multiple file selection', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const files = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.doc', { type: 'application/msword' }),
      new File(['test3'], 'test3.jpg', { type: 'image/jpeg' })
    ];
    
    const input = screen.getByLabelText(/choose files/i);
    await userEvent.upload(input, files);
    
    await waitFor(() => {
      expect(screen.getByText('test1.pdf')).toBeInTheDocument();
      expect(screen.getByText('test2.doc')).toBeInTheDocument();
      expect(screen.getByText('test3.jpg')).toBeInTheDocument();
    });
  });

  test('validates file types', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' });
    const input = screen.getByLabelText(/choose files/i);
    
    await userEvent.upload(input, invalidFile);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type: test.exe/i)).toBeInTheDocument();
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  test('validates file size', async () => {
    render(<FileUpload onUpload={mockOnUpload} maxSize={1024} />); // 1KB limit
    
    const largeFile = new File(['x'.repeat(2000)], 'large.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose files/i);
    
    await userEvent.upload(input, largeFile);
    
    await waitFor(() => {
      expect(screen.getByText(/large.pdf exceeds maximum size/i)).toBeInTheDocument();
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  test('shows upload progress', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose files/i);
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('Uploading files...')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('handles drag and drop', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText('Drag and drop files here or click to browse').parentElement;
    const file = new File(['test'], 'dropped.pdf', { type: 'application/pdf' });
    
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', getAsFile: () => file }],
      types: ['Files']
    };
    
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone, { dataTransfer });
    
    await waitFor(() => {
      expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
    });
  });

  test('accepts custom file types', () => {
    render(<FileUpload onUpload={mockOnUpload} acceptedTypes={['.txt', '.csv']} />);
    
    expect(screen.getByText(/Accepted:.*\.txt, \.csv/)).toBeInTheDocument();
  });

  test('displays custom max size', () => {
    render(<FileUpload onUpload={mockOnUpload} maxSize={5242880} />); // 5MB
    
    expect(screen.getByText(/Max size:.*5MB/)).toBeInTheDocument();
  });

  test('calls onUpload with selected files', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/choose files/i);
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    }, { timeout: 2000 });
  });

  test('handles mixed valid and invalid files', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const files = [
      new File(['valid'], 'valid.pdf', { type: 'application/pdf' }),
      new File(['invalid'], 'invalid.exe', { type: 'application/exe' })
    ];
    
    const input = screen.getByLabelText(/choose files/i);
    await userEvent.upload(input, files);
    
    await waitFor(() => {
      expect(screen.getByText('valid.pdf')).toBeInTheDocument();
      expect(screen.getByText(/Invalid file type: invalid.exe/i)).toBeInTheDocument();
    });
    
    // Should only upload valid files
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([files[0]]);
    }, { timeout: 2000 });
  });

  test('clears errors when valid files are selected', async () => {
    render(<FileUpload onUpload={mockOnUpload} />);
    
    const invalidFile = new File(['invalid'], 'invalid.exe', { type: 'application/exe' });
    const input = screen.getByLabelText(/choose files/i);
    
    // First upload invalid file
    await userEvent.upload(input, invalidFile);
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
    
    // Then upload valid file
    const validFile = new File(['valid'], 'valid.pdf', { type: 'application/pdf' });
    await userEvent.upload(input, validFile);
    
    await waitFor(() => {
      expect(screen.queryByText(/Invalid file type/i)).not.toBeInTheDocument();
      expect(screen.getByText('valid.pdf')).toBeInTheDocument();
    });
  });
});