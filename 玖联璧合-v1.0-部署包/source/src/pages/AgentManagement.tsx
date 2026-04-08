import React, { useState } from 'react';
import {
  Search, Filter, Plus, X, Download, ShieldCheck, Loader2, Edit, Trash2,
  Clock, Eye, EyeOff, UserPlus, KeyRound, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchAgentsUi,
  insertAgentRow,
  updateAgentRow,
  deleteAgentRow,
  agentHasFilesOrApplications,
  type AgentUi,
} from '../services/agentService';
import { listFilesForEntity, downloadFileById, getFilePreviewUrl, formatFileSize } from '../services/fileService';
import { AdminPasswordDialog } from '../components/AdminPasswordDialog';
import { FileText } from 'lucide-react';

// ── 状态徽标：区分 待审核 / 已审核 ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === '待审核') {
    return (
      <span className="flex items-center text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-md">
        <Clock className="w-3 h-3 mr-1" /> 待审核
      </span>
    );
  }
  return (
    <span className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-md">
      <ShieldCheck className="w-3 h-3 mr-1" /> {status || '已审核'}
    </span>
  );
}

export const AgentManagement: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentUi | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data: agents = [], isLoading, refetch } = useQuery('agents', fetchAgentsUi);

  const { data: agentFiles = [] } = useQuery(
    `agent-files-${editingItem?.id}`,
    () => editingItem ? listFilesForEntity('agent', editingItem.id) : Promise.resolve([])
  );

  const handlePreview = async (fileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const url = await getFilePreviewUrl(fileId);
      window.open(url, '_blank');
    } catch {
      toast.error('预览获取失败');
    }
  };

  const handleDownload = async (fileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await downloadFileById(fileId);
    } catch {
      toast.error('文件下载失败');
    }
  };

  // admin 密码确认弹窗状态
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    bizType: '干线运输 (中越/越老)',
    contact: '',
    phone: '',
    level: 'A级 (核心供应商)',
    remark: '',
    // 账号字段（仅新增时使用）
    loginAccount: '',
    loginPassword: '',
  });

  const handleOpenDrawer = (item?: AgentUi) => {
    setShowPassword(false);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        bizType: item.bizType,
        contact: item.contact,
        phone: item.phone,
        level: item.level === 'A级' ? 'A级 (核心供应商)' : item.level === 'B级' ? 'B级 (常规供应商)' : 'C级 (备用供应商)',
        remark: item.remark,
        loginAccount: '',
        loginPassword: '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', bizType: '干线运输 (中越/越老)', contact: '', phone: '',
        level: 'A级 (核心供应商)', remark: '',
        loginAccount: '', loginPassword: '123456',
      });
    }
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const needsAdmin = await agentHasFilesOrApplications(id);
      if (needsAdmin) {
        setPendingDeleteId(id);
        setAdminDialogOpen(true);
        return;
      }
      if (!window.confirm('您确定要删除这条记录吗？此操作不可恢复。')) return;
      await deleteAgentRow(id);
      await refetch();
      toast.success('删除成功');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleAdminConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteAgentRow(pendingDeleteId);
      await refetch();
      toast.success('删除成功');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setAdminDialogOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateAgentRow(editingItem.id, formData);
        toast.success('代理商信息更新成功');
      } else {
        // 新增时需要填写登录账号
        if (!formData.loginAccount.trim()) {
          toast.error('请填写代理登录账号');
          setIsSubmitting(false);
          return;
        }
        await insertAgentRow({
          ...formData,
          code: '',
          location: '',
          status: '待审核',
        });
        toast.success(
          '代理商建档成功！已自动注册代理账号，代理需登录代理端完成入库申请。',
          { duration: 4000 }
        );
      }
      setIsDrawerOpen(false);
      setEditingItem(null);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 自动填充：联系电话 → 登录账号
  const handlePhoneChange = (phone: string) => {
    const shouldSync = !editingItem && (!formData.loginAccount || formData.loginAccount === formData.phone);
    setFormData((prev) => ({
      ...prev,
      phone,
      ...(shouldSync ? { loginAccount: phone } : {}),
    }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索代理名称/编码..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0A2540] w-64 bg-white shadow-sm"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600 shadow-sm">
            <Filter className="w-4 h-4" />
            <span>业务板块筛选</span>
          </button>
        </div>
        <div className="flex space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-600 shadow-sm">
            <Download className="w-4 h-4" />
            <span>导出数据</span>
          </button>
          <button
            onClick={() => handleOpenDrawer()}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm bg-[#FF6B00] text-white hover:bg-[#e66000] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>手工新增代理</span>
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
                  <th className="p-4 font-medium">代理公司名称</th>
                  <th className="p-4 font-medium">业务板块</th>
                  <th className="p-4 font-medium">企业编码</th>
                  <th className="p-4 font-medium">所在地</th>
                  <th className="p-4 font-medium">联系人</th>
                  <th className="p-4 font-medium">合作等级</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {agents.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-[#0A2540]">{a.name}</td>
                    <td className="p-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs">{a.bizType}</span></td>
                    <td className="p-4 text-gray-500">{a.code}</td>
                    <td className="p-4">{a.location}</td>
                    <td className="p-4">{a.contact}</td>
                    <td className="p-4">
                      <span className={`font-bold ${a.level === 'A级' ? 'text-green-600' : a.level === 'B级' ? 'text-blue-600' : 'text-gray-500'}`}>{a.level}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-4 text-right space-x-3">
                      <button onClick={() => handleOpenDrawer(a)} className="text-[#0A2540] hover:text-[#FF6B00] transition-colors font-medium text-sm inline-flex items-center">
                        <Edit className="w-4 h-4 mr-1" /> 编辑
                      </button>
                      <button onClick={() => void handleDelete(a.id)} className="text-red-500 hover:text-red-700 transition-colors font-medium text-sm inline-flex items-center">
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

      {/* ── 右侧滑出抽屉 ─────────────────────────────────────────────────────── */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-[520px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {editingItem ? (
                <><Edit className="w-5 h-5" /> 编辑代理信息</>
              ) : (
                <><UserPlus className="w-5 h-5" /> 新增代理入库</>
              )}
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="text-gray-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* ── 代理常规信息 ───────────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-4 border-l-4 border-[#0A2540] pl-2">代理常规信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540]"
                    placeholder="代理全称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">主营业务板块</label>
                  <select
                    value={formData.bizType}
                    onChange={(e) => setFormData({...formData, bizType: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-white"
                  >
                    <option>干线运输 (中越/越老)</option>
                    <option>口岸清关</option>
                    <option>末端派送</option>
                    <option>特殊检测/实验室服务</option>
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
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                    <input
                      required
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 代理登录账号（仅新增时显示）─────────────────────────────── */}
            {!editingItem && (
              <div className="border border-indigo-200 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-indigo-700">代理登录账号</p>
                  </div>
                  <p className="text-[11px] text-indigo-500 mt-1">
                    建档后系统将在「代理商账号管理」中自动注册此账号。代理需使用此账号登录代理端完成入库申请。
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      登录账号 <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-400 ml-1">（手机号/邮箱/自定义）</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.loginAccount}
                      onChange={(e) => setFormData({...formData, loginAccount: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      placeholder="默认使用联系电话"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      初始密码 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={formData.loginPassword}
                        onChange={(e) => setFormData({...formData, loginPassword: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg p-2.5 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        placeholder="初始密码（默认 123456）"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">代理首次登录后建议修改密码</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 资质附件（编辑时显示，按分类分组）─────────────────────── */}
            {editingItem && (
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                 <h3 className="text-sm font-bold text-[#0A2540] mb-4 flex items-center">资质与认证附件 ({agentFiles.length})</h3>
                 <div className="space-y-3">
                   {agentFiles.length > 0 ? (
                     (() => {
                       const catLabels: Record<string, string> = {
                         business_license: '营业执照副本',
                         transport_permit: '道路运输经营许可证',
                         id_card: '法人身份证正反面',
                         qualification: '企业资质证明',
                       };
                       const catOrder = ['business_license', 'transport_permit', 'id_card', 'qualification'];
                       const grouped: Record<string, typeof agentFiles> = {};
                       const uncategorized: typeof agentFiles = [];
                       agentFiles.forEach((f) => {
                         const cat = f.docCategory;
                         if (cat) { (grouped[cat] ??= []).push(f); } else { uncategorized.push(f); }
                       });
                       const entries = [
                         ...catOrder.filter(c => grouped[c]).map(c => ({ cat: c, files: grouped[c] })),
                         ...(uncategorized.length > 0 ? [{ cat: '_other', files: uncategorized }] : []),
                       ];
                       return entries.map(({ cat, files }) => (
                         <div key={cat} className="space-y-1.5">
                           <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                             <CheckCircle2 className="w-3 h-3 text-green-500" />
                             {catLabels[cat] ?? '其他文件'}
                           </div>
                           {files.map((f) => (
                             <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm ml-4">
                               <div className="flex items-center gap-3 flex-1 min-w-0">
                                 <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={(e) => void handlePreview(f.id, e)} title="预览">
                                   <FileText className="w-4 h-4 text-orange-500" />
                                 </div>
                                 <div className="flex flex-col min-w-0 flex-1">
                                   <span className="text-sm text-gray-700 truncate cursor-pointer hover:underline" onClick={(e) => void handlePreview(f.id, e)}>{f.originalName}</span>
                                   <span className="text-xs text-gray-400">{formatFileSize(f.sizeBytes)}</span>
                                 </div>
                               </div>
                               <button
                                 type="button"
                                 onClick={(e) => void handleDownload(f.id, e)}
                                 className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap flex-shrink-0"
                               >
                                 下载
                               </button>
                             </div>
                           ))}
                         </div>
                       ));
                     })()
                   ) : (
                     <div className="text-sm text-gray-400 py-2 border border-dashed border-gray-200 rounded-lg text-center bg-white">暂未上传任何附件</div>
                   )}
                 </div>
              </div>
            )}

            {/* ── 内部管控字段 ────────────────────────────────────────── */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
               <h3 className="text-sm font-bold text-[#0A2540] mb-4 flex items-center">内部管控字段 (代理不可见)</h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">自动生成编码</label>
                      <input type="text" disabled value={editingItem ? editingItem.code : "系统自动分配"} className="w-full border border-gray-200 bg-gray-100 text-gray-400 rounded-lg p-2.5 text-sm cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">初始合作等级 <span className="text-red-500">*</span></label>
                      <select
                        value={formData.level}
                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-white"
                      >
                        <option>A级 (核心供应商)</option>
                        <option>B级 (常规供应商)</option>
                        <option>C级 (备用供应商)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">内部审核备注</label>
                    <textarea
                      rows={2}
                      value={formData.remark}
                      onChange={(e) => setFormData({...formData, remark: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0A2540]"
                      placeholder="例如：该代理在友谊关口岸清关能力较强..."
                    />
                  </div>
               </div>
            </div>

            {/* ── 新增时的流程提示 ────────────────────────────────────── */}
            {!editingItem && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">建档后流程说明</p>
                <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
                  <li>系统自动在「代理商账号管理」创建代理登录账号，状态为<span className="font-bold text-amber-900">待审核</span></li>
                  <li>将上方填写的<span className="font-bold text-amber-900">登录账号和密码</span>告知代理方</li>
                  <li>代理使用该账号登录<span className="font-bold text-amber-900">代理端</span>，提交入库申请并上传资质文件</li>
                  <li>管理员在「代理申请入库审批」页面审核通过后，账号激活，代理正式入库</li>
                </ol>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white flex justify-end space-x-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="px-5 py-2 text-sm text-white bg-[#0A2540] rounded-lg hover:bg-[#113a63] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? '保存中...' : (editingItem ? '保存修改' : '确认建档并注册账号')}
            </button>
          </div>
        </form>
      </div>

      {/* admin 密码确认弹窗 */}
      <AdminPasswordDialog
        open={adminDialogOpen}
        title="删除代理需要管理员确认"
        description="该代理已上传入库申请或资质文件，删除操作需要输入 admin 账号密码进行安全确认。"
        onConfirm={handleAdminConfirmDelete}
        onCancel={() => { setAdminDialogOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
};
