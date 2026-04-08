import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FilePlus,
  Search,
  Filter,
  Clock,
  MapPin,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '../../hooks/useQuery';
import { fetchTendersForAgentPool } from '../../services/tenderService';
import { getCurrentUser } from '../../services/authService';
import type { SharedTender } from '../../types/tender';

export const BiddingCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'my' ? 'my' : 'open';

  const user = getCurrentUser();
  const agentId = user?.agentId ?? '';

  const { data: pool = [], isLoading } = useQuery(
    `agent-tenders-${agentId || 'none'}`,
    () => fetchTendersForAgentPool(agentId || undefined)
  );

  const openTenders = useMemo(
    () =>
      pool.filter(
        (t) => t.status === 'bidding' || t.status === 'evaluating'
      ),
    [pool]
  );

  const myTenders = useMemo(
    () =>
      pool.filter((t) =>
        agentId ? t.bids.some((b) => b.agentId === agentId) : false
      ),
    [pool, agentId]
  );

  const list: SharedTender[] = tab === 'my' ? myTenders : openTenders;

  const budgetLabel = (t: SharedTender) => {
    if (!t.bids.length) return '开放竞价';
    const min = Math.min(...t.bids.map((b) => b.price));
    return `已报最低 ¥${min.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">投标中心</h1>
          <p className="text-gray-500 mt-1">
            仅展示定向邀标中包含本账号代理商 ID 的标单（链式 .contains，模拟 RLS）。
          </p>
        </div>
        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all',
              tab === 'open'
                ? 'bg-white text-[#0061FF] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            招标大厅
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'my' })}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-bold transition-all',
              tab === 'my'
                ? 'bg-white text-[#0061FF] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            我的报价
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
          <input
            type="text"
            placeholder="搜索招标项目名称、编号..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all shadow-sm"
          />
        </div>
        <button
          type="button"
          className="px-6 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
        >
          <Filter className="w-4 h-4" /> 筛选条件
        </button>
      </div>

      {!agentId ? (
        <div className="text-center py-20 text-amber-700 text-sm bg-amber-50 rounded-3xl border border-amber-100">
          未识别代理商身份（session 缺少 agent_id），请重新从代理入口登录。
        </div>
      ) : isLoading ? (
        <div className="text-center py-20 text-gray-500">加载中…</div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-sm bg-white rounded-3xl border border-gray-100">
          {tab === 'my'
            ? '暂无已提交的报价。'
            : '当前没有进行中的招标。'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {list.map((tender, idx) => (
            <motion.div
              key={tender.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all group"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {tender.id}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#0061FF] transition-colors">
                      {tender.title}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-medium">报价动态</p>
                    <p className="text-lg font-black text-orange-500">
                      {budgetLabel(tender)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      起运地
                    </p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-gray-700">
                        {tender.origin ??
                          tender.route.split('→')[0]?.trim() ??
                          '—'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      目的地
                    </p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-bold text-gray-700">
                        {tender.destination ??
                          tender.route.split('→')[1]?.trim() ??
                          '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Clock className="w-4 h-4 text-orange-400" />
                      截止: {tender.deadline}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Truck className="w-4 h-4 text-blue-400" />
                      跨境运输
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/supplier/bid/${tender.id}`)}
                    className="px-6 py-2.5 bg-[#0A2540] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a5a] transition-all flex items-center gap-2 group/btn"
                  >
                    {tab === 'my'
                      ? '查看详情'
                      : (() => {
                          const closed =
                            !!tender.deadline_at &&
                            Date.now() > new Date(tender.deadline_at).getTime();
                          const done = tender.status === 'awarded';
                          const mine = agentId
                            ? tender.bids.some((b) => b.agentId === agentId)
                            : false;
                          if (closed) return '查看（已截止）';
                          if (done) return '查看（已定标）';
                          if (mine) return '查看（已报价）';
                          return '立即投标';
                        })()}{' '}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4">
                <FilePlus className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  已有 {tender.bids.length} 家报价
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
