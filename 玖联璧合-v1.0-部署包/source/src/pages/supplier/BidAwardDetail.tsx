import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { AwardBidSummary } from '../../components/bid-award/AwardBidSummary';
import { AwardDetailHero } from '../../components/bid-award/AwardDetailHero';
import { AwardNextSteps } from '../../components/bid-award/AwardNextSteps';
import { AwardTenderSidebar } from '../../components/bid-award/AwardTenderSidebar';
import { RevokeAwardModal } from '../../components/bid-award/RevokeAwardModal';
import { ApiError } from '../../services/http';
import { fetchAwardById, revokeAward } from '../../services/awardService';
import { fetchContractByBidId } from '../../services/contractService';
import type { BidAwardDetailData } from '../../types/bidAward';

export default function BidAwardDetail() {
  const { id: awardId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [awardData, setAwardData] = useState<BidAwardDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!awardId) {
      setAwardData(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setAwardData(null);
    try {
      const data = await fetchAwardById(awardId);
      setAwardData(data);
      // Try to find the associated contract
      const c = await fetchContractByBidId(awardId);
      if (c) setContractId(c.id);
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : '加载失败，请稍后重试';
      setLoadError(message);
      console.error('[BidAwardDetail] 加载中标详情失败', e);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [awardId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSignContract = () => {
    if (contractId) {
      navigate(`/supplier/contract/${contractId}`);
    } else if (awardId) {
      navigate(`/supplier/contract/${awardId}`);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!awardId) return;
    setIsRevoking(true);
    try {
      const res = await revokeAward(awardId);
      const next =
        res?.revokeChancesRemaining ?? res?.revoke_chances_remaining;
      if (typeof next === 'number') {
        setAwardData((prev) =>
          prev ? { ...prev, revokeChancesRemaining: next } : prev
        );
      }
      toast.success(res?.message ?? '已成功提交撤销中标资格申请。');
      setIsRevokeModalOpen(false);
      navigate('/supplier/bidding');
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : '撤销申请失败';
      console.error('[BidAwardDetail] 撤销中标失败', e);
      toast.error(message);
    } finally {
      setIsRevoking(false);
    }
  };

  if (!awardId) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-24 text-center px-4">
        <Inbox className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">缺少中标通知单 ID</p>
        <button
          type="button"
          onClick={() => navigate('/supplier/notifications')}
          className="mt-4 text-sm font-bold text-[#0061FF] hover:underline"
        >
          返回通知列表
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (loadError && !awardData) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">无法加载中标详情</p>
        <p className="text-sm text-gray-500 mb-6 max-w-md">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            返回
          </button>
          <button
            type="button"
            onClick={() => void loadDetail()}
            className="px-4 py-2 text-sm font-bold text-white bg-[#0A2540] rounded-xl hover:bg-[#113a63]"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!awardData) {
    return null;
  }

  const canRevoke = awardData.revokeChancesRemaining > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-[#0A2540] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> 返回通知列表
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            disabled={!canRevoke}
            title={!canRevoke ? '本年度撤销次数已用完' : undefined}
            onClick={() => setIsRevokeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <XCircle className="w-4 h-4" /> 申请撤销中标
          </button>
          <button
            type="button"
            onClick={handleSignContract}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-bold hover:bg-[#e66000] transition-colors shadow-lg shadow-orange-500/20"
          >
            <CheckCircle2 className="w-4 h-4" /> 立即签署合同
          </button>
        </div>
      </div>

      <AwardDetailHero
        status={awardData.status}
        awardId={awardData.id}
        title={awardData.title}
        awardDate={awardData.awardDate}
        deadline={awardData.deadline}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <AwardBidSummary bidInfo={awardData.bidInfo} />
          <AwardNextSteps onSignContract={handleSignContract} />
        </div>
        <div className="space-y-6">
          <AwardTenderSidebar tenderInfo={awardData.tenderInfo} />
        </div>
      </div>

      <RevokeAwardModal
        open={isRevokeModalOpen}
        awardTitle={awardData.title}
        revokeChancesRemaining={awardData.revokeChancesRemaining}
        isRevoking={isRevoking}
        onClose={() => !isRevoking && setIsRevokeModalOpen(false)}
        onConfirm={() => void handleConfirmRevoke()}
      />
    </div>
  );
}
