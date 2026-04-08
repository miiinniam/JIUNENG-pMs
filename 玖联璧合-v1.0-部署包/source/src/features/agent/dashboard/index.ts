/**
 * features/agent/dashboard — 代理供应商端仪表盘功能入口
 * ─────────────────────────────────────────────────────────────────────────────
 * 导出代理端仪表盘相关数据获取函数（招标列表、我的报价、中标详情等）。
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {
  // 获取代理可见的招标列表（根据 invited_agent_ids 过滤）
  fetchTendersForAgentPool,
  // 获取定向招标单详情（代理端）
  fetchTenderVisibleToAgent,
  // 提交/更新报价
  insertBidRow,
  // 订阅数据变更
  subscribeTenders,
  // 查询代理自己的中标记录（accepted 状态的 bids）
  fetchAcceptedBidsForAgent,
} from '../../../services/tenderService';

export {
  // 获取中标详情（代理端中标后查看详情）
  fetchAwardById,
  revokeAward,
} from '../../../services/awardService';

export type { SharedTender, TenderBidRecord, SubmitBidInput } from '../../../lib/types';
export type { BidAwardDetailData } from '../../../lib/types';
