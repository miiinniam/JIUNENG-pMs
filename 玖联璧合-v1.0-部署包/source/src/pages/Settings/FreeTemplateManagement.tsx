/**
 * 免费文件模板管理页面 (Admin后台)
 */

import React, { useEffect, useState } from 'react';
import {
  FileDown,
  Plus,
  Edit2,
  Trash2,
  Download,
  Loader2,
  X,
  Upload,
  FileText,
  Table,
  File,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  uploadTemplateFile,
  formatFileSize,
  getFileIcon,
  FreeTemplateUi,
} from '../../services/templateService';
import type { TemplateCategory } from '../../database/schema';

// ── 模态框组件 ──────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ── 表单组件 ───────────────────────────────────────────────────────────────

interface TemplateFormData {
  name: string;
  description: string;
  category: TemplateCategory;
  file: File | null;
  isActive: boolean;
}

interface TemplateFormProps {
  initialData?: FreeTemplateUi;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'export',
    file: null,
    isActive: initialData?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          文件名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-colors"
          placeholder="例如：商业发票模板"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          文件描述
        </label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-colors resize-none"
          rows={3}
          placeholder="简要描述此文件的用途..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          文件分类 <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="export"
              checked={formData.category === 'export'}
              onChange={() => setFormData({ ...formData, category: 'export' })}
              className="w-4 h-4 text-[#FF6B00]"
            />
            <span className="text-sm text-gray-700">📤 出口文件</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="import"
              checked={formData.category === 'import'}
              onChange={() => setFormData({ ...formData, category: 'import' })}
              className="w-4 h-4 text-[#FF6B00]"
            />
            <span className="text-sm text-gray-700">📥 进口文件</span>
          </label>
        </div>
      </div>

      {!initialData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            上传文件
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FF6B00]/40 transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {formData.file ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="w-6 h-6 text-[#FF6B00]" />
                  <span className="text-sm text-gray-700">{formData.file.name}</span>
                  <span className="text-xs text-gray-400">({formatFileSize(formData.file.size)})</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
                  <p className="text-xs text-gray-400 mt-1">支持 PDF、Word、Excel、TXT、CSV</p>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          启用状态
        </label>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
          className="flex items-center gap-2"
        >
          {formData.isActive ? (
            <ToggleRight className="w-10 h-10 text-green-500" />
          ) : (
            <ToggleLeft className="w-10 h-10 text-gray-300" />
          )}
          <span className="text-sm text-gray-700">
            {formData.isActive ? '已启用' : '已禁用'}
          </span>
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting || !formData.name}
          className="flex-1 px-4 py-2.5 bg-[#FF6B00] text-white font-medium rounded-xl hover:bg-[#E55A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              保存
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ── 主组件 ──────────────────────────────────────────────────────────────────

export const FreeTemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<FreeTemplateUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FreeTemplateUi | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | TemplateCategory>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
      showToast('error', '加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (data: TemplateFormData) => {
    try {
      if (data.file) {
        await uploadTemplateFile({
          file: data.file,
          category: data.category,
          name: data.name,
          description: data.description || undefined,
        });
      } else {
        await createTemplate({
          name: data.name,
          description: data.description || undefined,
          category: data.category,
          path: `templates/${data.category}/${Date.now()}_template`,
          originalName: `${data.name}.pdf`,
        });
      }
      showToast('success', '添加成功');
      setShowAddModal(false);
      loadTemplates();
    } catch (error: any) {
      console.error('添加失败:', error);
      // 显示真实错误信息
      const errMsg = error?.message || String(error) || '未知错误';
      showToast('error', errMsg);
    }
  };

  const handleEdit = async (data: TemplateFormData) => {
    if (!editingTemplate) return;
    try {
      await updateTemplate({
        id: editingTemplate.id,
        name: data.name,
        description: data.description || undefined,
        category: data.category,
        isActive: data.isActive,
      });
      showToast('success', '更新成功');
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('更新失败:', error);
      showToast('error', '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      showToast('success', '删除成功');
      setDeleteConfirm(null);
      loadTemplates();
    } catch (error) {
      console.error('删除失败:', error);
      showToast('error', '删除失败');
    }
  };

  const handleToggleActive = async (template: FreeTemplateUi) => {
    try {
      await updateTemplate({
        id: template.id,
        isActive: !template.isActive,
      });
      showToast('success', template.isActive ? '已禁用' : '已启用');
      loadTemplates();
    } catch (error) {
      console.error('切换状态失败:', error);
      showToast('error', '操作失败');
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const { downloadTemplate } = await import('../../services/templateService');
      await downloadTemplate(id);
    } catch (error) {
      console.error('下载失败:', error);
      showToast('error', '下载失败');
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const exportTemplates = filteredTemplates.filter(t => t.category === 'export');
  const importTemplates = filteredTemplates.filter(t => t.category === 'import');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">免费文件管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理进出口报关清关所需的文件模板</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const { diagnoseStorage } = await import('../../services/templateService');
              const result = await diagnoseStorage();
              if (result.success) {
                showToast('success', `存储正常，buckets: ${result.buckets?.join(', ')}`);
              } else {
                showToast('error', result.error || '存储检查失败');
              }
            }}
            className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            诊断存储
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] text-white font-medium rounded-xl hover:bg-[#E55A00] transition-colors shadow-lg shadow-orange-200"
          >
            <Plus className="w-5 h-5" />
            添加模板
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文件名或描述..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as 'all' | TemplateCategory)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-colors"
          >
            <option value="all">全部分类</option>
            <option value="export">📤 出口文件</option>
            <option value="import">📥 进口文件</option>
          </select>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {toast.type === 'success' ? (
            <FileDown className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.message}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Export Templates */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <span className="text-xl">📤</span>
              <div>
                <h2 className="font-semibold text-gray-900">出口文件</h2>
                <p className="text-xs text-gray-500">{exportTemplates.length} 个模板</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {exportTemplates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">暂无模板</div>
              ) : (
                exportTemplates.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onEdit={() => setEditingTemplate(template)}
                    onDelete={() => setDeleteConfirm(template.id)}
                    onToggle={() => handleToggleActive(template)}
                    onDownload={() => handleDownload(template.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Import Templates */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-green-50 border-b border-green-100 flex items-center gap-3">
              <span className="text-xl">📥</span>
              <div>
                <h2 className="font-semibold text-gray-900">进口文件</h2>
                <p className="text-xs text-gray-500">{importTemplates.length} 个模板</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {importTemplates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">暂无模板</div>
              ) : (
                importTemplates.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onEdit={() => setEditingTemplate(template)}
                    onDelete={() => setDeleteConfirm(template.id)}
                    onToggle={() => handleToggleActive(template)}
                    onDownload={() => handleDownload(template.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="添加模板">
        <TemplateForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)} title="编辑模板">
        {editingTemplate && (
          <TemplateForm
            initialData={editingTemplate}
            onSubmit={handleEdit}
            onCancel={() => setEditingTemplate(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="确认删除">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-600 mb-6">确定要删除这个模板吗？此操作不可撤销。</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── 行组件 ──────────────────────────────────────────────────────────────────

interface TemplateRowProps {
  template: FreeTemplateUi;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDownload: () => void;
}

const TemplateRow: React.FC<TemplateRowProps> = ({
  template,
  onEdit,
  onDelete,
  onToggle,
  onDownload,
}) => {
  const iconType = getFileIcon(template.mimeType);

  const IconComponent = () => {
    switch (iconType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'sheet':
        return <Table className="w-5 h-5 text-green-500" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className={`p-4 flex items-center gap-4 ${!template.isActive ? 'opacity-50' : ''}`}>
      <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
        <IconComponent />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{template.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(template.sizeBytes)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onDownload}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="下载"
        >
          <Download className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="编辑"
        >
          <Edit2 className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title={template.isActive ? '禁用' : '启用'}
        >
          {template.isActive ? (
            <ToggleRight className="w-6 h-6 text-green-500" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-300" />
          )}
        </button>
      </div>
    </div>
  );
};

export default FreeTemplateManagement;
