/**
 * dbHelpers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Mock / 真实 Supabase 双模式下的写入辅助函数。
 *
 * Supabase PostgREST 的视图（app_users / files）仅支持 SELECT，
 * INSERT / UPDATE / DELETE 必须操作基表（profiles / documents）。
 * Mock 模式直接操作 app_users / files（内存表），无此限制。
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { isMockMode } from './supabase';

/** 视图 → 基表 映射（仅 real 模式生效） */
const VIEW_TO_TABLE: Record<string, string> = {
  app_users: 'profiles',
  files: 'documents',
};

/**
 * 返回写入操作应使用的表名。
 * SELECT 可继续用视图名，INSERT/UPDATE/DELETE 必须用此函数。
 *
 * 返回 `string` 以兼容 Mock（TableName 联合）和 真实 Supabase（string）两种 from() 签名。
 */
export function writeTable(viewName: string): string {
  if (isMockMode) return viewName;
  return VIEW_TO_TABLE[viewName] ?? viewName;
}

/**
 * 返回读取操作应使用的表名。
 * Mock 模式用视图名，真实 Supabase 直接查基表以避免视图权限问题。
 */
export function readTable(viewName: string): string {
  if (isMockMode) return viewName;
  return VIEW_TO_TABLE[viewName] ?? viewName;
}

/**
 * 将 app_users 行数据映射为 profiles 表列名。
 * 核心差异：mock 用 `password`，profiles 用 `password_hash`。
 */
export function mapUserRowForWrite(row: Record<string, unknown>): Record<string, unknown> {
  if (isMockMode) return row;
  const mapped = { ...row };
  if ('password' in mapped) {
    mapped.password_hash = mapped.password;
    delete mapped.password;
  }
  return mapped;
}

/**
 * 将 files 行数据映射为 documents 表列名。
 * 核心差异：mock 用 `data_base64`，documents 用 `storage_url`。
 */
export function mapFileRowForWrite(row: Record<string, unknown>): Record<string, unknown> {
  if (isMockMode) return row;
  const mapped = { ...row };
  if ('data_base64' in mapped) {
    mapped.storage_url = mapped.data_base64;
    delete mapped.data_base64;
  }
  return mapped;
}
