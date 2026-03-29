
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration?: number; // Optional duration in ms. 0 = infinite.
}

let toastId = 0;
const toastListeners = new Set<(toast: ToastMessage) => void>();

// Updated signature to accept duration
export const toast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
  toastId += 1;
  const newToast: ToastMessage = { id: toastId, message, type, duration };
  toastListeners.forEach(listener => listener(newToast));
};

const typeStyles = {
  success: {
    bg: 'bg-[var(--toast-success-background)]',
    text: 'text-[var(--toast-success-foreground)]',
    icon: <CheckCircle className="h-5 w-5" />,
  },
  error: {
    bg: 'bg-[var(--toast-error-background)]',
    text: 'text-[var(--toast-error-foreground)]',
    icon: <XCircle className="h-5 w-5" />,
  },
  info: {
    bg: 'bg-[var(--toast-info-background)]',
    text: 'text-[var(--toast-info-foreground)]',
    icon: <Info className="h-5 w-5" />,
  },
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const addToast = (newToast: ToastMessage) => {
      setToasts(currentToasts => [...currentToasts, newToast]);

      // Only set timeout if duration is not 0 (0 means persistent/manual close only)
      if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(t => t.id !== newToast.id));
          }, newToast.duration);
      }
    };

    toastListeners.add(addToast);
    return () => {
      toastListeners.delete(addToast);
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-3">
      {toasts.map(({ id, message, type }) => {
        const styles = typeStyles[type];
        return (
          <div
            key={id}
            className={`flex items-center justify-between max-w-sm w-full p-4 rounded-lg shadow-lg border border-black/5 animate-in slide-in-from-right-5 fade-in duration-300 ${styles.bg} ${styles.text}`}
          >
            <div className="flex items-center">
              <span className="mr-3 flex-shrink-0">{styles.icon}</span>
              <span className="font-semibold text-sm">{message}</span>
            </div>
            <button 
                onClick={() => removeToast(id)} 
                className={`ml-4 -mr-2 p-1.5 rounded-full hover:bg-black/10 transition-colors`}
                title="Close"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
};
