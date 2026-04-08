import { createSeedDatabase } from './seed';
import type {
  AgentRow,
  BidRow,
  ContractRow,
  DatabaseSchema,
  ProjectRow,
  TableName,
  TenderRow,
} from './schema';

const LS_KEY = 'jl_mock_supabase_db_v1';
const BC_NAME = 'jl-mock-supabase-sync';

export interface PostgrestError {
  message: string;
  code: string;
  details?: string;
}

export interface PostgrestSingleResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

function err(message: string, code: string): PostgrestError {
  return { message, code };
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function finalizeDatabase(db: DatabaseSchema): DatabaseSchema {
  const seed = createSeedDatabase();
  const tenderSeed = new Map(seed.tenders.map((t) => [t.id, t]));
  return {
    ...db,
    tenders: (db.tenders as TenderRow[]).map((t) => ({
      ...t,
      invited_agent_ids: Array.isArray(t.invited_agent_ids)
        ? t.invited_agent_ids
        : tenderSeed.get(t.id)?.invited_agent_ids ?? [],
    })),
    projects: (db.projects as ProjectRow[]).map((p) => ({
      ...p,
      source_tender_id: p.source_tender_id ?? p.tender_id ?? null,
      awarded_agent_id: p.awarded_agent_id ?? p.agent_id ?? null,
    })),
  };
}

let memoryDb: DatabaseSchema = finalizeDatabase(clone(createSeedDatabase()));
const localSubs = new Set<() => void>();

function nowIso() {
  return new Date().toISOString();
}

function mergeWithSeed(parsed: Partial<DatabaseSchema> | null): DatabaseSchema {
  const seed = createSeedDatabase();
  if (!parsed || typeof parsed !== 'object') return clone(seed);
  return {
    agents: parsed.agents ?? seed.agents,
    app_users: parsed.app_users ?? seed.app_users,
    customers: parsed.customers ?? seed.customers,
    tenders: parsed.tenders ?? seed.tenders,
    bids: parsed.bids ?? seed.bids,
    projects: parsed.projects ?? seed.projects,
    potential_projects: parsed.potential_projects ?? seed.potential_projects,
    agent_applications: parsed.agent_applications ?? seed.agent_applications,
    contracts: parsed.contracts ?? seed.contracts,
    project_alerts: parsed.project_alerts ?? seed.project_alerts,
    files: parsed.files ?? seed.files,
    free_templates: parsed.free_templates ?? seed.free_templates,
  };
}

function loadFromStorage(): DatabaseSchema {
  if (typeof localStorage === 'undefined') {
    return clone(createSeedDatabase());
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const s = finalizeDatabase(clone(createSeedDatabase()));
      localStorage.setItem(LS_KEY, JSON.stringify(s));
      return s;
    }
    return finalizeDatabase(
      mergeWithSeed(JSON.parse(raw) as Partial<DatabaseSchema>)
    );
  } catch {
    return finalizeDatabase(clone(createSeedDatabase()));
  }
}

function persist(db: DatabaseSchema) {
  memoryDb = db;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    try {
      const bc = new BroadcastChannel(BC_NAME);
      bc.postMessage({ t: Date.now() });
      bc.close();
    } catch {
      /* ignore */
    }
  }
  localSubs.forEach((fn) => fn());
}

function ensureInit() {
  if (typeof window === 'undefined') return;
  memoryDb = loadFromStorage();
}

if (typeof window !== 'undefined') {
  memoryDb = loadFromStorage();
  window.addEventListener('storage', (e) => {
    if (e.key !== LS_KEY || e.newValue == null) return;
    try {
      memoryDb = finalizeDatabase(
        mergeWithSeed(JSON.parse(e.newValue) as Partial<DatabaseSchema>)
      );
      localSubs.forEach((fn) => fn());
    } catch {
      /* ignore */
    }
  });
  try {
    const bc = new BroadcastChannel(BC_NAME);
    bc.onmessage = () => {
      memoryDb = loadFromStorage();
      localSubs.forEach((fn) => fn());
    };
  } catch {
    /* ignore */
  }
}

export function subscribeMockDatabase(cb: () => void): () => void {
  localSubs.add(cb);
  return () => localSubs.delete(cb);
}

export function resetMockDatabaseToSeed(): void {
  const s = finalizeDatabase(clone(createSeedDatabase()));
  persist(s);
}

function getTable(name: TableName): DatabaseSchema[TableName] {
  return memoryDb[name] as DatabaseSchema[TableName];
}

function setTable<K extends TableName>(name: K, rows: DatabaseSchema[K]) {
  (memoryDb as unknown as Record<string, unknown>)[name] = rows as unknown;
  persist(clone(memoryDb));
}

type EmbedSpec = { alias: string; fkOnChild: string; parentKey: string };

function parseSelect(
  sel: string,
  parentTable: TableName
): { columns: string; embeds: EmbedSpec[] } {
  const embeds: EmbedSpec[] = [];
  const parts = sel.split(',').map((s) => s.trim());
  const cols: string[] = [];
  for (const p of parts) {
    const m = /^(\w+)\(\*\)$/.exec(p);
    if (m) {
      const alias = m[1];
      if (parentTable === 'tenders' && alias === 'bids') {
        embeds.push({ alias: 'bids', fkOnChild: 'tender_id', parentKey: 'id' });
      } else if (parentTable === 'bids' && alias === 'agents') {
        embeds.push({ alias: 'agents', fkOnChild: 'agent_id', parentKey: 'id' });
      } else {
        embeds.push({ alias, fkOnChild: `${alias.slice(0, -1)}_id`, parentKey: 'id' });
      }
    } else if (p === '*') {
      cols.push('*');
    } else {
      cols.push(p);
    }
  }
  return { columns: cols.includes('*') ? '*' : cols.join(','), embeds };
}

function applyEmbeds(
  parentTable: TableName,
  rows: Record<string, unknown>[],
  embeds: EmbedSpec[]
): Record<string, unknown>[] {
  if (!embeds.length) return rows;
  return rows.map((row) => {
    const o = { ...row };
    for (const e of embeds) {
      if (parentTable === 'tenders' && e.alias === 'bids') {
        const bids = (getTable('bids') as BidRow[]).filter(
          (b) => b.tender_id === row.id
        );
        o.bids = bids.map((b) => ({ ...b }));
      }
      if (parentTable === 'bids' && e.alias === 'agents') {
        const ag = (getTable('agents') as AgentRow[]).find(
          (a) => a.id === row.agent_id
        );
        o.agents = ag ? { ...ag } : null;
      }
    }
    return o;
  });
}

type OrClause = { col: string; op: 'ilike' | 'eq'; pattern: string };

class MockQueryBuilder<T = unknown> implements PromiseLike<PostgrestSingleResponse<T>> {
  private filters: { col: string; val: unknown }[] = [];
  /** PostgREST：数组列包含给定子集，如 invited_agent_ids @> {AG-001} */
  private containsSpecs: { col: string; vals: unknown[] }[] = [];
  private orClauses: OrClause[] | null = null;
  private orderSpec: { col: string; asc: boolean } | null = null;
  private wantSingle = false;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: unknown = null;
  private selectStr = '*';

  constructor(private readonly table: TableName) { }

  select(s = '*') {
    this.selectStr = s;
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  contains(col: string, vals: unknown[]) {
    this.containsSpecs.push({ col, vals: [...vals] });
    return this;
  }

  /** 简化版 PostgREST or：如 `name.ilike.%x%,contact.ilike.%x%` */
  or(expr: string) {
    const parts = expr.split(',').map((p) => p.trim());
    const clauses: OrClause[] = [];
    for (const p of parts) {
      const m = /^(\w+)\.(ilike|eq)\.(.+)$/.exec(p);
      if (!m) continue;
      const col = m[1];
      const op = m[2] as 'ilike' | 'eq';
      let val = m[3];
      if (op === 'ilike') {
        val = val.replace(/^%+|%+$/g, '');
      }
      clauses.push({ col, op, pattern: val });
    }
    this.orClauses = clauses.length ? clauses : null;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderSpec = { col, asc: opts?.ascending !== false };
    return this;
  }

  single() {
    this.wantSingle = true;
    return this;
  }

  insert(row: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = 'insert';
    this.payload = row;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }

  delete() {
    this.op = 'delete';
    this.payload = null;
    return this;
  }

  then<TResult1 = PostgrestSingleResponse<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: PostgrestSingleResponse<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as never, onrejected as never);
  }

  private match(row: Record<string, unknown>) {
    return this.filters.every((f) => row[f.col] === f.val);
  }

  private matchOr(row: Record<string, unknown>) {
    if (!this.orClauses?.length) return true;
    for (const c of this.orClauses) {
      const cell = String(row[c.col] ?? '');
      if (c.op === 'ilike' && cell.toLowerCase().includes(c.pattern.toLowerCase())) {
        return true;
      }
      if (c.op === 'eq' && cell === c.pattern) return true;
    }
    return false;
  }

  private matchContains(row: Record<string, unknown>) {
    for (const s of this.containsSpecs) {
      const raw = row[s.col];
      if (!Array.isArray(raw)) return false;
      for (const v of s.vals) {
        if (!raw.some((x) => x === v)) return false;
      }
    }
    return true;
  }

  private rowMatches(row: Record<string, unknown>) {
    return this.match(row) && this.matchOr(row) && this.matchContains(row);
  }

  private async execute(): Promise<PostgrestSingleResponse<T>> {
    ensureInit();
    const tbl = this.table;
    const rows = getTable(tbl) as unknown as Record<string, unknown>[];

    if (this.op === 'delete') {
      const next = rows.filter((r) => !this.rowMatches(r));
      if (next.length === rows.length) {
        return { data: null, error: err('No rows matched', 'PGRST116') };
      }
      setTable(tbl, next as never);
      return { data: null, error: null };
    }

    if (this.op === 'update') {
      const patch = this.payload as Record<string, unknown>;
      const updatedRows: Record<string, unknown>[] = [];
      const next = rows.map((r) => {
        if (!this.rowMatches(r)) return r;
        const nr = { ...r, ...patch, updated_at: nowIso() };
        updatedRows.push(nr);
        return nr;
      });
      if (!updatedRows.length) {
        return { data: null, error: err('No rows matched', 'PGRST116') };
      }
      setTable(tbl, next as never);
      const { embeds } = parseSelect(this.selectStr, tbl);
      const shaped = applyEmbeds(tbl, updatedRows, embeds) as T[];
      if (this.wantSingle) {
        const one = shaped[0] ?? null;
        if (!one) {
          return { data: null, error: err('No rows returned', 'PGRST116') };
        }
        return { data: one as T, error: null };
      }
      return { data: shaped as T, error: null };
    }

    if (this.op === 'insert') {
      const raw = this.payload;
      const list = Array.isArray(raw) ? raw : [raw];
      const inserted: Record<string, unknown>[] = [];
      const t = nowIso();
      for (const item of list) {
        const row = { ...item, created_at: t, updated_at: t } as Record<
          string,
          unknown
        >;
        if (tbl === 'tenders' && !Array.isArray(row.invited_agent_ids)) {
          row.invited_agent_ids = [];
        }
        if (!row.id) {
          if (tbl === 'tenders') row.id = `TND-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          else if (tbl === 'bids')
            row.id = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          else if (tbl === 'projects') {
            row.id = `PRJ-${Date.now()}`;
            if (row.source_tender_id === undefined) {
              row.source_tender_id = row.tender_id ?? null;
            }
            if (row.awarded_agent_id === undefined) {
              row.awarded_agent_id = row.agent_id ?? null;
            }
          }
          else if (tbl === 'potential_projects')
            row.id = `P-${Date.now().toString(36)}`;
          else if (tbl === 'contracts')
            row.id = `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          else if (tbl === 'customers')
            row.id = `CUS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          else if (tbl === 'files')
            row.id = `FILE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          else if (tbl === 'free_templates')
            row.id = `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        inserted.push(row);
      }
      setTable(tbl, [...rows, ...inserted] as never);
      const { embeds } = parseSelect(this.selectStr, tbl);
      const shaped = applyEmbeds(tbl, inserted, embeds) as T[];
      if (this.wantSingle) {
        return {
          data: (shaped[0] ?? null) as T,
          error: null,
        };
      }
      return { data: shaped as T, error: null };
    }

    // select
    let filtered = rows.filter((r) => this.rowMatches(r));
    if (this.orderSpec) {
      const { col, asc } = this.orderSpec;
      filtered = [...filtered].sort((a, b) => {
        const va = a[col];
        const vb = b[col];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const c = va < vb ? -1 : 1;
        return asc ? c : -c;
      });
    }
    const { embeds } = parseSelect(this.selectStr, tbl);
    const shaped = applyEmbeds(tbl, filtered, embeds) as T[];
    if (this.wantSingle) {
      if (shaped.length !== 1) {
        return {
          data: null,
          error: err(
            shaped.length === 0 ? 'No rows' : 'Multiple rows',
            'PGRST116'
          ),
        };
      }
      return { data: shaped[0] as T, error: null };
    }
    return { data: shaped as T, error: null };
  }
}

async function awardTenderTx(
  tenderId: string,
  winningBidId: string
): Promise<PostgrestSingleResponse<{ project_id: string; contract_id: string }>> {
  ensureInit();
  const tenders = getTable('tenders') as TenderRow[];
  const bids = getTable('bids') as BidRow[];
  const projects = getTable('projects') as ProjectRow[];
  const agents = getTable('agents') as AgentRow[];
  const contracts = getTable('contracts') as ContractRow[];

  const tender = tenders.find((t) => t.id === tenderId);
  const win = bids.find((b) => b.id === winningBidId && b.tender_id === tenderId);
  if (!tender || !win) {
    return { data: null, error: err('招标或报价不存在', 'PGRST301') };
  }
  if (tender.status === 'awarded') {
    return { data: null, error: err('该招标已定标', 'PGRST301') };
  }

  const tUpd = tenders.map((t) =>
    t.id === tenderId
      ? { ...t, status: 'awarded' as const, updated_at: nowIso() }
      : t
  );
  const bUpd = bids.map((b) => {
    if (b.tender_id !== tenderId) return b;
    if (b.id === winningBidId) {
      return { ...b, status: 'accepted' as const, updated_at: nowIso() };
    }
    return { ...b, status: 'rejected' as const, updated_at: nowIso() };
  });

  const agent = agents.find((a) => a.id === win.agent_id);
  const pid = `PRJ-${Date.now()}`;
  const proj: ProjectRow = {
    id: pid,
    tender_id: tenderId,
    source_tender_id: tenderId,
    winning_bid_id: winningBidId,
    agent_id: win.agent_id,
    awarded_agent_id: win.agent_id,
    client_id: null,
    client_name: null,
    name: `${tender.title} · 履约`,
    origin: tender.origin,
    destination: tender.destination,
    route: tender.route_label,
    cargo_type: tender.biz_type ?? tender.cargo_summary.slice(0, 32),
    progress: 0,
    status: 'preparing',
    manager: agent ? `承运 ${agent.name}` : '待分配',
    amount_display: `${win.currency} ${win.price.toLocaleString()}`,
    source: 'award',
    source_potential_id: null,
    current_location: null,
    weight: null,
    eta: null,
    priority_label: null,
    transport_type: null,
    rating: null,
    completed_date: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  // 自动生成中标合同
  const cid = `CTR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const awardContract: ContractRow = {
    id: cid,
    contract_type: 'award',
    tender_id: tenderId,
    bid_id: winningBidId,
    project_id: pid,
    agent_id: win.agent_id,
    parent_contract_id: null,
    status: 'pending_agent_sign',
    tender_snapshot: JSON.stringify(tender),
    bid_snapshot: JSON.stringify(win),
    agent_snapshot: JSON.stringify(agent ?? {}),
    platform_signee: null,
    agent_signee: null,
    agent_signed_at: null,
    platform_confirmed_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  memoryDb = {
    ...memoryDb,
    tenders: tUpd,
    bids: bUpd,
    projects: [proj, ...projects],
    contracts: [awardContract, ...contracts],
  };
  persist(memoryDb);
  return { data: { project_id: pid, contract_id: cid }, error: null };
}

export interface MockSupabaseClient {
  from: (t: TableName) => MockQueryBuilder;
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<PostgrestSingleResponse<unknown>>;
  subscribe: (cb: () => void) => () => void;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    from: (t: TableName) => new MockQueryBuilder(t),
    rpc: async (fn, params = {}) => {
      if (fn === 'award_tender') {
        return awardTenderTx(
          params.p_tender_id as string,
          params.p_winning_bid_id as string
        ) as Promise<PostgrestSingleResponse<unknown>>;
      }
      return { data: null, error: err(`未知 RPC: ${fn}`, 'PGRST301') };
    },
    subscribe: subscribeMockDatabase,
  };
}

let _client: MockSupabaseClient | null = null;

/** 业务层唯一入口：日后替换为 createClient(url,key) 即可 */
export function getMockSupabase(): MockSupabaseClient {
  if (!_client) _client = createMockSupabaseClient();
  return _client;
}
