import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  FilePlus,
  Bell,
  User,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Trophy,
  Building2,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { logout as authLogout, getCurrentUser } from '../services/authService';

const SUPPLIER_NAV_ITEMS = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard, path: '/supplier' },
  {
    id: 'application',
    label: '代理申请入库',
    icon: ShieldCheck,
    path: '/supplier/application',
  },
  {
    id: 'bidding',
    label: '招标大厅',
    icon: FilePlus,
    path: '/supplier/bidding',
    matchQuery: 'tab=open',
  },
  {
    id: 'my_quotes',
    label: '我的报价',
    icon: ClipboardList,
    path: '/supplier/bidding?tab=my',
  },
  {
    id: 'notifications',
    label: '中标通知',
    icon: Trophy,
    path: '/supplier/notifications',
  },
  {
    id: 'contracts',
    label: '我的合同',
    icon: FileText,
    path: '/supplier/contracts',
  },
];

function pathMatchesNav(pathname: string, search: string, itemPath: string): boolean {
  const [p, q] = itemPath.split('?');
  if (pathname !== p) return false;
  if (!q) {
    if (p === '/supplier/bidding') {
      return !search.includes('tab=my');
    }
    return true;
  }
  const want = new URLSearchParams(q);
  const got = new URLSearchParams(search);
  for (const [k, v] of want.entries()) {
    if (got.get(k) !== v) return false;
  }
  return true;
}

/** 代理供应商门户布局（与内部 ERP MainLayout 数据隔离、导航精简） */
export const SupplierLayout: React.FC = () => {
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

  const activeId =
    SUPPLIER_NAV_ITEMS.find((item) =>
      pathMatchesNav(location.pathname, location.search, item.path)
    )?.id || 'dashboard';

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-[#0A2540]">
      <header className="h-16 bg-[#0A2540] text-white flex items-center px-6 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3 mr-12">
          <div className="w-10 h-10 bg-[#0061FF] rounded-lg flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:block">
            代理供应商门户
          </span>
        </div>

        <nav className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
          {SUPPLIER_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                'px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2 text-sm font-medium whitespace-nowrap',
                activeId === item.id
                  ? 'bg-white/10 text-[#0061FF]'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 ml-4">
          <button
            type="button"
            className="p-2 hover:bg-white/10 rounded-full relative"
          >
            <Bell className="w-5 h-5 text-white/80" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A2540]"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">
                {currentUser?.displayName ?? '代理商'}
              </p>
              <p className="text-[10px] text-white/40">
                {currentUser?.agentId ? `档案 ${currentUser.agentId}` : '认证供应商'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0061FF] to-[#00A3FF] flex items-center justify-center shadow-inner">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-40',
            isSidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <span
              className={cn(
                'font-bold text-gray-400 text-xs uppercase tracking-widest transition-opacity',
                !isSidebarOpen && 'opacity-0'
              )}
            >
              供应商菜单
            </span>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {SUPPLIER_NAV_ITEMS.map((item, idx) => {
              const active = pathMatchesNav(
                location.pathname,
                location.search,
                item.path
              );
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                    active
                      ? 'bg-[#F0F7FF] text-[#0061FF]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-[#0A2540]'
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5',
                      active
                        ? 'text-[#0061FF]'
                        : 'text-gray-400 group-hover:text-[#0A2540]'
                    )}
                  />
                  {isSidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                  {isSidebarOpen && active && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-1">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
            >
              <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
              {isSidebarOpen && (
                <span className="text-sm font-medium">退出登录</span>
              )}
            </button>
          </div>
        </aside>

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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    确认退出登录？
                  </h3>
                  <p className="text-gray-500 mb-8 text-sm">
                    退出后您需要重新登录才能访问系统。
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
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

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/** 别名：与需求文档中的 AgentLayout 一致 */
export const AgentLayout = SupplierLayout;
