"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertMessageProps {
  type: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  message: string | React.ReactNode;
  className?: string;
}

const alertStyles = {
  error: {
    bg: 'bg-red-50 border-red-500 text-red-700',
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  success: {
    bg: 'bg-green-50 border-green-500 text-green-700',
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-500 text-yellow-700',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-500 text-blue-700',
    icon: <Info className="h-5 w-5 text-blue-500" />,
  },
};

export default function AlertMessage({ type, title, message, className }: AlertMessageProps) {
  const styles = alertStyles[type];
  return (
    <div className={`p-4 border-l-4 rounded-md ${styles.bg} ${className || ''}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={`text-sm ${title ? 'mt-2' : ''}`}>
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        </div>
      </div>
    </div>
  );
}
