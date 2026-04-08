import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchAllContracts,
  platformConfirmExecutionContract,
  type ContractUi,
} from '../services/contractService';
import { getCurrentUser } from '../services/authService';
import type { ContractStatus } from '../database/schema';

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿',
  pending_agent_sign: '待代理签署',
  agent_signed: '代理已签署',
  pending_platform_confirm: '待平台确认',
  active: '已生效',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_agent_sign: 'bg-orange-100 text-orange-700',
  agent_signed: 'bg-blue-100 text-blue-700',
  pending_platform_confirm: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

type Filter = 'all' | ContractStatus;

export const ContractManagement: React.FC = () => {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading } = useQuery('contracts-all', fetchAllContracts);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const filtered = contracts.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.id.toLowerCase().includes(q) ||
        c.tenderSnapshot.title?.toLowerCase().includes(q) ||
        c.agentSnapshot.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = contracts.filter((c) => c.status === 'pending_platform_confirm').length;

  const handleConfirmExecution = async (contract: ContractUi) => {
    const user = getCurrentUser();
    if (!user) return;
    setConfirmingId(contract.id);
    try {
      await platformConfirmExecutionContract(contract.id, user.displayName);
      toast.success(`执行合同已确认生效！项目已自动进入执行阶段。`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '确认失败');
    } finally {
      setConfirmingId(null);
    }
  };

  const filterButtons: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending_agent_sign', label: '待代理签署' },
    { key: 'pending_platform_confirm', label: '待确认', count: pendingCount },
    { key: 'active', label: '已生效' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#0A2540]">合同管理</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索合同编号、招标标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none w-72 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              filter === btn.key
                ? 'bg-[#0A2540] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {btn.label}
            {btn.count != null && btn.count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <FileText className="w-10 h-10 mb-2" />
            <p className="text-sm">暂无合同记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">合同编号</th>
                  <th className="p-4 font-medium">类型</th>
                  <th className="p-4 font-medium">招标标题</th>
                  <th className="p-4 font-medium">代理商</th>
                  <th className="p-4 font-medium">金额</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">创建时间</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 font-mono text-xs text-[#0A2540]">{c.id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.contractType === 'award' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {c.contractType === 'award' ? '中标合同' : '执行合同'}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{c.tenderSnapshot.title || '—'}</td>
                    <td className="p-4">{c.agentSnapshot.name || '—'}</td>
                    <td className="p-4 font-medium text-[#FF6B00]">
                      {c.bidSnapshot.currency} {c.bidSnapshot.price?.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-xs">{c.createdAt?.slice(0, 10)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/contracts/${c.id}`)}
                        className="text-[#0061FF] hover:underline text-xs font-medium"
                      >
                        查看
                      </button>
                      {c.contractType === 'execution' && c.status === 'pending_platform_confirm' && (
                        <button
                          onClick={() => handleConfirmExecution(c)}
                          disabled={confirmingId === c.id}
                          className="text-white bg-green-600 px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-medium disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {confirmingId === c.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          确认生效
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
