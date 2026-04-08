import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, X, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, subscribeToDb } from '../lib/supabase';

// 定义客户数据接口
interface Customer {
  id: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  wechat: string;
  biz_type: string;
  inquiry_count: number;
  status: string;
}

export const Customers: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 真实数据状态
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 表单状态 (用于新增和编辑)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '私企',
    contact: '',
    phone: '',
    wechat: '',
    biz_type: '',
    status: 'active'
  });

  // 1. Read: 获取客户列表
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,contact.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('获取客户列表失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    return subscribeToDb(() => { fetchCustomers(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // 2. Create / Update: 保存客户
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('customers')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingId);
          
        if (error) throw error;
        toast.success('客户更新成功');
      } else {
        // Create
        const { error } = await supabase
          .from('customers')
          .insert([{ ...formData, inquiry_count: 0 }]);
          
        if (error) throw error;
        toast.success('客户添加成功');
      }
      
      setIsDrawerOpen(false);
      fetchCustomers(); // 刷新列表
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete: 删除客户
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该客户吗？此操作不可恢复。')) return;
    
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('客户已删除');
      fetchCustomers();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };

  // 打开抽屉 (新增或编辑)
  const openDrawer = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        type: customer.type || '私企',
        contact: customer.contact,
        phone: customer.phone,
        wechat: customer.wechat || '',
        biz_type: customer.biz_type || '',
        status: customer.status || 'active'
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        type: '私企',
        contact: '',
        phone: '',
        wechat: '',
        biz_type: '',
        status: 'active'
      });
    }
    setIsDrawerOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部操作区 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索公司名称/联系人..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0A2540] w-64 bg-white"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600">
            <Filter className="w-4 h-4" />
            <span>企业性质</span>
          </button>
        </div>
        <div className="flex space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600">
            <Download className="w-4 h-4" />
            <span>导出 Excel</span>
          </button>
          <button 
            onClick={() => openDrawer()}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm bg-[#FF6B00] text-white hover:bg-[#e66000] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增客户</span>
          </button>
        </div>
      </div>

      {/* 数据表格卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p>暂无客户数据</p>
            <button 
              onClick={() => openDrawer()}
              className="text-[#FF6B00] hover:underline text-sm font-medium"
            >
              立即添加第一个客户
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">公司名称</th>
                  <th className="p-4 font-medium">企业性质</th>
                  <th className="p-4 font-medium">联系人</th>
                  <th className="p-4 font-medium">联系方式</th>
                  <th className="p-4 font-medium">微信号</th>
                  <th className="p-4 font-medium">业务类型</th>
                  <th className="p-4 font-medium">询价次数</th>
                  <th className="p-4 font-medium">当前状态</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-[#0A2540]">{c.name}</td>
                    <td className="p-4">{c.type}</td>
                    <td className="p-4">{c.contact}</td>
                    <td className="p-4">{c.phone}</td>
                    <td className="p-4 text-gray-500">{c.wechat || '-'}</td>
                    <td className="p-4">{c.biz_type || '-'}</td>
                    <td className="p-4">{c.inquiry_count || 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'potential' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status === 'active' ? '活跃' : c.status === 'inactive' ? '停用' : c.status === 'potential' ? '潜在' : c.status || '活跃'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => openDrawer(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 右侧滑出抽屉 (新增/编辑客户) */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-[480px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#0A2540]">{editingId ? '编辑客户' : '新增客户'}</h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 <span className="text-red-500">*</span></label>
              <input 
                required 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540] outline-none" 
                placeholder="请输入完整公司名称" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">企业性质</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-white"
              >
                <option value="私企">私企</option>
                <option value="国企">国企</option>
                <option value="外企">外企</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none" 
                  placeholder="姓名" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号码 <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none" 
                  placeholder="手机号" 
                />
              </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
               <input 
                 type="text" 
                 value={formData.wechat}
                 onChange={(e) => setFormData({...formData, wechat: e.target.value})}
                 className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none" 
                 placeholder="选填"
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">业务类型</label>
               <input 
                 type="text" 
                 value={formData.biz_type}
                 onChange={(e) => setFormData({...formData, biz_type: e.target.value})}
                 className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none" 
                 placeholder="例如：跨境干线运输"
               />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前状态</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-white"
              >
                <option value="active">活跃</option>
                <option value="inactive">停用</option>
                <option value="potential">潜在</option>
              </select>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
            <button 
              disabled={isSubmitting}
              type="submit" 
              className="px-5 py-2 text-sm text-white bg-[#FF6B00] rounded-lg hover:bg-[#e66000] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '保存客户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
