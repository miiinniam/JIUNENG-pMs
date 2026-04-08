import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, User, Lock, Mail, Building2, ArrowRight, ArrowLeft,
  CheckCircle2, ChevronLeft, Phone, MapPin, Briefcase, Clock,
  ShieldCheck, Upload, FileText, Trash2, Loader2, Eye, AlertCircle,
} from 'lucide-react';
import {
  uploadFile, deleteFileById, getFilePreviewUrl, formatFileSize,
  type FileUi,
} from '../services/fileService';
import type { DocCategory } from '../database/schema';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { registerInternalUser } from '../services/userService';
import { submitAgentApplication } from '../services/agentService';
import { toast } from 'sonner';

type UserType = 'internal' | 'supplier';

// ── 通用输入框 ────────────────────────────────────────────────────────────────
const InputField = ({
  icon: Icon,
  label,
  ...props
}: { icon: React.ElementType; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
    <div className="relative group">
      <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
      <input
        {...props}
        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
      />
    </div>
  </div>
);

const STEP_LABELS = ['企业信息', '资质上传', '账号设置'];

// ── 四类资质文件 ──────────────────────────────────────────────────────────────
interface DocSlot {
  category: NonNullable<DocCategory>;
  label: string;
  desc: string;
  required: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  { category: 'business_license',  label: '营业执照副本',       desc: '需加盖公章扫描件',   required: true  },
  { category: 'transport_permit',  label: '道路运输经营许可证',   desc: '有效期内扫描件',    required: true  },
  { category: 'id_card',           label: '法人身份证正反面',     desc: '清晰无反光扫描件',  required: true  },
  { category: 'qualification',     label: '企业资质证明',        desc: 'ISO等（可选）',     required: false },
];

// ── 单个资质上传卡片（紧凑版，适合注册页） ───────────────────────────────────────
interface MiniDocCardProps {
  slot: DocSlot;
  file: FileUi | null;
  isUploading: boolean;
  onSelect: (f: File) => void;
  onDelete: () => void;
  onPreview: () => void;
}

const MiniDocCard: React.FC<MiniDocCardProps> = ({
  slot, file, isUploading, onSelect, onDelete, onPreview,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onSelect(f);
  };

  // 已上传
  if (file) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-green-50/80 rounded-xl border border-green-200/60">
        <div className="w-8 h-8 rounded-lg bg-white border border-green-200 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-700">{slot.label}</p>
          <p className="text-[10px] text-green-600 truncate">{file.originalName} · {formatFileSize(file.sizeBytes)}</p>
        </div>
        <button type="button" onClick={onPreview} className="p-1 text-blue-500 hover:text-blue-700 rounded transition-colors" title="预览">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="删除">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 上传中
  if (isUploading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-blue-50/50 rounded-xl border border-blue-200/60">
        <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-700">{slot.label}</p>
          <p className="text-[10px] text-blue-500">正在上传...</p>
        </div>
      </div>
    );
  }

  // 空（可上传）
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-all',
        dragOver
          ? 'border-[#FF6B00] bg-orange-50/30'
          : 'border-gray-200 hover:border-[#FF6B00] hover:bg-orange-50/20'
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,application/pdf,.doc,.docx,.jpg,.jpeg,.png,.pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ''; }}
      />
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Upload className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-700">
          {slot.label}
          {slot.required
            ? <span className="text-red-400 ml-1 text-[10px]">* 必传</span>
            : <span className="text-gray-300 ml-1 text-[10px]">选填</span>}
        </p>
        <p className="text-[10px] text-gray-400">{slot.desc}</p>
      </div>
    </div>
  );
};

// ── 主页面 ────────────────────────────────────────────────────────────────────
export const Register: React.FC = () => {
  const [userType, setUserType] = useState<UserType>('internal');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Internal staff form
  const [internalForm, setInternalForm] = useState({
    account: '', displayName: '', department: '', password: '', confirmPassword: '',
  });

  // Supplier form (multi-step)
  const [supplierStep, setSupplierStep] = useState(0);
  const [supplierForm, setSupplierForm] = useState({
    companyName: '', creditCode: '', bizType: '', contactName: '',
    phone: '', location: '', loginAccount: '', password: '', confirmPassword: '',
  });

  // ── 分类文件上传状态 ────────────────────────────────────────────────────
  const [appId] = useState(() => `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, FileUi | null>>({
    business_license: null,
    transport_permit: null,
    id_card: null,
    qualification: null,
  });
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const requiredDocsReady =
    uploadedDocs.business_license !== null &&
    uploadedDocs.transport_permit !== null &&
    uploadedDocs.id_card !== null;

  const totalUploaded = Object.values(uploadedDocs).filter(Boolean).length;

  // ── 文件操作 ────────────────────────────────────────────────────────────
  const handleDocSelect = async (category: string, file: File) => {
    setUploadingSlot(category);
    setError('');
    try {
      const existing = uploadedDocs[category];
      if (existing) await deleteFileById(existing.id);

      const result = await uploadFile({
        file,
        bucket: 'registrations',
        uploaderId: appId,
        uploaderPortal: 'agent',
        refType: 'agent_application',
        refId: appId,
        docCategory: category as NonNullable<DocCategory>,
      });
      setUploadedDocs((prev) => ({ ...prev, [category]: result }));
      toast.success(`${file.name} 上传成功`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleDocDelete = async (category: string) => {
    const file = uploadedDocs[category];
    if (!file) return;
    try {
      await deleteFileById(file.id);
      setUploadedDocs((prev) => ({ ...prev, [category]: null }));
      toast.success('文件已删除');
    } catch { toast.error('删除失败'); }
  };

  const handleDocPreview = async (category: string) => {
    const file = uploadedDocs[category];
    if (!file) return;
    try {
      const url = await getFilePreviewUrl(file.id);
      window.open(url, '_blank');
    } catch { toast.error('预览失败'); }
  };

  // ── Internal submit ─────────────────────────────────────────────────────
  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (internalForm.password !== internalForm.confirmPassword) { setError('两次输入的密码不一致'); return; }
    if (internalForm.password.length < 6) { setError('密码至少6位'); return; }
    setIsLoading(true);
    try {
      await registerInternalUser({
        username: internalForm.account.trim(),
        password: internalForm.password,
        displayName: internalForm.displayName.trim(),
        department: internalForm.department.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Supplier next ───────────────────────────────────────────────────────
  const handleSupplierNext = () => {
    setError('');
    if (supplierStep === 0) {
      if (!supplierForm.companyName.trim()) { setError('请填写公司名称'); return; }
      if (!supplierForm.bizType.trim()) { setError('请填写业务类型'); return; }
      if (!supplierForm.contactName.trim()) { setError('请填写联系人'); return; }
      if (!supplierForm.phone.trim()) { setError('请填写联系电话'); return; }
    }
    if (supplierStep === 1) {
      if (!requiredDocsReady) {
        setError('请上传全部必传资质文件（营业执照、运输许可证、法人身份证）');
        return;
      }
    }
    setSupplierStep((s) => s + 1);
  };

  // ── Supplier submit ─────────────────────────────────────────────────────
  const handleSupplierSubmit = async () => {
    setError('');
    if (!supplierForm.loginAccount.trim()) { setError('请填写登录账号'); return; }
    if (supplierForm.password.length < 6) { setError('密码至少6位'); return; }
    if (supplierForm.password !== supplierForm.confirmPassword) { setError('两次输入的密码不一致'); return; }
    setIsLoading(true);
    try {
      await submitAgentApplication({
        applicationId: appId,
        name: supplierForm.companyName.trim(),
        bizType: supplierForm.bizType.trim(),
        contact: supplierForm.contactName.trim(),
        phone: supplierForm.phone.trim(),
        location: supplierForm.location.trim(),
        loginAccount: supplierForm.loginAccount.trim(),
        regPassword: supplierForm.password,
        creditCode: supplierForm.creditCode.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const leftSideHints =
    userType === 'internal'
      ? ['注册后由管理员审核', '审核通过后可登录内部系统', '管理员将为您分配模块权限']
      : supplierStep === 0
        ? ['填写企业基础信息', '统一社会信用代码便于资质核验', '信息准确可加速审核流程']
        : supplierStep === 1
          ? ['分别上传四类资质文件', '三项必传资质齐全后进入下一步', '资料齐全可加速审核']
          : ['设置供应商端登录凭证', '审批通过后即可使用', '可参与平台招标与报价'];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FF6B00] rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#0A2540] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl shadow-gray-200/50 flex flex-col lg:flex-row overflow-hidden relative z-10 border border-gray-100"
      >
        {/* Left Side */}
        <div className="lg:w-[35%] bg-[#0A2540] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
          </div>
          <div className="relative z-10">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-12 text-sm font-medium group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              返回登录
            </Link>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">中越跨境物流系统</span>
            </div>
            <h2 className="text-3xl font-bold leading-tight mb-6">
              {userType === 'internal' ? (
                <>申请账号，<br />开启<span className="text-[#FF6B00]">合作之旅</span></>
              ) : (
                <>代理入库申请，<br />一站式<span className="text-[#FF6B00]">注册认证</span></>
              )}
            </h2>
            <div className="space-y-3">
              {leftSideHints.map((text, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B00] flex-shrink-0" />
                  <span className="text-sm text-white/80">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-white/30 pt-8 border-t border-white/10">
            © 2026 玖链物流管理系统 版权所有
          </p>
        </div>

        {/* Right Side */}
        <div className="flex-1 p-6 md:p-10 lg:p-14 flex flex-col justify-center overflow-y-auto max-h-[90vh]">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#0A2540] mb-2">申请已提交</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {userType === 'internal'
                    ? '您的内部员工注册申请已提交，管理员审核通过后您将能够登录系统。'
                    : '您的供应商入库申请已提交，管理员审核通过后将为您开通登录账号。'}
                </p>
              </div>
              {userType === 'supplier' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-left space-y-1">
                  <p className="font-semibold text-blue-800">提交摘要</p>
                  <p className="text-blue-700 text-xs">公司：{supplierForm.companyName}</p>
                  <p className="text-blue-700 text-xs">联系人：{supplierForm.contactName}（{supplierForm.phone}）</p>
                  <p className="text-blue-700 text-xs">已上传资质：{totalUploaded} 份</p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
                <p className="font-semibold mb-1">审核周期提示</p>
                <p>通常 1-3 个工作日内完成审核，请耐心等待。</p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A2540] text-white rounded-2xl text-sm font-bold hover:bg-[#1a3a5a] transition-colors"
              >
                返回登录页 <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <div className="max-w-lg mx-auto w-full space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-[#0A2540]">
                  {userType === 'supplier' ? '代理入库申请' : '创建账号申请'}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {userType === 'supplier'
                    ? '填写企业资料与登录信息，一次提交完成入库申请'
                    : '请选择身份并填写信息，提交后等待管理员审核'}
                </p>
              </div>

              {/* Tab */}
              <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => { setUserType('internal'); setError(''); setSupplierStep(0); }}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                    userType === 'internal' ? 'bg-white text-[#0A2540] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <User className="w-4 h-4" /> 内部员工
                </button>
                <button
                  type="button"
                  onClick={() => { setUserType('supplier'); setError(''); }}
                  className={cn(
                    'flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                    userType === 'supplier' ? 'bg-white text-[#0A2540] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Building2 className="w-4 h-4" /> 代理供应商
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {userType === 'internal' ? (
                /* ── 内部员工注册 ──────────────────────────────────── */
                <form onSubmit={handleInternalSubmit} className="space-y-4">
                  <InputField icon={Mail} label="登录账号（手机号或邮箱）" type="text" required placeholder="138****8888 或 user@example.com"
                    value={internalForm.account} onChange={(e) => setInternalForm({ ...internalForm, account: e.target.value })} />
                  <InputField icon={User} label="姓名 / 显示名称" type="text" required placeholder="您的真实姓名"
                    value={internalForm.displayName} onChange={(e) => setInternalForm({ ...internalForm, displayName: e.target.value })} />
                  <InputField icon={Briefcase} label="部门 / 职务" type="text" placeholder="如：运营部、业务员"
                    value={internalForm.department} onChange={(e) => setInternalForm({ ...internalForm, department: e.target.value })} />
                  <InputField icon={Lock} label="设置密码" type="password" required placeholder="至少6位"
                    value={internalForm.password} onChange={(e) => setInternalForm({ ...internalForm, password: e.target.value })} />
                  <InputField icon={Lock} label="确认密码" type="password" required placeholder="再次输入密码"
                    value={internalForm.confirmPassword} onChange={(e) => setInternalForm({ ...internalForm, confirmPassword: e.target.value })} />
                  <button type="submit" disabled={isLoading}
                    className="w-full py-4 bg-[#0A2540] text-white rounded-2xl text-base font-bold hover:bg-[#1a3a5a] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 group mt-2">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>提交审核申请 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </form>
              ) : (
                /* ── 供应商注册（3 步） ────────────────────────────── */
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center gap-2">
                    {STEP_LABELS.map((label, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <div className={cn('flex-1 h-0.5', idx <= supplierStep ? 'bg-[#FF6B00]' : 'bg-gray-200')} />}
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                            idx < supplierStep ? 'bg-green-500 text-white' :
                            idx === supplierStep ? 'bg-[#FF6B00] text-white' :
                            'bg-gray-200 text-gray-400'
                          )}>
                            {idx < supplierStep ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={cn('text-xs font-medium hidden sm:inline', idx === supplierStep ? 'text-[#FF6B00]' : 'text-gray-400')}>
                            {label}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {/* ── Step 0: 企业信息 ──────────────────────── */}
                    {supplierStep === 0 && (
                      <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <InputField icon={Building2} label="公司全称" type="text" required placeholder="例如：玖链跨境物流有限公司"
                          value={supplierForm.companyName} onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })} />
                        <InputField icon={ShieldCheck} label="统一社会信用代码" type="text" placeholder="18位信用代码"
                          value={supplierForm.creditCode} onChange={(e) => setSupplierForm({ ...supplierForm, creditCode: e.target.value })} />
                        <InputField icon={Briefcase} label="申请业务类型" type="text" required placeholder="如：跨境运输、报关代理"
                          value={supplierForm.bizType} onChange={(e) => setSupplierForm({ ...supplierForm, bizType: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                          <InputField icon={User} label="联系人姓名" type="text" required placeholder="负责人姓名"
                            value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} />
                          <InputField icon={Phone} label="联系电话" type="tel" required placeholder="138****8888"
                            value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                        </div>
                        <InputField icon={MapPin} label="所在地" type="text" placeholder="如：广西凭祥"
                          value={supplierForm.location} onChange={(e) => setSupplierForm({ ...supplierForm, location: e.target.value })} />
                      </motion.div>
                    )}

                    {/* ── Step 1: 资质上传（四文件分别上传）──────── */}
                    {supplierStep === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                        {/* 上传进度提示 */}
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
                          requiredDocsReady
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        )}>
                          {requiredDocsReady ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> 必传资质已齐全，可进入下一步</>
                          ) : (
                            <><AlertCircle className="w-3.5 h-3.5" /> 请上传全部必传资质（已上传 {totalUploaded}/3 必传）</>
                          )}
                        </div>

                        {/* 四个上传卡片 */}
                        {DOC_SLOTS.map((slot) => (
                          <MiniDocCard
                            key={slot.category}
                            slot={slot}
                            file={uploadedDocs[slot.category]}
                            isUploading={uploadingSlot === slot.category}
                            onSelect={(f) => void handleDocSelect(slot.category, f)}
                            onDelete={() => void handleDocDelete(slot.category)}
                            onPreview={() => void handleDocPreview(slot.category)}
                          />
                        ))}

                        <p className="text-[10px] text-gray-400 text-center pt-1">
                          支持 JPG / PNG / PDF / Word，单文件不超过 30MB
                        </p>
                      </motion.div>
                    )}

                    {/* ── Step 2: 账号设置 ──────────────────────── */}
                    {supplierStep === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                          审批通过后，您将使用以下账号登录<strong>供应商端口</strong>（/supplier）参与招标与报价。
                        </div>
                        <InputField icon={Mail} label="登录账号（手机号或邮箱）" type="text" required placeholder="审批通过后用于登录供应商端"
                          value={supplierForm.loginAccount} onChange={(e) => setSupplierForm({ ...supplierForm, loginAccount: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                          <InputField icon={Lock} label="设置密码" type="password" required placeholder="至少6位"
                            value={supplierForm.password} onChange={(e) => setSupplierForm({ ...supplierForm, password: e.target.value })} />
                          <InputField icon={Lock} label="确认密码" type="password" required placeholder="再次输入"
                            value={supplierForm.confirmPassword} onChange={(e) => setSupplierForm({ ...supplierForm, confirmPassword: e.target.value })} />
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm border border-gray-100">
                          <h4 className="font-bold text-gray-700 text-xs uppercase tracking-widest mb-2">提交信息摘要</h4>
                          <div className="grid grid-cols-3 gap-y-1.5 text-xs">
                            <span className="text-gray-400">公司名称</span>
                            <span className="col-span-2 text-gray-700 font-medium">{supplierForm.companyName || '—'}</span>
                            <span className="text-gray-400">业务类型</span>
                            <span className="col-span-2 text-gray-700">{supplierForm.bizType || '—'}</span>
                            <span className="text-gray-400">联系人</span>
                            <span className="col-span-2 text-gray-700">{supplierForm.contactName} · {supplierForm.phone}</span>
                            <span className="text-gray-400">资质文件</span>
                            <span className="col-span-2 text-gray-700">
                              {totalUploaded > 0 ? (
                                <span className="text-green-600 font-medium">{totalUploaded} 份已上传</span>
                              ) : (
                                <span className="text-red-400">未上传</span>
                              )}
                            </span>
                          </div>
                          {/* 分类文件列表 */}
                          {totalUploaded > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                              {DOC_SLOTS.map((slot) => {
                                const f = uploadedDocs[slot.category];
                                return (
                                  <div key={slot.category} className="flex items-center gap-1.5 text-[11px]">
                                    {f ? (
                                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                                    )}
                                    <span className={f ? 'text-gray-600' : 'text-gray-400'}>{slot.label}</span>
                                    {f && <span className="text-gray-400 truncate max-w-[120px]">— {f.originalName}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    {supplierStep > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSupplierStep((s) => s - 1); setError(''); }}
                        className="px-5 py-3.5 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" /> 上一步
                      </button>
                    )}
                    {supplierStep < 2 ? (
                      <button
                        type="button"
                        onClick={handleSupplierNext}
                        disabled={supplierStep === 1 && !requiredDocsReady}
                        className={cn(
                          'flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                          supplierStep === 1 && !requiredDocsReady
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#FF6B00] text-white hover:bg-[#e66000]'
                        )}
                      >
                        下一步 <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSupplierSubmit()}
                        disabled={isLoading}
                        className="flex-1 py-3.5 bg-[#FF6B00] text-white rounded-2xl text-sm font-bold hover:bg-[#e66000] transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>确认提交入库申请 <CheckCircle2 className="w-4 h-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-center text-sm text-gray-500 font-medium">
                已有账号？{' '}
                <Link to="/login" className="text-[#0061FF] font-bold hover:underline">
                  立即登录
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
