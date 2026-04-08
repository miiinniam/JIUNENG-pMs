import React, { useState } from 'react';
import { Search, MapPin, Calendar, FileText, Download, Filter, Star, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchHistoryProjectsUi,
  updateHistoryProjectRow,
  deleteHistoryProjectRow,
  type HistoryProjectUi,
} from '../services/projectService';

export const ProjectHistory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<HistoryProjectUi | null>(null);

  const { data: historyProjects = [], isLoading, refetch } = useQuery('project-history', fetchHistoryProjectsUi);

  const [formData, setFormData] = useState({
    name: '',
    client: '',
    route: '',
    cost: '',
    rating: 5,
  });

  const filtered = historyProjects.filter((p) =>
    !searchTerm ||
    p.name.includes(searchTerm) ||
    p.client.includes(searchTerm) ||
    p.id.includes(searchTerm)
  );

  const handleOpenDrawer = (item: HistoryProjectUi) => {
    setEditingItem(item);
    setFormData({ name: item.name, client: item.client, route: item.route, cost: item.cost, rating: item.rating });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条历史记录吗？此操作不可恢复。')) return;
    try {
      await deleteHistoryProjectRow(id);
      toast.success('删除成功');
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await updateHistoryProjectRow(editingItem.id, formData);
      toast.success('历史记录更新成功');
      await refetch();
      setIsDrawerOpen(false);
      setEditingItem(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-[#0A2540]">历史订单查询</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索项目编号/名称/客户..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0A2540] w-64 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600 shadow-sm">
            <Filter className="w-4 h-4" />
            <span>筛选</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600 shadow-sm">
            <Download className="w-4 h-4" />
            <span>导出</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">项目信息</th>
                  <th className="p-4 font-medium">客户名称</th>
                  <th className="p-4 font-medium">运输路线</th>
                  <th className="p-4 font-medium">完成日期</th>
                  <th className="p-4 font-medium">结算金额</th>
                  <th className="p-4 font-medium">服务评价</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-[#0A2540]">{p.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-wider">{p.type}</span>
                        <span className="text-xs text-gray-400">{p.id}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{p.client}</td>
                    <td className="p-4">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400"/>
                        {p.route}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-gray-500">
                        <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                        {p.completedDate}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[#0A2540]">{p.cost}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < p.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-3">
                      <button onClick={() => handleOpenDrawer(p)} className="text-[#0A2540] hover:text-[#FF6B00] transition-colors font-medium text-sm inline-flex items-center">
                        <Edit className="w-4 h-4 mr-1" /> 编辑
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 transition-colors font-medium text-sm inline-flex items-center">
                        <Trash2 className="w-4 h-4 mr-1" /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-gray-400">共 {filtered.length} 条记录</p>
      </div>

      {/* 编辑历史记录抽屉 */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center"><FileText className="w-5 h-5 mr-2"/> 编辑历史记录</h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)}><X className="w-5 h-5 text-gray-300 hover:text-white" /></button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">项目名称 *</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">客户名称 *</label>
              <input required type="text" value={formData.client} onChange={(e) => setFormData({...formData, client: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">运输路线</label>
              <input type="text" value={formData.route} onChange={(e) => setFormData({...formData, route: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">结算金额</label>
              <input type="text" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">服务评价 (1-5)</label>
              <input type="number" min="1" max="5" value={formData.rating} onChange={(e) => setFormData({...formData, rating: Number(e.target.value)})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">取消</button>
            <button disabled={isSubmitting} type="submit" className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm hover:bg-[#e66000] flex items-center gap-2 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
