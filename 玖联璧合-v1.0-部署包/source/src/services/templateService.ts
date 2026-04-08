/**
 * 免费文件模板服务
 * 
 * 功能：
 * - 获取启用的模板列表
 * - 按分类获取模板
 * - 创建/更新/删除模板
 * - 上传模板文件
 */

import { supabase, isMockMode } from '../lib/supabase';
import type { FreeTemplateRow, TemplateCategory } from '../database/schema';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── 类型别名 ────────────────────────────────────────────────────────────────

export interface FreeTemplateUi {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  bucket: string;
  path: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: number;
  storageUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

function mapTemplateRow(row: FreeTemplateRow): FreeTemplateUi {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    bucket: row.bucket,
    path: row.path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageUrl: row.storage_url,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

// ── 获取所有启用的模板 ────────────────────────────────────────────────────────

export async function getActiveTemplates(): Promise<FreeTemplateUi[]> {
  const sb = supabase;
  const table: any = isMockMode ? 'free_templates' : 'free_templates';

  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return (data as FreeTemplateRow[]).map(mapTemplateRow);
}

// ── 按分类获取模板 ───────────────────────────────────────────────────────────

export async function getTemplatesByCategory(category: TemplateCategory): Promise<FreeTemplateUi[]> {
  const sb = supabase;
  const table: any = isMockMode ? 'free_templates' : 'free_templates';

  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return (data as FreeTemplateRow[]).map(mapTemplateRow);
}

// ── 获取所有模板（管理员用，含禁用）─────────────────────────────────────────

export async function getAllTemplates(): Promise<FreeTemplateUi[]> {
  const sb = supabase;
  const table: any = isMockMode ? 'free_templates' : 'free_templates';

  const { data, error } = await sb
    .from(table)
    .select('*')
    .order('category')
    .order('display_order', { ascending: true });

  if (error || !data) return [];
  return (data as FreeTemplateRow[]).map(mapTemplateRow);
}

// ── 创建模板 ────────────────────────────────────────────────────────────────

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  bucket?: string;
  path: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageUrl?: string;
  displayOrder?: number;
}

export async function createTemplate(input: CreateTemplateInput): Promise<FreeTemplateUi> {
  const sb = supabase;

  const row = {
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    bucket: input.bucket ?? 'templates',
    path: input.path,
    original_name: input.originalName,
    mime_type: input.mimeType ?? null,
    size_bytes: input.sizeBytes ?? 0,
    storage_url: input.storageUrl ?? null,
    is_active: true,
    display_order: input.displayOrder ?? 0,
  };

  const { data, error } = await sb.from('free_templates').insert(row).single();
  if (error) throw new Error(error.message);
  return mapTemplateRow(data as FreeTemplateRow);
}

// ── 更新模板 ────────────────────────────────────────────────────────────────

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  category?: TemplateCategory;
  path?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export async function updateTemplate(input: UpdateTemplateInput): Promise<FreeTemplateUi> {
  const sb = supabase;
  const { id, ...updates } = input;

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.path !== undefined) patch.path = updates.path;
  if (updates.originalName !== undefined) patch.original_name = updates.originalName;
  if (updates.mimeType !== undefined) patch.mime_type = updates.mimeType;
  if (updates.sizeBytes !== undefined) patch.size_bytes = updates.sizeBytes;
  if (updates.storageUrl !== undefined) patch.storage_url = updates.storageUrl;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  if (updates.displayOrder !== undefined) patch.display_order = updates.displayOrder;

  const { data, error } = await sb
    .from('free_templates')
    .update(patch)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return mapTemplateRow(data as FreeTemplateRow);
}

// ── 删除模板 ────────────────────────────────────────────────────────────────

export async function deleteTemplate(id: string): Promise<void> {
  const sb = supabase;

  if (!isMockMode) {
    const realSb = sb as SupabaseClient;
    const { data } = await realSb
      .from('free_templates')
      .select('bucket, path')
      .eq('id', id)
      .single();

    if (data) {
      await realSb.storage
        .from(String(data.bucket))
        .remove([String(data.path)])
        .catch(() => {});
    }
  }

  const { error } = await sb.from('free_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── 上传模板文件 ────────────────────────────────────────────────────────────

export interface UploadTemplateFileInput {
  file: File;
  category: TemplateCategory;
  name: string;
  description?: string;
}

export async function uploadTemplateFile(
  input: UploadTemplateFileInput
): Promise<FreeTemplateUi> {
  const sb = supabase;
  const bucketName = 'templates';
  
  // 生成安全的文件名（去掉中文和特殊字符）
  const safeFileName = input.file.name
    .replace(/[^\w\s.-]/g, '_')  // 替换非字母数字字符为下划线
    .replace(/\s+/g, '_');        // 替换空格为下划线
  const path = `${input.category}/${Date.now()}_${safeFileName}`;

  if (!isMockMode) {
    const realSb = sb as SupabaseClient;
    
    // 文件大小限制 (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (input.file.size > maxSize) {
      throw new Error('文件大小超过 50MB 限制');
    }

    // 直接尝试上传文件
    console.log('[Upload] 开始上传文件到:', path, 'bucket:', bucketName);
    
    const { error: uploadErr } = await realSb.storage
      .from(bucketName)
      .upload(path, input.file, { 
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadErr) {
      console.error('[Upload] 文件上传失败:', uploadErr);
      // 提供更详细的错误信息
      const errMsg = uploadErr.message || '';
      if (errMsg.includes('not found') || errMsg.includes('不存在')) {
        throw new Error(`存储桶 "${bucketName}" 不存在或无权访问。请检查 Supabase Storage 中是否存在该 bucket`);
      }
      if (errMsg.includes('permission') || errMsg.includes('权限')) {
        throw new Error(`上传权限不足：${errMsg}`);
      }
      throw new Error(`文件上传失败：${errMsg}`);
    }
    console.log('[Upload] 文件上传成功:', path);

    // 获取公开访问 URL
    const { data: urlData } = realSb.storage.from(bucketName).getPublicUrl(path);
    console.log('[Upload] 文件公开URL:', urlData.publicUrl);

    // 创建数据库记录
    const row = {
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      bucket: bucketName,
      path,
      original_name: input.file.name,
      mime_type: input.file.type || 'application/octet-stream',
      size_bytes: input.file.size,
      storage_url: urlData.publicUrl,
      is_active: true,
      display_order: 0,
    };

    const { data, error } = await realSb
      .from('free_templates')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('[Upload] 数据库记录创建失败:', error);
      // 尝试清理已上传的文件
      await realSb.storage.from(bucketName).remove([path]).catch(() => {});
      throw new Error(`保存模板信息失败：${error.message}`);
    }
    
    console.log('[Upload] 模板记录创建成功:', data.id);
    return mapTemplateRow(data as FreeTemplateRow);
  }

  // Mock 模式
  const row = {
    name: input.name,
    description: input.description ?? null,
    category: input.category,
    bucket: bucketName,
    path,
    original_name: input.file.name,
    mime_type: input.file.type || 'application/octet-stream',
    size_bytes: input.file.size,
    storage_url: null,
    is_active: true,
    display_order: 0,
  };

  const { data, error } = await sb.from('free_templates').insert(row).single();
  if (error) throw new Error(error.message);
  return mapTemplateRow(data as FreeTemplateRow);
}

// ── 下载模板 ────────────────────────────────────────────────────────────────

export async function downloadTemplate(id: string): Promise<void> {
  const sb = supabase;
  const table: any = isMockMode ? 'free_templates' : 'free_templates';

  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('模板不存在');
  const row = data as FreeTemplateRow;

  if (!isMockMode) {
    const realSb = sb as SupabaseClient;
    const { data: blob, error: dlErr } = await realSb.storage
      .from(row.bucket)
      .download(row.path);

    if (dlErr || !blob) throw new Error('文件下载失败');
    triggerDownload(blob, row.original_name);
    return;
  }

  // Mock 模式：生成示例文件内容下载
  const content = generateSampleTemplateContent(row);
  const ext = row.original_name.split('.').pop()?.toLowerCase() || 'txt';
  let mimeType = 'text/plain';
  if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === 'pdf') mimeType = 'application/pdf';

  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, row.original_name);
}

function generateSampleTemplateContent(row: FreeTemplateRow): string {
  const date = new Date().toLocaleDateString('zh-CN');
  
  if (row.mime_type?.includes('wordprocessingml') || row.original_name.endsWith('.docx')) {
    return `【${row.name}】

${row.description || ''}

一、基本信息
──────────────────────────────────────
公司名称：_______________________________
地址：_________________________________
联系人：_______________________________
电话：_________________________________

二、商品明细
──────────────────────────────────────
| 序号 | 商品名称 | 规格 | 数量 | 单位 | 单价 | 金额 |
|------|----------|------|------|------|------|------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

三、注意事项
1. 请确保所有信息真实有效
2. 商品描述需与实际货物一致
3. 如有疑问，请联系客服

──────────────────────────────────────
本模板由玖联璧合物流系统提供
下载日期：${date}
`;
  } else if (row.mime_type?.includes('spreadsheetml') || row.mime_type?.includes('excel') || row.original_name.endsWith('.xlsx')) {
    return `模板名称,${row.name}
描述,${row.description || ''}
下载日期,${date}

序号,商品名称,规格型号,数量,单位,毛重(kg),净重(kg),体积(m³),单价,金额
1,,,,,,,,
2,,,,,,,,
3,,,,,,,,
4,,,,,,,,
5,,,,,,,,
`;
  } else {
    return `
================================================================================
                              ${row.name}
================================================================================

描述：${row.description || '无'}

--------------------------------------------------------------------------------
                              官方文件说明
--------------------------------------------------------------------------------

本文件为进出口报关清关所需的标准文件模板。请按以下要求填写：

【填写要求】
1. 所有信息需真实、准确、完整
2. 文件内容需与实际货物相符
3. 需加盖企业公章方为有效
4. 填写完毕后请妥善保管，以备海关查验

【注意事项】
• 发票号需与实际交易一致
• 商品编码需准确填写海关税则号
• 如实申报货物价值，避免低报或高报

================================================================================
                        玖联璧合物流系统
================================================================================
`;
  }
}

// ── 诊断函数：检查存储状态 ────────────────────────────────────────────────

export async function diagnoseStorage(): Promise<{
  success: boolean;
  buckets?: string[];
  error?: string;
}> {
  if (isMockMode) {
    return { success: true, buckets: ['mock-bucket'] };
  }

  try {
    const realSb = supabase as SupabaseClient;
    const { data, error } = await realSb.storage.listBuckets();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    const bucketNames = data?.map(b => b.name) || [];
    const templatesExists = bucketNames.includes('templates');
    
    console.log('[Storage] 所有 buckets:', bucketNames);
    console.log('[Storage] templates bucket 是否存在:', templatesExists);
    
    if (!templatesExists) {
      return { 
        success: false, 
        buckets: bucketNames,
        error: `未找到 "templates" bucket。当前存在的 buckets: ${bucketNames.join(', ') || '无'}`
      };
    }
    
    return { success: true, buckets: bucketNames };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── 获取文件公开URL（测试用）───────────────────────────────────────────────

export async function testGetPublicUrl(path: string): Promise<string | null> {
  if (isMockMode) return null;
  
  try {
    const realSb = supabase as SupabaseClient;
    const { data } = realSb.storage.from('templates').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('[Storage] 获取公开URL失败:', e);
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string | null): 'pdf' | 'doc' | 'sheet' | 'file' {
  if (!mimeType) return 'file';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType === 'text/csv') return 'sheet';
  return 'file';
}
