/**
 * types.ts — 统一类型入口
 * ─────────────────────────────────────────────────────────────────────────────
 * 所有业务代码的类型从本文件导入，避免散落在多个目录中。
 *
 * 来源汇总：
 *   - src/database/schema.ts  → 数据库行类型（Row types）
 *   - src/types/auth.ts       → 认证 / 会话类型
 *   - src/types/tender.ts     → 招标 / 报价类型
 *   - src/types/bidAward.ts   → 中标详情类型
 *   + AuditLog                → 审计日志（本文件新增）
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 数据库行类型 ──────────────────────────────────────────────────────────────
export type {
  UUID,
  UserPortal,
  AppUserRole,
  TenderStatus,
  BidStatus,
  ProjectStatus,
  AlertSeverity,
  AgentApplicationStatus,
  ContractType,
  ContractStatus,
  FileBucket,
  FileRefType,
  DocCategory,
  AgentRow,
  AgentApplicationRow,
  ProjectAlertRow,
  AppUserRow,
  TenderRow,
  BidRow,
  ProjectRow,
  PotentialProjectRow,
  CustomerRow,
  ContractRow,
  FileRow,
  FreeTemplateRow,
  DatabaseSchema,
  TableName,
} from '../database/schema';

// ── 认证 / 会话类型 ───────────────────────────────────────────────────────────
export type {
  AppRole,
  LoginPortal,
  AuthUserInfo,
  AuthSession,
} from '../types/auth';

// ── 招标 / 报价 / 投标类型 ─────────────────────────────────────────────────────
export type {
  TenderBidRecord,
  TenderCargoLine,
  SharedTender,
  PublishTenderInput,
  SubmitBidInput,
} from '../types/tender';

// ── 中标详情类型 ──────────────────────────────────────────────────────────────
export type {
  AwardCargoItem,
  AwardTenderInfo,
  AwardBidInfo,
  BidAwardDetailData,
  BidAwardDetailApiDTO,
  RevokeAwardResponse,
} from '../types/bidAward';

// ── 审计日志（新增）──────────────────────────────────────────────────────────
/**
 * AuditLog — 记录所有数据库写操作（INSERT / UPDATE / DELETE）。
 *
 * 在本地 mock 模式下不自动记录（需业务层手动调用 logAudit）。
 * 在真实 Supabase 模式下通过数据库触发器自动写入 audit_logs 表。
 *
 * 对应 schema.sql 中的 audit_logs 表。
 */
export interface AuditLog {
  /** UUID 主键 */
  id: string;
  /** 被操作的表名，如 'tenders', 'bids', 'projects' */
  table_name: string;
  /** 被操作记录的主键 ID */
  record_id: string;
  /** 操作类型 */
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  /** 操作前的完整行数据（INSERT 时为 null） */
  old_data: Record<string, unknown> | null;
  /** 操作后的完整行数据（DELETE 时为 null） */
  new_data: Record<string, unknown> | null;
  /** 执行操作的用户 ID（对应 profiles.id） */
  user_id: string;
  /** 执行操作的用户显示名（冗余存储，便于快速展示） */
  user_name: string;
  /** 操作时间戳（ISO 8601） */
  created_at: string;
}
