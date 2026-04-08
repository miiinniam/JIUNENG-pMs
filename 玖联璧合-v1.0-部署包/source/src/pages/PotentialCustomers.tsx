import React, { useMemo, useState } from 'react';
import { Plus, X, MessageSquare, ExternalLink, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import {
  deletePotentialRow,
  fetchPotentialProjectsUi,
  upsertPotentialRow,
  type PotentialProjectUi,
} from '../services/projectService';

export const PotentialCustomers: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('全部');
  const [editingItem, setEditingItem] = useState<PotentialProjectUi | null>(null);
  const [selectedPotential, setSelectedPotential] =
    useState<PotentialProjectUi | null>(null);

  const tabs = ['全部', '初步沟通中', '报价中', '谈判中', '已成单', '已丢单', '已关闭'];

  const { data: pipelines = [], refetch } = useQuery(
    'potential-projects',
    fetchPotentialProjectsUi
  );
  const filteredPipelines = useMemo(
    () =>
      pipelines.filter(
        (p) => activeTab === '全部' || p.status === activeTab
      ),
    [pipelines, activeTab]
  );

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    type: '',
    amount: '',
    status: '初步沟通中',
    expectedDate: ''
  });

  const handleOpenEdit = (item?: PotentialProjectUi) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        client: item.client,
        type: item.type,
        amount: item.amount,
        status: item.status,
        expectedDate: item.expectedDate
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        client: '',
        type: '',
        amount: '',
        status: '初步沟通中',
        expectedDate: ''
      });
    }
    setIsEditDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条记录吗？此操作不可恢复。')) return;
    try {
      await deletePotentialRow(id);
      toast.success('删除成功');
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const lastUpdate = new Date().toISOString().split('T')[0];
    const id =
      editingItem?.id ?? `P-${Date.now().toString(36).toUpperCase()}`;
    try {
      await upsertPotentialRow({
        id,
        name: formData.name,
        client: formData.client,
        type: formData.type,
        amount: formData.amount,
        status: formData.status,
        expectedDate: formData.expectedDate,
        lastUpdate,
      });
      toast.success(editingItem ? '项目信息更新成功' : '项目创建成功');
      await refetch();
      setIsEditDrawerOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case '报价中': return 'bg-blue-100 text-blue-700';
      case '初步沟通中': return 'bg-gray-100 text-gray-700';
      case '谈判中': return 'bg-[#FF6B00]/10 text-[#FF6B00]';
      case '已成单': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-[#0A2540] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button 
          onClick={() => handleOpenEdit()}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm bg-[#FF6B00] text-white hover:bg-[#e66000] shadow-sm transition-colors shrink-0 ml-4"
        >
          <Plus className="w-4 h-4" />
          <span>新增潜在项目</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                <th className="p-4 font-medium">项目名称</th>
                <th className="p-4 font-medium">关联客户</th>
                <th className="p-4 font-medium">项目类型</th>
                <th className="p-4 font-medium">预计金额</th>
                <th className="p-4 font-medium">当前状态</th>
                <th className="p-4 font-medium">最新跟进</th>
                <th className="p-4 font-medium">预计成交日期</th>
                <th className="p-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {filteredPipelines.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4 font-medium text-[#0A2540]">{p.name}</td>
                  <td className="p-4">{p.client}</td>
                  <td className="p-4 text-gray-500">{p.type}</td>
                  <td className="p-4 font-medium">{p.amount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">{p.lastUpdate}</td>
                  <td className="p-4 text-gray-500">{p.expectedDate}</td>
                  <td className="p-4 text-right space-x-2">
                    <button type="button" onClick={() => { setSelectedPotential(p); setIsDrawerOpen(true); }} className="text-[#FF6B00] hover:text-[#e66000] font-medium text-xs inline-flex items-center px-1">
                      详情 <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                    <button onClick={() => handleOpenEdit(p)} className="text-[#0A2540] hover:text-[#FF6B00] font-medium text-xs inline-flex items-center px-1">
                      <Edit className="w-3 h-3 mr-1" /> 编辑
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 font-medium text-xs inline-flex items-center px-1">
                      <Trash2 className="w-3 h-3 mr-1" /> 删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 右侧滑出抽屉 (详情与跟进) */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[560px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">潜在项目跟踪</h2>
            <p className="text-xs text-gray-500 mt-1">项目编号: {selectedPotential?.id ?? '—'}</p>
          </div>
          <button type="button" onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {/* 基础信息区块 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">基础信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div><span className="text-gray-500 block mb-1">项目名称</span><span className="font-medium text-gray-900">{selectedPotential?.name ?? '—'}</span></div>
               <div><span className="text-gray-500 block mb-1">关联客户</span><span>{selectedPotential?.client ?? '—'}</span></div>
               <div><span className="text-gray-500 block mb-1">预计金额</span><span className="text-[#0A2540] font-medium">{selectedPotential?.amount ?? '—'}</span></div>
               <div><span className="text-gray-500 block mb-1">预计成交日期</span><span>{selectedPotential?.expectedDate ?? '—'}</span></div>
            </div>
          </div>

          {/* 时间轴跟进区块 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-[#FF6B00]" /> 跟进记录
            </h3>
            
            {/* 新增跟进输入框 */}
            <div className="mb-6 flex space-x-2">
              <input type="text" placeholder="输入最新跟进情况..." className="flex-1 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              <button className="bg-[#0A2540] text-white px-4 py-2 rounded-lg text-sm">发布</button>
            </div>

            {/* 时间轴 */}
            <div className="relative border-l border-gray-200 ml-3 space-y-6">
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#FF6B00] rounded-full -left-[6.5px] top-1"></div>
                <div className="text-xs text-gray-500 mb-1">2026-04-03 14:30 | 阮经理</div>
                <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  客户要求提供从老挝萨拉万途径越南，最终送达中国河口的详细通关时效报告，已转交操作部评估。状态更新为：报价中。
                </div>
              </div>
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-gray-300 rounded-full -left-[6.5px] top-1"></div>
                <div className="text-xs text-gray-500 mb-1">2026-04-01 10:15 | 阮经理</div>
                <div className="text-sm text-gray-800">初步电话沟通，客户有大概每月 50 柜的木炭进口需求，正在比价阶段。</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <button
            type="button"
            className="text-sm text-[#0A2540] font-medium hover:underline"
            onClick={() => {
              if (!selectedPotential) return;
              setIsDrawerOpen(false);
              navigate('/tenders', {
                state: {
                  prefillTender: {
                    title: selectedPotential.name,
                    bizType: selectedPotential.type,
                    cargoSummary: selectedPotential.name,
                    sourceId: selectedPotential.id,
                    clientName: selectedPotential.client,
                  },
                },
              });
            }}
          >
            转为正式询价订单
          </button>
          <div className="space-x-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg">关闭</button>
            <button type="button" className="px-5 py-2 text-sm text-white bg-[#FF6B00] rounded-lg opacity-60 cursor-not-allowed" title="请使用编辑抽屉保存">保存更新</button>
          </div>
        </div>
      </div>

      {/* 编辑/新增项目抽屉 */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isEditDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsEditDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isEditDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSaveEdit} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center">{editingItem ? '编辑潜在项目' : '新增潜在项目'}</h2>
            <button type="button" onClick={() => setIsEditDrawerOpen(false)}><X className="w-5 h-5 text-gray-300 hover:text-white" /></button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">项目名称 *</label>
              <input 
                required 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">关联客户 *</label>
              <input 
                required 
                type="text" 
                value={formData.client}
                onChange={(e) => setFormData({...formData, client: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">项目类型</label>
              <input 
                type="text" 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">预计金额</label>
              <input 
                type="text" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">当前状态</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0A2540]"
              >
                {tabs.filter(t => t !== '全部').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">预计成交日期</label>
              <input 
                type="date" 
                value={formData.expectedDate}
                onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" 
              />
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-3">
            <button type="button" onClick={() => setIsEditDrawerOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">取消</button>
            <button 
              disabled={isSubmitting}
              type="submit" 
              className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm hover:bg-[#e66000] flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
