/**
 * features/user/auth — 内部员工端认证功能入口
 * ─────────────────────────────────────────────────────────────────────────────
 * 导出内部员工（portal='internal'）相关的认证函数。
 * 代理端认证请使用 features/agent/auth。
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {
  loginAsync,
  logout,
  getCurrentUser,
  getSession,
  getAuthToken,
  isAuthenticated,
} from '../../../services/authService';

export type { LoginResult } from '../../../services/authService';
