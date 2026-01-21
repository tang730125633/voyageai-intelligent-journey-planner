
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md animate-slide-in">
      <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle size={18} className="text-red-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Oops! Something went wrong</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ErrorNotification;
