import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Trash2,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadFile,
  downloadFileById,
  deleteFileById,
  getFilePreviewUrl,
  formatFileSize,
  getFileIcon,
  ACCEPT_STRING,
  type FileUi,
  type UploadFileInput,
} from '../services/fileService';
import type { FileBucket, FileRefType, UserPortal } from '../database/schema';

// ── Types ───────────────────────────────────────────────────────────────────

interface FileUploadZoneProps {
  /** 文件列表 */
  files: FileUi[];
  /** 上传完成后的回调 (用于刷新列表) */
  onUploadComplete?: () => void;
  /** 删除完成后的回调 */
  onDeleteComplete?: () => void;
  /** Storage bucket */
  bucket: FileBucket;
  /** 上传者 */
  uploaderId: string;
  uploaderPortal: UserPortal;
  /** 关联实体 */
  refType?: FileRefType;
  refId?: string;
  /** 是否只读 (仅查看/下载, 不可上传/删除) */
  readOnly?: boolean;
  /** 标题 */
  title?: string;
  /** 最大同时上传数 */
  maxFiles?: number;
  /** 紧凑模式 */
  compact?: boolean;
}

// ── Icon map ────────────────────────────────────────────────────────────────

const FileTypeIcon: React.FC<{ mime: string; className?: string }> = ({ mime, className = '' }) => {
  const kind = getFileIcon(mime);
  switch (kind) {
    case 'image':
      return <ImageIcon className={`text-purple-500 ${className}`} />;
    case 'pdf':
      return <FileText className={`text-red-500 ${className}`} />;
    case 'doc':
      return <FileText className={`text-blue-500 ${className}`} />;
    case 'sheet':
      return <FileSpreadsheet className={`text-green-500 ${className}`} />;
    default:
      return <FileIcon className={`text-gray-400 ${className}`} />;
  }
};

// ── Component ───────────────────────────────────────────────────────────────

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  files,
  onUploadComplete,
  onDeleteComplete,
  bucket,
  uploaderId,
  uploaderPortal,
  refType,
  refId,
  readOnly = false,
  title = '附件管理',
  maxFiles = 10,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]); // uploading file names
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = !readOnly && files.length < maxFiles;

  // ── Upload ──────────────────────────────────────────────────────────────

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      if (arr.length === 0) return;

      const remaining = maxFiles - files.length;
      if (arr.length > remaining) {
        toast.error(`最多还可上传 ${remaining} 个文件`);
        return;
      }

      setUploading(arr.map((f) => f.name));

      let successCount = 0;
      for (const file of arr) {
        try {
          const input: UploadFileInput = {
            file,
            bucket,
            uploaderId,
            uploaderPortal,
            refType,
            refId,
          };
          await uploadFile(input);
          successCount++;
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `上传 ${file.name} 失败`);
        }
      }

      setUploading([]);
      if (successCount > 0) {
        toast.success(`成功上传 ${successCount} 个文件`);
        onUploadComplete?.();
      }
    },
    [bucket, uploaderId, uploaderPortal, refType, refId, files.length, maxFiles, onUploadComplete]
  );

  // ── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!readOnly) setIsDragging(true);
  }, [readOnly]);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!readOnly && e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [readOnly, handleFiles]
  );

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleDownload = async (fileId: string) => {
    try {
      await downloadFileById(fileId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '下载失败');
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!window.confirm(`确定删除文件 "${fileName}" 吗？`)) return;
    try {
      await deleteFileById(fileId);
      toast.success('文件已删除');
      onDeleteComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handlePreview = async (fileId: string, mime: string) => {
    if (!mime.startsWith('image/') && mime !== 'application/pdf') {
      toast.info('仅支持预览图片和 PDF 文件');
      return;
    }
    try {
      const url = await getFilePreviewUrl(fileId);
      setPreviewUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '预览失败');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className={`font-medium text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>
          {title}
          <span className="ml-2 text-gray-400 text-xs font-normal">
            ({files.length}{maxFiles < 999 ? `/${maxFiles}` : ''})
          </span>
        </h4>
      </div>

      {/* Drop Zone */}
      {canUpload && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#FF6B00] bg-orange-50/50 scale-[1.01]'
              : 'border-gray-200 hover:border-[#FF6B00]/50 hover:bg-gray-50/50'
          } ${compact ? 'py-3' : 'py-6'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />

          {uploading.length > 0 ? (
            <div className="flex items-center justify-center gap-2 text-[#FF6B00]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">
                正在上传 {uploading.length} 个文件...
              </span>
            </div>
          ) : (
            <>
              <div className={`mx-auto rounded-full flex items-center justify-center ${
                compact ? 'w-8 h-8 bg-gray-100' : 'w-12 h-12 bg-gradient-to-br from-[#FF6B00]/10 to-orange-100'
              }`}>
                <Upload className={`text-[#FF6B00] ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
              </div>
              <p className={`text-gray-500 mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                拖拽文件到此处，或 <span className="text-[#FF6B00] font-medium">点击选择</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                支持 PDF / Word / Excel / 图片，单文件最大 30MB
              </p>
            </>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg group hover:bg-gray-100/80 transition-colors"
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                <FileTypeIcon mime={f.mimeType} className="w-4 h-4" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-700 truncate">{f.originalName}</p>
                <p className="text-[10px] text-gray-400">
                  {formatFileSize(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {(f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf') && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handlePreview(f.id, f.mimeType); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                    title="预览"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleDownload(f.id); }}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                  title="下载"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(f.id, f.originalName); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && readOnly && (
        <div className="text-center py-4 text-xs text-gray-400">
          暂无文件
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => { setPreviewUrl(null); URL.revokeObjectURL(previewUrl); }}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setPreviewUrl(null); URL.revokeObjectURL(previewUrl); }}
              className="absolute top-3 right-3 z-10 p-1 bg-white/80 rounded-full shadow hover:bg-white"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            {previewUrl.includes('pdf') ? (
              <iframe src={previewUrl} className="w-[800px] h-[80vh]" title="PDF Preview" />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain" />
            )}
          </div>
        </div>
      )}

      {/* Upload Success Indicator */}
      {uploading.length === 0 && files.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          已上传 {files.length} 个文件
        </div>
      )}
    </div>
  );
};
