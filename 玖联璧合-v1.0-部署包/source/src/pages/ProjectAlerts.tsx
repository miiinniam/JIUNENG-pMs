import React, { useState } from 'react';
import { ShieldAlert, Clock, Filter, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchAlertsUi,
  updateAlertRow,
  deleteAlertRow,
  type AlertUi,
} from '../services/alertService';

export const ProjectAlerts: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<AlertUi | null>(null);

  const { data: alerts = [], isLoading, refetch } = useQuery('project-alerts', fetchAlertsUi);

  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    severity: 'medium' as AlertUi['severity'],
  });

  const handleOpenDrawer = (item: AlertUi) => {
    setEditingItem(item);
    setFormData({ title: item.title, desc: item.desc, severity: item.severity });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条异常记录吗？此操作不可恢复。')) return;
    try {
      await deleteAlertRow(id);
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
      await updateAlertRow(editingItem.id, formData);
      toast.success('异常记录更新成功');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-[#0A2540]">异常处理中心</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" /> 筛选
          </button>
          <button className="px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5a]">
            一键处理已读
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
              <div className={`p-3 rounded-full ${
                alert.severity === 'critical' ? 'bg-red-50 text-red-600' :
                alert.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0A2540]">{alert.title}</h3>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {alert.time}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{alert.desc}</p>
                <div className="mt-4 flex gap-3">
                  <button className="text-xs font-bold text-[#0061FF] hover:underline">立即处理</button>
                  <button className="text-xs font-bold text-gray-400 hover:underline">标记为误报</button>
                  <div className="flex-1"></div>
                  <button onClick={() => handleOpenDrawer(alert)} className="text-[#0A2540] hover:text-[#FF6B00] transition-colors font-medium text-xs inline-flex items-center">
                    <Edit className="w-3 h-3 mr-1" /> 编辑
                  </button>
                  <button onClick={() => handleDelete(alert.id)} className="text-red-500 hover:text-red-700 transition-colors font-medium text-xs inline-flex items-center">
                    <Trash2 className="w-3 h-3 mr-1" /> 删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑异常记录抽屉 */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center"><ShieldAlert className="w-5 h-5 mr-2"/> 编辑异常记录</h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)}><X className="w-5 h-5 text-gray-300 hover:text-white" /></button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">异常标题 *</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">异常描述 *</label>
              <textarea
                required
                value={formData.desc}
                onChange={(e) => setFormData({...formData, desc: e.target.value})}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540] min-h-[100px]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">严重程度</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({...formData, severity: e.target.value as AlertUi['severity']})}
                className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0A2540]"
              >
                <option value="critical">严重 (Critical)</option>
                <option value="high">高 (High)</option>
                <option value="medium">中 (Medium)</option>
              </select>
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">取消</button>
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
};
