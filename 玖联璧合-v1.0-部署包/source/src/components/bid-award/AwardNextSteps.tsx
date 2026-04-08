import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, FileText, Package } from 'lucide-react';

export interface AwardNextStepsProps {
  onSignContract: () => void;
  delay?: number;
}

export const AwardNextSteps: React.FC<AwardNextStepsProps> = ({
  onSignContract,
  delay = 0.2,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6"
  >
    <h2 className="text-lg font-bold text-[#0A2540] flex items-center gap-2 border-b border-gray-100 pb-4">
      <AlertCircle className="w-5 h-5 text-[#0061FF]" /> 后续操作指引
    </h2>

    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#FF6B00] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
          <h3 className="font-bold text-orange-800 text-sm">1. 确认中标通知</h3>
          <p className="text-xs text-orange-600/80 mt-1">您已收到并查看中标通知书。</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
          <FileText className="w-5 h-5" />
        </div>
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 text-sm">2. 签署运输合同</h3>
          <p className="text-xs text-gray-500 mt-1">
            请在3个工作日内完成线上合同签署。
          </p>
          <button
            type="button"
            onClick={onSignContract}
            className="mt-3 text-xs font-bold text-[#0061FF] hover:underline"
          >
            去签署 &rarr;
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gray-200 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
          <Package className="w-5 h-5" />
        </div>
        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 text-sm">3. 提货与发运</h3>
          <p className="text-xs text-gray-500 mt-1">
            合同签署后，请按照约定时间前往指定地点提货。
          </p>
        </div>
      </div>
    </div>
  </motion.div>
);
