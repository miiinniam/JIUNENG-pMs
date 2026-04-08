-- ============================================================================
-- 玖联v1.0 Supabase 迁移脚本
-- 请在 Supabase Dashboard > SQL Editor 中执行此脚本
-- 日期：2026-04-07
-- ============================================================================

-- ── 1. 临时禁用 RLS（应用层自行管理认证，RLS 策略中 auth.uid() 为 NULL 导致查询失败）
-- 生产环境集成 Supabase Auth 后需重新启用
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

-- ── 2. 给 documents 表添加 doc_category 列（文件资质分类）
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_category TEXT;

-- ── 3. 重建 files 兼容视图（包含 doc_category）
CREATE OR REPLACE VIEW files AS
  SELECT
    id,
    bucket,
    path,
    original_name,
    mime_type,
    size_bytes,
    storage_url       AS data_base64,
    uploader_id,
    uploader_portal,
    ref_type,
    ref_id,
    doc_category,
    created_at,
    updated_at
  FROM documents;

-- ── 4. 授予 anon 和 authenticated 角色对所有表/视图的权限
-- 视图（SELECT only）
GRANT SELECT ON app_users TO anon, authenticated;
GRANT SELECT ON files TO anon, authenticated;

-- 基表（全部权限，应用层控制授权）
GRANT ALL ON profiles TO anon, authenticated;
GRANT ALL ON documents TO anon, authenticated;
GRANT ALL ON agents TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON agent_applications TO anon, authenticated;
GRANT ALL ON tenders TO anon, authenticated;
GRANT ALL ON bids TO anon, authenticated;
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON potential_projects TO anon, authenticated;
GRANT ALL ON contracts TO anon, authenticated;
GRANT ALL ON project_alerts TO anon, authenticated;
GRANT ALL ON audit_logs TO anon, authenticated;

-- ── 5. 验证测试账号是否存在
-- 如果没有测试数据，取消注释下面的 INSERT 语句执行
/*
INSERT INTO profiles (id, username, password_hash, role, portal, display_name, department, agent_id, status, created_at, updated_at)
VALUES
  ('usr-admin-001', 'admin', '123456', 'admin', 'internal', '系统管理员', '运营总部', NULL, 'active', NOW(), NOW()),
  ('usr-staff-001', 'staff', '123456', 'staff', 'internal', '业务员小王', '跨境业务部', NULL, 'active', NOW(), NOW()),
  ('usr-agent-001', 'agent', '123456', 'agent', 'agent', '谅山鸿运车队', NULL, 'AG-001', 'active', NOW(), NOW()),
  ('usr-agent-002', 'agent2', '123456', 'agent', 'agent', '海防捷通报关行', NULL, 'AG-002', 'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
*/

-- ── 6. Supabase Storage bucket 策略（允许 anon 上传/读取）
-- 需在 Supabase Dashboard > Storage > Policies 中手动配置，或执行以下 SQL：
-- 注意：以下策略仅适用于开发/测试环境，生产环境需配合 Supabase Auth 收紧

-- 对每个 bucket (registrations, contracts, tenders, projects) 执行：
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('registrations', 'registrations', false),
  ('contracts', 'contracts', false),
  ('tenders', 'tenders', false),
  ('projects', 'projects', false)
ON CONFLICT (id) DO NOTHING;

-- 允许 anon 用户上传文件（开发/测试环境）
CREATE POLICY "Allow anon upload" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 允许 anon 用户读取文件（开发/测试环境）
CREATE POLICY "Allow anon read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (true);

-- 允许 anon 用户删除文件（开发/测试环境）
CREATE POLICY "Allow anon delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (true);

-- ── 7. 创建 award_tender RPC 函数（定标 + 自动生成项目和合同）
CREATE OR REPLACE FUNCTION public.award_tender(
  p_tender_id TEXT,
  p_winning_bid_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tender   tenders%ROWTYPE;
  v_bid      bids%ROWTYPE;
  v_agent    agents%ROWTYPE;
  v_pid      TEXT;
  v_cid      TEXT;
BEGIN
  -- 1. 查询招标单
  SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '招标单不存在: %', p_tender_id;
  END IF;
  IF v_tender.status = 'awarded' THEN
    RAISE EXCEPTION '该招标已定标';
  END IF;

  -- 2. 查询中标报价
  SELECT * INTO v_bid FROM bids WHERE id = p_winning_bid_id AND tender_id = p_tender_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '报价不存在: %', p_winning_bid_id;
  END IF;

  -- 3. 查询代理商
  SELECT * INTO v_agent FROM agents WHERE id = v_bid.agent_id;

  -- 4. 更新招标状态为 awarded
  UPDATE tenders SET status = 'awarded', updated_at = NOW() WHERE id = p_tender_id;

  -- 5. 中标报价 accepted，其余 rejected
  UPDATE bids SET status = 'accepted', updated_at = NOW() WHERE id = p_winning_bid_id;
  UPDATE bids SET status = 'rejected', updated_at = NOW()
    WHERE tender_id = p_tender_id AND id <> p_winning_bid_id;

  -- 6. 生成项目
  v_pid := 'PRJ-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;
  INSERT INTO projects (
    id, tender_id, source_tender_id, winning_bid_id,
    agent_id, awarded_agent_id,
    name, origin, destination, route, cargo_type,
    progress, status, manager, amount_display, source,
    created_at, updated_at
  ) VALUES (
    v_pid, p_tender_id, p_tender_id, p_winning_bid_id,
    v_bid.agent_id, v_bid.agent_id,
    v_tender.title || ' · 履约',
    v_tender.origin, v_tender.destination, v_tender.route_label,
    COALESCE(v_tender.biz_type, LEFT(v_tender.cargo_summary, 32)),
    0, 'preparing',
    CASE WHEN v_agent.id IS NOT NULL THEN '承运 ' || v_agent.name ELSE '待分配' END,
    v_bid.currency || ' ' || v_bid.price::TEXT,
    'award',
    NOW(), NOW()
  );

  -- 7. 生成中标合同
  v_cid := 'CTR-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
  INSERT INTO contracts (
    id, contract_type, tender_id, bid_id, project_id, agent_id,
    status, tender_snapshot, bid_snapshot, agent_snapshot,
    created_at, updated_at
  ) VALUES (
    v_cid, 'award', p_tender_id, p_winning_bid_id, v_pid, v_bid.agent_id,
    'pending_agent_sign',
    TO_JSONB(v_tender), TO_JSONB(v_bid), TO_JSONB(v_agent),
    NOW(), NOW()
  );

  -- 8. 返回结果
  RETURN JSONB_BUILD_OBJECT('project_id', v_pid, 'contract_id', v_cid);
END;
$$;

-- 授权 anon 和 authenticated 调用
GRANT EXECUTE ON FUNCTION public.award_tender(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 完成! 请验证：
-- 1. 在 Table Editor 中检查 profiles 表是否有 admin/agent 测试账号
-- 2. 在 Storage 中检查 4 个 bucket 是否已创建
-- 3. 前端 .env.local 中 VITE_USE_MOCK_DB=false
-- ============================================================================
