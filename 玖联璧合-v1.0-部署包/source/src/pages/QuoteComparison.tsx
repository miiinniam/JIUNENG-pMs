import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Send,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  awardTenderRpc,
  fetchTendersWithBidsForUi,
} from '../services/tenderService';
import type { SharedTender, TenderBidRecord } from '../types/tender';

/**
 * 定标状态机：RPC 内事务 — tender.awarded + bid accepted/rejected + project insert(executing)
 */
export const QuoteComparison: React.FC = () => {
  const { tenderId } = useParams<{ tenderId: string }>();
  const navigate = useNavigate();
  const [busyBidId, setBusyBidId] = useState<string | null>(null);

  const { data: tenders, isLoading } = useQuery('tenders-full', fetchTendersWithBidsForUi);
  const tender: SharedTender | undefined = tenders?.find((t) => t.id === tenderId);

  const handleApprove = async (bid: TenderBidRecord) => {
    if (!tenderId) return;
    setBusyBidId(bid.id);
    try {
      const { projectId, contractId } = await awardTenderRpc(tenderId, bid.id);
      toast.success(`已定标！项目 ${projectId} 已创建，中标合同 ${contractId} 已发送至代理商签署。`);
      navigate('/contracts');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '定标失败';
      toast.error(msg);
      console.error(e);
    } finally {
      setBusyBidId(null);
    }
  };

  if (isLoading && !tenders) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!tenderId || !tender) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-600">未找到招标单</p>
        <button
          type="button"
          onClick={() => navigate('/tenders')}
          className="text-[#0061FF] font-bold"
        >
          返回招标中心
        </button>
      </div>
    );
  }

  const sorted = [...tender.bids].sort((a, b) => a.price - b.price);

  return (
    <div className="h-full flex flex-col -m-6 md:-m-8">
      <div className="bg-white border-b px-6 py-4 flex items-center shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/tenders')}
          className="mr-4 text-gray-500 hover:text-[#0A2540]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0A2540]">代理报价与定标审批</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {tender.id} · {tender.title}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3 border-l-4 border-[#FF6B00] pl-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 招标摘要
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">路线</span>
                <p className="font-medium">{tender.route}</p>
              </div>
              <div>
                <span className="text-gray-500">截止</span>
                <p className="font-medium">{tender.deadline}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">货物</span>
                <p className="font-medium">{tender.cargo}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 border-l-4 border-[#0061FF] pl-2">
              报价列表（低价优先）
            </h3>
            <div className="space-y-3">
              {sorted.map((bid, index) => (
                <div
                  key={bid.id}
                  className={`bg-white p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    bid.status === 'won'
                      ? 'border-green-500 ring-1 ring-green-500'
                      : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {index === 0 && bid.status === 'pending' && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          最低价
                        </span>
                      )}
                      <span className="font-bold text-[#0A2540]">{bid.agentName}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
                        {bid.agentLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">备注: {bid.remarks}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#FF6B00]">
                      {bid.currency} {bid.price.toLocaleString()}
                    </p>
                    {tender.status === 'awarded' ? (
                      bid.status === 'won' ? (
                        <span className="inline-flex items-center text-green-600 text-sm font-bold mt-2">
                          <CheckCircle className="w-4 h-4 mr-1" /> 已中标
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm mt-2 inline-block">未中标</span>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={busyBidId !== null}
                        onClick={() => void handleApprove(bid)}
                        className="mt-2 inline-flex items-center px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-medium hover:bg-[#113a63] disabled:opacity-50"
                      >
                        {busyBidId === bid.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Trophy className="w-4 h-4 mr-2" />
                        )}
                        审批通过并发送中标通知
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sorted.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
                  暂无报价
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Send className="w-3 h-3" />
            定标后系统将自动创建状态为 executing 的执行项目，并同步至「执行项目管理」。
          </p>
        </div>
      </div>
    </div>
  );
};
