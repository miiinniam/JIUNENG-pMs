import React from 'react';
import {
  TrendingUp,
  Users,
  Truck,
  AlertCircle,
  ChevronRight,
  MapPin,
  Clock,
  ArrowUpRight,
  Package,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import {
  fetchDashboardStats,
  fetchRecentProjectsUi,
} from '../services/projectService';
import { fetchPendingApplicationsUi } from '../services/agentService';
import { fetchAlertsUi } from '../services/alertService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery('dashboard-stats', fetchDashboardStats);
  const { data: recentProjects = [] } = useQuery('dashboard-recent-projects', fetchRecentProjectsUi);
  const { data: alerts = [] } = useQuery('dashboard-alerts', fetchAlertsUi);
  const { data: pendingApps = [] } = useQuery('dashboard-pending-apps', fetchPendingApplicationsUi);

  const statCards = [
    {
      label: '执行中项目',
      value: String(stats?.activeProjectCount ?? '—'),
      unit: '个',
      trend: '+2',
      isUp: true,
      icon: Truck,
      color: 'blue',
      path: '/projects',
    },
    {
      label: '活跃客户',
      value: String(stats?.customerCount ?? '—'),
      unit: '家',
      trend: '+1',
      isUp: true,
      icon: Users,
      color: 'orange',
      path: '/customers',
    },
    {
      label: '准点率',
      value: '98.2',
      unit: '%',
      trend: '-0.4%',
      isUp: false,
      icon: CheckCircle2,
      color: 'green',
      path: '/projects/tracking',
    },
    {
      label: '异常预警',
      value: String(stats?.alertCount ?? '—'),
      unit: '件',
      trend: stats?.alertCount != null ? String(stats.alertCount) : '—',
      isUp: true,
      icon: AlertCircle,
      color: 'red',
      path: '/projects/alerts',
    },
  ];

  const todoItems = [
    ...(pendingApps.length > 0
      ? [{
          title: '代理商资质审核',
          desc: `${pendingApps[0]?.name ?? '代理'}等 ${pendingApps.length} 家提交了入库申请`,
          time: '待处理',
          type: 'audit',
          path: '/agents/audit',
        }]
      : []),
    ...(alerts.length > 0
      ? [{
          title: '异常预警',
          desc: alerts[0]?.title ?? '运输预警',
          time: alerts[0]?.time ?? '',
          type: 'alert',
          path: '/projects/alerts',
        }]
      : []),
    {
      title: '新询价单',
      desc: '前往招标中心查看最新招标',
      time: '',
      type: 'tender',
      path: '/tenders',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540]">运营概览</h1>
          <p className="text-gray-500 text-sm mt-1">欢迎回来，这是您今天的业务摘要。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
          </div>
          <button className="bg-[#0A2540] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors shadow-lg shadow-blue-900/10">
            导出报告
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(stat.path)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className={cn(
                "p-3 rounded-xl transition-colors",
                stat.color === 'blue' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" :
                stat.color === 'orange' ? "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white" :
                stat.color === 'green' ? "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white" :
                "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}>
                <ArrowUpRight className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-[#0A2540]">{stat.value}</span>
                <span className="text-gray-400 text-xs font-medium">{stat.unit}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0A2540] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#FF6B00]" />
              实时项目跟踪
            </h2>
            <button onClick={() => navigate('/projects')} className="text-sm font-medium text-[#0061FF] hover:underline flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">项目名称 / 路线</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">进度</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">预计到达</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-[#0A2540]">{project.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {project.route}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          project.status === '执行中' ? "bg-blue-50 text-blue-600" :
                          project.status === '已完成' ? "bg-green-50 text-green-600" :
                          project.status === '准备中' ? "bg-orange-50 text-orange-600" :
                          "bg-gray-50 text-gray-400"
                        )}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-gray-400">{project.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full",
                                project.progress === 100 ? "bg-green-500" : "bg-[#0061FF]"
                              )}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-600">{project.route}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-8">
          <div className="bg-[#0A2540] rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all"></div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#FF6B00]" />
              快速操作
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/tenders')}
                className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/5"
              >
                <Package className="w-6 h-6 text-[#FF6B00]" />
                <span className="text-xs font-bold">新建招标</span>
              </button>
              <button
                onClick={() => navigate('/customers')}
                className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/5"
              >
                <Users className="w-6 h-6 text-[#0061FF]" />
                <span className="text-xs font-bold">添加客户</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-[#0A2540] mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              待办提醒
            </h3>
            <div className="space-y-4">
              {todoItems.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    item.type === 'audit' ? "bg-blue-500" : item.type === 'alert' ? "bg-red-500" : "bg-orange-500"
                  )}></div>
                  <div>
                    <p className="text-sm font-bold text-[#0A2540] group-hover:text-[#0061FF] transition-colors">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    {item.time && <p className="text-[10px] text-gray-400 mt-2 font-medium">{item.time}</p>}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-sm font-bold text-gray-400 hover:text-[#0A2540] transition-colors border-t border-gray-50 pt-4">
              查看所有提醒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
