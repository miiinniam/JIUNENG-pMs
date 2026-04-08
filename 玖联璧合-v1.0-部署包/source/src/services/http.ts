export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

function authHeaders(): HeadersInit {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: HeadersInit = {
    ...authHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  const isForm = init.body instanceof FormData;
  if (!isForm && init.method && init.method !== 'GET' && init.method !== 'HEAD') {
    (headers as Record<string, string>)['Content-Type'] =
      (headers as Record<string, string>)['Content-Type'] ?? 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[API] 网络错误', url, err);
    throw err;
  }

  const text = await res.text();
  if (!res.ok) {
    console.error('[API] 请求失败', res.status, url, text);
    throw new ApiError(
      text || `请求失败（${res.status}）`,
      res.status,
      text
    );
  }

  if (res.status === 204 || text === '') {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error('[API] JSON 解析失败', url, text);
    throw new Error('响应格式不是有效的 JSON');
  }
}
