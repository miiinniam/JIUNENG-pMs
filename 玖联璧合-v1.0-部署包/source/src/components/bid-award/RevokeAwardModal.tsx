import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export interface RevokeAwardModalProps {
  open: boolean;
  awardTitle: string;
  revokeChancesRemaining: number;
  isRevoking: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ANNUAL_REVOKE_LIMIT = 3;

export const RevokeAwardModal: React.FC<RevokeAwardModalProps> = ({
  open,
  awardTitle,
  revokeChancesRemaining,
  isRevoking,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !isRevoking && onClose()}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-award-title"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3
            id="revoke-award-title"
            className="text-lg font-bold text-gray-900 flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
            确认撤销中标资格？
          </h3>
          <button
            type="button"
            disabled={isRevoking}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            您正在申请撤销{' '}
            <span className="font-bold text-gray-900">&quot;{awardTitle}&quot;</span>{' '}
            的中标资格。此操作不可逆，且会影响您的平台信誉。
          </p>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm font-bold text-red-800 mb-1">撤销资格警告</p>
            <p className="text-xs text-red-600/80 leading-relaxed">
              每个代理商每年仅有{' '}
              <span className="font-bold text-red-600 text-sm">
                {ANNUAL_REVOKE_LIMIT}
              </span>{' '}
              次撤销中标资格的机会。您当前剩余{' '}
              <span className="font-bold text-red-600 text-sm">
                {revokeChancesRemaining}
              </span>{' '}
              次机会。
              <br />
              <br />
              <span className="font-bold">注意：</span>
              三次机会用完后，您将被永久取消平台投标资格！
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isRevoking}
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 bg-white border border-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            暂不撤销
          </button>
          <button
            type="button"
            disabled={isRevoking || revokeChancesRemaining <= 0}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isRevoking && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRevoking ? '提交中...' : '确认撤销'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
