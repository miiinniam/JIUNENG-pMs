import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  Truck, 
  Clock, 
  ArrowUpRight, 
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';

const MONTHLY_DATA = [
  { name: '1月', volume: 400, cost: 2400, profit: 600 },
  { name: '2月', volume: 300, cost: 1398, profit: 400 },
  { name: '3月', volume: 200, cost: 9800, profit: 2000 },
  { name: '4月', volume: 278, cost: 3908, profit: 800 },
  { name: '5月', volume: 189, cost: 4800, profit: 1200 },
  { name: '6月', volume: 239, cost: 3800, profit: 1000 },
];

const ROUTE_DATA = [
  { name: '中越干线', value: 45 },
  { name: '越老过境', value: 25 },
  { name: '中老铁路', value: 20 },
  { name: '其他', value: 10 },
];

const COLORS = ['#0A2540', '#FF6B00', '#0061FF', '#10B981'];

const AGENT_PERFORMANCE = [
  { name: '谅山车队', onTime: 98, cost: 85, service: 90 },
  { name: '海防捷通', onTime: 92, cost: 90, service: 85 },
  { name: '万象通', onTime: 95, cost: 80, service: 95 },
  { name: '顺丰国际', onTime: 99, cost: 70, service: 98 },
];

export const StatsAnalysis: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A2540]">数据统计分析</h1>
          <p className="text-gray-500 text-sm mt-1">深度洞察中越跨境物流业务表现与增长趋势。</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>2026年 第一季度</span>
          </div>
          <button className="bg-white border border-gray-200 p-2 rounded-lg text-gray-500 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
          </button>
          <button className="bg-[#0A2540] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出分析报告
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: '总运输货值', value: '¥2.48M', trend: '+15.2%', icon: Package, color: 'blue' },
          { label: '平均运输时效', value: '3.2天', trend: '-0.5天', icon: Clock, color: 'orange' },
          { label: '异常处理率', value: '99.4%', trend: '+2.1%', icon: TrendingUp, color: 'green' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${item.color}-50 text-${item.color}-600`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> {item.trend}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">{item.label}</p>
            <h3 className="text-2xl font-bold text-[#0A2540] mt-1">{item.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Volume & Profit Trend */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[#0A2540]">月度运输量与利润趋势</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#0A2540]"></div> 运输量
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF6B00]"></div> 利润
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A2540" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0A2540" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#0A2540" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                <Area type="monotone" dataKey="profit" stroke="#FF6B00" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#0A2540] mb-6">业务板块分布</h3>
          <div className="flex flex-col md:flex-row items-center justify-around h-80">
            <div className="h-64 w-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ROUTE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ROUTE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 w-full md:w-auto">
              {ROUTE_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between md:justify-start gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                    <span className="text-sm font-medium text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#0A2540]">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance Comparison */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[#0A2540]">核心代理商表现对比 (准点率 vs 成本)</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#0061FF]"></div> 准点率
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#FF6B00]"></div> 成本指数
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGENT_PERFORMANCE}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="onTime" fill="#0061FF" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="cost" fill="#FF6B00" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
