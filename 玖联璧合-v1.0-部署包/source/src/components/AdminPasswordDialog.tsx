import React, { useState } from 'react';
import { ShieldAlert, Loader2, Eye, EyeOff, X } from 'lucide-react';
import { verifyAdminPassword } from '../services/authService';
import { toast } from 'sonner';

interface AdminPasswordDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const AdminPasswordDialog: React.FC<AdminPasswordDialogProps> = ({
  open,
  title = '安全验证',
  description = '此操作需要管理员密码确认，请输入 admin 账号的密码。',
  onConfirm,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('请输入管理员密码');
      return;
    }
    setVerifying(true);
    try {
      const ok = await verifyAdminPassword(password.trim());
      if (!ok) {
        toast.error('管理员密码错误，请重试');
        setVerifying(false);
        return;
      }
      await onConfirm();
      setPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity"
        onClick={handleCancel}
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-red-800">{title}</h3>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">{description}</p>
            </div>
            <button type="button" onClick={handleCancel} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Admin 密码
            </label>
            <div className="relative">
              <input
                autoFocus
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                placeholder="请输入 admin 用户的密码"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="px-5 pb-4 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {verifying ? '验证中...' : '确认删除'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
