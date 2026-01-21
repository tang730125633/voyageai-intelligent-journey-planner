import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { GLMService } from '../services/glmService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => Promise<void>;
  currentApiKey: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && currentApiKey) {
      setApiKey(currentApiKey);
    }
  }, [isOpen, currentApiKey]);

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('请输入 API Key');
      setValidationStatus('error');
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');
    setErrorMessage('');

    try {
      const service = new GLMService(apiKey.trim());
      const isValid = await service.validateKey();

      if (isValid) {
        setValidationStatus('success');
        await onSave(apiKey.trim());
        setTimeout(() => {
          onClose();
          resetForm();
        }, 500);
      } else {
        setValidationStatus('error');
        setErrorMessage('API Key 无效，请检查后重试');
      }
    } catch (error) {
      setValidationStatus('error');
      setErrorMessage('验证失败，请检查网络连接');
    } finally {
      setIsValidating(false);
    }
  };

  const resetForm = () => {
    setApiKey('');
    setValidationStatus('idle');
    setErrorMessage('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Key size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">配置 API Key</h2>
              <p className="text-sm text-slate-500">支持智谱 GLM API</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              GLM API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidationStatus('idle');
                setErrorMessage('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              placeholder="输入你的 API Key..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />

            {/* Validation Status */}
            {validationStatus === 'success' && (
              <div className="mt-2 flex items-center gap-2 text-green-600 text-xs font-medium">
                <CheckCircle size={14} />
                <span>API Key 验证成功！</span>
              </div>
            )}
            {validationStatus === 'error' && (
              <div className="mt-2 flex items-center gap-2 text-red-500 text-xs font-medium">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Get API Key Link */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-700 mb-2 font-medium">还没有 API Key？</p>
            <button
              onClick={() => window.open('https://example.com/contact', '_blank')}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ExternalLink size={12} />
              <span>私信泽龙获取</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleValidate}
              disabled={isValidating || !apiKey.trim()}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  验证中...
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
