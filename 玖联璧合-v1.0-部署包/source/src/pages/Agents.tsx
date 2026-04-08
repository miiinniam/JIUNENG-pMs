import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Download, 
  ChevronRight,
  AlertCircle,
  Building2,
  Calendar,
  UserCheck,
  UserX,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const AGENTS = [
  { id: 'AGT-2026-001', company: '顺丰国际物流 (SF International)', contact: '李四', phone: '139****9999', status: '待审核', date: '2026-04-04 10:25', type: '一级代理', region: '华南区' },
  { id: 'AGT-2026-002', company: '越南快运 (VN Post)', contact: 'Nguyen Van B', phone: '+84 91****456', status: '已通过', date: '2026-04-03 14:30', type: '跨境代理', region: '越南-河内' },
  { id: 'AGT-2026-003', company: '中外运 (Sinotrans)', contact: '赵六', phone: '136****6666', status: '已通过', date: '2026-04-02 09:15', type: '一级代理', region: '华东区' },
  { id: 'AGT-2026-004', company: '老挝通 (Lao Express)', contact: 'Somsak', phone: '+856 20****789', status: '已驳回', date: '2026-04-01 16:45', type: '跨境代理', region: '老挝-万象' },
  { id: 'AGT-2026-005', company: '德邦快递', contact: '陈七', phone: '135****5555', status: '待审核', date: '2026-04-04 08:10', type: '二级代理', region: '华北区' },
];

export const Agents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540]">代理商审核</h1>
          <p className="text-gray-500 text-sm mt-1">审核新加入的代理商资质，管理其合作权限与等级。</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <History className="w-4 h-4" /> 审核历史
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl w-full md:w-auto">
          {[
            { id: 'all', label: '全部', count: 45 },
            { id: 'pending', label: '待审核', count: 12 },
            { id: 'approved', label: '已通过', count: 28 },
            { id: 'rejected', label: '已驳回', count: 5 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                activeTab === tab.id 
                  ? "bg-white text-[#0A2540] shadow-sm" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-[#0A2540] text-white" : "bg-gray-200 text-gray-500"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索代理商名称..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#0061FF] transition-all"
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent, idx) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#0A2540] group-hover:text-white transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  agent.status === '待审核' ? "bg-blue-50 text-blue-600" :
                  agent.status === '已通过' ? "bg-green-50 text-green-600" :
                  "bg-red-50 text-red-600"
                )}>
                  {agent.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#0A2540] line-clamp-1">{agent.company}</h3>
                <p className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> 提交于 {agent.date}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">联系人</p>
                  <p className="text-sm font-medium text-gray-700">{agent.contact}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">代理类型</p>
                  <p className="text-sm font-medium text-gray-700">{agent.type}</p>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-2">
                <button 
                  onClick={() => setSelectedAgent(agent)}
                  className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> 查看详情
                </button>
                {agent.status === '待审核' && (
                  <button className="p-2 bg-[#0A2540] hover:bg-[#1a3a5a] text-white rounded-xl transition-colors shadow-lg shadow-blue-900/10">
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {agent.status === '待审核' && (
              <div className="px-5 py-3 bg-blue-50/50 border-t border-blue-50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">需要立即处理</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Agent Detail Drawer (Simplified) */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAgent(null)}
              className="absolute inset-0 bg-[#0A2540]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-xl h-full relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-[#0A2540]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0A2540]">代理商详情</h3>
                    <p className="text-xs text-gray-400 font-medium">{selectedAgent.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-[#FF6B00] pl-3">基本信息</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">公司名称</p>
                      <p className="text-sm font-bold text-[#0A2540]">{selectedAgent.company}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">所属地区</p>
                      <p className="text-sm font-bold text-[#0A2540]">{selectedAgent.region}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">联系人</p>
                      <p className="text-sm font-bold text-[#0A2540]">{selectedAgent.contact}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">联系电话</p>
                      <p className="text-sm font-bold text-[#0A2540]">{selectedAgent.phone}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-[#FF6B00] pl-3">上传资质</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: '营业执照.pdf', size: '2.4 MB' },
                      { name: '道路运输许可证.pdf', size: '1.8 MB' },
                      { name: '企业法人身份证.jpg', size: '850 KB' },
                      { name: '跨境运输资质证明.pdf', size: '3.1 MB' },
                    ].map((doc, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3 group cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A2540] truncate">{doc.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{doc.size}</p>
                        </div>
                        <Download className="w-4 h-4 text-gray-300 group-hover:text-[#0A2540] transition-colors" />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-l-2 border-[#FF6B00] pl-3">审核备注</h4>
                  <textarea 
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0061FF] min-h-[100px]"
                    placeholder="输入审核意见或驳回原因..."
                  ></textarea>
                </section>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center gap-4">
                <button className="flex-1 py-3 bg-white border border-gray-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <UserX className="w-4 h-4" /> 驳回申请
                </button>
                <button className="flex-1 py-3 bg-[#0A2540] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a5a] transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" /> 通过审核
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
