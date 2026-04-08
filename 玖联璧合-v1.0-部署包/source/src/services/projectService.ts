import { supabase } from '../lib/supabase';
import type { CustomerRow, PotentialProjectRow, ProjectRow } from '../database/schema';

export interface FormalProjectUi {
  id: string;
  name: string;
  client: string;
  origin: string;
  destination: string;
  cargoType: string;
  route: string;
  progress: number;
  status: string;
  manager: string;
  /** 数据来源：manual | award | potential_convert */
  source?: string;
  /** 在途跟踪字段（executing 项目才有） */
  currentLocation?: string;
  eta?: string;
  weight?: string;
  priorityLabel?: string;
  transportType?: string;
}

export interface PotentialProjectUi {
  id: string;
  name: string;
  client: string;
  type: string;
  amount: string;
  status: string;
  lastUpdate: string;
  expectedDate: string;
}

function statusLabel(s: ProjectRow['status']): string {
  switch (s) {
    case 'executing':
      return '执行中';
    case 'preparing':
      return '待合同确认';
    case 'completed':
      return '已完成';
    case 'suspended':
      return '已暂停';
    default:
      return s;
  }
}

function mapProject(p: ProjectRow): FormalProjectUi {
  return {
    id: p.id,
    name: p.name,
    client: p.client_name ?? p.client_id ?? '—',
    origin: p.origin,
    destination: p.destination,
    cargoType: p.cargo_type,
    route: p.route,
    progress: p.progress,
    status: statusLabel(p.status),
    manager: p.manager,
    source: p.source ?? 'manual',
    currentLocation: p.current_location ?? undefined,
    eta: p.eta ?? undefined,
    weight: p.weight ?? undefined,
    priorityLabel: p.priority_label ?? undefined,
    transportType: p.transport_type ?? undefined,
  };
}

/** 执行项目列表（含定标自动生成 + 手工录入） */
export async function fetchFormalProjectsUi(): Promise<FormalProjectUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ProjectRow[]).map(mapProject);
}

export async function fetchPotentialProjectsUi(): Promise<PotentialProjectUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('potential_projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as PotentialProjectRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    client: p.client,
    type: p.type,
    amount: p.amount,
    status: p.status,
    lastUpdate: p.last_update,
    expectedDate: p.expected_date,
  }));
}

export async function upsertPotentialRow(row: PotentialProjectUi): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();
  const dbRow: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    client: row.client,
    type: row.type,
    amount: row.amount,
    status: row.status,
    last_update: row.lastUpdate,
    expected_date: row.expectedDate,
    updated_at: t,
  };
  const { data: existingRows } = await sb
    .from('potential_projects')
    .select('id')
    .eq('id', row.id);
  const exists =
    Array.isArray(existingRows) && (existingRows as { id: string }[]).length > 0;
  if (exists) {
    const { error } = await sb
      .from('potential_projects')
      .update(dbRow)
      .eq('id', row.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb
      .from('potential_projects')
      .insert({ ...dbRow, created_at: t });
    if (error) throw new Error(error.message);
  }
}

export async function deletePotentialRow(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('potential_projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

function parseStatusToRow(s: string): ProjectRow['status'] {
  if (s === '准备中' || s === '待合同确认' || s === 'preparing') return 'preparing';
  if (s === '执行中' || s === '运输中' || s === 'executing') return 'executing';
  if (s === '已完成') return 'completed';
  return 'preparing';
}

export async function upsertFormalProjectRow(p: FormalProjectUi): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();
  const base: Record<string, unknown> = {
    name: p.name,
    client_name: p.client,
    origin: p.origin,
    destination: p.destination,
    cargo_type: p.cargoType,
    route: p.route,
    progress: p.progress,
    status: parseStatusToRow(p.status),
    manager: p.manager,
    updated_at: t,
  };
  const { data: existingRows } = await sb
    .from('projects')
    .select('id')
    .eq('id', p.id);
  const exists =
    Array.isArray(existingRows) && (existingRows as { id: string }[]).length > 0;
  if (exists) {
    const { error } = await sb.from('projects').update(base).eq('id', p.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from('projects').insert({
      id: p.id,
      ...base,
      tender_id: null,
      source_tender_id: null,
      winning_bid_id: null,
      agent_id: null,
      awarded_agent_id: null,
      client_id: null,
      amount_display: null,
      source: 'manual',
      source_potential_id: null,
      created_at: t,
    });
    if (error) throw new Error(error.message);
  }
}

/**
 * 检查项目的删除权限等级：
 * - 'blocked': 已定标项目，不可删除
 * - 'admin_required': 招标项目且有代理投标，需 admin 密码
 * - 'allowed': 可直接删除
 */
export async function checkProjectDeletePermission(id: string): Promise<{
  level: 'blocked' | 'admin_required' | 'allowed';
  reason?: string;
}> {
  const sb = supabase;
  const { data: rows } = await sb.from('projects').select('*').eq('id', id);
  const project = (rows as ProjectRow[] | null)?.[0];
  if (!project) return { level: 'allowed' };

  // 已定标的项目（source=award 且有 winning_bid_id）不能删除
  if (project.source === 'award' && project.winning_bid_id) {
    return { level: 'blocked', reason: '该项目已定标（中标履约），不可删除。如需处理请先取消关联的招标定标。' };
  }

  // 有 tender_id 的项目，检查是否有代理投标
  if (project.tender_id || project.source_tender_id) {
    const tenderId = project.tender_id || project.source_tender_id;
    const { data: bids } = await sb.from('bids').select('id').eq('tender_id', tenderId!);
    if (bids && Array.isArray(bids) && bids.length > 0) {
      return {
        level: 'admin_required',
        reason: `该项目关联的招标已有 ${bids.length} 条代理投标记录，删除需要管理员密码确认。`,
      };
    }
  }

  return { level: 'allowed' };
}

export async function deleteFormalProjectRow(id: string): Promise<void> {
  const sb = supabase;

  // 删除关联的 contracts
  await sb.from('contracts').delete().eq('project_id', id);

  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Dashboard Aggregations ────────────────────────────────────────────────────

export interface DashboardStats {
  activeProjectCount: number;
  customerCount: number;
  alertCount: number;
  pendingApplicationCount: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const sb = supabase;
  const [prjRes, cusRes, altRes, appRes] = await Promise.all([
    sb.from('projects').select('*'),
    sb.from('customers').select('*'),
    sb.from('project_alerts').select('*'),
    sb.from('agent_applications').select('*').eq('status', 'pending'),
  ]);
  const projects = (prjRes.data as ProjectRow[] | null) ?? [];
  return {
    activeProjectCount: projects.filter((p) => p.status === 'executing' || p.status === 'preparing').length,
    customerCount: (cusRes.data as unknown[] | null)?.length ?? 0,
    alertCount: (altRes.data as unknown[] | null)?.length ?? 0,
    pendingApplicationCount: (appRes.data as unknown[] | null)?.length ?? 0,
  };
}

export async function fetchRecentProjectsUi(): Promise<FormalProjectUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as ProjectRow[])
    .filter((p) => p.current_location !== null)
    .slice(0, 4)
    .map(mapProject);
}

// ── Project Tracking (Projects.tsx) ──────────────────────────────────────────

export interface TrackingProjectUi {
  id: string;
  name: string;
  status: string;
  progress: number;
  origin: string;
  destination: string;
  currentLocation: string;
  cargoType: string;
  weight: string;
  eta: string;
  priorityLabel: string;
}

function trackingStatusLabel(p: ProjectRow): string {
  if (p.progress === 100) return '已到达';
  if (p.status === 'preparing') return '待发货';
  // derive from current_location vs destination
  if (p.current_location && p.current_location !== p.destination) return '运输中';
  return statusLabel(p.status);
}

function mapTrackingUi(p: ProjectRow): TrackingProjectUi {
  return {
    id: p.id,
    name: p.name,
    status: trackingStatusLabel(p),
    progress: p.progress,
    origin: p.origin,
    destination: p.destination,
    currentLocation: p.current_location ?? p.origin,
    cargoType: p.cargo_type,
    weight: p.weight ?? '',
    eta: p.eta ?? '',
    priorityLabel: p.priority_label ?? 'Normal',
  };
}

export async function fetchTrackingProjectsUi(): Promise<TrackingProjectUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  // Only projects that have tracking data (current_location set) and are not completed
  return (data as ProjectRow[])
    .filter((p) => p.current_location !== null && p.status !== 'completed')
    .map(mapTrackingUi);
}

export async function updateTrackingProjectRow(
  id: string,
  patch: Partial<TrackingProjectUi>
): Promise<void> {
  const sb = supabase;
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) dbPatch.name = patch.name;
  if (patch.status != null) {
    if (patch.status === '待发货') dbPatch.status = 'preparing';
    else if (patch.status === '已到达') { dbPatch.status = 'executing'; dbPatch.progress = patch.progress ?? 100; }
    else dbPatch.status = 'executing';
  }
  if (patch.progress != null) dbPatch.progress = patch.progress;
  if (patch.origin != null) dbPatch.origin = patch.origin;
  if (patch.destination != null) dbPatch.destination = patch.destination;
  if (patch.currentLocation != null) dbPatch.current_location = patch.currentLocation;
  if (patch.cargoType != null) dbPatch.cargo_type = patch.cargoType;
  if (patch.weight != null) dbPatch.weight = patch.weight;
  if (patch.eta != null) dbPatch.eta = patch.eta;
  if (patch.priorityLabel != null) dbPatch.priority_label = patch.priorityLabel;
  const { error } = await sb.from('projects').update(dbPatch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTrackingProjectRow(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 激活在途跟踪（执行项目管理 → 在途跟踪的联通入口）────────────────────────

export interface ActivateTrackingInput {
  currentLocation: string;
  eta: string;
  weight: string;
  priorityLabel: 'Normal' | 'High';
  transportType?: string;
}

/**
 * 将一个"准备中/待合同确认"的执行项目激活为在途跟踪状态。
 * 写入 current_location、eta、weight、priority_label，并将 status 置为 executing。
 * 激活后该项目将自动出现在「在途跟踪」页面。
 */
export async function activateProjectTracking(
  id: string,
  input: ActivateTrackingInput
): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('projects').update({
    status: 'executing',
    current_location: input.currentLocation,
    eta: input.eta,
    weight: input.weight,
    priority_label: input.priorityLabel,
    transport_type: input.transportType ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Project History (ProjectHistory.tsx) ─────────────────────────────────────

export interface HistoryProjectUi {
  id: string;
  name: string;
  client: string;
  route: string;
  completedDate: string;
  cost: string;
  manager: string;
  rating: number;
  type: string;
}

function mapHistoryUi(p: ProjectRow): HistoryProjectUi {
  return {
    id: p.id,
    name: p.name,
    client: p.client_name ?? '—',
    route: p.route,
    completedDate: p.completed_date ?? '',
    cost: p.amount_display ?? '—',
    manager: p.manager,
    rating: p.rating ?? 5,
    type: p.transport_type ?? '陆运',
  };
}

export async function fetchHistoryProjectsUi(): Promise<HistoryProjectUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .eq('status', 'completed')
    .order('completed_date', { ascending: false });
  if (error || !data) return [];
  return (data as ProjectRow[]).map(mapHistoryUi);
}

export async function updateHistoryProjectRow(
  id: string,
  patch: Partial<Pick<HistoryProjectUi, 'name' | 'client' | 'route' | 'cost' | 'rating'>>
): Promise<void> {
  const sb = supabase;
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) dbPatch.name = patch.name;
  if (patch.client != null) dbPatch.client_name = patch.client;
  if (patch.route != null) dbPatch.route = patch.route;
  if (patch.cost != null) dbPatch.amount_display = patch.cost;
  if (patch.rating != null) dbPatch.rating = patch.rating;
  const { error } = await sb.from('projects').update(dbPatch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteHistoryProjectRow(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** 潜客转正：写 projects + 更新 potential_projects */
export async function convertPotentialToFormalRow(
  potentialId: string
): Promise<string> {
  const sb = supabase;
  const { data: rows } = await sb
    .from('potential_projects')
    .select('*')
    .eq('id', potentialId);
  const p = (rows as PotentialProjectRow[] | null)?.[0];
  if (!p) throw new Error('潜在项目不存在');
  const t = new Date().toISOString();
  const pid = `PRJ-${Date.now()}`;
  const { error: e2 } = await sb.from('projects').insert({
    id: pid,
    tender_id: null,
    source_tender_id: null,
    winning_bid_id: null,
    agent_id: null,
    awarded_agent_id: null,
    client_id: null,
    client_name: p.client,
    name: p.name,
    origin: '待确认',
    destination: '待确认',
    route: '待路线维护',
    cargo_type: p.type,
    progress: 0,
    status: 'preparing',
    manager: '待分配',
    amount_display: p.amount,
    source: 'potential_convert',
    source_potential_id: potentialId,
    created_at: t,
    updated_at: t,
  });
  if (e2) throw new Error(e2.message);
  const today = t.split('T')[0];
  const { error: e3 } = await sb
    .from('potential_projects')
    .update({
      status: '已成单',
      last_update: today,
      updated_at: t,
    })
    .eq('id', potentialId);
  if (e3) throw new Error(e3.message);
  return pid;
}

// ── Customer List (for dropdowns in project forms) ───────────────────────────

export interface CustomerOption {
  id: string;
  name: string;
  type: string;
  contact: string;
  phone: string;
  bizType: string;
}

/** 获取客户列表供下拉选择，数据源为 customers 表（与客户管理模块同源） */
export async function fetchCustomerOptions(): Promise<CustomerOption[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
  if (error || !data) return [];
  return (data as CustomerRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    contact: c.contact,
    phone: c.phone,
    bizType: c.biz_type,
  }));
}
