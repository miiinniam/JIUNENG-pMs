import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Globe,
  CheckCircle2,
  Building2,
  FileDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { loginAsync, getCurrentUser } from '../services/authService';
import type { LoginPortal } from '../types/auth';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? '/';

  const [isLoading, setIsLoading] = useState(false);
  const [portal, setPortal] = useState<LoginPortal>('internal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) return;
    if (u.role === 'agent') navigate('/supplier', { replace: true });
    else navigate(from === '/login' ? '/' : from, { replace: true });
  }, [navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await loginAsync(username, password, portal);
    setIsLoading(false);
    if (res.ok === false) {
      toast.error(res.message);
      console.error('[auth]', res.message);
      return;
    }
    toast.success(`欢迎，${res.session.user.displayName}`);
    if (res.session.user.role === 'agent') {
      navigate('/supplier', { replace: true });
    } else {
      navigate(from.startsWith('/supplier') ? '/' : from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FF6B00] rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#0A2540] rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl bg-white rounded-2xl md:rounded-[2.5rem] shadow-2xl shadow-gray-200/50 flex flex-col lg:flex-row overflow-hidden relative z-10 border border-gray-100"
      >
        <div className="lg:w-[40%] bg-[#0A2540] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">中越跨境物流系统</span>
            </div>

            <div className="space-y-8">
              <h2 className="text-4xl font-bold leading-tight">
                连接中越，<br />
                <span className="text-[#FF6B00]">智慧物流</span>新体验
              </h2>
              <p className="text-white/60 text-lg leading-relaxed max-w-sm">
                一站式跨境物流管理平台，涵盖客户、代理商、项目跟踪与招标全流程。
              </p>

              <div className="space-y-4 pt-4">
                {[
                  { icon: CheckCircle2, text: '实时跨境项目跟踪' },
                  { icon: CheckCircle2, text: '智能代理商资质审核' },
                  { icon: CheckCircle2, text: '透明化招标竞价系统' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-[#FF6B00]" />
                    <span className="text-sm font-medium text-white/80">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-12 flex items-center gap-4 border-t border-white/10">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[#0A2540] bg-gray-500 overflow-hidden"
                >
                  <img
                    src={`https://picsum.photos/seed/user${i}/100/100`}
                    alt="user"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40 font-medium">
              已有 <span className="text-white font-bold">2,400+</span> 企业用户加入
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 md:p-10 lg:p-16 flex flex-col justify-center">
          <div className="max-w-lg mx-auto w-full space-y-10">
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-[#0A2540]">登录系统</h3>
              <p className="text-gray-400 text-sm font-medium">
                请选择入口并输入测试账号（内部：admin/staff + 123456；代理：agent + 123456）
              </p>
            </div>

            <div className="flex p-1.5 bg-gray-100 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setPortal('internal')}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                  portal === 'internal'
                    ? 'bg-white text-[#0A2540] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <ShieldCheck className="w-4 h-4" /> 内部员工
              </button>
              <button
                type="button"
                onClick={() => setPortal('agent')}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2',
                  portal === 'agent'
                    ? 'bg-white text-[#0A2540] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Building2 className="w-4 h-4" /> 代理供应商
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    账号
                  </label>
                  <div className="relative group">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={portal === 'internal' ? 'admin 或 staff' : 'agent 或 agent2'}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      密码
                    </label>
                    <button type="button" className="text-xs font-bold text-[#0061FF] hover:underline">
                      忘记密码?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0061FF] transition-colors" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-[#0061FF] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-gray-300 text-[#0061FF] focus:ring-[#0061FF]"
                />
                <label htmlFor="remember" className="text-sm text-gray-500 font-medium cursor-pointer">
                  记住登录状态
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#0A2540] text-white rounded-2xl text-base font-bold hover:bg-[#1a3a5a] transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    进入系统{' '}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 font-medium">
                还没有账号？{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-[#0061FF] font-bold hover:underline"
                >
                  立即注册
                </button>
              </p>
            </form>

            {/* Free Templates Section */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <Link
                to="/free-templates"
                className="block bg-gradient-to-r from-[#FFF7F0] to-[#F0F7FF] rounded-2xl p-5 hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <FileDown className="w-6 h-6 text-[#FF6B00]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0A2540] group-hover:text-[#FF6B00] transition-colors">
                        免费报关文件模板
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        进出口报关清关所需标准文件下载
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg">
                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">出口</span>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-lg">
                        <ArrowDownRight className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-medium text-green-600">进口</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF6B00] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>

            <div className="pt-8 flex items-center justify-center gap-6 border-t border-gray-100">
              <button
                type="button"
                className="text-xs font-bold text-gray-400 hover:text-[#0A2540] transition-colors flex items-center gap-2"
              >
                <Globe className="w-4 h-4" /> 简体中文
              </button>
              <button
                type="button"
                className="text-xs font-bold text-gray-400 hover:text-[#0A2540] transition-colors"
              >
                帮助中心
              </button>
              <button
                type="button"
                className="text-xs font-bold text-gray-400 hover:text-[#0A2540] transition-colors"
              >
                隐私政策
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
