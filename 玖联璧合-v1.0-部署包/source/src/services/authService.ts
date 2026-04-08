import { supabase, isMockMode } from '../lib/supabase';
import type { AppUserRow } from '../database/schema';
import type { AuthSession, AuthUserInfo, LoginPortal } from '../types/auth';

const AUTH_KEY = 'cross_border_auth';
const TOKEN_KEY = 'token';

function safeParseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as AuthSession;
    if (!o?.token || !o?.user?.role) return null;
    return o;
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUserInfo | null {
  if (typeof localStorage === 'undefined') return null;
  return safeParseSession(localStorage.getItem(AUTH_KEY))?.user ?? null;
}

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof localStorage === 'undefined') return null;
  return safeParseSession(localStorage.getItem(AUTH_KEY));
}

function persistSession(session: AuthSession | null): void {
  if (typeof localStorage === 'undefined') return;
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_KEY, session.token);
  } else {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export type LoginResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

/** Session 写入 localStorage；代理端 RLS 模拟仅信任此处的 agentId（与 app_users.agent_id 同源）。 */
function rowToAuthUser(row: AppUserRow): AuthUserInfo {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    department: row.department ?? undefined,
    agentId: row.agent_id ?? undefined,
    permissions: row.permissions,
  };
}

/**
 * 与 Supabase 一致：通过 `from('app_users').select().eq().single()` 校验；
 * 上云后仅替换 supabase 实现即可。
 */
export async function loginAsync(
  username: string,
  password: string,
  loginType: LoginPortal
): Promise<LoginResult> {
  const u = username.trim();
  const sb = supabase;

  // Mock 模式查 app_users.password；真实 Supabase 查 profiles.password_hash
  const table: any = isMockMode ? 'app_users' : 'profiles'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const pwCol = isMockMode ? 'password' : 'password_hash';

  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('username', u)
    .eq(pwCol, password)
    .single();

  if (error || !data) {
    console.error('[Auth] login query error:', error);
    return {
      ok: false,
      message: '账号或密码错误，或请选择正确的登录入口',
    };
  }

  // 真实模式下 profiles 返回 password_hash 而非 password，统一映射
  if (!isMockMode && data.password_hash !== undefined) {
    data.password = data.password_hash;
  }
  const row = data as AppUserRow;
  if (row.status === 'pending') {
    return {
      ok: false,
      message: '账号待审核，请等待管理员审批后再登录',
    };
  }
  if (row.status === 'disabled') {
    return {
      ok: false,
      message: '账号已被禁用，请联系管理员',
    };
  }
  if (row.role === 'agent' && !row.agent_id) {
    return {
      ok: false,
      message: '代理账号未绑定代理商档案 (agent_id)，无法使用代理端',
    };
  }
  if (row.portal !== loginType) {
    return {
      ok: false,
      message:
        loginType === 'internal'
          ? '该账号为代理入口账号，请切换「代理供应商」登录'
          : '该账号为内部员工账号，请切换「内部员工」登录',
    };
  }
  const user = rowToAuthUser(row);
  const session: AuthSession = {
    token: `mock-jwt-${row.id}-${Date.now()}`,
    user,
  };
  persistSession(session);
  return { ok: true, session };
}

export function logout(): void {
  persistSession(null);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * 验证 admin 用户的密码。
 * 用于敏感操作（如删除有关联数据的代理/项目）前的二次确认。
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const sb = supabase;
  const table: any = isMockMode ? 'app_users' : 'profiles'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const pwCol = isMockMode ? 'password' : 'password_hash';
  const { data, error } = await sb
    .from(table)
    .select('id')
    .eq('username', 'admin')
    .eq(pwCol, password)
    .single();
  return !error && !!data;
}
