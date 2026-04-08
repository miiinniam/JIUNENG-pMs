import { supabase } from '../lib/supabase';
import type { AgentRow, BidRow, ContractRow, TenderRow } from '../database/schema';

// ── UI Types ────────────────────────────────────────────────────────────────

export interface ContractUi {
  id: string;
  contractType: ContractRow['contract_type'];
  tenderId: string;
  bidId: string;
  projectId: string | null;
  agentId: string;
  parentContractId: string | null;
  status: ContractRow['status'];
  tenderSnapshot: TenderRow;
  bidSnapshot: BidRow;
  agentSnapshot: AgentRow;
  platformSignee: string | null;
  agentSignee: string | null;
  agentSignedAt: string | null;
  platformConfirmedAt: string | null;
  createdAt: string;
}

function parseSnapshot<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

function mapContractUi(row: ContractRow): ContractUi {
  return {
    id: row.id,
    contractType: row.contract_type,
    tenderId: row.tender_id,
    bidId: row.bid_id,
    projectId: row.project_id,
    agentId: row.agent_id,
    parentContractId: row.parent_contract_id,
    status: row.status,
    tenderSnapshot: parseSnapshot<TenderRow>(row.tender_snapshot, {} as TenderRow),
    bidSnapshot: parseSnapshot<BidRow>(row.bid_snapshot, {} as BidRow),
    agentSnapshot: parseSnapshot<AgentRow>(row.agent_snapshot, {} as AgentRow),
    platformSignee: row.platform_signee,
    agentSignee: row.agent_signee,
    agentSignedAt: row.agent_signed_at,
    platformConfirmedAt: row.platform_confirmed_at,
    createdAt: row.created_at,
  };
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function fetchContractById(contractId: string): Promise<ContractUi | null> {
  const sb = supabase;
  const { data, error } = await sb.from('contracts').select('*').eq('id', contractId).single();
  if (error || !data) return null;
  return mapContractUi(data as ContractRow);
}

export async function fetchContractsForAgent(agentId: string): Promise<ContractUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ContractRow[]).map(mapContractUi);
}

export async function fetchContractsForTender(tenderId: string): Promise<ContractUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .eq('tender_id', tenderId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ContractRow[]).map(mapContractUi);
}

export async function fetchAllContracts(): Promise<ContractUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ContractRow[]).map(mapContractUi);
}

export async function fetchContractsPendingPlatformConfirm(): Promise<ContractUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .eq('status', 'pending_platform_confirm')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ContractRow[]).map(mapContractUi);
}

export async function fetchContractByBidId(bidId: string): Promise<ContractUi | null> {
  const sb = supabase;
  const { data, error } = await sb
    .from('contracts')
    .select('*')
    .eq('bid_id', bidId)
    .eq('contract_type', 'award');
  if (error || !data || !(data as ContractRow[]).length) return null;
  return mapContractUi((data as ContractRow[])[0]);
}

// ── Mutations ───────────────────────────────────────────────────────────────

/** 代理签署中标合同 → 自动生成执行合同 */
export async function agentConfirmAwardContract(
  contractId: string,
  signee: string
): Promise<{ executionContractId: string }> {
  const sb = supabase;
  const t = new Date().toISOString();

  // 1. 更新中标合同状态
  const { error: e1 } = await sb.from('contracts').update({
    status: 'agent_signed',
    agent_signee: signee,
    agent_signed_at: t,
    updated_at: t,
  }).eq('id', contractId);
  if (e1) throw new Error(e1.message);

  // 2. 获取中标合同数据
  const { data: contractData } = await sb.from('contracts').select('*').eq('id', contractId).single();
  if (!contractData) throw new Error('合同不存在');
  const award = contractData as ContractRow;

  // 3. 自动生成执行合同
  const execContract: Record<string, unknown> = {
    id: `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    contract_type: 'execution',
    tender_id: award.tender_id,
    bid_id: award.bid_id,
    project_id: award.project_id,
    agent_id: award.agent_id,
    parent_contract_id: contractId,
    status: 'pending_platform_confirm',
    tender_snapshot: award.tender_snapshot,
    bid_snapshot: award.bid_snapshot,
    agent_snapshot: award.agent_snapshot,
    platform_signee: null,
    agent_signee: signee,
    agent_signed_at: t,
    platform_confirmed_at: null,
    created_at: t,
    updated_at: t,
  };

  const { error: e2 } = await sb.from('contracts').insert(execContract);
  if (e2) throw new Error(e2.message);

  return { executionContractId: execContract.id as string };
}

/** 平台确认执行合同 → 项目状态变为 executing */
export async function platformConfirmExecutionContract(
  contractId: string,
  signee: string
): Promise<void> {
  const sb = supabase;
  const t = new Date().toISOString();

  // 1. 更新执行合同状态
  const { error: e1 } = await sb.from('contracts').update({
    status: 'active',
    platform_signee: signee,
    platform_confirmed_at: t,
    updated_at: t,
  }).eq('id', contractId);
  if (e1) throw new Error(e1.message);

  // 2. 获取合同信息
  const { data: contractData } = await sb.from('contracts').select('*').eq('id', contractId).single();
  if (!contractData) throw new Error('合同不存在');
  const contract = contractData as ContractRow;

  // 3. 更新项目状态为 executing
  if (contract.project_id) {
    const { error: e2 } = await sb.from('projects').update({
      status: 'executing',
      updated_at: t,
    }).eq('id', contract.project_id);
    if (e2) throw new Error(e2.message);
  }
}
