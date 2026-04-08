import { supabase } from '../lib/supabase';
import { writeTable, mapUserRowForWrite } from '../lib/dbHelpers';
import type { AgentRow, AppUserRow } from '../database/schema';

export type SubAccountUi = {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  department: string;
  permissions: string[];
  status: 'active' | 'disabled' | 'pending';
};

function mapUserUi(row: AppUserRow): SubAccountUi {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    department: row.department ?? '',
    permissions: row.permissions ?? [],
    status: row.status ?? 'active',
  };
}

export async function fetchSubAccounts(parentId?: string): Promise<SubAccountUi[]> {
  const sb = supabase;
  let query = sb.from('app_users').select('*').eq('role', 'staff');
  
  if (parentId) {
    query = query.eq('parent_id', parentId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as AppUserRow[]).map(mapUserUi);
}

export async function createSubAccount(
  parentId: string,
  input: Omit<SubAccountUi, 'id' | 'status'>
): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();
  
  // check duplicate username
  const { data: exist } = await sb.from(writeTable('app_users')).select('id').eq('username', input.username);
  if (exist && Array.isArray(exist) && exist.length > 0) {
    throw new Error('用户名已存在');
  }

  const row: AppUserRow = {
    id: `int-${Date.now()}`,
    username: input.username,
    password: input.password || '123456',
    role: 'staff',
    portal: 'internal',
    display_name: input.displayName,
    department: input.department,
    agent_id: null,
    parent_id: parentId,
    permissions: input.permissions,
    status: 'active',
    created_at: t,
    updated_at: t,
  };

  const { error } = await sb.from(writeTable('app_users')).insert(mapUserRowForWrite(row as unknown as Record<string, unknown>));
  if (error) throw new Error(error.message);
}

export async function updateSubAccount(
  id: string,
  input: Partial<SubAccountUi>
): Promise<void> {
  const sb = supabase;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.displayName != null) patch.display_name = input.displayName;
  if (input.department != null) patch.department = input.department;
  if (input.permissions != null) patch.permissions = input.permissions;
  if (input.status != null) patch.status = input.status;
  if (input.password) patch.password = input.password;

  const { error } = await sb.from(writeTable('app_users')).update(mapUserRowForWrite(patch)).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSubAccount(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from(writeTable('app_users')).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── 代理商登录账号管理 ───────────────────────────────────────────────────────

export type AgentAccountUi = {
  id: string;
  username: string;
  displayName: string;
  agentId: string;
  agentName: string;
  agentLevel: string;
  status: 'active' | 'disabled' | 'pending';
};

function mapAgentAccountUi(row: AppUserRow, agentMap: Map<string, AgentRow>): AgentAccountUi {
  const agent = agentMap.get(row.agent_id ?? '');
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    agentId: row.agent_id ?? '',
    agentName: agent?.name ?? row.agent_id ?? '—',
    agentLevel: agent?.level_label ?? '—',
    status: row.status ?? 'active',
  };
}

export async function fetchAgentAccounts(): Promise<AgentAccountUi[]> {
  const sb = supabase;
  const { data: users, error: e1 } = await sb
    .from('app_users')
    .select('*')
    .eq('role', 'agent')
    .order('created_at', { ascending: false });
  const { data: agents, error: e2 } = await sb.from('agents').select('*');
  if (e1 || e2 || !users) return [];
  const agentMap = new Map((agents as AgentRow[]).map((a) => [a.id, a]));
  return (users as AppUserRow[]).map((u) => mapAgentAccountUi(u, agentMap));
}

export async function createAgentAccount(input: {
  username: string;
  password: string;
  displayName: string;
  agentId: string;
}): Promise<void> {
  if (!input.agentId) throw new Error('必须关联一个代理商档案');
  const sb = supabase;
  const { data: exist } = await sb.from(writeTable('app_users')).select('id').eq('username', input.username);
  if (exist && Array.isArray(exist) && exist.length > 0) {
    throw new Error('用户名已存在');
  }
  const t = new Date().toISOString();
  const row: AppUserRow = {
    id: `ag-usr-${Date.now()}`,
    username: input.username,
    password: input.password || '123456',
    role: 'agent',
    portal: 'agent',
    display_name: input.displayName,
    department: null,
    agent_id: input.agentId,
    status: 'active',
    created_at: t,
    updated_at: t,
  };
  const { error } = await sb.from(writeTable('app_users')).insert(mapUserRowForWrite(row as unknown as Record<string, unknown>));
  if (error) throw new Error(error.message);
}

export async function updateAgentAccount(
  id: string,
  input: { displayName?: string; password?: string; status?: 'active' | 'disabled' }
): Promise<void> {
  const sb = supabase;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.displayName != null) patch.display_name = input.displayName;
  if (input.password) patch.password = input.password;
  if (input.status != null) patch.status = input.status;
  const { error } = await sb.from(writeTable('app_users')).update(mapUserRowForWrite(patch)).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAgentAccount(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from(writeTable('app_users')).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── 自注册内部员工（待审核） ──────────────────────────────────────────────────

export async function registerInternalUser(input: {
  username: string;
  password: string;
  displayName: string;
  department: string;
}): Promise<void> {
  const sb = supabase;
  const { data: exist } = await sb.from(writeTable('app_users')).select('id').eq('username', input.username);
  if (exist && Array.isArray(exist) && exist.length > 0) {
    throw new Error('该账号已注册，请直接登录或使用其他账号');
  }
  const t = new Date().toISOString();
  const row: AppUserRow = {
    id: `int-reg-${Date.now()}`,
    username: input.username,
    password: input.password,
    role: 'staff',
    portal: 'internal',
    display_name: input.displayName,
    department: input.department || null,
    agent_id: null,
    permissions: [],
    status: 'pending',
    created_at: t,
    updated_at: t,
  };
  const { error } = await sb.from(writeTable('app_users')).insert(mapUserRowForWrite(row as unknown as Record<string, unknown>));
  if (error) throw new Error(error.message);
}

export async function fetchPendingInternalUsers(): Promise<SubAccountUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('app_users')
    .select('*')
    .eq('role', 'staff')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as AppUserRow[]).map(mapUserUi);
}

export async function approveInternalUser(id: string, adminId: string): Promise<void> {
  const sb = supabase;
  const patch = { status: 'active', parent_id: adminId, updated_at: new Date().toISOString() };
  const { error } = await sb.from(writeTable('app_users')).update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function rejectInternalUser(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from(writeTable('app_users')).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
