/**
 * PostgreSQL / Supabase 风格行类型（业务层仅依赖这些接口 + 与真实 Supabase 相同的调用形状）
 */

export type UUID = string;

export type UserPortal = 'internal' | 'agent';

export type AppUserRole = 'admin' | 'staff' | 'agent';

export type TenderStatus = 'bidding' | 'evaluating' | 'awarded';

export type BidStatus = 'pending' | 'accepted' | 'rejected';

export type ProjectStatus = 'executing' | 'completed' | 'suspended' | 'preparing';

export interface AgentRow {
  id: UUID;
  name: string;
  level_label: string;
  code: string | null;
  location: string | null;
  contact: string | null;
  phone: string | null;
  biz_type: string | null;
  status: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AgentApplicationRow {
  id: UUID;
  name: string;
  biz_type: string;
  apply_date: string;
  contact: string;
  phone: string;
  location: string;
  status: AgentApplicationStatus;
  /** 注册时填写的登录账号（手机号或邮箱） */
  login_account?: string | null;
  /** 注册时设置的登录密码（审批通过后写入 app_users） */
  reg_password?: string | null;
  /** 统一社会信用代码 */
  credit_code?: string | null;
  /** 已上传资质文件名列表（JSON 字符串） */
  doc_names?: string | null;
  created_at: string;
  updated_at: string;
}

export type AlertSeverity = 'critical' | 'high' | 'medium';

export interface ProjectAlertRow {
  id: UUID;
  type: string;
  title: string;
  desc: string;
  time: string;
  severity: AlertSeverity;
  created_at: string;
  updated_at: string;
}

export interface AppUserRow {
  id: UUID;
  username: string;
  /** 本地 Mock 明文；上云后仅保留 password_hash，校验移入 Edge Function */
  password: string;
  role: AppUserRole;
  portal: UserPortal;
  display_name: string;
  department: string | null;
  /** 当 role === 'agent' 时指向 agents.id */
  agent_id: UUID | null;
  parent_id?: string;
  permissions?: string[];
  /** pending = 自注册待审核；active = 正常；disabled = 已禁用 */
  status?: 'active' | 'disabled' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface TenderRow {
  id: UUID;
  title: string;
  origin: string;
  destination: string;
  route_label: string;
  deadline_at: string;
  status: TenderStatus;
  cargo_summary: string;
  requirements: string | null;
  biz_type: string | null;
  /** JSON 字符串：货物明细数组 */
  cargo_json: string | null;
  /** 定向邀标：仅列出的代理商可在代理端见单、投标（模拟 RLS） */
  invited_agent_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface BidRow {
  id: UUID;
  tender_id: UUID;
  agent_id: UUID;
  price: number;
  currency: string;
  status: BidStatus;
  remarks: string | null;
  estimated_time: string | null;
  edit_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: UUID;
  /** 来自定标时关联 */
  tender_id: UUID | null;
  /** 源头招标单（与 tender_id 同义冗余，便于审计与报表） */
  source_tender_id: UUID | null;
  winning_bid_id: UUID | null;
  agent_id: UUID | null;
  /** 定标承运代理商（与 agent_id 对齐，中标溯源） */
  awarded_agent_id: UUID | null;
  client_id: UUID | null;
  /** 展示用客户名称（无独立 clients 表时） */
  client_name: string | null;
  name: string;
  origin: string;
  destination: string;
  route: string;
  cargo_type: string;
  progress: number;
  status: ProjectStatus;
  manager: string;
  /** 展示用金额文案 */
  amount_display: string | null;
  source: 'award' | 'manual' | 'potential_convert';
  source_potential_id: UUID | null;
  /** 项目跟踪额外字段 */
  current_location: string | null;
  weight: string | null;
  eta: string | null;
  priority_label: string | null;
  transport_type: string | null;
  /** 完成后服务评分 1-5 */
  rating: number | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PotentialProjectRow {
  id: UUID;
  name: string;
  client: string;
  type: string;
  amount: string;
  status: string;
  last_update: string;
  expected_date: string;
  created_at: string;
  updated_at: string;
}

/** 客户主数据（CRM）；projects.client_id 可未来关联至此 */
export interface CustomerRow {
  id: UUID;
  name: string;
  type: string;
  contact: string;
  phone: string;
  wechat: string;
  biz_type: string;
  inquiry_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Contracts ───────────────────────────────────────────────────────────────

export type ContractType = 'award' | 'execution';

export type ContractStatus =
  | 'draft'
  | 'pending_agent_sign'
  | 'agent_signed'
  | 'pending_platform_confirm'
  | 'active'
  | 'cancelled';

export interface ContractRow {
  id: UUID;
  contract_type: ContractType;
  tender_id: UUID;
  bid_id: UUID;
  project_id: UUID | null;
  agent_id: UUID;
  /** 执行合同 → 指向中标合同 */
  parent_contract_id: UUID | null;
  status: ContractStatus;
  /** JSON 快照：合同生成时冻结的招标数据 */
  tender_snapshot: string;
  /** JSON 快照：合同生成时冻结的投标数据 */
  bid_snapshot: string;
  /** JSON 快照：合同生成时冻结的代理商数据 */
  agent_snapshot: string;
  platform_signee: string | null;
  agent_signee: string | null;
  agent_signed_at: string | null;
  platform_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Files (Mock Supabase Storage metadata) ──────────────────────────────────

export type FileBucket = 'registrations' | 'contracts' | 'tenders' | 'projects';

export type FileRefType = 'agent_application' | 'agent' | 'contract' | 'tender' | 'bid' | 'project';

/** 文件资质分类（代理入库申请用） */
export type DocCategory =
  | 'business_license'     // 营业执照副本
  | 'transport_permit'     // 道路运输经营许可证
  | 'id_card'              // 法人身份证正反面
  | 'qualification'        // 企业资质证明（可选）
  | null;

export interface FileRow {
  id: UUID;
  bucket: FileBucket;
  path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  /** Base64 编码的文件内容；上云后移除，改用 Supabase Storage URL */
  data_base64: string;
  uploader_id: UUID;
  uploader_portal: UserPortal;
  ref_type: FileRefType | null;
  ref_id: UUID | null;
  /** 文件资质分类，用于区分同一实体下不同类型文件 */
  doc_category?: DocCategory;
  created_at: string;
  updated_at: string;
}

// ── Free Templates (公开下载模板) ───────────────────────────────────────────

export type TemplateCategory = 'export' | 'import';

export interface FreeTemplateRow {
  id: UUID;
  name: string;
  description: string | null;
  category: TemplateCategory;
  bucket: string;
  path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  agents: AgentRow[];
  app_users: AppUserRow[];
  customers: CustomerRow[];
  tenders: TenderRow[];
  bids: BidRow[];
  projects: ProjectRow[];
  potential_projects: PotentialProjectRow[];
  agent_applications: AgentApplicationRow[];
  project_alerts: ProjectAlertRow[];
  contracts: ContractRow[];
  files: FileRow[];
  free_templates: FreeTemplateRow[];
}

export type TableName = keyof DatabaseSchema;
