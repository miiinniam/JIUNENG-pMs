import { supabase, isMockMode } from '../lib/supabase';
import { writeTable, mapUserRowForWrite } from '../lib/dbHelpers';
import type { AgentApplicationRow, AgentRow, AppUserRow } from '../database/schema';
import { uploadFile } from './fileService';

// ── Agent Management (already-enrolled agents) ──────────────────────────────

export type AgentUi = {
  id: string;
  name: string;
  bizType: string;
  code: string;
  location: string;
  contact: string;
  phone: string;
  level: string;
  status: string;
  remark: string;
};

function mapAgentUi(row: AgentRow): AgentUi {
  return {
    id: row.id,
    name: row.name,
    bizType: row.biz_type ?? '',
    code: row.code ?? '',
    location: row.location ?? '',
    contact: row.contact ?? '',
    phone: row.phone ?? '',
    level: row.level_label,
    status: row.status ?? '已审核',
    remark: row.remark ?? '',
  };
}

export async function fetchAgentsUi(): Promise<AgentUi[]> {
  const sb = supabase;
  const { data, error } = await sb.from('agents').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as AgentRow[]).map(mapAgentUi);
}

/**
 * 手工新增代理并同时在 app_users 注册一个对应的代理账号。
 * 新增后代理状态为「待审核」，代理需要用分配的账号登录代理端完成入库申请。
 */
export async function insertAgentRow(input: Omit<AgentUi, 'id'> & {
  /** 为代理分配的初始登录账号 */
  loginAccount?: string;
  /** 初始登录密码 */
  loginPassword?: string;
}): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();
  const agentId = `AG-${Date.now()}`;

  // 1. 检查账号是否已存在（直接查基表，避免视图权限问题）
  const rawUsername = (input.loginAccount || '').trim();
  if (rawUsername) {
    const { data: exist } = await sb.from(writeTable('app_users')).select('id').eq('username', rawUsername);
    if (exist && Array.isArray(exist) && exist.length > 0) {
      throw new Error(`登录账号「${rawUsername}」已被占用，请更换`);
    }
  }

  // 2. 插入 agents 表（状态：待审核）
  const row: AgentRow = {
    id: agentId,
    name: input.name,
    level_label: input.level.split(' ')[0],
    code: `NEW-${Math.floor(Math.random() * 1000)}`,
    location: '待补充',
    contact: input.contact,
    phone: input.phone,
    biz_type: input.bizType,
    status: '待审核',
    remark: input.remark,
    created_at: t,
    updated_at: t,
  };
  const { error } = await sb.from('agents').insert(row as unknown as Record<string, unknown>);
  if (error) throw new Error(error.message);

  // 3. 在 app_users 自动注册对应的代理登录账号
  //    状态设为 active，让代理可以立即登录代理端完成入库申请
  const finalUsername = rawUsername || input.phone || `agent-${Date.now()}`;
  const finalPassword = (input.loginPassword || '').trim() || '123456';
  const userRow: Record<string, unknown> = {
    id: `agt-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: finalUsername,
    password: finalPassword,
    role: 'agent',
    portal: 'agent',
    display_name: input.name,
    department: null,
    agent_id: agentId,
    status: 'active',
    created_at: t,
    updated_at: t,
  };
  const { error: eAcc } = await sb.from(writeTable('app_users')).insert(mapUserRowForWrite(userRow));
  if (eAcc) {
    console.error('[AgentService] 账号创建失败:', eAcc);
    if (eAcc.message?.includes('unique') || eAcc.message?.includes('duplicate')) {
      throw new Error(`登录账号「${finalUsername}」已被占用，请更换其他账号`);
    }
    throw new Error(`代理建档成功但账号创建失败：${eAcc.message}`);
  }
}

export async function updateAgentRow(id: string, input: Partial<AgentUi>): Promise<void> {
  const sb = supabase;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = input.name;
  if (input.bizType != null) patch.biz_type = input.bizType;
  if (input.contact != null) patch.contact = input.contact;
  if (input.phone != null) patch.phone = input.phone;
  if (input.level != null) patch.level_label = input.level.split(' ')[0];
  if (input.remark != null) patch.remark = input.remark;
  const { error } = await sb.from('agents').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * 检查代理是否有关联的文件或入库申请（需要 admin 密码确认删除）。
 */
export async function agentHasFilesOrApplications(id: string): Promise<boolean> {
  const sb = supabase;
  const fileTable: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data: files } = await sb.from(fileTable).select('id').eq('ref_type', 'agent').eq('ref_id', id);
  if (files && Array.isArray(files) && files.length > 0) return true;
  // 也检查是否有关联的入库申请文件
  const { data: appFiles } = await sb.from(fileTable).select('id').eq('ref_type', 'agent_application').eq('ref_id', id);
  if (appFiles && Array.isArray(appFiles) && appFiles.length > 0) return true;
  return false;
}

/**
 * 级联删除代理：先删除关联的 contracts、bids、projects 引用、files、app_users，
 * 最后删除 agents 记录本身。
 */
export async function deleteAgentRow(id: string): Promise<void> {
  const sb = supabase;

  // 1. 删除关联的 contracts（agent_id 引用了 agents.id，ON DELETE RESTRICT）
  await sb.from('contracts').delete().eq('agent_id', id);

  // 2. 删除关联的 bids（agent_id 引用了 agents.id，ON DELETE CASCADE，但 mock 模式无级联）
  await sb.from('bids').delete().eq('agent_id', id);

  // 3. 清除 projects 中的 agent_id / awarded_agent_id 引用（ON DELETE SET NULL）
  const { data: relatedProjects } = await sb.from('projects').select('id, agent_id, awarded_agent_id').or(`agent_id.eq.${id},awarded_agent_id.eq.${id}`);
  if (relatedProjects && Array.isArray(relatedProjects)) {
    for (const p of relatedProjects) {
      const patch: Record<string, unknown> = {};
      if ((p as Record<string, unknown>).agent_id === id) patch.agent_id = null;
      if ((p as Record<string, unknown>).awarded_agent_id === id) patch.awarded_agent_id = null;
      if (Object.keys(patch).length > 0) {
        await sb.from('projects').update(patch).eq('id', (p as Record<string, unknown>).id as string);
      }
    }
  }

  // 4. 删除关联的文件记录
  const fileTable: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  await sb.from(fileTable).delete().eq('ref_type', 'agent').eq('ref_id', id);

  // 5. 删除关联的 app_users / profiles（agent_id 引用）
  await sb.from(writeTable('app_users')).delete().eq('agent_id', id);

  // 6. 最后删除 agents 记录本身
  const { error } = await sb.from('agents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Agent Applications (audit queue) ─────────────────────────────────────────

export type AgentApplicationUi = {
  id: string;
  name: string;
  bizType: string;
  applyDate: string;
  contact: string;
  phone: string;
  location: string;
  status: AgentApplicationRow['status'];
  loginAccount: string;
  regPassword: string;
  creditCode: string;
  docNames: string[];
};

function mapApplicationUi(row: AgentApplicationRow): AgentApplicationUi {
  let docs: string[] = [];
  try { docs = JSON.parse(row.doc_names ?? '[]'); } catch { /* ignore */ }
  return {
    id: row.id,
    name: row.name,
    bizType: row.biz_type,
    applyDate: row.apply_date,
    contact: row.contact,
    phone: row.phone,
    location: row.location,
    status: row.status,
    loginAccount: row.login_account ?? row.phone ?? '',
    regPassword: row.reg_password ?? '123456',
    creditCode: row.credit_code ?? '',
    docNames: docs,
  };
}

/**
 * 供应商自助注册提交申请。
 *
 * 支持两种模式：
 *   1. **分步上传**（推荐）：传 `applicationId`，文件已在 Step 2 通过 fileService 实时上传并关联到该 ID。
 *   2. **一次性上传**（兼容旧逻辑）：传 `files` 数组，提交时批量上传。
 */
export async function submitAgentApplication(input: {
  /** 预生成的申请 ID（文件已提前上传关联到此 ID） */
  applicationId?: string;
  name: string;
  bizType: string;
  contact: string;
  phone: string;
  location: string;
  loginAccount: string;
  regPassword: string;
  creditCode?: string;
  /** 兼容旧逻辑：一次性上传的文件列表 */
  files?: File[];
}): Promise<void> {
  const sb = supabase;
  const { data: exist } = await sb.from(writeTable('app_users')).select('id').eq('username', input.loginAccount);
  if (exist && Array.isArray(exist) && exist.length > 0) {
    throw new Error('该账号已注册，请直接登录');
  }
  const t = new Date().toISOString();
  const appId = input.applicationId || `app-${Date.now()}`;

  // 查已关联的文件名（分步上传模式下文件已存在）
  let docNamesList: string[] = [];
  if (input.applicationId) {
    const fileTable: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: existingFiles } = await sb
      .from(fileTable)
      .select('original_name')
      .eq('ref_type', 'agent_application')
      .eq('ref_id', appId);
    if (existingFiles && Array.isArray(existingFiles)) {
      docNamesList = existingFiles.map((f: Record<string, unknown>) => String(f.original_name));
    }
  }

  const row: AgentApplicationRow = {
    id: appId,
    name: input.name,
    biz_type: input.bizType,
    apply_date: t.slice(0, 10),
    contact: input.contact,
    phone: input.phone,
    location: input.location || '待补充',
    status: 'pending',
    login_account: input.loginAccount,
    reg_password: input.regPassword,
    credit_code: input.creditCode || null,
    doc_names: docNamesList.length > 0
      ? JSON.stringify(docNamesList)
      : input.files?.length
      ? JSON.stringify(input.files.map(f => f.name))
      : null,
    created_at: t,
    updated_at: t,
  };
  const { error } = await sb.from('agent_applications').insert(row as unknown as Record<string, unknown>);
  if (error) throw new Error(error.message);

  // 兼容旧逻辑：一次性上传
  if (input.files && input.files.length > 0 && !input.applicationId) {
    for (const file of input.files) {
      await uploadFile({
        file,
        bucket: 'registrations',
        uploaderId: row.id,
        uploaderPortal: 'agent',
        refType: 'agent_application',
        refId: row.id,
      });
    }
  }
}

export async function fetchPendingApplicationsUi(): Promise<AgentApplicationUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('agent_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as AgentApplicationRow[]).map(mapApplicationUi);
}

export async function updateApplicationRow(
  id: string,
  patch: Partial<Pick<AgentApplicationUi, 'name' | 'bizType' | 'contact' | 'phone' | 'location'>>
): Promise<void> {
  const sb = supabase;
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) dbPatch.name = patch.name;
  if (patch.bizType != null) dbPatch.biz_type = patch.bizType;
  if (patch.contact != null) dbPatch.contact = patch.contact;
  if (patch.phone != null) dbPatch.phone = patch.phone;
  if (patch.location != null) dbPatch.location = patch.location;
  const { error } = await sb.from('agent_applications').update(dbPatch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteApplicationRow(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('agent_applications').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** 审批通过：将 application 状态改为 approved，并在 agents 表新增一条记录 */
export async function approveApplication(
  app: AgentApplicationUi,
  levelLabel: string
): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();
  // 1. Insert into agents
  const agentRow: AgentRow = {
    id: `AG-${Date.now()}`,
    name: app.name,
    level_label: levelLabel.split(' ')[0],
    code: `NEW-${Math.floor(Math.random() * 1000)}`,
    location: app.location,
    contact: app.contact,
    phone: app.phone,
    biz_type: app.bizType,
    status: '已审核',
    remark: '',
    created_at: t,
    updated_at: t,
  };
  const { error: e1 } = await sb.from('agents').insert(agentRow as unknown as Record<string, unknown>);
  if (e1) throw new Error(e1.message);
  
  // 1.5. Automatic Account Generation
  const rawUsername = (app.loginAccount || app.phone || app.contact || '').trim();
  const finalUsername = rawUsername || `agent-${Date.now()}`;
  const userRow: Record<string, unknown> = {
    id: `agt-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    username: finalUsername,
    password: app.regPassword || '123456',
    role: 'agent',
    portal: 'agent',
    display_name: app.name,
    department: null,
    agent_id: agentRow.id,
    status: 'active',
    created_at: t,
    updated_at: t,
  };
  const { error: eAcc } = await sb.from(writeTable('app_users')).insert(mapUserRowForWrite(userRow));
  if (eAcc) {
    console.error('[AgentService] 审批通过但账号创建失败:', eAcc);
    throw new Error(eAcc.message);
  }

  // 2. Update application status
  const { error: e2 } = await sb
    .from('agent_applications')
    .update({ status: 'approved', updated_at: t })
    .eq('id', app.id);
  if (e2) throw new Error(e2.message);

  // 3. Migrate files from agent_application to the new agent
  await sb
    .from(writeTable('files'))
    .update({ ref_type: 'agent', ref_id: agentRow.id, updated_at: t })
    .eq('ref_type', 'agent_application')
    .eq('ref_id', app.id);
}

/** 驳回申请 */
export async function rejectApplication(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb
    .from('agent_applications')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
