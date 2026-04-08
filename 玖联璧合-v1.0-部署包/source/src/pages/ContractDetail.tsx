import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileSignature,
  Loader2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { ContractTemplate } from '../components/contract/ContractTemplate';
import {
  fetchContractById,
  platformConfirmExecutionContract,
  type ContractUi,
} from '../services/contractService';
import { downloadContractAsWord } from '../services/fileService';
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

export const ContractDetail: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractUi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (!contractId) return;
    setIsLoading(true);
    fetchContractById(contractId)
      .then((c) => setContract(c))
      .finally(() => setIsLoading(false));
  }, [contractId]);

  const handleConfirm = async () => {
    if (!contract) return;
    const user = getCurrentUser();
    if (!user) return;
    setIsConfirming(true);
    try {
      await platformConfirmExecutionContract(contract.id, user.displayName);
      toast.success('执行合同已确认，项目已进入执行阶段');
      // Reload
      const updated = await fetchContractById(contract.id);
      setContract(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '确认失败');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-gray-700 font-medium">合同不存在</p>
        <button onClick={() => navigate('/contracts')} className="mt-4 text-sm font-bold text-[#0061FF] hover:underline">
          返回合同列表
        </button>
      </div>
    );
  }

  const canConfirm = contract.contractType === 'execution' && contract.status === 'pending_platform_confirm';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate('/contracts')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0A2540] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> 返回合同列表
      </button>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">合同类型</p>
          <p className="font-bold text-[#0A2540]">{contract.contractType === 'award' ? '中标合同' : '执行合同'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">状态</p>
          <p className="font-bold text-[#0A2540]">{STATUS_LABELS[contract.status]}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">代理商</p>
          <p className="font-bold text-[#0A2540]">{contract.agentSnapshot.name || '—'}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">合同金额</p>
          <p className="font-bold text-[#FF6B00]">
            {contract.bidSnapshot.currency} {contract.bidSnapshot.price?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4">合同状态进度</h3>
        <div className="flex items-center gap-2 text-xs">
          {[
            { label: '生成合同', done: true },
            { label: '代理签署', done: ['agent_signed', 'pending_platform_confirm', 'active'].includes(contract.status) },
            { label: '执行合同生成', done: ['pending_platform_confirm', 'active'].includes(contract.status) || contract.contractType === 'execution' },
            { label: '平台确认', done: contract.status === 'active' },
            { label: '合同生效', done: contract.status === 'active' },
          ].map((step, idx, arr) => (
            <React.Fragment key={idx}>
              <div className={`flex items-center gap-1 ${step.done ? 'text-green-600' : 'text-gray-400'}`}>
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="font-medium whitespace-nowrap">{step.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-0.5 ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Contract body */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">合同正文</h3>
          <button
            onClick={() => downloadContractAsWord(
              contract.contractType,
              contract.tenderSnapshot,
              contract.bidSnapshot,
              contract.agentSnapshot,
              contract.platformSignee,
              contract.agentSignee
            )}
            className="px-3 py-1.5 bg-[#0A2540] text-white rounded-lg text-xs font-bold hover:bg-[#113a63] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> 下载Word文档
          </button>
        </div>
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 max-h-[500px] overflow-y-auto">
          <ContractTemplate
            contractType={contract.contractType}
            contractId={contract.id}
            tender={contract.tenderSnapshot}
            bid={contract.bidSnapshot}
            agent={contract.agentSnapshot}
          />
        </div>
      </motion.div>

      {/* Action */}
      {canConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileSignature className="w-8 h-8 text-amber-600" />
            <div>
              <h3 className="font-bold text-amber-800">执行合同待您确认</h3>
              <p className="text-sm text-amber-600 mt-1">代理商已签署，请确认后合同即刻生效，项目自动进入执行阶段。</p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isConfirming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            确认合同生效
          </button>
        </div>
      )}

      {contract.status === 'active' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-bold text-green-800">合同已生效</h3>
              <p className="text-sm text-green-600 mt-1">
                {contract.platformSignee && `平台确认人：${contract.platformSignee}`}
                {contract.platformConfirmedAt && ` · ${contract.platformConfirmedAt.slice(0, 10)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => downloadContractAsWord(
              contract.contractType,
              contract.tenderSnapshot,
              contract.bidSnapshot,
              contract.agentSnapshot,
              contract.platformSignee,
              contract.agentSignee
            )}
            className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 下载合同 (Word)
          </button>
        </div>
      )}
    </div>
  );
};
