import React, { useState, useRef, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Upload, CheckCircle2, AlertCircle, FileText,
  Building2, User, Phone, Loader2, Trash2, Eye, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { uploadFile, deleteFileById, getFilePreviewUrl, formatFileSize, type FileUi } from '../../services/fileService';
import { submitAgentApplication } from '../../services/agentService';
import type { DocCategory } from '../../database/schema';

// ── 四类资质文件定义 ──────────────────────────────────────────────────────────
interface DocSlot {
  category: NonNullable<DocCategory>;
  label: string;
  desc: string;
  required: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  { category: 'business_license',  label: '营业执照副本',       desc: '需加盖公章的扫描件',        required: true  },
  { category: 'transport_permit',  label: '道路运输经营许可证',   desc: '有效期内扫描件',           required: true  },
  { category: 'id_card',           label: '法人身份证正反面',     desc: '清晰无反光扫描件',         required: true  },
  { category: 'qualification',     label: '企业资质证明',        desc: '如ISO认证等（可选）',      required: false },
];

// ── 单个文件上传卡片 ──────────────────────────────────────────────────────────
interface DocUploadCardProps {
  slot: DocSlot;
  file: FileUi | null;
  isUploading: boolean;
  onSelect: (file: File) => void;
  onDelete: () => void;
  onPreview: () => void;
}

const DocUploadCard: React.FC<DocUploadCardProps> = ({
  slot, file, isUploading, onSelect, onDelete, onPreview,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onSelect(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onSelect(f);
  };

  // 已上传状态
  if (file) {
    return (
      <div className="relative p-5 border-2 border-green-200 bg-green-50/50 rounded-3xl text-center space-y-2 group">
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{slot.label}</h4>
          <p className="text-xs text-green-600 font-medium mt-0.5 truncate px-2" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(file.sizeBytes)}</p>
        </div>
        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={onPreview}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3 h-3" /> 预览
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> 删除
          </button>
        </div>
        {/* 必填标识 */}
        {slot.required && (
          <div className="absolute top-2 right-3 text-[10px] text-green-600 font-bold">已上传</div>
        )}
      </div>
    );
  }

  // 上传中状态
  if (isUploading) {
    return (
      <div className="p-6 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-3xl text-center space-y-3">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{slot.label}</h4>
          <p className="text-xs text-blue-500 mt-1">正在上传...</p>
        </div>
      </div>
    );
  }

  // 空状态（可上传）
  return (
    <div
      className={cn(
        'p-6 border-2 border-dashed rounded-3xl transition-all cursor-pointer text-center space-y-3 group',
        isDragOver
          ? 'border-[#0061FF] bg-[#F0F7FF] scale-[1.02]'
          : 'border-gray-200 hover:border-[#0061FF] hover:bg-[#F0F7FF]'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,application/pdf,.doc,.docx,.jpg,.jpeg,.png,.pdf"
        onChange={handleFileChange}
      />
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-white group-hover:text-[#0061FF] transition-colors">
        <Upload className="w-6 h-6 text-gray-400 group-hover:text-[#0061FF]" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900">{slot.label}</h4>
        <p className="text-xs text-gray-400 mt-1">{slot.desc}</p>
      </div>
      {/* 必填/可选标识 */}
      {slot.required ? (
        <span className="text-[10px] text-red-400 font-medium">* 必传</span>
      ) : (
        <span className="text-[10px] text-gray-300 font-medium">选填</span>
      )}
    </div>
  );
};

// ── 主页面 ────────────────────────────────────────────────────────────────────
export const AgentApplication: React.FC = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 基础信息
  const [formData, setFormData] = useState({
    companyName: '',
    creditCode: '',
    contact: '',
    phone: '',
    bizType: '干线运输',
    location: '',
  });

  // 文件上传状态：每个 category → FileUi | null
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, FileUi | null>>({
    business_license: null,
    transport_permit: null,
    id_card: null,
    qualification: null,
  });
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // 预生成申请 ID（用于文件关联）
  const [appId] = useState(() => `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  // ── Step 校验 ──────────────────────────────────────────────────────────
  const isStep1Valid =
    formData.companyName.trim() !== '' &&
    formData.contact.trim() !== '' &&
    formData.phone.trim() !== '';

  const requiredDocsUploaded =
    uploadedFiles.business_license !== null &&
    uploadedFiles.transport_permit !== null &&
    uploadedFiles.id_card !== null;

  const totalUploaded = Object.values(uploadedFiles).filter(Boolean).length;

  // ── 文件操作 ──────────────────────────────────────────────────────────
  const handleFileSelect = async (category: string, file: File) => {
    setUploadingSlot(category);
    try {
      // 如果该分类已有文件，先删除旧的
      const existing = uploadedFiles[category];
      if (existing) {
        await deleteFileById(existing.id);
      }

      const result = await uploadFile({
        file,
        bucket: 'registrations',
        uploaderId: appId,
        uploaderPortal: 'agent',
        refType: 'agent_application',
        refId: appId,
        docCategory: category as NonNullable<DocCategory>,
      });

      setUploadedFiles((prev) => ({ ...prev, [category]: result }));
      toast.success(`${file.name} 上传成功`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleFileDelete = async (category: string) => {
    const file = uploadedFiles[category];
    if (!file) return;
    try {
      await deleteFileById(file.id);
      setUploadedFiles((prev) => ({ ...prev, [category]: null }));
      toast.success('文件已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const handleFilePreview = async (category: string) => {
    const file = uploadedFiles[category];
    if (!file) return;
    try {
      const url = await getFilePreviewUrl(file.id);
      window.open(url, '_blank');
    } catch {
      toast.error('预览失败');
    }
  };

  // ── 提交 ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredDocsUploaded) {
      toast.error('请上传全部必传资质文件后再提交');
      return;
    }
    setIsSubmitting(true);
    try {
      // 使用预生成的 appId 提交（文件已关联到该 ID）
      await submitAgentApplication({
        applicationId: appId,
        name: formData.companyName,
        bizType: formData.bizType,
        contact: formData.contact,
        phone: formData.phone,
        location: formData.location,
        loginAccount: formData.phone,
        regPassword: '123456',
        creditCode: formData.creditCode,
        // 不再传 files — 文件已在 Step 2 实时上传完毕
      });
      setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !isStep1Valid) {
      toast.error('请填写所有必填项');
      return;
    }
    if (step === 2 && !requiredDocsUploaded) {
      toast.error('请上传全部必传资质文件（营业执照、运输许可证、法人身份证）');
      return;
    }
    setStep((s) => s + 1);
  };
  const handlePrev = () => setStep((s) => s - 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">代理申请入库</h1>
          <p className="text-gray-500 mt-1">请填写您的企业资质信息，提交后管理员将在3个工作日内完成审核。</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4" />
          企业认证通道
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-8 relative before:absolute before:left-0 before:right-0 before:top-1/2 before:-translate-y-1/2 before:h-0.5 before:bg-gray-100">
        {[1, 2, 3].map((s) => (
          <div key={s} className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-4 border-white shadow-sm',
                step > s
                  ? 'bg-green-500 text-white'
                  : step === s
                  ? 'bg-[#0061FF] text-white scale-110 shadow-lg shadow-blue-200'
                  : 'bg-gray-200 text-gray-400'
              )}
            >
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            <span className={cn('text-xs font-bold', step === s ? 'text-[#0061FF]' : 'text-gray-400')}>
              {s === 1 ? '基础信息' : s === 2 ? '资质上传' : '提交审核'}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        {/* ── 成功页 ──────────────────────────────────────────────────── */}
        {step === 4 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-16 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">申请已提交</h2>
              <p className="text-gray-500 max-w-sm mx-auto">
                您的入库申请已进入审核队列。审核结果将通过系统通知和短信告知您，请耐心等待。
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-sm mx-auto text-left space-y-1.5 text-sm">
              <p className="text-blue-800 font-semibold">提交摘要</p>
              <p className="text-blue-700">公司：{formData.companyName}</p>
              <p className="text-blue-700">联系人：{formData.contact}（{formData.phone}）</p>
              <p className="text-blue-700">已上传资质：{totalUploaded} 份</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-8 py-3 bg-[#0A2540] text-white rounded-xl font-bold hover:bg-[#1a3a5a] transition-all"
            >
              返回控制台
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
            <AnimatePresence mode="wait">
              {/* ── Step 1: 基础信息 ──────────────────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        公司全称 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="例如：玖链跨境物流有限公司"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">统一社会信用代码</label>
                      <div className="relative group">
                        <ShieldCheck className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                        <input
                          type="text"
                          placeholder="18位信用代码"
                          value={formData.creditCode}
                          onChange={(e) => setFormData({ ...formData, creditCode: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        联系人姓名 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="负责人姓名"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        联系电话 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                        <input
                          type="tel"
                          required
                          placeholder="手机号码（也作为登录账号）"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: 资质上传 ──────────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* 上传进度提示 */}
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                    requiredDocsUploaded
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  )}>
                    {requiredDocsUploaded ? (
                      <><CheckCircle2 className="w-4 h-4" /> 全部必传资质已上传齐全，可以进入下一步</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> 请上传全部必传资质文件后才能进入下一步（已上传 {totalUploaded}/3 必传）</>
                    )}
                  </div>

                  {/* 四个文件上传卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {DOC_SLOTS.map((slot) => (
                      <DocUploadCard
                        key={slot.category}
                        slot={slot}
                        file={uploadedFiles[slot.category]}
                        isUploading={uploadingSlot === slot.category}
                        onSelect={(f) => void handleFileSelect(slot.category, f)}
                        onDelete={() => void handleFileDelete(slot.category)}
                        onPreview={() => void handleFilePreview(slot.category)}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    支持 JPG/PNG/PDF/Word 格式，单文件不超过 30MB
                  </p>
                </motion.div>
              )}

              {/* ── Step 3: 提交审核 ──────────────────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-blue-50 p-6 rounded-2xl flex gap-4">
                    <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">提交前请确认</h4>
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        您提交的所有信息均真实有效。虚假信息将导致申请被永久拒绝并列入系统黑名单。
                      </p>
                    </div>
                  </div>

                  {/* 信息汇总 */}
                  <div className="p-6 border border-gray-100 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 border-l-4 border-[#0061FF] pl-2">企业信息</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-gray-500">公司名称</div>
                      <div className="font-medium text-[#0A2540]">{formData.companyName}</div>
                      {formData.creditCode && (
                        <>
                          <div className="text-gray-500">信用代码</div>
                          <div className="font-mono text-gray-700">{formData.creditCode}</div>
                        </>
                      )}
                      <div className="text-gray-500">联系人</div>
                      <div>{formData.contact}</div>
                      <div className="text-gray-500">联系电话</div>
                      <div>{formData.phone}</div>
                    </div>
                  </div>

                  <div className="p-6 border border-gray-100 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 border-l-4 border-green-500 pl-2">
                      已上传资质文件（{totalUploaded} 份）
                    </h4>
                    <div className="space-y-2">
                      {DOC_SLOTS.map((slot) => {
                        const file = uploadedFiles[slot.category];
                        return (
                          <div key={slot.category} className="flex items-center gap-3 text-sm">
                            {file ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                            )}
                            <span className={file ? 'text-gray-700' : 'text-gray-400'}>
                              {slot.label}
                            </span>
                            {file && (
                              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                — {file.originalName}
                              </span>
                            )}
                            {!file && slot.required && (
                              <span className="text-[10px] text-red-400">未上传</span>
                            )}
                            {!file && !slot.required && (
                              <span className="text-[10px] text-gray-300">可选·未上传</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── 底部按钮 ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-8 border-t border-gray-50">
              <button
                type="button"
                onClick={handlePrev}
                disabled={step === 1}
                className={cn(
                  'px-6 py-3 rounded-xl font-bold transition-all',
                  step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                上一步
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !isStep1Valid) ||
                    (step === 2 && !requiredDocsUploaded)
                  }
                  className={cn(
                    'px-8 py-3 rounded-xl font-bold transition-all shadow-lg',
                    (step === 1 && !isStep1Valid) || (step === 2 && !requiredDocsUploaded)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                      : 'bg-[#0061FF] text-white hover:bg-[#0052D9] shadow-blue-200'
                  )}
                >
                  下一步
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-[#0A2540] text-white rounded-xl font-bold hover:bg-[#1a3a5a] transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> 提交中...</>
                  ) : (
                    <>确认提交审核 <CheckCircle2 className="w-5 h-5" /></>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
