/**
 * 仅作文档/对照用。真实登录与 agent_id 绑定以 `database/seed.ts` 的 `app_users`
 * + `authService.loginAsync` 为准。
 */
import type { AppRole } from '../types/auth';

export interface InternalUserRecord {
  id: string;
  username: string;
  password: string;
  role: Extract<AppRole, 'admin' | 'staff'>;
  department: string;
  displayName: string;
}

export interface AgentUserRecord {
  id: string;
  username: string;
  password: string;
  role: 'agent';
  /** 关联代理商档案库 ID */
  agentId: string;
  displayName: string;
}

/** 内部员工测试账号：admin / 123456，staff / 123456 */
export const internalUsers: InternalUserRecord[] = [
  {
    id: 'int-001',
    username: 'admin',
    password: '123456',
    role: 'admin',
    department: '运营总部',
    displayName: '系统管理员',
  },
  {
    id: 'int-002',
    username: 'staff',
    password: '123456',
    role: 'staff',
    department: '跨境业务部',
    displayName: '张业务',
  },
];

/** 代理供应商测试账号：agent / 123456，agent2 / 123456 */
export const agentUsers: AgentUserRecord[] = [
  {
    id: 'ag-usr-001',
    username: 'agent',
    password: '123456',
    role: 'agent',
    agentId: 'AG-001',
    displayName: '谅山鸿运车队',
  },
  {
    id: 'ag-usr-002',
    username: 'agent2',
    password: '123456',
    role: 'agent',
    agentId: 'AG-002',
    displayName: '海防捷通报关行',
  },
];
