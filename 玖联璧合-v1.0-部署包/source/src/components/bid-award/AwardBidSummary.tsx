import React from 'react';
import { motion } from 'motion/react';
import { DollarSign } from 'lucide-react';
import type { AwardBidInfo } from '../../types/bidAward';

export interface AwardBidSummaryProps {
  bidInfo: AwardBidInfo;
  delay?: number;
}

export const AwardBidSummary: React.FC<AwardBidSummaryProps> = ({
  bidInfo,
  delay = 0.1,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6"
  >
    <h2 className="text-lg font-bold text-[#0A2540] flex items-center gap-2 border-b border-gray-100 pb-4">
      <DollarSign className="w-5 h-5 text-[#FF6B00]" /> 您的中标方案
    </h2>

    <div className="grid grid-cols-2 gap-6">
      <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
        <p className="text-xs font-bold text-orange-600/70 uppercase tracking-widest mb-1">
          中标总价
        </p>
        <p className="text-3xl font-black text-orange-600">
          {bidInfo.price}{' '}
          <span className="text-sm font-bold text-orange-600/70">
            {bidInfo.currency}
          </span>
        </p>
      </div>
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
        <p className="text-xs font-bold text-blue-600/70 uppercase tracking-widest mb-1">
          承诺时效
        </p>
        <p className="text-3xl font-black text-blue-600">
          {bidInfo.estimatedTime}
        </p>
      </div>
    </div>

    <div>
      <p className="text-sm font-bold text-gray-700 mb-2">投标备注说明</p>
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed border border-gray-100">
        {bidInfo.remarks}
      </div>
    </div>
  </motion.div>
);
