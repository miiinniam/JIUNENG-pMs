/**
 * 中标详情服务 — 读取 mockSupabase，与真实 Supabase 0 改动切换。
 * 原 HTTP 调用已移除；"撤销中标" 以 localStorage 计数模拟年度限额。
 */
import { supabase } from '../lib/supabase';
import type { BidRow, TenderRow } from '../database/schema';
import type {
  AwardCargoItem,
  BidAwardDetailData,
  RevokeAwardResponse,
} from '../types/bidAward';

// ── 年度撤销次数 ──────────────────────────────────────────────────────────────
const REVOKE_LS_KEY = 'jl_revoke_chances_v1';
const REVOKE_MAX = 3;

function getRevokeChances(bidId: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(REVOKE_LS_KEY) ?? '{}') as Record<string, number>;
    return map[bidId] ?? REVOKE_MAX;
  } catch {
    return REVOKE_MAX;
  }
}

function consumeRevokeChance(bidId: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(REVOKE_LS_KEY) ?? '{}') as Record<string, number>;
    const next = Math.max(0, (map[bidId] ?? REVOKE_MAX) - 1);
    map[bidId] = next;
    localStorage.setItem(REVOKE_LS_KEY, JSON.stringify(map));
    return next;
  } catch {
    return 0;
  }
}

function parseCargo(json: string | null): AwardCargoItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as AwardCargoItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ── fetchAwardById ────────────────────────────────────────────────────────────
/**
 * 以【中标 bid.id】为主键查询中标详情。
 * 上云后替换此函数体为 supabase.from('bids')... 即可，调用方无感知。
 */
export async function fetchAwardById(bidId: string): Promise<BidAwardDetailData> {
  const sb = supabase;

  const { data: bidData, error: bidErr } = await sb
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .single();

  if (bidErr || !bidData) {
    throw new Error(bidErr?.message ?? '中标记录不存在');
  }

  const bid = bidData as BidRow;

  if (bid.status !== 'accepted') {
    throw new Error('该报价单尚未中标');
  }

  const { data: tenderData, error: tenderErr } = await sb
    .from('tenders')
    .select('*')
    .eq('id', bid.tender_id)
    .single();

  if (tenderErr || !tenderData) {
    throw new Error(tenderErr?.message ?? '关联招标单不存在');
  }

  const tender = tenderData as TenderRow;

  return {
    id: bid.id,
    tenderId: bid.tender_id,
    title: tender.title,
    awardDate: bid.updated_at,
    deadline: tender.deadline_at,
    status: 'awarded',
    revokeChancesRemaining: getRevokeChances(bidId),
    tenderInfo: {
      route: tender.route_label,
      type: tender.biz_type ?? '跨境干线',
      cargoList: parseCargo(tender.cargo_json),
      requirements: tender.requirements ?? '',
    },
    bidInfo: {
      price: String(bid.price),
      currency: bid.currency,
      estimatedTime: bid.estimated_time ?? '',
      remarks: bid.remarks ?? '',
    },
  };
}

// ── revokeAward ───────────────────────────────────────────────────────────────
/**
 * 代理端申请撤销中标资格（扣减年度限额，Mock 不真正回滚事务）。
 * 上云后替换为调用 Edge Function / RPC。
 */
export async function revokeAward(bidId: string): Promise<RevokeAwardResponse> {
  const remaining = getRevokeChances(bidId);
  if (remaining <= 0) {
    throw new Error('本年度撤销次数已用完');
  }
  const next = consumeRevokeChance(bidId);
  return {
    revokeChancesRemaining: next,
    message: '撤销申请已提交，待内部审核处理。',
  };
}
