import React from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import type { AwardCargoItem, AwardTenderInfo } from '../../types/bidAward';

export interface AwardTenderSidebarProps {
  tenderInfo: AwardTenderInfo;
  delay?: number;
}

export const AwardTenderSidebar: React.FC<AwardTenderSidebarProps> = ({
  tenderInfo,
  delay = 0.3,
}) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-6"
  >
    <h2 className="text-base font-bold text-[#0A2540] mb-4 pb-3 border-b border-gray-100">
      招标项目概要
    </h2>

    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          运输路线
        </p>
        <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#0061FF]" /> {tenderInfo.route}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          业务类型
        </p>
        <p className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
          {tenderInfo.type}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          货物清单
        </p>
        <div className="space-y-2">
          {tenderInfo.cargoList.length === 0 ? (
            <p className="text-xs text-gray-400">暂无货物明细</p>
          ) : (
            tenderInfo.cargoList.map((cargo: AwardCargoItem) => (
              <div
                key={String(cargo.id)}
                className="bg-gray-50 p-3 rounded-xl border border-gray-100"
              >
                <p className="text-sm font-bold text-[#0A2540]">{cargo.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {cargo.weight} | {cargo.volume} | {cargo.pkg}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          特殊要求
        </p>
        <p className="text-xs text-gray-600 leading-relaxed bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
          {tenderInfo.requirements}
        </p>
      </div>
    </div>
  </motion.div>
);
