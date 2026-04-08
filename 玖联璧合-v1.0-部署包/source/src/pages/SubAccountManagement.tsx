import React, { useState } from 'react';
import { Users, Search, Plus, Edit, ShieldX, KeySquare, Loader2, X, CheckSquare, Square, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchSubAccounts,
  createSubAccount,
  updateSubAccount,
  fetchPendingInternalUsers,
  approveInternalUser,
  rejectInternalUser,
  type SubAccountUi,
} from '../services/userService';
import { getCurrentUser } from '../services/authService';
import { Navigate } from 'react-router-dom';

const ALL_MODULES = [
  { id: 'dashboard', label: '控制台' },
  { id: 'customers', label: '客户管理' },
  { id: 'agents', label: '代理商管理' },
  { id: 'projects', label: '项目跟踪' },
  { id: 'tenders', label: '招标下单' },
  { id: 'system', label: '系统配置' },
];

export const SubAccountManagement: React.FC = () => {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data: subAccounts = [], isLoading, refetch } = useQuery('sub-accounts', () => fetchSubAccounts(currentUser?.id));
  const { data: pendingUsers = [], isLoading: isPendingLoading, refetch: refetchPending } = useQuery('pending-internal-users', fetchPendingInternalUsers);

  const [activeTab, setActiveTab] = useState<'accounts' | 'pending'>('accounts');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    department: '',
    permissions: [] as string[],
    status: 'active' as 'active' | 'disabled',
  });

  const handleOpenDrawer = (account?: SubAccountUi) => {
    if (account) {
      setEditingId(account.id);
      setFormData({
        username: account.username,
        password: '',
        displayName: account.displayName,
        department: account.department,
        permissions: account.permissions || [],
        status: account.status,
      });
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        password: '',
        displayName: '',
        department: '',
        permissions: [],
        status: 'active',
      });
    }
    setIsDrawerOpen(true);
  };

  const togglePermission = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateSubAccount(editingId, {
          displayName: formData.displayName,
          department: formData.department,
          permissions: formData.permissions,
          status: formData.status,
          ...(formData.password ? { password: formData.password } : {})
        });
        toast.success('子账号更新成功');
      } else {
        if (!formData.username) throw new Error('账号为必填项');
        await createSubAccount(currentUser!.id, {
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName,
          department: formData.department,
          permissions: formData.permissions,
        });
        toast.success('子账号创建成功');
      }
      setIsDrawerOpen(false);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (account: SubAccountUi) => {
    const newStatus = account.status === 'active' ? 'disabled' : 'active';
    try {
      await updateSubAccount(account.id, { status: newStatus });
      toast.success(`账号已${newStatus === 'active' ? '启用' : '禁用'}`);
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '状态切换失败');
    }
  };

  const handleApprove = async (account: SubAccountUi) => {
    try {
      await approveInternalUser(account.id, currentUser!.id);
      toast.success(`已通过「${account.displayName}」的注册申请`);
      refetchPending();
      refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '审批失败');
    }
  };

  const handleReject = async (account: SubAccountUi) => {
    if (!window.confirm(`确认驳回「${account.displayName}」的注册申请？此操作将删除该申请记录。`)) return;
    try {
      await rejectInternalUser(account.id);
      toast.success('已驳回该注册申请');
      refetchPending();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '驳回失败');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-[#0A2540]">子账号管理</h1>
            <span className="bg-blue-100 text-[#0061FF] text-xs px-2 py-0.5 rounded font-medium">配置内部系统权限</span>
         </div>
         <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="搜索员工姓名/账号..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none w-64 bg-white shadow-sm" />
            </div>
            {activeTab === 'accounts' && (
              <button
                onClick={() => handleOpenDrawer()}
                className="bg-[#0061FF] text-white hover:bg-[#0052cc] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> 新增子账号
              </button>
            )}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'accounts' ? 'bg-white text-[#0A2540] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />已有账号
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${activeTab === 'pending' ? 'bg-white text-[#0A2540] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />待审核注册
          {pendingUsers.length > 0 && (
            <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'accounts' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-[#0061FF]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                    <th className="p-4 font-medium">账号信息</th>
                    <th className="p-4 font-medium">部门</th>
                    <th className="p-4 font-medium">状态</th>
                    <th className="p-4 font-medium w-1/3">授权模块</th>
                    <th className="p-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {subAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4">
                        <div className="font-medium text-[#0A2540]">{account.displayName}</div>
                        <div className="text-gray-400 text-xs">{account.username}</div>
                      </td>
                      <td className="p-4">{account.department || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {account.status === 'active' ? '正常' : '已禁用'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {account.permissions.length === 0 ? <span className="text-red-400">无任何模块权限</span> :
                            account.permissions.map(p => {
                              const label = ALL_MODULES.find(m => m.id === p)?.label || p;
                              return <span key={p} className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{label}</span>
                            })
                          }
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                         <button onClick={() => handleToggleStatus(account)} className="text-gray-500 hover:text-gray-900 inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs bg-white">
                          <ShieldX className="w-3 h-3 mr-1" /> {account.status === 'active' ? '禁用' : '启用'}
                        </button>
                        <button onClick={() => handleOpenDrawer(account)} className="text-[#0061FF] hover:text-[#0052cc] inline-flex items-center px-2 py-1 border border-blue-200 rounded text-xs bg-blue-50">
                          <Edit className="w-3 h-3 mr-1" /> 编辑权限
                        </button>
                      </td>
                    </tr>
                  ))}
                  {subAccounts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        暂无子账号记录，请点击右上角新增
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
          {isPendingLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-[#0061FF]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                    <th className="p-4 font-medium">申请人</th>
                    <th className="p-4 font-medium">登录账号</th>
                    <th className="p-4 font-medium">部门</th>
                    <th className="p-4 font-medium">状态</th>
                    <th className="p-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-700">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-4 font-medium text-[#0A2540]">{u.displayName}</td>
                      <td className="p-4 text-gray-500 font-mono text-xs">{u.username}</td>
                      <td className="p-4">{u.department || '-'}</td>
                      <td className="p-4">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">待审核</span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(u)}
                          className="text-white bg-[#0061FF] hover:bg-[#0052cc] inline-flex items-center px-3 py-1.5 rounded text-xs font-medium"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> 通过
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          className="text-red-600 hover:text-red-800 inline-flex items-center px-3 py-1.5 border border-red-200 rounded text-xs bg-red-50"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> 驳回
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        暂无待审核的注册申请
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drawer */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[480px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center"><Users className="w-5 h-5 mr-2"/> {editingId ? '编辑子账号' : '新增子账号'}</h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)}><X className="w-5 h-5 text-gray-300 hover:text-white" /></button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">账号配置 (登录手机号/邮箱) *</label>
                <input required disabled={!!editingId} type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF] disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">登录密码</label>
                <div className="relative">
                  <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder={editingId ? '不填则保持原密码' : '默认: 123456'} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]" />
                  <KeySquare className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">显示名称 *</label>
                <input required type="text" value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">部门 / 职务</label>
                <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#0A2540] mb-3 border-b pb-2">模块授权</h3>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {ALL_MODULES.map(md => {
                  const hasPerm = formData.permissions.includes(md.id);
                  return (
                    <div 
                      key={md.id} 
                      onClick={() => togglePermission(md.id)}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${hasPerm ? 'border-[#0061FF] bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      {hasPerm ? <CheckSquare className="w-5 h-5 text-[#0061FF] mr-2" /> : <Square className="w-5 h-5 text-gray-300 mr-2" />}
                      <span className={`text-sm ${hasPerm ? 'font-medium text-[#0A2540]' : 'text-gray-500'}`}>{md.label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">提示：未勾选的模块，子账号登录后将无法在左侧菜单栏看见，且直接访问 URL 也会被系统拦截。</p>
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-white bg-white shadow-sm font-medium">取消</button>
            <button disabled={isSubmitting} type="submit" className="px-5 py-2 bg-[#0061FF] text-white rounded-lg text-sm hover:bg-[#0052cc] shadow-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '提交配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
