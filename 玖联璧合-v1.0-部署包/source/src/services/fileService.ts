/**
 * 文件存储服务 — Mock Supabase Storage
 *
 * 文件以 Base64 编码存于 localStorage (Mock 阶段)。
 * 上云后仅需将 upload / download 替换为 Supabase Storage SDK 调用。
 *
 * 约束:
 *   - 文件类型: 文档类 + 图片
 *   - 单文件上限: 30 MB
 */

import { supabase, isMockMode } from '../lib/supabase';
import { writeTable, mapFileRowForWrite } from '../lib/dbHelpers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DocCategory,
  FileBucket,
  FileRefType,
  FileRow,
  UserPortal,
} from '../database/schema';

// ── IndexedDB Wrapper for File Content (Bypass localStorage quota) ────────────
const IDB_DB_NAME = 'jl_mock_files_db';
const IDB_STORE_NAME = 'files_store';

function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveFileBase64ToIDB(id: string, base64: string): Promise<void> {
  return getIndexedDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(base64, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function loadFileBase64FromIDB(id: string): Promise<string | undefined> {
  return getIndexedDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  });
}

export function deleteFileBase64FromIDB(id: string): Promise<void> {
  return getIndexedDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp',
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.txt', '.csv',
]);

// ── UI Types ────────────────────────────────────────────────────────────────

export interface FileUi {
  id: string;
  bucket: FileBucket;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderPortal: UserPortal;
  refType: FileRefType | null;
  refId: string | null;
  docCategory: DocCategory;
  createdAt: string;
}

function mapFileUi(row: FileRow): FileUi {
  return {
    id: row.id,
    bucket: row.bucket,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploaderPortal: row.uploader_portal,
    refType: row.ref_type,
    refId: row.ref_id,
    docCategory: row.doc_category ?? null,
    createdAt: row.created_at,
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`文件 "${file.name}" 大小为 ${mb} MB，超过上限 30 MB`);
  }

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk && !extOk) {
    throw new Error(
      `不支持的文件格式 "${ext}"。仅支持文档（PDF/Word/Excel/PPT/TXT/CSV）和图片（JPG/PNG/GIF/WebP）`
    );
  }
}

// ── Core helpers ────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data:xxx;base64, prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// ── Upload ──────────────────────────────────────────────────────────────────

export interface UploadFileInput {
  file: File;
  bucket: FileBucket;
  uploaderId: string;
  uploaderPortal: UserPortal;
  refType?: FileRefType;
  refId?: string;
  /** 文件资质分类（如 business_license / transport_permit / id_card / qualification） */
  docCategory?: DocCategory;
}

export async function uploadFile(input: UploadFileInput): Promise<FileUi> {
  validateFile(input.file);

  const t = new Date().toISOString();
  const path = `${input.refType ?? 'misc'}/${input.refId ?? 'general'}/${Date.now()}_${input.file.name}`;
  const sb = supabase;

  if (!isMockMode) {
    // ── 真实 Supabase 模式 ──────────────────────────────────────────────
    const realSb = sb as SupabaseClient;

    // 1. 上传二进制文件到 Supabase Storage
    const { error: uploadErr } = await realSb.storage
      .from(input.bucket)
      .upload(path, input.file, { contentType: input.file.type || 'application/octet-stream' });
    if (uploadErr) throw new Error(`文件上传失败：${uploadErr.message}`);

    // 2. 获取公开 URL
    const { data: urlData } = realSb.storage.from(input.bucket).getPublicUrl(path);

    // 3. 写入 documents 表（非 files 视图）
    const row: Record<string, unknown> = {
      bucket: input.bucket,
      path,
      original_name: input.file.name,
      mime_type: input.file.type || 'application/octet-stream',
      size_bytes: input.file.size,
      storage_url: urlData.publicUrl,
      uploader_id: input.uploaderId,
      uploader_portal: input.uploaderPortal,
      ref_type: input.refType ?? null,
      ref_id: input.refId ?? null,
      doc_category: input.docCategory ?? null,
      created_at: t,
      updated_at: t,
    };

    const { data, error } = await realSb.from('documents').insert(row).select().single();
    if (error) throw new Error(error.message);

    // 映射为 FileRow 兼容格式
    const fileRow = { ...data, data_base64: data.storage_url ?? '' } as FileRow;
    return mapFileUi(fileRow);
  }

  // ── Mock 模式（原有逻辑） ──────────────────────────────────────────────
  const base64 = await fileToBase64(input.file);

  const row: Record<string, unknown> = {
    bucket: input.bucket,
    path,
    original_name: input.file.name,
    mime_type: input.file.type || 'application/octet-stream',
    size_bytes: input.file.size,
    data_base64: '',
    uploader_id: input.uploaderId,
    uploader_portal: input.uploaderPortal,
    ref_type: input.refType ?? null,
    ref_id: input.refId ?? null,
    doc_category: input.docCategory ?? null,
    created_at: t,
    updated_at: t,
  };

  const { data, error } = await sb.from('files').insert(row).single();
  if (error) throw new Error(error.message);

  const fileRow = data as FileRow;
  await saveFileBase64ToIDB(fileRow.id, base64);

  return mapFileUi(fileRow);
}

// ── List ────────────────────────────────────────────────────────────────────

export async function listFilesForEntity(
  refType: FileRefType,
  refId: string
): Promise<FileUi[]> {
  const sb = supabase;
  const table: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('ref_type', refType)
    .eq('ref_id', refId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as FileRow[]).map(mapFileUi);
}

export async function listFilesByBucket(bucket: FileBucket): Promise<FileUi[]> {
  const sb = supabase;
  const table: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('bucket', bucket)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as FileRow[]).map(mapFileUi);
}

// ── Download ────────────────────────────────────────────────────────────────

export async function downloadFileById(fileId: string): Promise<void> {
  const sb = supabase;
  const table: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('id', fileId)
    .single();
  if (error || !data) throw new Error('文件不存在');

  if (!isMockMode) {
    // 真实模式：从 Supabase Storage 下载
    const row = data as Record<string, unknown>;
    const realSb = sb as SupabaseClient;
    const bucket = String(row.bucket);
    const path = String(row.path);
    const { data: blob, error: dlErr } = await realSb.storage.from(bucket).download(path);
    if (dlErr || !blob) throw new Error('文件下载失败');
    triggerDownload(blob, String(row.original_name));
    return;
  }

  // Mock 模式
  const row = data as FileRow;
  const actualBase64 = row.data_base64 || await loadFileBase64FromIDB(row.id);
  if (!actualBase64) throw new Error('文件内容缺失或已损坏');

  const blob = base64ToBlob(actualBase64, row.mime_type);
  triggerDownload(blob, row.original_name);
}

/** 直接从 Blob / text 生成下载（用于合同生成等场景） */
export function downloadBlobAs(blob: Blob, filename: string): void {
  triggerDownload(blob, filename);
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

// ── Preview ─────────────────────────────────────────────────────────────────

export async function getFilePreviewUrl(fileId: string): Promise<string> {
  const sb = supabase;
  const table: any = isMockMode ? 'files' : 'documents'; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await sb
    .from(table)
    .select('*')
    .eq('id', fileId)
    .single();
  if (error || !data) throw new Error('文件不存在');

  if (!isMockMode) {
    // 真实模式：生成签名 URL 或使用 publicUrl
    const row = data as Record<string, unknown>;
    const realSb = sb as SupabaseClient;
    const bucket = String(row.bucket);
    const path = String(row.path);
    const { data: signedData, error: signErr } = await realSb.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
    if (signErr || !signedData?.signedUrl) {
      // fallback: 尝试 publicUrl
      const { data: pubData } = realSb.storage.from(bucket).getPublicUrl(path);
      return pubData.publicUrl;
    }
    return signedData.signedUrl;
  }

  // Mock 模式
  const row = data as FileRow;
  const actualBase64 = row.data_base64 || await loadFileBase64FromIDB(row.id);
  if (!actualBase64) throw new Error('文件内容缺失或已损坏');

  const blob = base64ToBlob(actualBase64, row.mime_type);
  return URL.createObjectURL(blob);
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFileById(fileId: string): Promise<void> {
  const sb = supabase;

  if (!isMockMode) {
    // 真实模式：先查出 bucket/path，从 Storage 删除，再删 documents 行
    const realSb = sb as SupabaseClient;
    const { data } = await realSb.from('documents').select('bucket, path').eq('id', fileId).single();
    if (data) {
      await realSb.storage.from(String(data.bucket)).remove([String(data.path)]).catch(() => {});
    }
    const { error } = await realSb.from('documents').delete().eq('id', fileId);
    if (error) throw new Error(error.message);
    return;
  }

  // Mock 模式
  const { error } = await sb.from('files').delete().eq('id', fileId);
  if (error) throw new Error(error.message);
  await deleteFileBase64FromIDB(fileId).catch(() => {});
}

// ── Contract Word Document Generation ───────────────────────────────────────

/**
 * 从合同 snapshot 生成 HTML 格式的 Word 文档并触发下载 (.doc)。
 * Word / WPS / LibreOffice 均可原生打开 HTML .doc 文件，无需额外依赖。
 */
function generateContractHtml(
  contractType: 'award' | 'execution',
  tenderSnapshot: Record<string, unknown>,
  bidSnapshot: Record<string, unknown>,
  agentSnapshot: Record<string, unknown>,
  platformSignee?: string | null,
  agentSignee?: string | null
): string {
  const typeLabel = contractType === 'award' ? '中标合同' : '执行合同';
  const t = tenderSnapshot;
  const b = bidSnapshot;
  const a = agentSnapshot;
  const contractNo = `${contractType.toUpperCase()}-${Date.now()}`;
  const date = new Date().toLocaleDateString('zh-CN');

  const row = (label: string, value: string) =>
    `<tr><td style="width:140px;padding:8px 12px;border:1px solid #ddd;background:#f9fafb;font-weight:600;color:#374151;">${label}</td><td style="padding:8px 12px;border:1px solid #ddd;color:#111827;">${value}</td></tr>`;

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${typeLabel}</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: '微软雅黑', 'SimSun', Arial, sans-serif; font-size: 12pt; color: #1f2937; line-height: 1.8; }
  h1 { text-align: center; font-size: 22pt; color: #0A2540; border-bottom: 3px solid #FF6B00; padding-bottom: 12px; margin-bottom: 6px; }
  .subtitle { text-align: center; color: #6b7280; font-size: 10pt; margin-bottom: 30px; }
  h2 { font-size: 14pt; color: #0A2540; border-left: 4px solid #FF6B00; padding-left: 10px; margin: 24px 0 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .sign-section { margin-top: 50px; display: flex; justify-content: space-between; }
  .sign-box { width: 45%; }
  .sign-box h3 { font-size: 12pt; color: #0A2540; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
  .sign-line { margin-top: 40px; border-bottom: 1px solid #374151; width: 200px; }
  .footer { text-align: center; margin-top: 60px; padding-top: 16px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 9pt; }
  .seal { text-align: center; margin-top: 20px; color: #dc2626; font-size: 14pt; font-weight: bold; border: 3px solid #dc2626; display: inline-block; padding: 8px 20px; border-radius: 8px; opacity: 0.7; }
</style></head><body>

<h1>🏛 ${typeLabel}</h1>
<div class="subtitle">合同编号：${contractNo} &nbsp;|&nbsp; 生成日期：${date}</div>

<h2>一、招标项目信息</h2>
<table>${row('招标标题', String(t.title ?? '—'))}${row('运输路线', String(t.route_label ?? `${t.origin ?? ''} → ${t.destination ?? ''}`))}${row('货物概要', String(t.cargo_summary ?? '—'))}${row('业务类型', String(t.biz_type ?? '—'))}${row('特殊要求', String(t.requirements ?? '无'))}</table>

<h2>二、中标方信息</h2>
<table>${row('代理商名称', String(a.name ?? '—'))}${row('合作等级', String(a.level_label ?? '—'))}${row('联系人', String(a.contact ?? '—'))}${row('联系电话', String(a.phone ?? '—'))}${row('所在地', String(a.location ?? '—'))}</table>

<h2>三、报价与合同金额</h2>
<table>${row('合同金额', `<span style="font-size:14pt;font-weight:bold;color:#FF6B00;">${b.currency ?? 'CNY'} ${Number(b.price ?? 0).toLocaleString()}</span>`)}${row('承诺时效', String(b.estimated_time ?? '—'))}${row('备注说明', String(b.remarks ?? '无'))}</table>

<h2>四、合同条款</h2>
<p>1. 本合同自双方签署之日起生效，有效期至项目交付完成。</p>
<p>2. 中标方应按照招标文件要求及投标承诺，按时、保质、保量完成运输任务。</p>
<p>3. 如遇不可抗力导致无法履约，应及时通知招标方并提供相关证明材料。</p>
<p>4. 违约责任按照国家相关法律法规及本合同约定执行。</p>
<p>5. 本合同一式两份，招标方与中标方各执一份，具有同等法律效力。</p>

<h2>五、签署</h2>
<table style="margin-top:20px;">
<tr>
  <td style="width:50%;padding:20px;border:1px solid #ddd;vertical-align:top;">
    <strong style="color:#0A2540;">甲方（招标方）</strong><br/><br/>
    签署人：${platformSignee ?? '<span style="color:#9ca3af">（待签署）</span>'}<br/><br/>
    <div style="margin-top:30px;border-bottom:1px solid #374151;width:180px;"></div>
    <div style="font-size:9pt;color:#6b7280;margin-top:4px;">签字 / 盖章</div>
  </td>
  <td style="width:50%;padding:20px;border:1px solid #ddd;vertical-align:top;">
    <strong style="color:#0A2540;">乙方（中标方）</strong><br/><br/>
    签署人：${agentSignee ?? '<span style="color:#9ca3af">（待签署）</span>'}<br/><br/>
    <div style="margin-top:30px;border-bottom:1px solid #374151;width:180px;"></div>
    <div style="font-size:9pt;color:#6b7280;margin-top:4px;">签字 / 盖章</div>
  </td>
</tr>
</table>

<div class="footer">
  <p>本合同由 <strong>玖链物流管理系统</strong> 自动生成</p>
  <p>© ${new Date().getFullYear()} 玖联璧合 · 中越跨境物流系统 · All Rights Reserved</p>
</div>

</body></html>`;
}

export function downloadContractAsWord(
  contractType: 'award' | 'execution',
  tenderSnapshot: Record<string, unknown>,
  bidSnapshot: Record<string, unknown>,
  agentSnapshot: Record<string, unknown>,
  platformSignee?: string | null,
  agentSignee?: string | null
): void {
  const html = generateContractHtml(
    contractType, tenderSnapshot, bidSnapshot, agentSnapshot,
    platformSignee, agentSignee
  );
  const typeLabel = contractType === 'award' ? '中标合同' : '执行合同';
  const blob = new Blob(
    ['\ufeff', html],
    { type: 'application/msword' }
  );
  triggerDownload(blob, `${typeLabel}_${new Date().toISOString().slice(0, 10)}.doc`);
}

/**
 * 生成中标通知书并下载为 Word 文档
 */
export function downloadAwardNotice(
  tenderTitle: string,
  route: string,
  bidPrice: number,
  bidCurrency: string,
  agentName?: string,
): void {
  const date = new Date().toLocaleDateString('zh-CN');
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>中标通知书</title>
<style>
  @page { margin: 2.5cm; }
  body { font-family: '微软雅黑', 'SimSun', Arial, sans-serif; font-size: 12pt; color: #1f2937; line-height: 1.8; }
  h1 { text-align: center; font-size: 22pt; color: #0A2540; border-bottom: 3px solid #FF6B00; padding-bottom: 12px; }
  .info { text-align: center; color: #6b7280; font-size: 10pt; margin-bottom: 30px; }
</style></head><body>
<h1>🏆 中标通知书</h1>
<div class="info">日期：${date}</div>
<p><strong>${agentName ?? '贵公司'}</strong>：</p>
<p style="text-indent:2em;">经我方综合评审，贵公司在招标项目 <strong>【${tenderTitle}】</strong>（运输路线：${route}）中表现优异，现正式通知贵公司中标。</p>
<p style="text-indent:2em;">中标金额：<strong style="color:#FF6B00;font-size:14pt;">${bidCurrency} ${bidPrice.toLocaleString()}</strong></p>
<p style="text-indent:2em;">请于收到本通知后 3 个工作日内登录系统签署中标合同，逾期未签署视为自动放弃中标。</p>
<br/><br/>
<p style="text-align:right;">招标方：玖联璧合跨境物流平台</p>
<p style="text-align:right;">日期：${date}</p>
<div style="text-align:center;margin-top:60px;padding-top:16px;border-top:2px solid #e5e7eb;color:#9ca3af;font-size:9pt;">
  © ${new Date().getFullYear()} 玖联璧合 · 中越跨境物流系统
</div>
</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  triggerDownload(blob, `中标通知书_${tenderTitle.slice(0, 20)}_${date}.doc`);
}

// backward compat alias
export const downloadContractAsText = downloadContractAsWord;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIcon(mimeType: string): 'image' | 'pdf' | 'doc' | 'sheet' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType === 'text/csv') return 'sheet';
  return 'file';
}

export const ACCEPT_STRING =
  'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
