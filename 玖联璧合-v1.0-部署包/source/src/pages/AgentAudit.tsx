import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Search, FileBadge, Loader2, Edit, Trash2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '../hooks/useQuery';
import {
  fetchPendingApplicationsUi,
  updateApplicationRow,
  deleteApplicationRow,
  approveApplication,
  rejectApplication,
  type AgentApplicationUi,
} from '../services/agentService';
import { listFilesForEntity, downloadFileById, getFilePreviewUrl, formatFileSize, type FileUi } from '../services/fileService';

/** 文件分类显示名 */
const DOC_CATEGORY_LABELS: Record<string, string> = {
  business_license: '营业执照副本',
  transport_permit: '道路运输经营许可证',
  id_card: '法人身份证正反面',
  qualification: '企业资质证明',
};

export const AgentAudit: React.FC = () => {
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentApplicationUi | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditLevel, setAuditLevel] = useState('');
  const [auditRemark, setAuditRemark] = useState('');

  const { data: pendingAgents = [], isLoading, refetch } = useQuery('agent-applications-pending', fetchPendingApplicationsUi);

  const { data: auditFiles = [] } = useQuery(
    `agent-application-files-${selectedAgent?.id}`,
    () => selectedAgent ? listFilesForEntity('agent_application', selectedAgent.id) : Promise.resolve([])
  );

  // File action handlers
  const handlePreview = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = await getFilePreviewUrl(fileId);
      window.open(url, '_blank');
    } catch (err) {
      toast.error('预览获取失败');
    }
  };

  const handleDownload = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadFileById(fileId);
    } catch (err) {
      toast.error('文件下载失败');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    bizType: '',
    contact: '',
    phone: '',
    location: ''
  });

  const openAudit = (agent: AgentApplicationUi) => {
    setSelectedAgent(agent);
    setAuditLevel('');
    setAuditRemark('');
    setIsAuditDrawerOpen(true);
  };

  const handleOpenEdit = (agent: AgentApplicationUi) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      bizType: agent.bizType,
      contact: agent.contact,
      phone: agent.phone,
      location: agent.location
    });
    setIsEditDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条申请记录吗？此操作不可恢复。')) return;
    try {
      await deleteApplicationRow(id);
      toast.success('删除成功');
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setIsSubmitting(true);
    try {
      await updateApplicationRow(selectedAgent.id, {
        name: formData.name,
        bizType: formData.bizType,
        contact: formData.contact,
        phone: formData.phone,
        location: formData.location,
      });
      toast.success('申请信息更新成功');
      await refetch();
      setIsEditDrawerOpen(false);
      setSelectedAgent(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudit = async (status: 'approve' | 'reject') => {
    if (!selectedAgent) return;
    setIsSubmitting(true);
    try {
      if (status === 'approve') {
        await approveApplication(selectedAgent, auditLevel || 'B级');
        const acct = selectedAgent.loginAccount || selectedAgent.phone || selectedAgent.contact;
        toast.success(`审核通过！供应商登录账号：${acct}`);
      } else {
        await rejectApplication(selectedAgent.id);
        toast.error('申请已驳回');
      }
      await refetch();
      setIsAuditDrawerOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold text-[#0A2540] relative">
              待处理入库申请
              {pendingAgents.length > 0 && (
                <span className="absolute -top-1 -right-4 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingAgents.length}</span>
              )}
            </h1>
         </div>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="搜索申请公司..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none w-64 bg-white shadow-sm" />
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
                  <th className="p-4 font-medium w-12 text-center"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="p-4 font-medium">申请公司名称</th>
                  <th className="p-4 font-medium">申请业务资质</th>
                  <th className="p-4 font-medium">申请时间</th>
                  <th className="p-4 font-medium">联系人</th>
                  <th className="p-4 font-medium">所在地</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {pendingAgents.map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="p-4 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-4 font-medium text-[#0A2540]">{agent.name}</td>
                    <td className="p-4 text-gray-600">{agent.bizType}</td>
                    <td className="p-4 text-gray-500">{agent.applyDate}</td>
                    <td className="p-4">{agent.contact} <span className="text-gray-400 text-xs block">{agent.phone}</span></td>
                    <td className="p-4">{agent.location}</td>
                    <td className="p-4">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">待审核</span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openAudit(agent)} className="text-white bg-[#FF6B00] px-3 py-1.5 rounded-md hover:bg-[#e66000] font-medium text-xs transition-colors">
                        去审批
                      </button>
                      <button onClick={() => handleOpenEdit(agent)} className="text-[#0A2540] hover:text-[#FF6B00] font-medium text-xs inline-flex items-center px-2 py-1.5">
                        <Edit className="w-3 h-3 mr-1" /> 编辑
                      </button>
                      <button onClick={() => handleDelete(agent.id)} className="text-red-500 hover:text-red-700 font-medium text-xs inline-flex items-center px-2 py-1.5">
                        <Trash2 className="w-3 h-3 mr-1" /> 删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 审批抽屉 */}
      <div className={`fixed inset-0 bg-black/30 z-[60] transition-opacity backdrop-blur-sm ${isAuditDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsAuditDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[560px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isAuditDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
          <div>
            <h2 className="text-lg font-semibold flex items-center"><FileBadge className="w-5 h-5 mr-2" /> 代理入库审批</h2>
            <p className="text-xs text-gray-300 mt-1">审批流水号: {selectedAgent?.id}</p>
          </div>
          <button onClick={() => setIsAuditDrawerOpen(false)} className="text-gray-300 hover:text-white">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
             <h3 className="text-sm font-bold text-gray-800 mb-3 border-l-4 border-[#FF6B00] pl-2">申请方提交资料</h3>
             <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 space-y-3 text-sm">
                <div className="grid grid-cols-3">
                  <div className="text-gray-500">公司名称</div>
                  <div className="col-span-2 font-medium text-[#0A2540]">{selectedAgent?.name}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="text-gray-500">申请业务</div>
                  <div className="col-span-2">{selectedAgent?.bizType}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="text-gray-500">联系方式</div>
                  <div className="col-span-2">{selectedAgent?.contact} ({selectedAgent?.phone})</div>
                </div>
                {selectedAgent?.loginAccount && (
                  <div className="grid grid-cols-3">
                    <div className="text-gray-500">注册登录账号</div>
                    <div className="col-span-2 font-mono text-[#0061FF] font-medium">{selectedAgent.loginAccount}</div>
                  </div>
                )}
                {selectedAgent?.creditCode && (
                  <div className="grid grid-cols-3">
                    <div className="text-gray-500">统一信用代码</div>
                    <div className="col-span-2 font-mono text-gray-700">{selectedAgent.creditCode}</div>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                   <div className="text-gray-500 text-sm mb-3 flex items-center gap-1">
                     <FileText className="w-3.5 h-3.5" />
                     资质文件附件 ({auditFiles.length || selectedAgent?.docNames?.length || 0})
                   </div>
                   <div className="space-y-2.5">
                     {auditFiles.length > 0 ? (
                       /* ── 按 doc_category 分组显示 ────────── */
                       (() => {
                         const categoryOrder = ['business_license', 'transport_permit', 'id_card', 'qualification'];
                         const grouped: Record<string, FileUi[]> = {};
                         const uncategorized: FileUi[] = [];
                         auditFiles.forEach((f) => {
                           const cat = f.docCategory;
                           if (cat) {
                             (grouped[cat] ??= []).push(f);
                           } else {
                             uncategorized.push(f);
                           }
                         });
                         const entries = [
                           ...categoryOrder.filter(c => grouped[c]).map(c => ({ cat: c, files: grouped[c] })),
                           ...(uncategorized.length > 0 ? [{ cat: '_other', files: uncategorized }] : []),
                         ];
                         return entries.map(({ cat, files }) => (
                           <div key={cat} className="space-y-1">
                             <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                               <CheckCircle2 className="w-3 h-3 text-green-500" />
                               {DOC_CATEGORY_LABELS[cat] ?? '其他文件'}
                             </div>
                             {files.map((f) => (
                               <div key={f.id} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors ml-4">
                                 <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={(e) => void handlePreview(f.id, e)} title="预览">
                                   <FileText className="w-3.5 h-3.5 text-blue-500" />
                                 </div>
                                 <span className="text-xs text-gray-700 flex-1 truncate cursor-pointer hover:underline" onClick={(e) => void handlePreview(f.id, e)}>{f.originalName}</span>
                                 <span className="text-[10px] text-gray-400">{formatFileSize(f.sizeBytes)}</span>
                                 <button
                                   type="button"
                                   onClick={(e) => void handleDownload(f.id, e)}
                                   className="text-[11px] text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded"
                                 >
                                   下载
                                 </button>
                               </div>
                             ))}
                           </div>
                         ));
                       })()
                     ) : selectedAgent?.docNames && selectedAgent.docNames.length > 0 ? (
                       selectedAgent.docNames.map((name, idx) => (
                         <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                           <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                             <FileText className="w-3.5 h-3.5 text-blue-500" />
                           </div>
                           <span className="text-xs text-gray-700 flex-1 truncate">{name}</span>
                           <span className="text-[10px] text-gray-400">名称记录 (未含源文件)</span>
                         </div>
                       ))
                     ) : (
                       <span className="text-xs text-gray-400">未上传资质文件</span>
                     )}
                   </div>
                </div>
             </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[#0A2540] mb-3 flex items-center">内部审批决议</h3>
            <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">评定合作等级 <span className="text-red-500">*</span></label>
                  <select
                    value={auditLevel}
                    onChange={(e) => setAuditLevel(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-white focus:border-blue-500"
                  >
                    <option value="">请选择初始等级...</option>
                    <option value="A级">A级 (优先派单)</option>
                    <option value="B级">B级 (常规比价)</option>
                    <option value="C级">C级 (临时备用)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">审批意见</label>
                  <textarea
                    rows={3}
                    value={auditRemark}
                    onChange={(e) => setAuditRemark(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
                    placeholder="若拒绝，请务必填写拒绝原因；若通过，可填写内部备注..."
                  ></textarea>
               </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center shadow-inner">
          <button disabled={isSubmitting} onClick={() => setIsAuditDrawerOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-white hover:underline disabled:opacity-50">取消返回</button>
          <div className="flex space-x-3">
             <button
               disabled={isSubmitting}
               onClick={() => handleAudit('reject')}
               className="flex items-center px-4 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
             >
               <XCircle className="w-4 h-4 mr-1" /> 驳回申请
             </button>
             <button
               disabled={isSubmitting}
               onClick={() => handleAudit('approve')}
               className="flex items-center px-5 py-2 text-sm text-white bg-[#0A2540] rounded-lg hover:bg-[#113a63] disabled:opacity-50"
             >
               {isSubmitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
               {isSubmitting ? '处理中...' : '审核通过并生成登录账号'}
             </button>
          </div>
        </div>
      </div>

      {/* 编辑申请抽屉 */}
      <div className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isEditDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsEditDrawerOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isEditDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={handleSaveEdit} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold flex items-center"><FileText className="w-5 h-5 mr-2"/> 编辑申请信息</h2>
            <button type="button" onClick={() => setIsEditDrawerOpen(false)}><X className="w-5 h-5 text-gray-300 hover:text-white" /></button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">公司名称 *</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">申请业务资质 *</label>
              <input required type="text" value={formData.bizType} onChange={(e) => setFormData({...formData, bizType: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">联系人</label>
              <input type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">联系电话</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">所在地</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
          </div>
          <div className="p-4 border-t flex justify-end space-x-3">
            <button type="button" onClick={() => setIsEditDrawerOpen(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">取消</button>
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
