import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  FileSignature,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { ContractTemplate } from '../../components/contract/ContractTemplate';
import {
  fetchContractById,
  agentConfirmAwardContract,
  type ContractUi,
} from '../../services/contractService';
import { downloadContractAsWord } from '../../services/fileService';
import { getCurrentUser } from '../../services/authService';

export default function ContractSign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractUi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchContractById(id)
      .then((c) => {
        if (!c) {
          setLoadError('合同不存在或已失效');
        } else {
          setContract(c);
        }
      })
      .catch(() => setLoadError('加载合同失败'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSign = async () => {
    if (!contract) return;
    const user = getCurrentUser();
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setIsSigning(true);
    try {
      if (contract.contractType === 'award' && contract.status === 'pending_agent_sign') {
        const { executionContractId } = await agentConfirmAwardContract(
          contract.id,
          user.displayName
        );
        toast.success('中标合同已签署！执行合同已自动生成并发送给平台确认。');
        navigate(`/supplier/contract/${executionContractId}`, { replace: true });
      } else {
        toast.info('该合同无需您签署操作');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '签署失败');
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (loadError || !contract) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">{loadError || '合同不存在'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 text-sm font-bold text-white bg-[#0A2540] rounded-xl hover:bg-[#113a63]"
        >
          返回
        </button>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
    pending_agent_sign: {
      label: '待签署',
      color: 'orange',
      icon: <FileSignature className="w-5 h-5" />,
      desc: '请仔细阅读合同条款后签署确认',
    },
    agent_signed: {
      label: '已签署（等待平台确认执行合同）',
      color: 'blue',
      icon: <CheckCircle2 className="w-5 h-5" />,
      desc: '您已签署中标合同，执行合同已自动发送给平台审核',
    },
    pending_platform_confirm: {
      label: '执行合同待平台确认',
      color: 'blue',
      icon: <Clock className="w-5 h-5" />,
      desc: '执行合同已生成，等待平台方确认签署后即可开始执行项目',
    },
    active: {
      label: '合同已生效',
      color: 'green',
      icon: <CheckCircle2 className="w-5 h-5" />,
      desc: '合同双方均已确认，项目已进入执行阶段',
    },
  };

  const cfg = statusConfig[contract.status] ?? {
    label: contract.status,
    color: 'gray',
    icon: <FileText className="w-5 h-5" />,
    desc: '',
  };

  const canSign = contract.contractType === 'award' && contract.status === 'pending_agent_sign';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-[#0A2540] transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              cfg.color === 'green' ? 'bg-green-50 text-green-600'
              : cfg.color === 'orange' ? 'bg-orange-50 text-orange-600'
              : cfg.color === 'blue' ? 'bg-blue-50 text-blue-600'
              : 'bg-gray-50 text-gray-600'
            }`}>
              {cfg.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {contract.contractType === 'award' ? '中标合同' : '执行合同'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                合同编号: {contract.id}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            cfg.color === 'green' ? 'bg-green-100 text-green-700'
            : cfg.color === 'orange' ? 'bg-orange-100 text-orange-700'
            : cfg.color === 'blue' ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700'
          }`}>
            {cfg.label}
          </span>
        </div>

        {/* Status banner */}
        {cfg.desc && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${
            cfg.color === 'green' ? 'bg-green-50 border-green-200 text-green-800'
            : cfg.color === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {cfg.desc}
          </div>
        )}

        {/* Contract content */}
        <div className="mb-8">
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
        </div>

        {/* Actions */}
        {canSign ? (
          <div className="flex items-center justify-between bg-white border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              点击签署即代表您已阅读并同意上述合同条款
            </div>
            <button
              onClick={handleSign}
              disabled={isSigning}
              className="px-8 py-3 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-[#e66000] transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-70 flex items-center gap-2"
            >
              {isSigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 签署中...
                </>
              ) : (
                <>
                  <FileSignature className="w-5 h-5" /> 确认并签署合同
                </>
              )}
            </button>
          </div>
        ) : contract.status === 'active' ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-green-800">合同已生效</h3>
                <p className="text-sm text-green-600 mt-1">项目已自动进入执行阶段，请前往工作台查看。</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => downloadContractAsWord(
                  contract.contractType,
                  contract.tenderSnapshot,
                  contract.bidSnapshot,
                  contract.agentSnapshot,
                  contract.platformSignee,
                  contract.agentSignee
                )}
                className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> 下载副本 (Word)
              </button>
              <button
                onClick={() => navigate('/supplier')}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
              >
                返回工作台
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center gap-4">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <h3 className="font-bold text-blue-800">等待平台确认</h3>
              <p className="text-sm text-blue-600 mt-1">
                执行合同已发送至平台方，确认后项目将自动开始执行。
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
