-- ============================================================================
-- 玖联v1.0 — Supabase 全新部署脚本（一键执行）
-- 适用于：全新 Supabase 项目，从零开始
-- 执行位置：Supabase Dashboard > SQL Editor
-- ============================================================================
-- 执行顺序：本脚本分 5 个阶段，请一次性全部执行
--   阶段 A：基础函数
--   阶段 B：12 张业务表 + 触发器 + 索引
--   阶段 C：2 个兼容视图（app_users / files）
--   阶段 D：权限配置（禁用 RLS + GRANT）
--   阶段 E：Storage 存储桶 + 策略
--   阶段 F：测试种子数据
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 A：基础辅助函数
-- ═══════════════════════════════════════════════════════════════════════════

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';

-- 自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 审计日志自动写入函数
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_name)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP
      WHEN 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    TG_OP,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    COALESCE(current_setting('app.current_user_id', true), 'system'),
    COALESCE(current_setting('app.current_user_name', true), 'system')
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 B：12 张业务表
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. agents（代理商主档案）───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  level_label   TEXT        NOT NULL DEFAULT '普通',
  code          TEXT,
  location      TEXT,
  contact       TEXT,
  phone         TEXT,
  biz_type      TEXT,
  status        TEXT        NOT NULL DEFAULT 'active',
  remark        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- ── 2. profiles（用户账号表，前端通过 app_users 视图访问）─────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('admin', 'staff', 'agent')),
  portal        TEXT        NOT NULL CHECK (portal IN ('internal', 'agent')),
  display_name  TEXT        NOT NULL,
  department    TEXT,
  agent_id      TEXT        REFERENCES agents(id) ON DELETE SET NULL,
  parent_id     TEXT        REFERENCES profiles(id) ON DELETE CASCADE,
  permissions   JSONB,
  status        TEXT        NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'disabled', 'pending')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_portal ON profiles(portal);
CREATE INDEX IF NOT EXISTS idx_profiles_agent_id ON profiles(agent_id);

-- ── 3. customers（客户 CRM）────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT '企业',
  contact        TEXT,
  phone          TEXT,
  wechat         TEXT,
  biz_type       TEXT,
  inquiry_count  INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive', 'potential')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. agent_applications（代理申请表）──────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_applications (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name          TEXT        NOT NULL,
  biz_type      TEXT        NOT NULL,
  apply_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  contact       TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  location      TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  login_account TEXT,
  reg_password  TEXT,
  credit_code   TEXT,
  doc_names     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER agent_applications_updated_at
  BEFORE UPDATE ON agent_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. tenders（招标/询价表）──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenders (
  id                TEXT        PRIMARY KEY,
  title             TEXT        NOT NULL,
  origin            TEXT        NOT NULL,
  destination       TEXT        NOT NULL,
  route_label       TEXT        NOT NULL,
  deadline_at       TIMESTAMPTZ NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'bidding'
                    CHECK (status IN ('bidding', 'evaluating', 'awarded')),
  cargo_summary     TEXT        NOT NULL,
  requirements      TEXT,
  biz_type          TEXT,
  cargo_json        JSONB,
  invited_agent_ids TEXT[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tenders_updated_at
  BEFORE UPDATE ON tenders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_invited_agent_ids ON tenders USING GIN(invited_agent_ids);

-- ── 6. bids（投标/报价表）──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bids (
  id             TEXT        PRIMARY KEY,
  tender_id      TEXT        NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  agent_id       TEXT        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  price          NUMERIC     NOT NULL CHECK (price > 0),
  currency       TEXT        NOT NULL DEFAULT 'CNY',
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected')),
  remarks        TEXT,
  estimated_time TEXT,
  edit_count     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tender_id, agent_id)
);

CREATE TRIGGER bids_updated_at
  BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bids_tender_id ON bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_agent_id ON bids(agent_id);

-- ── 7. projects（项目/订单执行表）───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                   TEXT        PRIMARY KEY,
  tender_id            TEXT        REFERENCES tenders(id) ON DELETE SET NULL,
  source_tender_id     TEXT        REFERENCES tenders(id) ON DELETE SET NULL,
  winning_bid_id       TEXT        REFERENCES bids(id) ON DELETE SET NULL,
  agent_id             TEXT        REFERENCES agents(id) ON DELETE SET NULL,
  awarded_agent_id     TEXT        REFERENCES agents(id) ON DELETE SET NULL,
  client_id            TEXT        REFERENCES customers(id) ON DELETE SET NULL,
  client_name          TEXT,
  name                 TEXT        NOT NULL,
  origin               TEXT        NOT NULL,
  destination          TEXT        NOT NULL,
  route                TEXT        NOT NULL,
  cargo_type           TEXT        NOT NULL,
  progress             INTEGER     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status               TEXT        NOT NULL DEFAULT 'preparing'
                       CHECK (status IN ('preparing', 'executing', 'completed', 'suspended')),
  manager              TEXT,
  amount_display       TEXT,
  source               TEXT        NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('award', 'manual', 'potential_convert')),
  source_potential_id  TEXT,
  current_location     TEXT,
  weight               TEXT,
  eta                  TEXT,
  priority_label       TEXT,
  transport_type       TEXT,
  rating               SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  completed_date       DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_agent_id ON projects(agent_id);

-- ── 8. potential_projects（潜在项目管道）──────────────────────────────────
CREATE TABLE IF NOT EXISTS potential_projects (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  client          TEXT        NOT NULL,
  type            TEXT        NOT NULL,
  amount          TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT '初步接触',
  last_update     DATE        NOT NULL DEFAULT CURRENT_DATE,
  expected_date   DATE        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER potential_projects_updated_at
  BEFORE UPDATE ON potential_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 9. contracts（合同表）────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id                     TEXT        PRIMARY KEY,
  contract_type          TEXT        NOT NULL CHECK (contract_type IN ('award', 'execution')),
  tender_id              TEXT        NOT NULL REFERENCES tenders(id) ON DELETE RESTRICT,
  bid_id                 TEXT        NOT NULL REFERENCES bids(id) ON DELETE RESTRICT,
  project_id             TEXT        REFERENCES projects(id) ON DELETE SET NULL,
  agent_id               TEXT        NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  parent_contract_id     TEXT        REFERENCES contracts(id) ON DELETE SET NULL,
  status                 TEXT        NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','pending_agent_sign','agent_signed','pending_platform_confirm','active','cancelled')),
  tender_snapshot        JSONB       NOT NULL,
  bid_snapshot           JSONB       NOT NULL,
  agent_snapshot         JSONB       NOT NULL,
  platform_signee        TEXT,
  agent_signee           TEXT,
  agent_signed_at        TIMESTAMPTZ,
  platform_confirmed_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);

-- ── 10. project_alerts（项目异常预警表）────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_alerts (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  time        TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'medium'
              CHECK (severity IN ('critical', 'high', 'medium')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER project_alerts_updated_at
  BEFORE UPDATE ON project_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 11. documents（文件元数据表，前端通过 files 视图访问）──────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  bucket          TEXT        NOT NULL
                  CHECK (bucket IN ('registrations', 'contracts', 'tenders', 'projects')),
  path            TEXT        NOT NULL,
  original_name   TEXT        NOT NULL,
  mime_type       TEXT        NOT NULL,
  size_bytes      BIGINT      NOT NULL,
  storage_url     TEXT,
  uploader_id     TEXT        NOT NULL,
  uploader_portal TEXT        NOT NULL CHECK (uploader_portal IN ('internal', 'agent')),
  ref_type        TEXT        CHECK (ref_type IN ('agent_application','agent','contract','tender','bid','project')),
  ref_id          TEXT,
  doc_category    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_documents_ref ON documents(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_documents_bucket ON documents(bucket);

-- ── 12. audit_logs（审计日志表）────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  record_id   TEXT        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  user_id     TEXT        NOT NULL,
  user_name   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 审计触发器（挂载到关键表）
CREATE TRIGGER audit_tenders   AFTER INSERT OR UPDATE OR DELETE ON tenders   FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_bids      AFTER INSERT OR UPDATE OR DELETE ON bids      FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_projects  AFTER INSERT OR UPDATE OR DELETE ON projects  FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_profiles  AFTER INSERT OR UPDATE OR DELETE ON profiles  FOR EACH ROW EXECUTE FUNCTION create_audit_log();


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 C：兼容视图（前端代码通过视图名访问）
-- ═══════════════════════════════════════════════════════════════════════════

-- app_users 视图：前端 SELECT 用，映射 profiles 表
CREATE OR REPLACE VIEW app_users AS
  SELECT
    id, username,
    password_hash AS password,
    role, portal, display_name, department, agent_id,
    parent_id, permissions, status, created_at, updated_at
  FROM profiles;

-- files 视图：前端 SELECT 用，映射 documents 表
CREATE OR REPLACE VIEW files AS
  SELECT
    id, bucket, path, original_name, mime_type, size_bytes,
    storage_url AS data_base64,
    uploader_id, uploader_portal, ref_type, ref_id, doc_category,
    created_at, updated_at
  FROM documents;


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 D：权限配置
-- ═══════════════════════════════════════════════════════════════════════════

-- 禁用所有表的 RLS（当前应用层自己管理认证，不使用 Supabase Auth）
-- 生产环境集成 Supabase Auth 后再重新启用
ALTER TABLE profiles           DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents             DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers          DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenders            DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids               DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects           DISABLE ROW LEVEL SECURITY;
ALTER TABLE potential_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_alerts     DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents          DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         DISABLE ROW LEVEL SECURITY;

-- 授予 anon / authenticated 角色对所有表和视图的权限
GRANT SELECT ON app_users TO anon, authenticated;
GRANT SELECT ON files TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON agents TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON agent_applications TO anon, authenticated;
GRANT ALL ON tenders TO anon, authenticated;
GRANT ALL ON bids TO anon, authenticated;
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON potential_projects TO anon, authenticated;
GRANT ALL ON contracts TO anon, authenticated;
GRANT ALL ON project_alerts TO anon, authenticated;
GRANT ALL ON documents TO anon, authenticated;
GRANT ALL ON audit_logs TO anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 E：Storage 存储桶 + 文件访问策略
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('registrations', 'registrations', false),
  ('contracts',     'contracts',     false),
  ('tenders',       'tenders',       false),
  ('projects',      'projects',      false)
ON CONFLICT (id) DO NOTHING;

-- 开发/测试环境：允许所有角色上传、读取、删除文件
CREATE POLICY "Allow upload"  ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow read"    ON storage.objects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow delete"  ON storage.objects FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow update"  ON storage.objects FOR UPDATE TO anon, authenticated USING (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 阶段 F：测试种子数据
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) 代理商主档案
INSERT INTO agents (id, name, level_label, code, location, contact, phone, biz_type, status)
VALUES
  ('AG-001', '谅山鸿运车队',   'A级', 'VN-LS-001', '越南谅山',   '阮文强', '0912-345-678', '干线运输 (中越/越老)', 'active'),
  ('AG-002', '海防捷通报关行', 'B级', 'VN-HP-002', '越南海防',   '陈氏美', '0923-456-789', '清关报关',            'active')
ON CONFLICT (id) DO NOTHING;

-- 2) 用户账号（密码明文 123456，仅测试用）
INSERT INTO profiles (id, username, password_hash, role, portal, display_name, department, agent_id, status)
VALUES
  ('usr-admin-001',  'admin',  '123456', 'admin', 'internal', '超级管理员',     '运营总部',   NULL,     'active'),
  ('usr-staff-001',  'staff',  '123456', 'staff', 'internal', '业务员小王',     '跨境业务部', NULL,     'active'),
  ('usr-agent-001',  'agent',  '123456', 'agent', 'agent',    '谅山鸿运车队',   NULL,         'AG-001', 'active'),
  ('usr-agent-002',  'agent2', '123456', 'agent', 'agent',    '海防捷通报关行', NULL,         'AG-002', 'active')
ON CONFLICT (username) DO NOTHING;

-- 3) 示例招标单（让代理端有内容可看）
INSERT INTO tenders (id, title, origin, destination, route_label, deadline_at, status, cargo_summary, biz_type, invited_agent_ids)
VALUES
  ('TND-001', '中越边境电子产品运输项目', '深圳', '河内', '深圳 → 河内', NOW() + INTERVAL '3 days', 'bidding', '电子元器件 20 吨', '干线运输 (中越/越老)', '{}'),
  ('TND-002', '河内工业园物料配送招标',   '南宁', '河内', '南宁 → 河内', NOW() + INTERVAL '5 days', 'bidding', '工业零部件 15 吨', '干线运输 (中越/越老)', '{}'),
  ('TND-003', '凭祥口岸冷链物流年度服务', '凭祥', '谅山', '凭祥 → 谅山', NOW() + INTERVAL '8 days', 'bidding', '冷链食品 50 吨',   '干线运输 (中越/越老)', '{}')
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 部署完成！
-- ═══════════════════════════════════════════════════════════════════════════
