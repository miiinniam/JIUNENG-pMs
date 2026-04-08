import { supabase, subscribeToDb, isMockMode } from '../lib/supabase';
import type { AgentRow, BidRow, TenderRow } from '../database/schema';
import type {
  SharedTender,
  SubmitBidInput,
  TenderBidRecord,
  TenderCargoLine,
} from '../types/tender';

export type { SharedTender as TenderView } from '../types/tender';

function formatDeadline(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

function mapBidUi(b: BidRow, agents: AgentRow[]): TenderBidRecord {
  const ag = agents.find((a) => a.id === b.agent_id);
  return {
    id: b.id,
    agentId: b.agent_id,
    agentName: ag?.name ?? b.agent_id,
    agentLevel: ag?.level_label ?? '',
    price: b.price,
    currency: b.currency,
    status:
      b.status === 'accepted'
        ? 'won'
        : b.status === 'rejected'
          ? 'lost'
          : 'pending',
    remarks: b.remarks ?? '',
    estimatedTime: b.estimated_time ?? undefined,
    editCount: b.edit_count ?? 0,
  };
}

function parseCargo(json: string | null): TenderCargoLine[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as TenderCargoLine[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 招标中心 / 代理端共用的聚合视图（由 tenders + bids + agents 派生） */
export async function fetchTendersWithBidsForUi(): Promise<SharedTender[]> {
  const sb = supabase;
  const { data: tenders, error: e1 } = await sb
    .from('tenders')
    .select('*')
    .order('created_at', { ascending: false });
  const { data: bids, error: e2 } = await sb.from('bids').select('*');
  const { data: agents, error: e3 } = await sb.from('agents').select('*');
  if (e1 || e2 || e3) {
    console.error(e1, e2, e3);
    return [];
  }
  const trows = (tenders ?? []) as TenderRow[];
  const brows = (bids ?? []) as BidRow[];
  const ags = (agents ?? []) as AgentRow[];

  return trows.map((t) => ({
    id: t.id,
    title: t.title,
    route: t.route_label,
    origin: t.origin,
    destination: t.destination,
    deadline: formatDeadline(t.deadline_at),
    deadline_at: t.deadline_at,
    status: t.status,
    cargo: t.cargo_summary,
    invitedAgentIds: t.invited_agent_ids ?? [],
    requirements: t.requirements ?? undefined,
    bizType: t.biz_type ?? undefined,
    cargoList: parseCargo(t.cargo_json),
    bids: brows.filter((b) => b.tender_id === t.id).map((b) => mapBidUi(b, ags)),
  }));
}

/** 已审核代理商，供内部端定向邀标勾选 */
export async function fetchApprovedAgentsForInvite(): Promise<AgentRow[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('agents')
    .select('*')
    .eq('status', '已审核')
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data as AgentRow[];
}

/**
 * 代理端招标池：仅返回 invited_agent_ids 包含该 agent 的标单（模拟 RLS）。
 * 不拉全表再在内存 filter，而是使用链式 .contains。
 */
export async function fetchTendersForAgentPool(
  agentId: string | undefined
): Promise<SharedTender[]> {
  if (!agentId) return [];
  const sb = supabase;
  const { data: tenders, error: e1 } = await sb
    .from('tenders')
    .select('*')
    .contains('invited_agent_ids', [agentId])
    .order('created_at', { ascending: false });
  const { data: bids, error: e2 } = await sb.from('bids').select('*');
  const { data: agents, error: e3 } = await sb.from('agents').select('*');
  if (e1 || e2 || e3) {
    console.error(e1, e2, e3);
    return [];
  }
  const trows = (tenders ?? []) as TenderRow[];
  const brows = (bids ?? []) as BidRow[];
  const ags = (agents ?? []) as AgentRow[];

  return trows.map((t) => ({
    id: t.id,
    title: t.title,
    route: t.route_label,
    origin: t.origin,
    destination: t.destination,
    deadline: formatDeadline(t.deadline_at),
    deadline_at: t.deadline_at,
    status: t.status,
    cargo: t.cargo_summary,
    invitedAgentIds: t.invited_agent_ids ?? [],
    requirements: t.requirements ?? undefined,
    bizType: t.biz_type ?? undefined,
    cargoList: parseCargo(t.cargo_json),
    bids: brows.filter((b) => b.tender_id === t.id).map((b) => mapBidUi(b, ags)),
  }));
}

export async function fetchTenderVisibleToAgent(
  tenderId: string,
  agentId: string | undefined
): Promise<SharedTender | null> {
  const list = await fetchTendersForAgentPool(agentId);
  return list.find((t) => t.id === tenderId) ?? null;
}

export interface PublishTenderInput {
  title: string;
  origin: string;
  destination: string;
  deadline: string;
  cargoSummary: string;
  cargoList?: TenderCargoLine[];
  requirements?: string;
  bizType?: string;
  /** 至少选一家受邀代理 */
  invitedAgentIds: string[];
}

export async function insertTender(input: PublishTenderInput): Promise<void> {
  if (!input.invitedAgentIds?.length) {
    throw new Error('请至少选择一家受邀代理商（定向邀标）');
  }
  if (!input.deadline || !input.deadline.trim()) {
    throw new Error('请选择截标时间');
  }
  const sb = supabase;
  const route = `${input.origin || '未知'} → ${input.destination || '未知'}`;
  const raw = input.deadline.trim();
  const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) {
    throw new Error('截标时间格式无效，请重新选择');
  }
  const deadlineIso = d.toISOString();
  const tenderId = `TND-${Date.now()}`;
  const row: Record<string, unknown> = {
    id: tenderId,
    title: input.title || '未命名招标',
    origin: input.origin,
    destination: input.destination,
    route_label: route,
    deadline_at: deadlineIso,
    status: 'bidding',
    cargo_summary: input.cargoSummary,
    requirements: input.requirements ?? '',
    biz_type: input.bizType ?? '跨境干线',
    cargo_json: JSON.stringify(input.cargoList ?? []),
    invited_agent_ids: [...new Set(input.invitedAgentIds)],
  };
  const { error } = await sb.from('tenders').insert(row);
  if (error) throw new Error(error.message);
}

export async function updateTenderRow(
  id: string,
  patch: {
    title?: string;
    route?: string;
    deadline?: string;
    cargo?: string;
    origin?: string;
    destination?: string;
    cargoList?: TenderCargoLine[];
    requirements?: string;
    bizType?: string;
    invitedAgentIds?: string[];
  }
): Promise<void> {
  const sb = supabase;
  let deadlineIso: string | undefined;
  if (patch.deadline?.trim()) {
    const raw = patch.deadline.trim();
    const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) {
      throw new Error('截标时间格式无效，请重新选择');
    }
    deadlineIso = d.toISOString();
  }
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title != null) updatePayload.title = patch.title;
  if (patch.route != null) updatePayload.route_label = patch.route;
  if (patch.origin != null) updatePayload.origin = patch.origin;
  if (patch.destination != null) updatePayload.destination = patch.destination;
  if (deadlineIso) updatePayload.deadline_at = deadlineIso;
  if (patch.cargo != null) updatePayload.cargo_summary = patch.cargo;
  if (patch.requirements != null) updatePayload.requirements = patch.requirements;
  if (patch.bizType != null) updatePayload.biz_type = patch.bizType;
  if (patch.cargoList) updatePayload.cargo_json = JSON.stringify(patch.cargoList);
  if (patch.invitedAgentIds != null) {
    if (!patch.invitedAgentIds.length) {
      throw new Error('受邀代理商不能为空');
    }
    updatePayload.invited_agent_ids = [...new Set(patch.invitedAgentIds)];
  }
  const { error } = await sb.from('tenders').update(updatePayload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTenderCascade(id: string): Promise<void> {
  const sb = supabase;
  const { data: related } = await sb.from('bids').select('id').eq('tender_id', id);
  const ids = (related as { id: string }[] | null)?.map((r) => r.id) ?? [];
  for (const bidId of ids) {
    const { error } = await sb.from('bids').delete().eq('id', bidId);
    if (error) throw new Error(error.message);
  }
  const { error } = await sb.from('tenders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertBidRow(
  tenderId: string,
  agentId: string,
  bid: SubmitBidInput
): Promise<void> {
  const sb = supabase;
  const { data: trows } = await sb
    .from('tenders')
    .select('*')
    .eq('id', tenderId);
  const t = (trows as TenderRow[] | null)?.[0];
  if (!t) throw new Error('招标单不存在');
  const invited = t.invited_agent_ids ?? [];
  if (!invited.includes(agentId)) {
    throw new Error('您未被邀请参与该招标，无法报价');
  }
  const deadlineMs = new Date(t.deadline_at).getTime();
  if (Number.isFinite(deadlineMs) && Date.now() > deadlineMs) {
    throw new Error('报价已截止，无法提交');
  }
  const st = t.status;
  if (st === 'awarded') throw new Error('该招标已决标，无法投标');
  const { data: existing } = await sb
    .from('bids')
    .select('*')
    .eq('tender_id', tenderId)
    .eq('agent_id', agentId);
  const rows = (existing as BidRow[] | null) ?? [];
  if (rows.length > 0) {
    const existingBid = rows[0];
    const currentEditCount = existingBid.edit_count ?? 0;
    if (currentEditCount >= 2) {
      throw new Error('您已达到最大修改次数限制（2次），无法再次修改报价');
    }
    const { error } = await sb.from('bids').update({
      price: bid.price,
      currency: bid.currency,
      remarks: bid.remarks,
      estimated_time: bid.estimatedTime,
      edit_count: currentEditCount + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', existingBid.id);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await sb.from('bids').insert({
    id: `bid-${Date.now()}`,
    tender_id: tenderId,
    agent_id: agentId,
    price: bid.price,
    currency: bid.currency,
    status: 'pending',
    remarks: bid.remarks,
    estimated_time: bid.estimatedTime,
    edit_count: 0,
  });
  if (error) throw new Error(error.message);
}

/** 定标：mock 模式走 RPC；real 模式用客户端多步操作（避免依赖数据库函数） */
export async function awardTenderRpc(
  tenderId: string,
  winningBidId: string
): Promise<{ projectId: string; contractId: string }> {
  const sb = supabase;

  /* ── mock 模式：沿用 RPC（mock 客户端已实现） ── */
  if (isMockMode) {
    const { data, error } = await sb.rpc('award_tender', {
      p_tender_id: tenderId,
      p_winning_bid_id: winningBidId,
    });
    if (error) throw new Error(error.message);
    const result = data as { project_id?: string; contract_id?: string } | null;
    if (!result?.project_id) throw new Error('定标未返回项目 ID');
    return { projectId: result.project_id, contractId: result.contract_id ?? '' };
  }

  /* ── real 模式：客户端直接操作 ── */
  // 1. 查询招标单
  const { data: tender, error: e1 } = await sb.from('tenders').select('*').eq('id', tenderId).single();
  if (e1 || !tender) throw new Error('招标单不存在: ' + (e1?.message ?? tenderId));
  if (tender.status === 'awarded') throw new Error('该招标已定标');

  // 2. 查询中标报价
  const { data: bid, error: e2 } = await sb.from('bids').select('*').eq('id', winningBidId).eq('tender_id', tenderId).single();
  if (e2 || !bid) throw new Error('报价不存在: ' + (e2?.message ?? winningBidId));

  // 3. 查询代理商
  const { data: agent } = await sb.from('agents').select('*').eq('id', bid.agent_id).single();

  // 4. 更新招标状态 → awarded
  const { error: e3 } = await sb.from('tenders').update({ status: 'awarded', updated_at: new Date().toISOString() }).eq('id', tenderId);
  if (e3) throw new Error('更新招标状态失败: ' + e3.message);

  // 5. 中标报价 accepted，其余 rejected
  const { error: e4 } = await sb.from('bids').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', winningBidId);
  if (e4) throw new Error('更新中标报价失败: ' + e4.message);
  const { error: e5 } = await sb.from('bids').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('tender_id', tenderId).neq('id', winningBidId);
  if (e5) console.warn('更新落选报价失败:', e5.message);

  // 6. 生成项目
  const pid = `PRJ-${Date.now()}`;
  const { error: e6 } = await sb.from('projects').insert({
    id: pid,
    tender_id: tenderId,
    source_tender_id: tenderId,
    winning_bid_id: winningBidId,
    agent_id: bid.agent_id,
    awarded_agent_id: bid.agent_id,
    name: `${tender.title} · 履约`,
    origin: tender.origin,
    destination: tender.destination,
    route: tender.route_label,
    cargo_type: tender.biz_type ?? (tender.cargo_summary || '').slice(0, 32),
    progress: 0,
    status: 'preparing',
    manager: agent ? `承运 ${agent.name}` : '待分配',
    amount_display: `${bid.currency} ${bid.price}`,
    source: 'award',
  });
  if (e6) throw new Error('创建项目失败: ' + e6.message);

  // 7. 生成中标合同
  const cid = `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error: e7 } = await sb.from('contracts').insert({
    id: cid,
    contract_type: 'award',
    tender_id: tenderId,
    bid_id: winningBidId,
    project_id: pid,
    agent_id: bid.agent_id,
    status: 'pending_agent_sign',
    tender_snapshot: tender,
    bid_snapshot: bid,
    agent_snapshot: agent ?? {},
  });
  if (e7) throw new Error('创建合同失败: ' + e7.message);

  return { projectId: pid, contractId: cid };
}

export function subscribeTenders(cb: () => void): () => void {
  return subscribeToDb(cb);
}

/**
 * 链式 API 示例（与 Supabase PostgREST embed 一致）：
 * `await mockSupabase.from('bids').select('*, agents(*)').eq('tender_id', id)`
 */
export function queryBidsWithAgentsForTender(tenderId: string) {
  return supabase
    .from('bids')
    .select('*, agents(*)')
    .eq('tender_id', tenderId);
}

/** @deprecated 使用 fetchTendersWithBidsForUi */
export async function getTendersSnapshot(): Promise<SharedTender[]> {
  return fetchTendersWithBidsForUi();
}

/**
 * 返回当前代理商所有已中标的 bid，附带对应 tender 信息。
 * 用于代理端「中标通知」列表。
 */
export async function fetchAcceptedBidsForAgent(
  agentId: string
): Promise<Array<{ bid: BidRow; tender: TenderRow }>> {
  const sb = supabase;
  const { data: bids, error: e1 } = await sb
    .from('bids')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'accepted');
  if (e1 || !bids) return [];

  const { data: tenders, error: e2 } = await sb.from('tenders').select('*');
  if (e2 || !tenders) return [];

  const tenderMap = new Map((tenders as TenderRow[]).map((t) => [t.id, t]));

  return (bids as BidRow[])
    .map((b) => {
      const tender = tenderMap.get(b.tender_id);
      if (!tender) return null;
      return { bid: b, tender };
    })
    .filter((x): x is { bid: BidRow; tender: TenderRow } => x !== null);
}
