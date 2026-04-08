import React, { useState, useEffect, useRef } from 'react';
import {
  Truck, Search, Filter, MapPin, Clock, Package,
  Layers, Activity, Maximize2, Edit, Trash2, X,
  Loader2, Navigation, ChevronLeft, Radio, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import {
  fetchTrackingProjectsUi,
  updateTrackingProjectRow,
  deleteTrackingProjectRow,
  type TrackingProjectUi,
} from '../services/projectService';

// 在途状态颜色配置
const TRACKING_STATUS_COLOR: Record<string, string> = {
  '运输中': 'bg-blue-50 text-blue-600',
  '清关中': 'bg-orange-50 text-orange-600',
  '已到达': 'bg-green-50 text-green-600',
  '待发货': 'bg-gray-50 text-gray-400',
};

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id'); // 从执行项目页跳转过来时的高亮 ID

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('所有状态');
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackingProjectUi | null>(null);

  const { data: projects = [], isLoading, refetch } = useQuery('tracking-projects', fetchTrackingProjectsUi);

  // 高亮指定项目并滚动到视图
  const highlightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, projects]);

  // 过滤逻辑
  const filtered = projects.filter((p) => {
    const matchSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === '所有状态' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [formData, setFormData] = useState({
    name: '',
    status: '运输中',
    progress: 0,
    origin: '',
    destination: '',
    currentLocation: '',
    cargoType: '',
    weight: '',
    eta: '',
    priorityLabel: 'Normal',
  });

  const handleOpenEdit = (item: TrackingProjectUi) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      status: item.status,
      progress: item.progress,
      origin: item.origin,
      destination: item.destination,
      currentLocation: item.currentLocation,
      cargoType: item.cargoType,
      weight: item.weight,
      eta: item.eta,
      priorityLabel: item.priorityLabel,
    });
    setIsEditDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('您确定要删除这条记录吗？此操作不可恢复。')) return;
    try {
      await deleteTrackingProjectRow(id);
      toast.success('删除成功');
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await updateTrackingProjectRow(editingItem.id, formData);
      toast.success('项目信息更新成功');
      await refetch();
      setIsEditDrawerOpen(false);
      setEditingItem(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── 页头 ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          {/* 来自执行项目管理页时显示面包屑 */}
          {highlightId && (
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-xs text-[#0061FF] hover:underline mb-2"
            >
              <ChevronLeft className="w-3 h-3" />
              返回执行项目管理
            </Link>
          )}
          <h1 className="text-2xl font-bold text-[#0A2540] flex items-center gap-2">
            在途跟踪
            {highlightId && (
              <span className="text-sm font-normal text-blue-500 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                已定位项目 {highlightId}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">实时监控跨境物流动态，掌握货物位置与预计到达时间。</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2 rounded-md transition-all', viewMode === 'list' ? 'bg-[#0A2540] text-white shadow-md' : 'text-gray-400 hover:text-gray-600')}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-md transition-all', viewMode === 'grid' ? 'bg-[#0A2540] text-white shadow-md' : 'text-gray-400 hover:text-gray-600')}
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#0A2540] rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
          >
            <Truck className="w-4 h-4" /> 执行项目管理
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#0A2540] text-white rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-all shadow-lg shadow-blue-900/10">
            <Navigation className="w-4 h-4" /> 地图视图
          </button>
        </div>
      </div>

      {/* ── 搜索 & 过滤栏 ────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索项目编号、名称或目的地..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-[#0061FF] cursor-pointer"
          >
            <option>所有状态</option>
            <option>运输中</option>
            <option>已到达</option>
            <option>清关中</option>
            <option>待发货</option>
          </select>
          <button className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
            <Filter className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── 统计摘要 ──────────────────────────────────────────────────────── */}
      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '在途总数', value: projects.length, color: 'text-[#0A2540]' },
            { label: '运输中', value: projects.filter(p => p.status === '运输中').length, color: 'text-blue-600' },
            { label: '清关中', value: projects.filter(p => p.status === '清关中').length, color: 'text-orange-500' },
            { label: '已到达', value: projects.filter(p => p.status === '已到达').length, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── 项目卡片列表 ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">暂无在途项目</p>
          <p className="text-sm mt-1">请在「执行项目管理」中启动跟踪，项目将自动出现在此处</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0061FF] text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" /> 去执行项目管理
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filtered.map((project, idx) => {
              const isHighlighted = project.id === highlightId;
              return (
                <motion.div
                  key={project.id}
                  ref={isHighlighted ? highlightRef : null}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn(
                    'bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group overflow-hidden',
                    isHighlighted
                      ? 'border-[#0061FF] ring-2 ring-[#0061FF]/20'
                      : 'border-gray-100'
                  )}
                >
                  {/* 高亮横幅 */}
                  {isHighlighted && (
                    <div className="bg-[#0061FF] text-white text-xs px-4 py-1.5 flex items-center gap-2">
                      <Radio className="w-3 h-3 animate-pulse" />
                      从「执行项目管理」跳转定位 · {project.id}
                    </div>
                  )}

                  <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* 左：项目信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          project.priorityLabel === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        )}>
                          {project.priorityLabel} Priority
                        </span>
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{project.id}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0A2540] truncate group-hover:text-[#0061FF] transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Package className="w-4 h-4 text-gray-400" /> {project.cargoType}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Layers className="w-4 h-4 text-gray-400" /> {project.weight || '—'}
                        </div>
                      </div>
                    </div>

                    {/* 中：路线进度 */}
                    <div className="flex-[1.5] flex items-center gap-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">始发地</p>
                        <p className="text-sm font-bold text-[#0A2540]">{project.origin}</p>
                      </div>
                      <div className="flex-1 relative h-8 flex items-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full h-0.5 bg-gray-100 rounded-full" />
                        </div>
                        <div className="absolute inset-0 flex items-center">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress}%` }}
                            transition={{ duration: 1.5, ease: 'easeInOut' }}
                            className="h-0.5 bg-[#0061FF] rounded-full relative"
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#0061FF] rounded-full flex items-center justify-center shadow-lg">
                              <Truck className="w-2 h-2 text-[#0061FF]" />
                            </div>
                          </motion.div>
                        </div>
                      </div>
                      <div className="text-center min-w-[80px]">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">目的地</p>
                        <p className="text-sm font-bold text-[#0A2540]">{project.destination}</p>
                      </div>
                    </div>

                    {/* 右：状态 & 操作 */}
                    <div className="flex items-center gap-8 pl-8 border-l border-gray-100">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            TRACKING_STATUS_COLOR[project.status] ?? 'bg-gray-50 text-gray-400'
                          )}>
                            {project.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> ETA: {project.eta || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(project)}
                          className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-[#0A2540] rounded-xl transition-all"
                          title="编辑跟踪信息"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => void handleDelete(project.id)}
                          className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => navigate(`/projects?highlight=${project.id}`)}
                          className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-[#0A2540] rounded-xl transition-all"
                          title="返回执行管理"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 底部：当前位置 */}
                  <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#FF6B00]" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">当前位置:</span>
                      <span className="text-xs font-bold text-[#0A2540]">{project.currentLocation}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">实时更新中</span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="text-[10px] font-bold text-[#0061FF] hover:underline uppercase tracking-widest"
                      >
                        更新位置 →
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── 编辑项目抽屉 ─────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/20 z-[60] transition-opacity ${isEditDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsEditDrawerOpen(false)}
      />
      <div className={`fixed inset-y-0 right-0 w-full max-w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col ${isEditDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <form onSubmit={(e) => void handleSaveEdit(e)} className="flex flex-col h-full">
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[#0A2540] text-white">
            <h2 className="text-lg font-semibold">编辑在途跟踪信息</h2>
            <button type="button" onClick={() => setIsEditDrawerOpen(false)}>
              <X className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">项目名称 *</label>
              <input required type="text" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">当前状态</label>
                <select value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0A2540]">
                  <option value="待发货">待发货</option>
                  <option value="运输中">运输中</option>
                  <option value="清关中">清关中</option>
                  <option value="已到达">已到达</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">进度 (%)</label>
                <input type="number" min="0" max="100" value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">始发地</label>
                <input type="text" value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">目的地</label>
                <input type="text" value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">当前位置</label>
              <input type="text" value={formData.currentLocation}
                onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]"
                placeholder="如：越南谅山口岸（已过境）" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">货物类型</label>
                <input type="text" value={formData.cargoType}
                  onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">重量</label>
                <input type="text" value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">ETA (预计到达)</label>
                <input type="date" value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none focus:border-[#0A2540]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">优先级</label>
                <select value={formData.priorityLabel}
                  onChange={(e) => setFormData({ ...formData, priorityLabel: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm outline-none bg-white focus:border-[#0A2540]">
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                </select>
              </div>
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
