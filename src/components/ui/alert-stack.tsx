import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AlertOptions {
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

// Singleton pattern for managing alerts across the app
class AlertManager {
  private static instance: AlertManager;
  private subscribers: Set<(message: string, options?: AlertOptions) => void>;

  private constructor() {
    this.subscribers = new Set();
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  public subscribe(callback: (message: string, options?: AlertOptions) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public show(message: string, options?: AlertOptions) {
    this.subscribers.forEach(callback => callback(message, options));
  }
}

export const alertManager = AlertManager.getInstance();

export function AlertStack() {
  useEffect(() => {
    const unsubscribe = alertManager.subscribe((message, options) => {
      switch (options?.type) {
        case 'success':
          toast.success(message, {
            duration: options?.duration || 3000,
          });
          break;
        case 'error':
          toast.error(message, {
            duration: options?.duration || 5000,
          });
          break;
        default:
          toast(message, {
            duration: options?.duration || 3000,
          });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Toaster 
      position="top-right"
      expand={false}
      richColors
      closeButton
    />
  );
} 