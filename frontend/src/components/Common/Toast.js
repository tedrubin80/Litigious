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

// OKLCH-based semantic color tokens
const TOAST_TYPES = {
  success: {
    icon: CheckCircleIcon,
    style: {
      bg: 'oklch(0.95 0.025 145)',
      border: 'oklch(0.84 0.06 145)',
      text: 'oklch(0.35 0.10 145)',
      icon: 'oklch(0.48 0.12 145)',
    },
    defaultDuration: 3000
  },
  error: {
    icon: XCircleIcon,
    style: {
      bg: 'oklch(0.95 0.025 25)',
      border: 'oklch(0.84 0.07 25)',
      text: 'oklch(0.38 0.12 25)',
      icon: 'oklch(0.50 0.15 25)',
    },
    defaultDuration: 5000
  },
  warning: {
    icon: ExclamationTriangleIcon,
    style: {
      bg: 'oklch(0.96 0.04 75)',
      border: 'oklch(0.85 0.08 75)',
      text: 'oklch(0.40 0.10 75)',
      icon: 'oklch(0.52 0.14 75)',
    },
    defaultDuration: 4000
  },
  info: {
    icon: InformationCircleIcon,
    style: {
      bg: 'oklch(0.95 0.015 240)',
      border: 'oklch(0.85 0.05 240)',
      text: 'oklch(0.30 0.018 240)',
      icon: 'oklch(0.42 0.022 240)',
    },
    defaultDuration: 3000
  }
};

// Individual toast component
const ToastItem = ({ toast, onClose }) => {
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const { style } = config;
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
    <div
      className="max-w-sm w-full rounded-lg shadow-lg overflow-hidden transition-all duration-300 ease-out"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        transform: toast.isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: toast.isVisible ? 1 : 0,
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: style.icon }} />

          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold mb-0.5" style={{ color: style.text }}>
                {toast.title}
              </p>
            )}
            <p className="text-sm" style={{ color: style.text }}>
              {toast.message}
            </p>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium underline"
                style={{ color: style.text }}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {toast.dismissible !== false && (
            <button
              onClick={() => onClose(toast.id)}
              className="flex-shrink-0 rounded p-0.5 focus:outline-none"
              style={{ color: style.icon }}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {toast.duration > 0 && toast.showProgress !== false && (
        <div className="h-0.5 overflow-hidden" style={{ backgroundColor: style.border }}>
          <div
            className="h-full animate-shrink"
            style={{
              backgroundColor: style.icon,
              opacity: 0.6,
              animation: `shrink ${toast.duration || config.defaultDuration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// Toast container
const ToastContainer = ({ toasts, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'top-center': 'top-0 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position] || positionClasses['top-right']} p-5 space-y-3 z-50 pointer-events-none`}>
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={(id) => toast.onClose && toast.onClose(id)} />
        </div>
      ))}
    </div>
  );
};

// Toast provider
export const ToastProvider = ({ children, position = 'top-right', maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isVisible: false } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

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
      const next = [toast, ...prev];
      if (next.length > maxToasts) next.splice(maxToasts);
      return next;
    });

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isVisible: true } : t));
    }, 10);

    return id;
  }, [maxToasts, removeToast]);

  const clearToasts = useCallback(() => {
    setToasts(prev => prev.map(t => ({ ...t, isVisible: false })));
    setTimeout(() => setToasts([]), 300);
  }, []);

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

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const withToast = (Component) => {
  const WrappedComponent = (props) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
  WrappedComponent.displayName = `withToast(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Progress bar keyframe
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
    .animate-shrink { transform-origin: left; }
  `;
  document.head.appendChild(style);
}

export default ToastProvider;
