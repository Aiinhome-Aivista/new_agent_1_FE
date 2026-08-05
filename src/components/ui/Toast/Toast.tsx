import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle className="text-button-orange" size={18} />,
    error: <AlertCircle className="text-destructive" size={18} />,
    info: <Info className="text-sky-500" size={18} />,
  };

  const bgStyles = {
    success: 'bg-card border-button-orange/30 shadow-button-orange/5',
    error: 'bg-card border-destructive/20 shadow-destructive/5',
    info: 'bg-card border-sky-500/20 shadow-sky-500/5',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed top-18 right-5 z-55 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
              className={`flex items-center justify-between p-4 rounded-xl border shadow-lg ${bgStyles[item.type]} glass transition-all`}
            >
              <div className="flex items-center gap-3">
                {icons[item.type]}
                <span className="text-sm font-medium text-foreground">{item.message}</span>
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="text-muted-foreground hover:text-foreground rounded-full p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
