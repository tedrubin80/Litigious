import React, { Component } from 'react';
import axios from 'axios';

class ErrorMonitor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('Error caught by ErrorMonitor:', error, errorInfo);
    
    // Generate error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId
    });
    
    // Send error to backend monitoring service
    this.logErrorToBackend(error, errorInfo, errorId);
  }

  logErrorToBackend = async (error, errorInfo, errorId) => {
    try {
      const token = localStorage.getItem('token');
      const errorData = {
        message: error.toString(),
        stack: error.stack,
        component: errorInfo.componentStack,
        severity: 'HIGH',
        additionalData: {
          errorId,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      };

      await axios.post('/api/monitoring/errors/client', errorData, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        }
      });
    } catch (logError) {
      console.error('Failed to log error to backend:', logError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
    
    // Optionally reload the page
    if (this.props.autoReload) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg
                className="h-8 w-8 text-red-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
            </div>
            
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. The error has been logged and our team will look into it.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                  <p className="font-semibold mb-1">Error ID: {this.state.errorId}</p>
                  <p className="font-semibold mb-1">Error:</p>
                  <pre className="whitespace-pre-wrap break-words">
                    {this.state.error && this.state.error.toString()}
                  </pre>
                  {this.state.error?.stack && (
                    <>
                      <p className="font-semibold mt-2 mb-1">Stack:</p>
                      <pre className="whitespace-pre-wrap break-words text-red-600">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <p className="font-semibold mt-2 mb-1">Component Stack:</p>
                      <pre className="whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
              >
                Go Home
              </button>
            </div>
            
            {this.state.errorId && (
              <p className="text-xs text-gray-500 mt-4 text-center">
                Error Reference: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorMonitor;