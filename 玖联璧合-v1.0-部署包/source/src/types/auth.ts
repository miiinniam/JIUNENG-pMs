/** 应用内统一角色（与登录账户 role 对齐） */
export type AppRole = 'admin' | 'staff' | 'agent';

export type LoginPortal = 'internal' | 'agent';

export interface AuthUserInfo {
  id: string;
  username: string;
  role: AppRole;
  displayName: string;
  /** 内部员工部门 */
  department?: string;
  /** 代理商档案 ID，仅 role === 'agent' */
  agentId?: string;
  /** RBAC 权限点 */
  permissions?: string[];
}

export interface AuthSession {
  token: string;
  user: AuthUserInfo;
}
