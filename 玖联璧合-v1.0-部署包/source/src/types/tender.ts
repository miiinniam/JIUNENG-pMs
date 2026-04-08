/** 与内部《招标中心 / 代理报价&项目比价》一致的投标记录 */
export interface TenderBidRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentLevel: string;
  price: number;
  currency: string;
  status: 'pending' | 'won' | 'lost';
  remarks: string;
  /** 承诺时效（展示用） */
  estimatedTime?: string;
  /** 修改次数 */
  editCount?: number;
}

export interface TenderCargoLine {
  id: number;
  name: string;
  spec: string;
  weight: string;
  volume: string;
  pkg: string;
}

/** 全局共享招标单（内部发布 ↔ 代理端可见） */
export interface SharedTender {
  id: string;
  title: string;
  route: string;
  deadline: string;
  /** ISO8601，编辑表单用 */
  deadline_at?: string;
  status: 'bidding' | 'evaluating' | 'awarded';
  cargo: string;
  bids: TenderBidRecord[];
  origin?: string;
  destination?: string;
  /** 定向邀标受邀代理商 ID（代理端 RLS 过滤依据） */
  invitedAgentIds: string[];
  /** 代理端投标页展示 */
  requirements?: string;
  bizType?: string;
  cargoList?: TenderCargoLine[];
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
  invitedAgentIds: string[];
}

export interface SubmitBidInput {
  price: number;
  currency: string;
  estimatedTime: string;
  remarks: string;
}
