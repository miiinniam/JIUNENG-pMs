import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft, Send, Package, Users, Eye, Clock, MapPin, CheckCircle, X, FileText, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  deleteTenderCascade,
  fetchApprovedAgentsForInvite,
  fetchTendersWithBidsForUi,
  insertTender,
  updateTenderRow,
} from '../services/tenderService';
import type { SharedTender as Tender } from '../types/tender';

interface PrefillTender {
  title?: string;
  bizType?: string;
  cargoSummary?: string;
  sourceId?: string;
  clientName?: string;
}

export const TenderCenter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargoList, setCargoList] = useState([{ id: Date.now(), name: '', spec: '', weight: '', lwh: '', pkg: '' }]);
  
  const [formData, setFormData] = useState({
    title: '',
    origin: '',
    destination: '',
    deadline: ''
  });

  const { data: tenders = [], isLoading: tendersLoading, refetch } = useQuery(
    'tenders-full',
    fetchTendersWithBidsForUi
  );
  const { data: approvedAgents = [] } = useQuery(
    'approved-agents',
    fetchApprovedAgentsForInvite
  );
  const [invitedAgentIds, setInvitedAgentIds] = useState<string[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const [prefillSource, setPrefillSource] = useState<{ clientName?: string; sourceId?: string } | null>(null);

  // 从「潜在客户」转入时，自动预填并打开创建表单
  useEffect(() => {
    const state = location.state as { prefillTender?: PrefillTender } | null;
    if (!state?.prefillTender) return;
    const pre = state.prefillTender;
    setEditingTender(null);
    setFormData({
      title: pre.title ?? '',
      origin: '',
      destination: '',
      deadline: '',
    });
    setCargoList([{
      id: Date.now(),
      name: pre.cargoSummary ?? pre.title ?? '',
      spec: '',
      weight: '',
      lwh: '',
      pkg: '',
    }]);
    setInvitedAgentIds([]);
    setPrefillSource({ clientName: pre.clientName, sourceId: pre.sourceId });
    setIsCreating(true);
    // 清除 state，防止刷新后重复触发
    navigate(location.pathname, { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleInvitedAgent = (agentId: string) => {
    setInvitedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((x) => x !== agentId)
        : [...prev, agentId]
    );
  };

  const handleOpenCreate = (tender?: Tender) => {
    setPrefillSource(null);
    if (tender) {
      setEditingTender(tender);
      setFormData({
        title: tender.title,
        origin: tender.origin || '',
        destination: tender.destination || '',
        deadline: tender.deadline_at
          ? tender.deadline_at.slice(0, 16)
          : tender.deadline.replace(' ', 'T'),
      });
      if (tender.cargoList && tender.cargoList.length > 0) {
        setCargoList(tender.cargoList.map((c) => ({
          id: c.id,
          name: c.name,
          spec: c.spec,
          weight: c.weight,
          lwh: c.volume,
          pkg: c.pkg,
        })));
      } else {
        setCargoList([{ id: Date.now(), name: tender.cargo, spec: '', weight: '', lwh: '', pkg: '' }]);
      }
      setInvitedAgentIds(
        tender.invitedAgentIds?.length ? [...tender.invitedAgentIds] : []
      );
    } else {
      setEditingTender(null);
      setFormData({
        title: '',
        origin: '',
        destination: '',
        deadline: ''
      });
      setCargoList([{ id: Date.now(), name: '', spec: '', weight: '', lwh: '', pkg: '' }]);
      setInvitedAgentIds([]);
    }
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条招标记录吗？此操作不可恢复。')) return;
    try {
      await deleteTenderCascade(id);
      toast.success('删除成功');
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    const route = `${formData.origin || '未知'} → ${formData.destination || '未知'}`;
    const cargoSummary =
      cargoList.map((c) => c.name).filter(Boolean).join(', ') || '未指定货物';
    const mappedCargo = cargoList.map((c, i) => ({
      id: typeof c.id === 'number' ? c.id : Date.now() + i,
      name: c.name,
      spec: c.spec || '',
      weight: c.weight || '',
      volume: c.lwh || '',
      pkg: c.pkg || '',
    }));

    if (!invitedAgentIds.length) {
      toast.error('请至少选择一家受邀代理商（定向邀标）');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingTender) {
        await updateTenderRow(editingTender.id, {
          title: formData.title || editingTender.title,
          route,
          deadline: formData.deadline,
          cargo: cargoSummary,
          origin: formData.origin,
          destination: formData.destination,
          cargoList: mappedCargo,
          invitedAgentIds,
        });
        toast.success('招标信息更新成功');
        await refetch();
        setIsCreating(false);
      } else {
        await insertTender({
          title: formData.title || '未命名招标',
          origin: formData.origin,
          destination: formData.destination,
          deadline: formData.deadline,
          cargoSummary,
          cargoList: mappedCargo,
          invitedAgentIds,
        });
        await refetch();
        setIsCreating(false);
        setIsSuccess(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8F9FA] -m-6 md:-m-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#0A2540]">招标发布成功！</h2>
            <p className="text-gray-500 text-sm">
              您的招标信息已同步至指定的 {invitedAgentIds.length} 家受邀代理商，请耐心等待报价反馈。
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <button 
              onClick={() => setIsSuccess(false)}
              className="w-full py-3 bg-[#0A2540] text-white rounded-xl font-bold hover:bg-[#113a63] transition-all shadow-lg shadow-blue-900/10"
            >
              返回招标列表
            </button>
            <button 
              onClick={() => setIsSuccess(false)}
              className="w-full py-3 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
            >
              查看订单详情
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="h-full flex flex-col bg-[#F8F9FA] -m-6 md:-m-8">
        {/* 沉浸式表单顶部 */}
        <div className="bg-white border-b px-6 py-4 flex items-center shrink-0 shadow-sm">
          <button onClick={() => setIsCreating(false)} className="mr-4 text-gray-500 hover:text-[#0A2540] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[#0A2540]">{editingTender ? '编辑招标订单' : '发布新招标订单'}</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 来源提示（从潜在客户转入时显示） */}
            {prefillSource && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
                <span className="font-bold shrink-0">来源：潜在项目转入</span>
                {prefillSource.clientName && (
                  <span>· 客户：<span className="font-medium">{prefillSource.clientName}</span></span>
                )}
                {prefillSource.sourceId && (
                  <span className="text-blue-500 font-mono text-xs">({prefillSource.sourceId})</span>
                )}
                <span className="ml-auto text-blue-600 text-xs">请补全路线与截止时间，并选择受邀代理商后发布招标。</span>
              </div>
            )}
            {/* 区块1：路线与基础 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-base font-bold text-[#0A2540] mb-4 border-l-4 border-[#FF6B00] pl-2">1. 基础信息与时间</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-4">
                    <label className="block text-sm text-gray-700 mb-1">招标标题 <span className="text-red-500">*</span></label>
                    <input 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]" 
                      placeholder="如：广州至河内 电子设备专线" 
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-sm text-gray-700 mb-1">始发地 <span className="text-red-500">*</span></label>
                    <input 
                      value={formData.origin}
                      onChange={(e) => setFormData({...formData, origin: e.target.value})}
                      className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]" 
                      placeholder="如：中国 广州" 
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-sm text-gray-700 mb-1">目的地 <span className="text-red-500">*</span></label>
                    <input 
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]" 
                      placeholder="如：越南 河内" 
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm text-gray-700 mb-1">最晚报价截止时间 <span className="text-red-500">*</span></label>
                    <input 
                      type="datetime-local" 
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]" 
                    />
                  </div>
               </div>
            </div>

            {/* 区块2：动态货物明细 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-base font-bold text-[#0A2540] mb-4 border-l-4 border-[#FF6B00] pl-2 flex items-center">
                 <Package className="w-4 h-4 mr-2"/> 2. 货物详情 (可多项)
               </h2>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left mb-4">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="p-3 font-medium rounded-tl-lg">产品名称</th>
                        <th className="p-3 font-medium">规格型号</th>
                        <th className="p-3 font-medium">重量(kg)</th>
                        <th className="p-3 font-medium">长宽高(cm)</th>
                        <th className="p-3 font-medium rounded-tr-lg">包装方式</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargoList.map((cargo, index) => (
                        <tr key={cargo.id} className="border-b border-gray-100 last:border-0">
                          <td className="p-2">
                            <input 
                              value={cargo.name}
                              onChange={(e) => {
                                const newList = [...cargoList];
                                newList[index].name = e.target.value;
                                setCargoList(newList);
                              }}
                              className="w-full border border-gray-200 p-2 rounded-md text-sm outline-none focus:border-[#0A2540]" 
                              placeholder="设备/货物名"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              value={cargo.spec}
                              onChange={(e) => {
                                const newList = [...cargoList];
                                newList[index].spec = e.target.value;
                                setCargoList(newList);
                              }}
                              className="w-full border border-gray-200 p-2 rounded-md text-sm outline-none focus:border-[#0A2540]" 
                              placeholder="如：XL-200"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              value={cargo.weight}
                              onChange={(e) => {
                                const newList = [...cargoList];
                                newList[index].weight = e.target.value;
                                setCargoList(newList);
                              }}
                              className="w-full border border-gray-200 p-2 rounded-md text-sm outline-none focus:border-[#0A2540]" 
                              placeholder="毛重"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              value={cargo.lwh}
                              onChange={(e) => {
                                const newList = [...cargoList];
                                newList[index].lwh = e.target.value;
                                setCargoList(newList);
                              }}
                              className="w-full border border-gray-200 p-2 rounded-md text-sm outline-none focus:border-[#0A2540]" 
                              placeholder="L*W*H"
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              value={cargo.pkg}
                              onChange={(e) => {
                                const newList = [...cargoList];
                                newList[index].pkg = e.target.value;
                                setCargoList(newList);
                              }}
                              className="w-full border border-gray-200 p-2 rounded-md text-sm bg-white outline-none focus:border-[#0A2540]"
                            >
                              <option value="">请选择</option>
                              <option value="木箱">木箱</option>
                              <option value="托盘">托盘</option>
                              <option value="散装">散装</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
               <button 
                 onClick={() => setCargoList([...cargoList, { id: Date.now(), name: '', spec: '', weight: '', lwh: '', pkg: '' }])} 
                 className="text-[#FF6B00] text-sm font-medium border border-dashed border-[#FF6B00] px-4 py-2.5 rounded-lg w-full hover:bg-orange-50 transition-colors"
               >
                 + 添加一行产品规格
               </button>
            </div>

            {/* 区块3：指定代理 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h2 className="text-base font-bold text-[#0A2540] mb-4 border-l-4 border-[#FF6B00] pl-2 flex items-center">
                 <Users className="w-4 h-4 mr-2"/> 3. 定向邀标（已审核代理商）
               </h2>
               <p className="text-xs text-gray-500 mb-3">仅被选中的代理商可在代理端「招标大厅」看到本单并投标（模拟 RLS）。</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {approvedAgents.map((ag) => (
                   <label
                     key={ag.id}
                     className="flex items-center space-x-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                   >
                     <input
                       type="checkbox"
                       checked={invitedAgentIds.includes(ag.id)}
                       onChange={() => toggleInvitedAgent(ag.id)}
                       className="rounded border-gray-300 text-[#FF6B00] focus:ring-[#FF6B00] w-4 h-4"
                     />
                     <span className="text-sm font-medium text-gray-700">
                       {ag.name}{' '}
                       <span className="text-gray-400 font-normal">({ag.level_label})</span>
                       <span className="block text-[10px] text-gray-400 font-mono">{ag.id}</span>
                     </span>
                   </label>
                 ))}
                 {!approvedAgents.length && (
                   <p className="text-sm text-amber-600 col-span-full">暂无「已审核」代理商，请先在代理商管理中完成审核。</p>
                 )}
               </div>
            </div>
          </div>
        </div>

        {/* 底部悬浮按钮 */}
        <div className="bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-end space-x-4 shrink-0">
           <button 
             disabled={isSubmitting}
             onClick={() => setIsCreating(false)} 
             className="px-6 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
           >
             存为草稿
           </button>
           <button 
             disabled={isSubmitting}
             onClick={handlePublish}
             className="px-6 py-2.5 text-sm bg-[#0A2540] text-white rounded-xl font-bold flex items-center hover:bg-[#113a63] shadow-lg shadow-blue-900/10 transition-all disabled:opacity-50"
           >
             {isSubmitting ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
             ) : (
               <Send className="w-4 h-4 mr-2" />
             )}
             {isSubmitting ? '保存中...' : (editingTender ? '保存修改' : '确认发布招标')}
           </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bidding': return <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-medium">招标中</span>;
      case 'evaluating': return <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md text-xs font-medium">待定标</span>;
      case 'awarded': return <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md text-xs font-medium">已定标</span>;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-[#0A2540]">招标中心</h1>
        <button onClick={() => handleOpenCreate()} className="flex items-center px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm shadow-sm hover:bg-[#e66000] transition-colors">
          <Plus className="w-4 h-4 mr-2" /> 新增招标
        </button>
      </div>

      {/* 招标列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          {tendersLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
            </div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">招标编号 / 标题</th>
                <th className="p-4 font-medium">运输路线</th>
                <th className="p-4 font-medium">货物概要</th>
                <th className="p-4 font-medium">截止时间</th>
                <th className="p-4 font-medium">参与报价</th>
                <th className="p-4 font-medium">状态</th>
                <th className="p-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {tenders.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="font-medium text-[#0A2540]">{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.id}</div>
                  </td>
                  <td className="p-4 flex items-center text-gray-600 mt-2">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400"/> {t.route}
                  </td>
                  <td className="p-4 text-gray-600">{t.cargo}</td>
                  <td className="p-4 text-gray-500 flex items-center mt-2">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400"/> {t.deadline}
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-[#0A2540]">{t.bids.length}</span> 家代理
                  </td>
                  <td className="p-4">{getStatusBadge(t.status)}</td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => setSelectedTender(t)}
                      className="text-[#0061FF] hover:text-blue-800 font-medium text-sm inline-flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" /> 查看
                    </button>
                    <button 
                      onClick={() => handleOpenCreate(t)}
                      className="text-[#0A2540] hover:text-[#FF6B00] font-medium text-sm inline-flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-1" /> 编辑
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm inline-flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> 删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* 右侧抽屉：招标详情与报价对比 */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${selectedTender ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setSelectedTender(null)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[700px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${selectedTender ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedTender && (
          <>
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
              <div>
                <h2 className="text-lg font-semibold flex items-center">
                  <FileText className="w-5 h-5 mr-2"/> 招标详情与比价
                </h2>
                <p className="text-xs text-gray-300 mt-1">{selectedTender.id} | {selectedTender.title}</p>
              </div>
              <button onClick={() => setSelectedTender(null)}><X className="w-6 h-6 text-gray-300 hover:text-white" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-[#F8F9FA]">
              {/* 招标基本信息 */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-3 border-l-4 border-[#FF6B00] pl-2">项目需求</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 block mb-1">运输路线</span><span className="font-medium">{selectedTender.route}</span></div>
                  <div><span className="text-gray-500 block mb-1">截止时间</span><span className="font-medium">{selectedTender.deadline}</span></div>
                  <div className="col-span-2"><span className="text-gray-500 block mb-1">货物概要</span><span className="font-medium">{selectedTender.cargo}</span></div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block mb-1">定向邀标</span>
                    <span className="font-medium text-xs font-mono">
                      {selectedTender.invitedAgentIds?.length
                        ? selectedTender.invitedAgentIds.join(' · ')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 报价对比列表 */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-800 border-l-4 border-[#0061FF] pl-2">代理报价对比</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">共 {selectedTender.bids.length} 家报价</span>
                    {selectedTender.status !== 'awarded' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTender(null);
                          navigate(`/tenders/compare/${selectedTender.id}`);
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0A2540] text-white hover:bg-[#113a63]"
                      >
                        进入定标审批页
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {selectedTender.bids
                    .sort((a, b) => a.price - b.price) // 按价格从低到高排序
                    .map((bid, index) => (
                    <div key={bid.id} className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all ${bid.status === 'won' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {index === 0 && bid.status !== 'won' && <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold">最低价</span>}
                          <span className="font-bold text-[#0A2540]">{bid.agentName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${bid.agentLevel === 'A级' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{bid.agentLevel}</span>
                        </div>
                        <p className="text-xs text-gray-500">备注: {bid.remarks}</p>
                      </div>
                      
                      <div className="text-right ml-4 flex flex-col items-end">
                        <div className="text-lg font-bold text-[#FF6B00] mb-2">
                          {bid.currency} {bid.price.toLocaleString()}
                        </div>
                        
                        {selectedTender.status === 'awarded' ? (
                          bid.status === 'won' ? (
                            <span className="flex items-center text-green-600 text-sm font-bold bg-green-50 px-3 py-1 rounded-full">
                              <CheckCircle className="w-4 h-4 mr-1" /> 已中标
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">未中标</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">请使用上方「定标审批」</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {selectedTender.bids.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed">
                      暂无代理报价
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
