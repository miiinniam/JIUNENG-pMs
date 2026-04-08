import React, { useState } from 'react';
import {
  KeySquare,
  Loader2,
  Plus,
  Search,
  ShieldX,
  Trash2,
  X,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import {
  fetchAgentAccounts,
  createAgentAccount,
  updateAgentAccount,
  deleteAgentAccount,
  type AgentAccountUi,
} from '../services/userService';
import { fetchApprovedAgentsForInvite } from '../services/tenderService';
import { getCurrentUser } from '../services/authService';

export const AgentAccountManagement: React.FC = () => {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data: accounts = [], isLoading, refetch } = useQuery(
    'agent-accounts',
    fetchAgentAccounts
  );
  const { data: approvedAgents = [] } = useQuery(
    'approved-agents-for-acct',
    fetchApprovedAgentsForInvite
  );

  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    agentId: '',
  });

  const filtered = accounts.filter(
    (a) =>
      !search ||
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.displayName.includes(search) ||
      a.agentName.includes(search)
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ username: '', password: '', displayName: '', agentId: '' });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (account: AgentAccountUi) => {
    setEditingId(account.id);
    setFormData({
      username: account.username,
      password: '',
      displayName: account.displayName,
      agentId: account.agentId,
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateAgentAccount(editingId, {
          displayName: formData.displayName,
          ...(formData.password ? { password: formData.password } : {}),
        });
        toast.success('账号信息已更新');
      } else {
        if (!formData.username) throw new Error('登录账号为必填项');
        if (!formData.agentId) throw new Error('请关联一个代理商档案');
        const agent = approvedAgents.find((a) => a.id === formData.agentId);
        await createAgentAccount({
          username: formData.username,
          password: formData.password || '123456',
          displayName: formData.displayName || (agent?.name ?? ''),
          agentId: formData.agentId,
        });
        toast.success('代理账号创建成功，默认密码：' + (formData.password || '123456'));
      }
      setIsDrawerOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (account: AgentAccountUi) => {
    const newStatus = account.status === 'active' ? 'disabled' : 'active';
    try {
      await updateAgentAccount(account.id, { status: newStatus });
      toast.success(`账号已${newStatus === 'active' ? '启用' : '禁用'}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '状态切换失败');
    }
  };

  const handleDelete = async (account: AgentAccountUi) => {
    if (!window.confirm(`确认删除代理账号「${account.username}」？此操作不可恢复。`)) return;
    try {
      await deleteAgentAccount(account.id);
      toast.success('账号已删除');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-[#0A2540]">代理商账号管理</h1>
          <span className="bg-orange-100 text-[#FF6B00] text-xs px-2 py-0.5 rounded font-medium">
            供应商登录端口
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索账号/代理商名称..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none w-60 bg-white shadow-sm"
            />
          </div>
          <button
            onClick={handleOpenCreate}
            className="bg-[#FF6B00] text-white hover:bg-[#e66000] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> 新增代理账号
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
                  <th className="p-4 font-medium">登录账号</th>
                  <th className="p-4 font-medium">关联代理商</th>
                  <th className="p-4 font-medium">等级</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filtered.map((account) => (
                  <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="font-medium text-[#0A2540]">{account.displayName}</div>
                      <div className="text-gray-400 text-xs font-mono">{account.username}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{account.agentName}</div>
                      <div className="text-gray-400 text-xs font-mono">{account.agentId}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          account.agentLevel === 'A级'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {account.agentLevel}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          account.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {account.status === 'active' ? '正常' : '已禁用'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(account)}
                        className="text-gray-500 hover:text-gray-900 inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                      >
                        <ShieldX className="w-3 h-3 mr-1" />
                        {account.status === 'active' ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(account)}
                        className="text-[#FF6B00] hover:text-[#e66000] inline-flex items-center px-2 py-1 border border-orange-200 rounded text-xs bg-orange-50"
                      >
                        <Edit className="w-3 h-3 mr-1" /> 编辑/重置密码
                      </button>
                      <button
                        onClick={() => handleDelete(account)}
                        className="text-red-500 hover:text-red-700 inline-flex items-center px-2 py-1 border border-red-200 rounded text-xs bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      {search ? '未找到匹配的账号' : '暂无代理账号，点击右上角新增'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 抽屉 */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-[440px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold">
              {editingId ? '编辑代理账号' : '新增代理账号'}
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)}>
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {/* 关联代理商（新建时选，编辑时只读） */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                关联代理商档案 <span className="text-red-500">*</span>
              </label>
              {editingId ? (
                <div className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 text-gray-500">
                  {accounts.find((a) => a.id === editingId)?.agentName ?? '—'}（不可修改）
                </div>
              ) : (
                <select
                  required
                  value={formData.agentId}
                  onChange={(e) => {
                    const agent = approvedAgents.find((a) => a.id === e.target.value);
                    setFormData({
                      ...formData,
                      agentId: e.target.value,
                      displayName: formData.displayName || agent?.name || '',
                    });
                  }}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none bg-white focus:border-[#FF6B00]"
                >
                  <option value="">请选择已审核代理商…</option>
                  {approvedAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.level_label}) · {a.id}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                显示名称 <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B00]"
                placeholder="代理商公司名或联系人"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                登录账号 <span className="text-red-500">*</span>
              </label>
              <input
                required
                disabled={!!editingId}
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B00] disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="如：agent_vn001"
              />
              {editingId && (
                <p className="text-xs text-gray-400 mt-1">账号名创建后不可修改</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                登录密码
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? '留空则保持原密码不变' : '默认：123456'}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#FF6B00] pr-10"
                />
                <KeySquare className="w-4 h-4 text-gray-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              代理商使用此账号登录<strong>供应商端口</strong>（/supplier），可查看定向邀标并提交报价。
            </div>
          </div>

          <div className="p-4 border-t flex justify-end space-x-3 bg-gray-50">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 font-medium"
            >
              取消
            </button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="px-5 py-2 bg-[#FF6B00] text-white rounded-lg text-sm hover:bg-[#e66000] font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
