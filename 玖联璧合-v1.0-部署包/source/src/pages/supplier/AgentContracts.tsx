import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { useQuery } from '../../hooks/useQuery';
import { fetchContractsForAgent, type ContractUi } from '../../services/contractService';
import { getCurrentUser } from '../../services/authService';
import type { ContractStatus } from '../../database/schema';

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿',
  pending_agent_sign: '待签署',
  agent_signed: '已签署',
  pending_platform_confirm: '等待平台确认',
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

export default function AgentContracts() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const agentId = user?.agentId ?? '';

  const { data: contracts = [], isLoading } = useQuery(
    `agent-contracts-${agentId}`,
    () => fetchContractsForAgent(agentId)
  );

  const pendingSign = contracts.filter((c) => c.contractType === 'award' && c.status === 'pending_agent_sign');
  const otherContracts = contracts.filter((c) => !(c.contractType === 'award' && c.status === 'pending_agent_sign'));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-[#0A2540]">我的合同</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无合同记录</p>
          <p className="text-sm text-gray-400 mt-1">中标后系统将自动生成合同</p>
        </div>
      ) : (
        <>
          {/* Pending sign section */}
          {pendingSign.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-orange-600 flex items-center gap-2">
                <FileSignature className="w-4 h-4" /> 待签署合同 ({pendingSign.length})
              </h2>
              {pendingSign.map((c) => (
                <ContractCard key={c.id} contract={c} onView={() => navigate(`/supplier/contract/${c.id}`)} highlight />
              ))}
            </div>
          )}

          {/* All contracts */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-600">全部合同</h2>
            {(pendingSign.length > 0 ? otherContracts : contracts).map((c) => (
              <ContractCard key={c.id} contract={c} onView={() => navigate(`/supplier/contract/${c.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ContractCard({ contract: c, onView, highlight }: { key?: React.Key; contract: ContractUi; onView: () => void | Promise<void>; highlight?: boolean }) {
  return (
    <div
      className={`bg-white rounded-xl p-5 border shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow ${
        highlight ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'
      }`}
      onClick={onView}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          c.status === 'active' ? 'bg-green-50 text-green-600'
          : c.status === 'pending_agent_sign' ? 'bg-orange-50 text-orange-600'
          : 'bg-blue-50 text-blue-600'
        }`}>
          {c.status === 'active' ? <CheckCircle2 className="w-5 h-5" /> :
           c.status === 'pending_agent_sign' ? <FileSignature className="w-5 h-5" /> :
           <Clock className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-medium text-[#0A2540]">
            {c.contractType === 'award' ? '中标合同' : '执行合同'}
            <span className="text-xs text-gray-400 ml-2">{c.id}</span>
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {c.tenderSnapshot.title || '—'} · {c.bidSnapshot.currency} {c.bidSnapshot.price?.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
          {STATUS_LABELS[c.status]}
        </span>
        <span className="text-xs text-gray-400">{c.createdAt?.slice(0, 10)}</span>
      </div>
    </div>
  );
}
