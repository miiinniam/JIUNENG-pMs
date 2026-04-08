import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, X, MapPin, Truck, Loader2, Edit, Trash2,
  ChevronDown, Search, User, Navigation, ArrowRight,
  Radio, CheckCircle2, Clock, Package, Zap, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import {
  deleteFormalProjectRow,
  fetchFormalProjectsUi,
  fetchCustomerOptions,
  upsertFormalProjectRow,
  activateProjectTracking,
  updateTrackingProjectRow,
  checkProjectDeletePermission,
  type FormalProjectUi,
  type CustomerOption,
  type ActivateTrackingInput,
} from '../services/projectService';
import { AdminPasswordDialog } from '../components/AdminPasswordDialog';

// ── 状态配置 ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  color: string; badge: string; canActivate: boolean; isTracking: boolean;
}> = {
  '待合同确认': { color: 'bg-amber-50 text-amber-600', badge: '⏳', canActivate: true,  isTracking: false },
  '执行中':     { color: 'bg-blue-50 text-blue-600',   badge: '🚚', canActivate: false, isTracking: true  },
  '已完成':     { color: 'bg-green-50 text-green-600', badge: '✓',  canActivate: false, isTracking: false },
  '已暂停':     { color: 'bg-gray-50 text-gray-500',   badge: '⏸',  canActivate: false, isTracking: false },
};

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { color: 'bg-gray-50 text-gray-500', badge: '·', canActivate: false, isTracking: false };
}

// ── 数据来源徽标 ───────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
  if (source === 'award') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-medium">
        <Award className="w-2.5 h-2.5" /> 招标履约
      </span>
    );
  }
  if (source === 'potential_convert') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 font-medium">
        <Zap className="w-2.5 h-2.5" /> 潜客转化
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 font-medium">
      <Package className="w-2.5 h-2.5" /> 手动录入
    </span>
  );
}

// ── 可搜索客户下拉 ────────────────────────────────────────────────────────────
interface CustomerSelectProps {
  customers: CustomerOption[];
  value: string;
  onChange: (name: string) => void;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({ customers, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [useManual, setUseManual] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.bizType.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.name === value);

  if (useManual) {
    return (
      <div className="space-y-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
          placeholder="手动输入客户名称"
        />
        <button type="button" onClick={() => setUseManual(false)} className="text-xs text-[#FF6B00] hover:underline">
          ← 从客户列表选择
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full border rounded-lg p-2 text-sm text-left flex items-center justify-between outline-none transition-colors ${open ? 'border-[#0A2540] ring-1 ring-[#0A2540]/20' : 'border-gray-200'} ${value ? 'text-[#0A2540]' : 'text-gray-400'}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedCustomer ? (
            <>
              <User className="w-3.5 h-3.5 text-[#FF6B00] flex-shrink-0" />
              <span className="text-[#0A2540] font-medium">{selectedCustomer.name}</span>
              <span className="text-xs text-gray-400">({selectedCustomer.type})</span>
            </>
          ) : value ? (
            <>
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-[#0A2540]">{value}</span>
              <span className="text-xs text-amber-500">(手动录入)</span>
            </>
          ) : (
            '请选择关联客户'
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[80] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-[#0A2540]"
                placeholder="搜索客户名称 / 联系人..."
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">未找到匹配客户</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.name); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-[#FF6B00]/5 flex items-start gap-2.5 transition-colors ${value === c.name ? 'bg-[#FF6B00]/10' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#FF6B00]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#0A2540] truncate">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 flex-shrink-0">{c.type}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {c.contact} · {c.phone} · {c.bizType}
                    </div>
                  </div>
                  {value === c.name && <span className="text-[#FF6B00] text-xs mt-1 flex-shrink-0">✓</span>}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={() => { setUseManual(true); setOpen(false); setSearch(''); }}
              className="w-full text-xs text-center text-gray-500 hover:text-[#FF6B00] py-1 transition-colors"
            >
              客户不在列表中？手动输入 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 主页面 ────────────────────────────────────────────────────────────────────
interface FormData {
  name: string;
  client: string;
  origin: string;
  destination: string;
  cargoType: string;
  // 在途跟踪字段
  currentLocation: string;
  eta: string;
  weight: string;
  transportType: string;
  priorityLabel: 'Normal' | 'High';
}

const EMPTY_FORM: FormData = {
  name: '', client: '', origin: '', destination: '', cargoType: '',
  currentLocation: '', eta: '', weight: '', transportType: '陆运', priorityLabel: 'Normal',
};

export const ActiveProjects: React.FC = () => {
  const navigate = useNavigate();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<FormalProjectUi | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  // 独立的"启动跟踪"快捷弹窗（从操作列按钮触发，不需要打开编辑抽屉）
  const [activateTarget, setActivateTarget] = useState<FormalProjectUi | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activateForm, setActivateForm] = useState<ActivateTrackingInput>({
    currentLocation: '', eta: '', weight: '', priorityLabel: 'Normal', transportType: '陆运',
  });

  // admin 密码确认弹窗状态
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [adminDialogDesc, setAdminDialogDesc] = useState('');

  const { data: projects = [], isLoading, refetch } = useQuery('projects-formal', fetchFormalProjectsUi);
  const { data: customerOptions = [] } = useQuery('customer-options', fetchCustomerOptions);

  // ── 打开抽屉 ──────────────────────────────────────────────────────────────
  const handleOpenDrawer = (item?: FormalProjectUi) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        client: item.client === '—' ? '' : item.client,
        origin: item.origin || '',
        destination: item.destination || '',
        cargoType: item.cargoType || '',
        currentLocation: item.currentLocation || '',
        eta: item.eta || '',
        weight: item.weight || '',
        transportType: item.transportType || '陆运',
        priorityLabel: (item.priorityLabel as 'Normal' | 'High') || 'Normal',
      });
    } else {
      setEditingItem(null);
      setFormData(EMPTY_FORM);
    }
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const permission = await checkProjectDeletePermission(id);
      if (permission.level === 'blocked') {
        toast.error(permission.reason || '该项目不可删除');
        return;
      }
      if (permission.level === 'admin_required') {
        setPendingDeleteId(id);
        setAdminDialogDesc(permission.reason || '删除需要管理员密码确认。');
        setAdminDialogOpen(true);
        return;
      }
      if (!window.confirm('您确定要删除这条记录吗？此操作不可恢复。')) return;
      await deleteFormalProjectRow(id);
      await refetch();
      toast.success('删除成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleAdminConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteFormalProjectRow(pendingDeleteId);
      await refetch();
      toast.success('删除成功');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    } finally {
      setAdminDialogOpen(false);
      setPendingDeleteId(null);
    }
  };

  // ── 保存（编辑 or 新建）────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const route = `${formData.origin || '未知'} → ${formData.destination || '未知'}`;
    const hasTrackingInfo = formData.currentLocation.trim() !== '';
    const isPreparing = editingItem?.status === '待合同确认';
    const isExecuting = editingItem?.status === '执行中';

    try {
      if (editingItem) {
        // 先保存基础信息
        await upsertFormalProjectRow({ ...editingItem, ...formData, route });

        if (hasTrackingInfo && isPreparing) {
          // 状态转换：待合同确认 → 执行中（启动跟踪）
          await activateProjectTracking(editingItem.id, {
            currentLocation: formData.currentLocation,
            eta: formData.eta,
            weight: formData.weight,
            priorityLabel: formData.priorityLabel,
            transportType: formData.transportType,
          });
          toast.success('项目已转入在途跟踪，正在跳转...', { duration: 1500 });
          setIsDrawerOpen(false);
          setEditingItem(null);
          setTimeout(() => navigate(`/projects/tracking?id=${editingItem.id}`), 800);
          return;
        } else if (hasTrackingInfo && isExecuting) {
          // 已执行中：更新跟踪信息
          await updateTrackingProjectRow(editingItem.id, {
            currentLocation: formData.currentLocation,
            eta: formData.eta,
            weight: formData.weight,
            priorityLabel: formData.priorityLabel,
            cargoType: formData.cargoType,
          });
          toast.success('项目及跟踪信息更新成功');
        } else {
          toast.success('项目信息更新成功');
        }
      } else {
        // 新建项目
        const newId = `PRJ-${Date.now()}`;
        await upsertFormalProjectRow({
          id: newId,
          name: formData.name,
          client: formData.client,
          origin: formData.origin,
          destination: formData.destination,
          cargoType: formData.cargoType,
          route,
          progress: 0,
          status: '准备中',
          manager: '待分配',
        });

        if (hasTrackingInfo) {
          // 新建时直接激活跟踪
          await activateProjectTracking(newId, {
            currentLocation: formData.currentLocation,
            eta: formData.eta,
            weight: formData.weight,
            priorityLabel: formData.priorityLabel,
            transportType: formData.transportType,
          });
          toast.success('项目已创建并激活跟踪，正在跳转...', { duration: 1500 });
          setIsDrawerOpen(false);
          setEditingItem(null);
          setTimeout(() => navigate(`/projects/tracking?id=${newId}`), 800);
          return;
        } else {
          toast.success('项目创建成功，已进入执行队列');
        }
      }

      setIsDrawerOpen(false);
      setEditingItem(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 快捷启动跟踪弹窗 ──────────────────────────────────────────────────────
  const handleOpenActivate = (project: FormalProjectUi) => {
    setActivateTarget(project);
    setActivateForm({
      currentLocation: project.origin || '',
      eta: '',
      weight: '',
      priorityLabel: 'Normal',
      transportType: '陆运',
    });
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateTarget) return;
    if (!activateForm.currentLocation.trim()) {
      toast.error('请填写当前货物位置');
      return;
    }
    setIsActivating(true);
    const targetId = activateTarget.id;
    try {
      await activateProjectTracking(targetId, activateForm);
      toast.success('跟踪已激活！该项目现已出现在「在途跟踪」页面。');
      setActivateTarget(null);
      await refetch();
      setTimeout(() => navigate(`/projects/tracking?id=${targetId}`), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '激活失败，请重试');
    } finally {
      setIsActivating(false);
    }
  };

  // ── 抽屉：是否展示跟踪区块 ─────────────────────────────────────────────────
  // 编辑时，若项目已完成则不允许修改跟踪信息
  const showTrackingSection = !editingItem || editingItem.status !== '已完成';
  const trackingSectionLabel =
    !editingItem
      ? '启动在途跟踪（可选）'
      : editingItem.status === '待合同确认'
      ? '转化为在途跟踪'
      : editingItem.status === '执行中'
      ? '在途跟踪信息'
      : '';

  return (
    <div className="h-full flex flex-col">
      {/* 页头 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0A2540]">执行项目管理</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            状态流转：
            <span className="text-amber-500">待合同确认</span>
            <ArrowRight className="w-3 h-3 inline mx-1" />
            <span className="text-blue-500">执行中（在途跟踪）</span>
            <ArrowRight className="w-3 h-3 inline mx-1" />
            <span className="text-green-500">已完成</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenDrawer()}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm bg-[#FF6B00] text-white hover:bg-[#e66000] shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>新增项目</span>
        </button>
      </div>

      {/* 项目表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">项目编号 / 名称</th>
                  <th className="p-4 font-medium">关联客户</th>
                  <th className="p-4 font-medium">运输路线</th>
                  <th className="p-4 font-medium w-44">执行进度</th>
                  <th className="p-4 font-medium">状态</th>
                  <th className="p-4 font-medium">负责人</th>
                  <th className="p-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {projects.map((p) => {
                  const cfg = getStatusCfg(p.status);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-[#0A2540]">{p.name}</span>
                          <SourceBadge source={p.source} />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{p.id}</div>
                      </td>
                      <td className="p-4">{p.client}</td>
                      <td className="p-4">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
                          {p.route}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-[#FF6B00] h-1.5 rounded-full transition-all"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{p.progress}% 完成</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.color}`}>
                          {cfg.badge} {p.status}
                        </span>
                      </td>
                      <td className="p-4">{p.manager}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* 待合同确认 → 快捷启动跟踪 */}
                          {cfg.canActivate && (
                            <button
                              type="button"
                              onClick={() => handleOpenActivate(p)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title="快捷激活在途跟踪"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              启动跟踪
                            </button>
                          )}
                          {/* 执行中 → 查看跟踪详情 */}
                          {cfg.isTracking && (
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/tracking?id=${p.id}`)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="查看在途跟踪"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              跟踪中
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#0A2540] hover:bg-gray-100 transition-colors"
                            title="编辑（可在此转化为在途跟踪）"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 新建 / 编辑项目抽屉 ─────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-[480px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <form onSubmit={(e) => void handleSave(e)} className="flex flex-col h-full">
          {/* 抽屉标题栏 */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white flex-shrink-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {editingItem ? '编辑项目' : '创建新项目'}
              {editingItem && <SourceBadge source={editingItem.source} />}
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)}>
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {/* ── 基础信息 ─────────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">基础信息</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">项目名称 *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540] focus:ring-1 focus:ring-[#0A2540]/10"
                    placeholder="如：胡志明工厂搬迁物流"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">关联客户 *</label>
                  <CustomerSelect
                    customers={customerOptions}
                    value={formData.client}
                    onChange={(name) => setFormData({ ...formData, client: name })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">始发地</label>
                    <input
                      type="text"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
                      placeholder="如：广州"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">目的地</label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
                      placeholder="如：河内"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">货物类型</label>
                  <input
                    type="text"
                    value={formData.cargoType}
                    onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
                    placeholder="如：工业设备、电子元件"
                  />
                </div>
              </div>
            </div>

            {/* ── 在途跟踪信息区块 ─────────────────────────────────────────── */}
            {showTrackingSection && (
              <div className="border border-blue-100 rounded-xl overflow-hidden">
                {/* 区块标题 */}
                <div className={`px-4 py-3 flex items-center gap-2 ${
                  editingItem?.status === '执行中'
                    ? 'bg-blue-50 border-b border-blue-100'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100'
                }`}>
                  <Navigation className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-700">{trackingSectionLabel}</p>
                    {editingItem?.status === '待合同确认' && (
                      <p className="text-[11px] text-blue-500 mt-0.5">
                        填写当前位置后保存，项目将自动转为「执行中」并跳转至在途跟踪页面
                      </p>
                    )}
                    {!editingItem && (
                      <p className="text-[11px] text-blue-500 mt-0.5">
                        填写当前位置后保存，将自动激活在途跟踪
                      </p>
                    )}
                    {editingItem?.status === '执行中' && (
                      <p className="text-[11px] text-blue-500 mt-0.5">
                        修改后同步更新「在途跟踪」页面的显示数据
                      </p>
                    )}
                  </div>
                  {editingItem?.status === '执行中' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/tracking?id=${editingItem.id}`)}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Radio className="w-3 h-3" /> 查看跟踪
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#FF6B00]" />
                      当前货物位置
                      {(editingItem?.status === '待合同确认' || !editingItem) && (
                        <span className="text-gray-400 text-xs ml-1">（填写后激活跟踪）</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.currentLocation}
                      onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF] focus:ring-1 focus:ring-[#0061FF]/20"
                      placeholder="如：越南谅山口岸（已过境）"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        预计到达 (ETA)
                      </label>
                      <input
                        type="date"
                        value={formData.eta}
                        onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">货物重量</label>
                      <input
                        type="text"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]"
                        placeholder="如：12.5吨"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">运输方式</label>
                      <select
                        value={formData.transportType}
                        onChange={(e) => setFormData({ ...formData, transportType: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0061FF]"
                      >
                        <option value="陆运">🚛 陆运</option>
                        <option value="海运">🚢 海运</option>
                        <option value="空运">✈️ 空运</option>
                        <option value="多式联运">🔄 多式联运</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">优先级</label>
                      <select
                        value={formData.priorityLabel}
                        onChange={(e) => setFormData({ ...formData, priorityLabel: e.target.value as 'Normal' | 'High' })}
                        className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0061FF]"
                      >
                        <option value="Normal">Normal（普通）</option>
                        <option value="High">High（紧急）</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 抽屉底部按钮 */}
          <div className="p-4 border-t flex-shrink-0 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              取消
            </button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm hover:bg-[#e66000] flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting
                ? '保存中...'
                : editingItem
                ? (formData.currentLocation && editingItem.status === '待合同确认')
                  ? '保存并启动跟踪 →'
                  : '保存修改'
                : formData.currentLocation
                ? '创建并激活跟踪 →'
                : '确认创建'}
            </button>
          </div>
        </form>
      </div>

      {/* ── 快捷启动在途跟踪弹窗 ─────────────────────────────────────────────── */}
      {activateTarget && (
        <div className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#0A2540] to-[#0061FF] p-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  <span className="font-semibold text-base">快捷启动在途跟踪</span>
                </div>
                <button type="button" onClick={() => setActivateTarget(null)}>
                  <X className="w-5 h-5 text-white/70 hover:text-white" />
                </button>
              </div>
              <p className="text-blue-100 text-xs mt-1 truncate">{activateTarget.name}</p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="bg-white/20 rounded px-2 py-0.5 text-xs">{activateTarget.origin}</span>
                <ArrowRight className="w-4 h-4 text-white/60" />
                <span className="bg-white/20 rounded px-2 py-0.5 text-xs">{activateTarget.destination}</span>
              </div>
            </div>

            <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center gap-2 text-xs text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              填写信息后，项目状态将变为「执行中」并自动进入在途跟踪页面
            </div>

            <form onSubmit={(e) => void handleActivate(e)} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#FF6B00]" />
                  当前货物位置 *
                </label>
                <input
                  required
                  type="text"
                  value={activateForm.currentLocation}
                  onChange={(e) => setActivateForm({ ...activateForm, currentLocation: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF] focus:ring-1 focus:ring-[#0061FF]/20"
                  placeholder="如：越南谅山口岸（已过境）"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    预计到达 (ETA)
                  </label>
                  <input
                    type="date"
                    value={activateForm.eta}
                    onChange={(e) => setActivateForm({ ...activateForm, eta: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">货物重量</label>
                  <input
                    type="text"
                    value={activateForm.weight}
                    onChange={(e) => setActivateForm({ ...activateForm, weight: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0061FF]"
                    placeholder="如：12.5吨"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">运输方式</label>
                  <select
                    value={activateForm.transportType}
                    onChange={(e) => setActivateForm({ ...activateForm, transportType: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0061FF]"
                  >
                    <option value="陆运">🚛 陆运</option>
                    <option value="海运">🚢 海运</option>
                    <option value="空运">✈️ 空运</option>
                    <option value="多式联运">🔄 多式联运</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                  <select
                    value={activateForm.priorityLabel}
                    onChange={(e) => setActivateForm({ ...activateForm, priorityLabel: e.target.value as 'Normal' | 'High' })}
                    className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0061FF]"
                  >
                    <option value="Normal">Normal（普通）</option>
                    <option value="High">High（紧急）</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActivateTarget(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isActivating}
                  className="flex items-center gap-2 px-5 py-2 bg-[#0061FF] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isActivating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 激活中...</>
                  ) : (
                    <><Navigation className="w-4 h-4" /> 确认启动跟踪</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* admin 密码确认弹窗 */}
      <AdminPasswordDialog
        open={adminDialogOpen}
        title="删除项目需要管理员确认"
        description={adminDialogDesc}
        onConfirm={handleAdminConfirmDelete}
        onCancel={() => { setAdminDialogOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
};
