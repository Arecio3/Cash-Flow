import { useState, useCallback, useMemo } from 'react';
import { Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { ToastContext } from '../hooks/useToast';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-portal-container">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }) {
  const { message, type } = toast;
  
  const icon = useMemo(() => {
    switch (type) {
      case 'success': return <Check size={16} className="toast-icon-svg" />;
      case 'error': return <AlertCircle size={16} className="toast-icon-svg" />;
      case 'warning': return <AlertTriangle size={16} className="toast-icon-svg" />;
      case 'info': return <Info size={16} className="toast-icon-svg" />;
      default: return null;
    }
  }, [type]);

  return (
    <div className={`toast-message-item ${type}`}>
      <div className="toast-content">
        {icon}
        <span className="toast-text">{message}</span>
      </div>
      <button onClick={onClose} className="toast-close-btn" type="button" aria-label="Dismiss toast">
        <X size={14} />
      </button>
      <div className="toast-progress-bar">
        <div className="toast-progress-bar-fill" />
      </div>
    </div>
  );
}

export default ToastProvider;
