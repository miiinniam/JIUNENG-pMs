/**
 * 免费文件模板下载页面
 * 公开访问，无需登录
 */

import React, { useEffect, useState } from 'react';
import { FileDown, FileText, Table, File, Download, Loader2, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getActiveTemplates, downloadTemplate, formatFileSize, getFileIcon, FreeTemplateUi } from '../services/templateService';

// ── 组件 Props ────────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: FreeTemplateUi;
  onDownload: (id: string) => void;
  downloading: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onDownload, downloading }) => {
  const iconType = getFileIcon(template.mimeType);

  const IconComponent = () => {
    switch (iconType) {
      case 'pdf':
        return <FileText className="w-10 h-10 text-red-500" />;
      case 'doc':
        return <FileText className="w-10 h-10 text-blue-500" />;
      case 'sheet':
        return <Table className="w-10 h-10 text-green-500" />;
      default:
        return <File className="w-10 h-10 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#FF6B00]/20 transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#FFF7F0] transition-colors">
          <IconComponent />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#FF6B00] transition-colors">
            {template.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {template.description || '暂无描述'}
          </p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {formatFileSize(template.sizeBytes)}
            </div>
            <button
              onClick={() => onDownload(template.id)}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] text-white text-sm font-medium rounded-lg hover:bg-[#E55A00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  下载中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  下载
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 主组件 ──────────────────────────────────────────────────────────────────

export const FreeTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<FreeTemplateUi[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getActiveTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      setDownloadingId(id);
      await downloadTemplate(id);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试');
    } finally {
      setDownloadingId(null);
    }
  };

  const exportTemplates = templates.filter(t => t.category === 'export');
  const importTemplates = templates.filter(t => t.category === 'import');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                to="/login" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">免费报关文件模板</h1>
                <p className="text-sm text-gray-500">进出口报关清关所需标准文件模板下载</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#F0F7FF] to-[#FFF7F0] rounded-2xl p-6 mb-8 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <FileDown className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">如何使用这些模板？</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                这些文件模板均为进出口报关清关所需的标准格式。您可以直接下载填写，或打印后手工填写。
                如有疑问，请联系我们的客服团队获取帮助。所有模板均可免费使用。
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#FF6B00] animate-spin mx-auto mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          </div>
        )}

        {/* Template Lists */}
        {!loading && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Export Templates */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📤</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">出口文件</h2>
                  <p className="text-xs text-gray-500">{exportTemplates.length} 个模板</p>
                </div>
              </div>
              
              {exportTemplates.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无出口文件模板</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exportTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onDownload={handleDownload}
                      downloading={downloadingId === template.id}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Import Templates */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📥</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">进口文件</h2>
                  <p className="text-xs text-gray-500">{importTemplates.length} 个模板</p>
                </div>
              </div>
              
              {importTemplates.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无进口文件模板</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {importTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onDownload={handleDownload}
                      downloading={downloadingId === template.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} 玖联璧合 · 中越跨境物流系统 · 免费文件模板
          </p>
          <p className="text-xs text-gray-400 mt-2">
            如需帮助，请联系客服：support@jiulian.cn
          </p>
        </div>
      </main>
    </div>
  );
};

export default FreeTemplates;
