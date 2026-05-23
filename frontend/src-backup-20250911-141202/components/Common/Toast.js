import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon, 
  XMarkIcon 
} from '../Icons';

// Toast context
const ToastContext = createContext();

// Toast types and configurations
const TOAST_TYPES = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-400',
    defaultDuration: 3000
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-400',
    defaultDuration: 5000
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-400',
    defaultDuration: 4000
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-400',
    defaultDuration: 3000
  }
};

// Individual toast component
const ToastItem = ({ toast, onClose }) => {
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || config.defaultDuration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, config.defaultDuration, onClose]);

  return (
    <div className={`
      max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg 
      transform transition-all duration-300 ease-in-out
      ${toast.isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div className="ml-3 w-0 flex-1">
            {toast.title && (
              <p className={`text-sm font-medium ${config.textColor}`}>
                {toast.title}
              </p>
            )}
            <p className={`text-sm ${config.textColor} ${toast.title ? 'mt-1' : ''}`}>
              {toast.message}
            </p>
            {toast.action && (
              <div className="mt-3">
                <button
                  onClick={toast.action.onClick}
                  className={`text-sm font-medium ${config.textColor} hover:opacity-75 underline`}
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          {toast.dismissible !== false && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => onClose(toast.id)}
                className={`
                  inline-flex ${config.textColor} hover:opacity-75 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                  rounded-md p-1
                `}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar for timed toasts */}
      {toast.duration > 0 && toast.showProgress !== false && (
        <div className={`h-1 ${config.bgColor} overflow-hidden rounded-b-lg`}>
          <div 
            className={`h-full bg-current ${config.iconColor} opacity-50 animate-shrink`}
            style={{
              animation: `shrink ${toast.duration || config.defaultDuration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

// Toast container component
const ToastContainer = ({ toasts, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'top-center': 'top-0 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-0 left-1/2 transform -translate-x-1/2'
  };

  return (
    <div className={`
      fixed ${positionClasses[position] || positionClasses['top-right']} 
      p-6 space-y-4 z-50 pointer-events-none
    `}>
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onClose={(id) => toast.onClose && toast.onClose(id)}
          />
        </div>
      ))}
    </div>
  );
};

// Toast provider component
export const ToastProvider = ({ children, position = 'top-right', maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast
  const addToast = useCallback((message, options = {}) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const toast = {
      id,
      message,
      type: options.type || 'info',
      title: options.title,
      duration: options.duration,
      dismissible: options.dismissible,
      showProgress: options.showProgress,
      action: options.action,
      isVisible: false,
      onClose: removeToast
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      // Limit number of toasts
      if (newToasts.length > maxToasts) {
        newToasts.splice(maxToasts);
      }
      return newToasts;
    });

    // Trigger animation after a short delay
    setTimeout(() => {
      setToasts(prev => prev.map(t => 
        t.id === id ? { ...t, isVisible: true } : t
      ));
    }, 10);

    return id;
  }, [maxToasts]);

  // Remove a toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, isVisible: false } : toast
    ));

    // Remove from array after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts(prev => prev.map(toast => ({ ...toast, isVisible: false })));
    setTimeout(() => {
      setToasts([]);
    }, 300);
  }, []);

  // Convenience methods for different toast types
  const toast = {
    success: (message, options = {}) => addToast(message, { ...options, type: 'success' }),
    error: (message, options = {}) => addToast(message, { ...options, type: 'error' }),
    warning: (message, options = {}) => addToast(message, { ...options, type: 'warning' }),
    info: (message, options = {}) => addToast(message, { ...options, type: 'info' }),
    add: addToast,
    remove: removeToast,
    clear: clearToasts
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} position={position} />
    </ToastContext.Provider>
  );
};

// Hook to use toast functionality
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Higher-order component to inject toast functionality
export const withToast = (Component) => {
  const WrappedComponent = (props) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
  
  WrappedComponent.displayName = `withToast(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// CSS for progress bar animation (add to your CSS file)
const styles = `
  @keyframes shrink {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
  
  .animate-shrink {
    transform-origin: left;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ToastProvider;