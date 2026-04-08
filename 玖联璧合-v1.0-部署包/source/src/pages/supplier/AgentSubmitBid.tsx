import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Package,
  AlertCircle,
  Upload,
  CheckCircle,
  Send,
  FileText,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '../../hooks/useQuery';
import {
  fetchTenderVisibleToAgent,
  insertBidRow,
} from '../../services/tenderService';
import { getCurrentUser } from '../../services/authService';
import { formatFileSize, ACCEPT_STRING } from '../../services/fileService';

export default function AgentSubmitBid() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getCurrentUser();
  const agentId = user?.agentId;

  const { data: tender, isLoading } = useQuery(
    `agent-tender-${id ?? ''}-${agentId ?? 'na'}`,
    async () => {
      if (!id) return null;
      return fetchTenderVisibleToAgent(id, agentId);
    }
  );

  const [bidForm, setBidForm] = useState({
    price: '',
    currency: 'CNY',
    time: '',
    remark: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bidFiles, setBidFiles] = useState<File[]>([]);
  const bidFileRef = React.useRef<HTMLInputElement>(null);
  const [hasInitForm, setHasInitForm] = useState(false);

  useEffect(() => {
    if (tender && agentId && !hasInitForm) {
      const myBid = tender.bids.find((b) => b.agentId === agentId);
      if (myBid) {
        setBidForm({
          price: String(myBid.price),
          currency: myBid.currency,
          time: myBid.estimatedTime || '',
          remark: myBid.remarks || '',
        });
      }
      setHasInitForm(true);
    }
  }, [tender, agentId, hasInitForm]);

  const readOnlyReason = useMemo(() => {
    if (!tender || !agentId) return null;
    const deadlineMs = tender.deadline_at
      ? new Date(tender.deadline_at).getTime()
      : NaN;
    const deadlinePassed =
      Number.isFinite(deadlineMs) && Date.now() > deadlineMs;
    const myBid = tender.bids.find((b) => b.agentId === agentId);
    if (tender.status === 'awarded') {
      const won = tender.bids.some(
        (b) => b.agentId === agentId && b.status === 'won'
      );
      return won
        ? '该标单已定标，您已中标，报价单为只读。'
        : '该标单已定标，无法再次修改报价。';
    }
    if (deadlinePassed) return '报价截止时间已过，仅可查看需求信息。';
    if (myBid && (myBid.editCount ?? 0) >= 2) return '您已提交过报价，且修改次数已达上限（2次）。';
    return null;
  }, [tender, agentId]);

  const readOnly = readOnlyReason != null;
  const myBidData = tender?.bids.find((b) => b.agentId === agentId);

  if (!id) {
    return (
      <div className="p-8 text-center text-gray-500">
        缺少招标单号
        <button
          type="button"
          onClick={() => navigate('/supplier/bidding')}
          className="block mx-auto mt-4 text-[#0061FF] font-bold"
        >
          返回招标大厅
        </button>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-amber-800 font-medium">
          会话中缺少代理商标识 (agent_id)，请从代理入口重新登录。
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm"
        >
          去登录
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-16 text-center text-gray-500 text-sm">加载招标单…</div>
    );
  }

  if (!tender) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-gray-800 font-medium">
          未找到该招标单，或您未被邀请参与（定向邀标权限隔离）。
        </p>
        <p className="text-xs text-gray-500">
          若您认为有误，请联系内部运营确认 invited_agent_ids 是否包含 {agentId}。
        </p>
        <button
          type="button"
          onClick={() => navigate('/supplier/bidding')}
          className="px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm"
        >
          返回招标大厅
        </button>
      </div>
    );
  }

  const tenderInfo = {
    id: tender.id,
    title: tender.title,
    deadline: tender.deadline,
    route: tender.route,
    type: tender.bizType ?? '跨境干线',
    cargoList:
      tender.cargoList && tender.cargoList.length > 0
        ? tender.cargoList
        : [
            {
              id: 1,
              name: tender.cargo,
              spec: '—',
              weight: '—',
              volume: '—',
              pkg: '—',
            },
          ],
    requirements:
      tender.requirements ?? '详见招标说明，如有疑问请联系招标方。',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!user?.agentId) {
      toast.error('无法识别代理商身份，请重新登录');
      return;
    }
    setIsSubmitting(true);
    try {
      await insertBidRow(tender.id, user.agentId, {
        price: Number(bidForm.price),
        currency: bidForm.currency,
        estimatedTime: bidForm.time,
        remarks: bidForm.remark,
      });
      setIsSuccess(true);
      toast.success('报价已写入 bids 表');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败';
      toast.error(msg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const isEdit = tender?.bids.some((b) => b.agentId === agentId);
    return (
      <div className="h-full flex items-center justify-center bg-[#F8F9FA] p-6 min-h-[80vh]">
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0A2540] mb-2">{isEdit ? '报价修改成功！' : '投标提交成功！'}</h2>
          <p className="text-gray-500 text-sm mb-6">
            数据已持久化到 Mock 数据库，内部端将自动刷新。
          </p>
          <button
            type="button"
            onClick={() => navigate('/supplier/bidding')}
            className="px-6 py-2 bg-[#0A2540] text-white rounded-lg hover:bg-[#113a63]"
          >
            返回招标大厅
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <div className="bg-white border-b px-6 py-4 flex items-center sticky top-0 z-10 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-500 hover:text-[#0A2540] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[#0A2540]">提交报价单</h1>
        <div className="ml-auto flex items-center text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4 mr-1.5" /> 截标时间: {tenderInfo.deadline}
        </div>
      </div>

      {readOnly && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>只读模式：</strong>
            {readOnlyReason}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-6 px-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#0A2540] mb-2">{tenderInfo.title}</h2>
            <p className="text-xs text-gray-400 mb-6">招标单号: {tenderInfo.id}</p>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">物流路线</div>
                <div className="font-medium flex items-center text-[#0A2540]">
                  <MapPin className="w-4 h-4 mr-1 text-[#FF6B00]" /> {tenderInfo.route}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">业务类型</div>
                <div className="font-medium text-[#0A2540]">{tenderInfo.type}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-[#0A2540] mb-4 border-l-4 border-[#FF6B00] pl-2 flex items-center">
              <Package className="w-4 h-4 mr-2" /> 货物详情清单
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="p-3 font-medium rounded-tl-lg">产品名称</th>
                    <th className="p-3 font-medium">规格型号</th>
                    <th className="p-3 font-medium">总重量(kg)</th>
                    <th className="p-3 font-medium">总体积(cbm)</th>
                    <th className="p-3 font-medium rounded-tr-lg">包装</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {tenderInfo.cargoList.map((cargo) => (
                    <tr key={cargo.id} className="border-b border-gray-50 last:border-0">
                      <td className="p-3 font-medium">{cargo.name}</td>
                      <td className="p-3 text-gray-500">{cargo.spec}</td>
                      <td className="p-3">{cargo.weight}</td>
                      <td className="p-3">{cargo.volume}</td>
                      <td className="p-3">{cargo.pkg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-[#0A2540] mb-4 border-l-4 border-[#FF6B00] pl-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> 特殊运输与操作要求
            </h3>
            <p className="text-sm text-gray-600 bg-orange-50/50 p-4 rounded-lg border border-orange-100 leading-relaxed">
              {tenderInfo.requirements}
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="bg-white p-6 rounded-xl shadow-md border-t-4 border-[#FF6B00] sticky top-24"
          >
            <h3 className="text-lg font-bold text-[#0A2540] mb-6">
              {myBidData ? '修改投标报价' : '填写投标报价'}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  投标总价 <span className="text-red-500">*</span>
                </label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#0A2540] focus-within:ring-1 focus-within:ring-[#0A2540]">
                  <input
                    type="number"
                    required={!readOnly}
                    min={0}
                    step="0.01"
                    value={bidForm.price}
                    onChange={(e) => setBidForm({ ...bidForm, price: e.target.value })}
                    disabled={readOnly}
                    className="w-full p-2.5 text-sm outline-none font-bold text-[#0A2540] disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="0.00"
                  />
                  <select
                    value={bidForm.currency}
                    onChange={(e) => setBidForm({ ...bidForm, currency: e.target.value })}
                    disabled={readOnly}
                    className="bg-gray-50 border-l border-gray-200 px-3 text-sm font-medium text-gray-600 outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="CNY">CNY (人民币)</option>
                    <option value="VND">VND (越南盾)</option>
                    <option value="USD">USD (美元)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  承诺时效 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={!readOnly}
                  value={bidForm.time}
                  onChange={(e) => setBidForm({ ...bidForm, time: e.target.value })}
                  disabled={readOnly}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540] disabled:bg-gray-100"
                  placeholder="例如：3-4天"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  报价说明与备注{' '}
                  <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <textarea
                  rows={3}
                  value={bidForm.remark}
                  onChange={(e) => setBidForm({ ...bidForm, remark: e.target.value })}
                  disabled={readOnly}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540] disabled:bg-gray-100"
                  placeholder="请说明费用包含的内容，如：含清关费、不含税等..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  上传正式报价单/附件{' '}
                  <span className="text-gray-400 font-normal">(选填)</span>
                </label>
                <input
                  ref={bidFileRef}
                  type="file"
                  multiple
                  accept={ACCEPT_STRING}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const arr = Array.from(e.target.files).filter((f: File) => {
                        if (f.size > 30 * 1024 * 1024) { toast.error(`文件 "${f.name}" 超过 30MB`); return false; }
                        return true;
                      });
                      setBidFiles((prev) => {
                        const names = new Set(prev.map((p) => p.name));
                        return [...prev, ...arr.filter((f: File) => !names.has(f.name))];
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <div
                  onClick={() => !readOnly && bidFileRef.current?.click()}
                  onDragOver={(e) => { if (!readOnly) { e.preventDefault(); e.currentTarget.classList.add('border-[#FF6B00]'); } }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('border-[#FF6B00]')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-[#FF6B00]');
                    if (!readOnly && e.dataTransfer.files.length) {
                      const arr = Array.from(e.dataTransfer.files).filter((f: File) => f.size <= 30 * 1024 * 1024);
                      setBidFiles((prev) => {
                        const names = new Set(prev.map((p) => p.name));
                        return [...prev, ...arr.filter((f: File) => !names.has(f.name))];
                      });
                    }
                  }}
                  className={`border-2 border-dashed border-gray-200 rounded-lg p-4 text-center transition-colors bg-gray-50 ${
                    readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#FF6B00] cursor-pointer'
                  }`}
                >
                  <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">点击或拖拽上传 (PDF/Word/Excel/图片，最大 30MB)</span>
                </div>
                {bidFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bidFiles.map((f) => (
                      <div key={f.name} className="flex items-center gap-2 px-2 py-1.5 bg-green-50 rounded border border-green-200/50">
                        <FileText className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 flex-1 truncate">{f.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatFileSize(f.size)}</span>
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setBidFiles((prev) => prev.filter((p) => p.name !== f.name)); }}
                            className="p-0.5 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={isSubmitting || readOnly}
                className={`w-full py-3 rounded-lg font-bold text-sm flex justify-center items-center transition-all ${
                  isSubmitting || readOnly
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-[#FF6B00] hover:bg-[#e66000] text-white shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">正在加密提交中...</span>
                ) : readOnly ? (
                  <span>不可提交</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> {myBidData ? `修改报价 (剩余 ${2 - (myBidData.editCount ?? 0)} 次)` : '确认提交报价'}
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-3">
                提交即代表您同意本平台的《供应商诚信履约协议》
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
