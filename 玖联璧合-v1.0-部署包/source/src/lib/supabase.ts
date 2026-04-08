/**
 * 业务层统一数据库入口。
 * ─────────────────────────────────────────────────────────────────────────────
 * 所有 service 文件通过本模块访问数据库，禁止直接导入 supabaseMockClient。
 *
 * 切换本地 mock ↔ 真实 Supabase：
 *   在 .env.local 中设置 VITE_USE_MOCK_DB=true/false 即可，无需改动业务代码。
 * ─────────────────────────────────────────────────────────────────────────────
 */
export { db as supabase, subscribeToDb, isMockMode } from './supabaseClient';
