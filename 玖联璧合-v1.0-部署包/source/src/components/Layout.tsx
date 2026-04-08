import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  Truck, 
  FilePlus, 
  Bell, 
  Search, 
  User, 
  ChevronRight, 
  Menu,
  X,
  LogOut,
  Settings,
  HelpCircle,
  Package,
  MapPin,
  ClipboardList,
  Activity,
  FileDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { logout as authLogout, getCurrentUser } from '../services/authService';

const TOP_NAV_ITEMS = [
  { id: 'dashboard', label: '控制台', icon: LayoutDashboard, path: '/', linkPath: '/' },
  { id: 'customers', label: '客户管理', icon: Users, path: '/customers', linkPath: '/customers' },
  { id: 'agents', label: '代理商管理', icon: ShieldCheck, path: '/agents', linkPath: '/agents' },
  { id: 'projects', label: '项目跟踪', icon: Truck, path: '/projects', linkPath: '/projects' },
  { id: 'tenders', label: '招标下单', icon: FilePlus, path: '/tenders', linkPath: '/tenders' },
  { id: 'system', label: '系统配置', icon: Settings, path: '/settings', linkPath: '/settings/sub-accounts' },
];

const SIDEBAR_MENUS: Record<string, any[]> = {
  dashboard: [
    { label: '概览', icon: LayoutDashboard, path: '/' },
    { label: '统计分析', icon: ClipboardList, path: '/dashboard/stats' },
  ],
  customers: [
    { label: '客户列表', icon: Users, path: '/customers' },
    { label: '潜在项目', icon: Activity, path: '/customers/potential' },
    { label: '客户分级', icon: Settings, path: '/customers/levels' },
  ],
  agents: [
    { label: '代理管理', icon: Users, path: '/agents' },
    { label: '代理申请入库审批', icon: ShieldCheck, path: '/agents/audit' },
  ],
  projects: [
    { label: '执行项目管理', icon: MapPin, path: '/projects' },
    { label: '在途跟踪', icon: MapPin, path: '/projects/tracking' },
    { label: '异常处理', icon: Bell, path: '/projects/alerts' },
    { label: '历史订单', icon: Package, path: '/projects/history' },
  ],
  tenders: [
    { label: '招标中心', icon: FilePlus, path: '/tenders' },
    { label: '合同管理', icon: ClipboardList, path: '/contracts' },
  ],
  system: [
    { label: '子账号管理', icon: Users, path: '/settings/sub-accounts' },
    { label: '代理商账号管理', icon: ShieldCheck, path: '/settings/agent-accounts' },
    { label: '免费文件管理', icon: FileDown, path: '/settings/free-templates' },
  ],
};

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    authLogout();
    navigate('/login', { replace: true });
  };
  
  const findActiveTopId = (pathname: string) => {
    if (pathname === '/' || pathname.startsWith('/dashboard')) return 'dashboard';
    if (pathname.startsWith('/customers')) return 'customers';
    if (pathname.startsWith('/agents')) return 'agents';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/tenders') || pathname.startsWith('/contracts')) return 'tenders';
    if (pathname.startsWith('/settings')) return 'system';
    return 'dashboard';
  };
  
  const activeTopId = findActiveTopId(location.pathname);

  const currentSidebarMenu = SIDEBAR_MENUS[activeTopId] || [];

  const visibleTopNavItems = TOP_NAV_ITEMS.filter(item => 
    currentUser?.role === 'admin' || currentUser?.permissions?.includes(item.id)
  );

  const activeSidebarItem = currentSidebarMenu.reduce((prev, curr) => {
    if (location.pathname === curr.path) return curr;
    if (location.pathname.startsWith(curr.path + '/') && curr.path !== '/') {
      if (!prev || curr.path.length > prev.path.length) return curr;
    }
    return prev;
  }, null);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-[#0A2540]">
      {/* Top Navigation */}
      <header className="h-16 bg-[#0A2540] text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3 mr-12">
          <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center shadow-lg">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:block">中越跨境物流系统</span>
        </div>

        <nav className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {visibleTopNavItems.map((item) => (
            <Link
              key={item.id}
              to={item.linkPath ?? item.path}
              className={cn(
                "px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm font-medium whitespace-nowrap",
                activeTopId === item.id 
                  ? "bg-white/10 text-[#FF6B00]" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 ml-4">
          <div className="relative hidden lg:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="搜索订单/客户..." 
              className="bg-white/10 border-none rounded-full pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-[#FF6B00] w-48 transition-all"
            />
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full relative">
            <Bell className="w-5 h-5 text-white/80" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A2540]"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">
                {currentUser?.displayName ?? '内部用户'}
              </p>
              <p className="text-[10px] text-white/40">
                {currentUser?.department ?? currentUser?.role ?? ''}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] flex items-center justify-center shadow-inner">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-40",
            isSidebarOpen ? "w-64" : "w-20"
          )}
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <span className={cn("font-bold text-gray-400 text-xs uppercase tracking-widest transition-opacity", !isSidebarOpen && "opacity-0")}>
              {TOP_NAV_ITEMS.find(i => i.id === activeTopId)?.label}
            </span>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {currentSidebarMenu.map((item, idx) => {
              const isActive = activeSidebarItem?.path === item.path;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
                    isActive 
                      ? "bg-[#F0F7FF] text-[#0061FF]" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-[#0A2540]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#0061FF]" : "text-gray-400 group-hover:text-[#0A2540]")} />
                  {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  {isSidebarOpen && isActive && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-1">
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
            >
              <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
              {isSidebarOpen && <span className="text-sm font-medium">退出登录</span>}
            </button>
          </div>
        </aside>

        {/* Logout Confirmation Modal */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLogoutConfirm(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">确认退出登录？</h3>
                  <p className="text-gray-500 mb-8 text-sm">退出后您需要重新登录才能访问系统。</p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
                    >
                      确认退出
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
