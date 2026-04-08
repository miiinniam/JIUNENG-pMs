import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Trophy,
  Bell,
  CheckCircle2,
  Calendar,
  ArrowRight,
  FileText,
  Inbox,
  Loader2,
} from 'lucide-react';
import { useQuery } from '../../hooks/useQuery';
import { fetchAcceptedBidsForAgent } from '../../services/tenderService';
import { downloadAwardNotice } from '../../services/fileService';
import { getCurrentUser } from '../../services/authService';
import type { BidRow, TenderRow } from '../../database/schema';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const agentId = user?.agentId ?? '';

  const fetcher = useCallback(
    () => fetchAcceptedBidsForAgent(agentId),
    [agentId]
  );
  const { data: awardedBids = [], isLoading } = useQuery<Array<{ bid: BidRow; tender: TenderRow }>>(
    `accepted-bids-${agentId}`,
    fetcher
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">中标通知与消息</h1>
          <p className="text-gray-500 mt-1">查看您的中标结果、审核进度及系统重要通知。</p>
        </div>
        {awardedBids.length > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
            <Bell className="w-4 h-4" />
            {awardedBids.length} 条中标通知
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : awardedBids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100">
          <Inbox className="w-14 h-14 text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">暂无中标通知</p>
          <p className="text-sm text-gray-400 mt-1">您目前没有中标记录</p>
        </div>
      ) : (
        <div className="space-y-6">
          {awardedBids.map(({ bid, tender }, idx) => (
            <motion.div
              key={bid.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden transition-all hover:shadow-xl hover:shadow-gray-200/50"
            >
              <div className="p-6 md:p-8 flex gap-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-orange-500 text-white">
                  <Trophy className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      恭喜！您已中标【{tender.title}】
                    </h3>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(bid.updated_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed">
                    经平台综合评审，您的报价方案在价格及时效方面表现优异，现正式授予您该项目的承运权。
                  </p>

                  <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">中标金额</p>
                      <p className="text-lg font-black text-orange-500">
                        {bid.currency} {bid.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">运输路线</p>
                      <p className="text-sm font-bold text-gray-700">{tender.route_label}</p>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/supplier/award/${bid.id}`)}
                        className="w-full py-2 bg-white border border-gray-200 text-[#0061FF] text-xs font-bold rounded-xl hover:bg-[#0061FF] hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        查看详情 <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => downloadAwardNotice(
                        tender.title,
                        tender.route_label,
                        bid.price,
                        bid.currency,
                      )}
                      className="text-xs font-bold text-[#0061FF] hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> 下载中标通知书 (Word)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/supplier/award/${bid.id}`)}
                      className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> 立即签署合同
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
