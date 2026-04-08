/**
 * supabaseClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 统一数据库客户端入口，支持两种模式：
 *
 *  VITE_USE_MOCK_DB=true  (默认) → 本地 localStorage 内存数据库，无需任何配置
 *  VITE_USE_MOCK_DB=false        → 真实 Supabase，需填写 URL + ANON_KEY
 *
 * 业务层（services/）统一从 src/lib/supabase.ts 导入 `supabase`，
 * 切换模式时只需修改 .env.local，无需改动任何业务代码。
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  getMockSupabase,
  type MockSupabaseClient,
} from '../database/supabaseMockClient';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** 联合类型：本地 mock 与真实 Supabase 客户端 */
export type AppSupabaseClient = MockSupabaseClient | SupabaseClient;

/**
 * 根据环境变量决定返回哪种客户端。
 * - 默认使用 mock（VITE_USE_MOCK_DB 未设置或 !== 'false'）
 * - 显式设置 VITE_USE_MOCK_DB=false 才连接真实 Supabase
 */
function createAppClient(): AppSupabaseClient {
  const useMock = import.meta.env.VITE_USE_MOCK_DB !== 'false';

  if (useMock) {
    // ── 本地开发模式 ──────────────────────────────────────────────────────
    // 数据存储在 localStorage（key: jl_mock_supabase_db_v1）
    // 支持跨标签页实时同步（BroadcastChannel）
    if (import.meta.env.DEV) {
      console.info('[DB] 使用本地 Mock 数据库（VITE_USE_MOCK_DB=true）');
    }
    return getMockSupabase();
  }

  // ── 真实 Supabase 模式 ────────────────────────────────────────────────
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[DB] VITE_USE_MOCK_DB=false 时必须同时设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY'
    );
  }

  if (import.meta.env.DEV) {
    console.info(`[DB] 连接真实 Supabase：${url}`);
  }

  return createClient(url, key);
}

/** 当前是否为 Mock 模式（供 service 层判断写入目标表） */
export const isMockMode: boolean = import.meta.env.VITE_USE_MOCK_DB !== 'false';

/** 全局单例客户端，业务层不要直接导入本文件，请使用 src/lib/supabase.ts */
export const db: AppSupabaseClient = createAppClient();

/**
 * subscribeToDb — 跨模式数据变更订阅
 * ─────────────────────────────────────────────────────────────────────────────
 * mock 模式：监听 localStorage / BroadcastChannel 变化（跨标签页同步）
 * 真实 Supabase 模式：暂为 no-op，Realtime 订阅请直接使用 Supabase Realtime API。
 *
 * 返回取消订阅函数，供 useEffect cleanup 使用：
 *   useEffect(() => {
 *     return subscribeToDb(() => refetch());
 *   }, []);
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function subscribeToDb(cb: () => void): () => void {
  if ('subscribe' in db && typeof db.subscribe === 'function') {
    // mock 客户端有 subscribe 方法
    return (db as MockSupabaseClient).subscribe(cb);
  }
  // 真实 Supabase：no-op（Realtime 订阅另行配置）
  return () => { /* unsubscribe no-op */ };
}
