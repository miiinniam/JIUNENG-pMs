import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FilePlus, Trophy, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const SupplierDashboard: React.FC = () => {
  const stats = [
    { label: '待处理投标', value: '3', icon: FilePlus, color: 'bg-blue-500' },
    { id: 'status', label: '入库状态', value: '已认证', icon: ShieldCheck, color: 'bg-green-500' },
    { label: '中标记录', value: '12', icon: Trophy, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">供应商控制台</h1>
          <p className="text-gray-500 mt-1">欢迎回来，查看您的投标动态与入库进度。</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
          <CheckCircle2 className="w-4 h-4" />
          系统运行正常
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={stat.color + " w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tenders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">最新招标推送</h3>
            <Link to="/supplier/bidding" className="text-sm font-bold text-[#0061FF] hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { title: '中越边境电子产品运输项目', deadline: '2026-04-10', budget: '¥50,000' },
              { title: '河内工业园物料配送招标', deadline: '2026-04-12', budget: '¥120,000' },
              { title: '凭祥口岸冷链物流年度服务', deadline: '2026-04-15', budget: '¥300,000' },
            ].map((item, idx) => (
              <div key={idx} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 截止日期: {item.deadline}
                    </span>
                    <span className="text-xs font-bold text-orange-500">{item.budget}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-[#F0F7FF] text-[#0061FF] text-xs font-bold rounded-lg hover:bg-[#0061FF] hover:text-white transition-all">
                  立即投标
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-6">入库申请进度</h3>
          <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {[
              { title: '资质初审通过', time: '2026-04-01 10:00', status: 'completed' },
              { title: '实地考察完成', time: '2026-04-02 14:30', status: 'completed' },
              { title: '系统入库认证', time: '2026-04-03 09:15', status: 'current' },
              { title: '正式合作协议签署', time: '预计 2026-04-05', status: 'pending' },
            ].map((step, idx) => (
              <div key={idx} className="relative pl-8">
                <div className={cn(
                  "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm",
                  step.status === 'completed' ? "bg-green-500" : 
                  step.status === 'current' ? "bg-blue-500 animate-pulse" : "bg-gray-200"
                )}>
                  {step.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <h4 className={cn("text-sm font-bold", step.status === 'pending' ? "text-gray-400" : "text-gray-900")}>
                    {step.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
