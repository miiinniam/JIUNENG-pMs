/**
 * features/agent/auth — 代理供应商端认证功能入口
 * ─────────────────────────────────────────────────────────────────────────────
 * 导出代理端（portal='agent'）相关的认证函数。
 * 底层与内部员工共用同一套 authService，通过 loginType='agent' 参数区分门户。
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
