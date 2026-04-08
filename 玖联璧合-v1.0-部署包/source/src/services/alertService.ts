import { supabase } from '../lib/supabase';
import type { ProjectAlertRow } from '../database/schema';

export type AlertUi = {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  severity: ProjectAlertRow['severity'];
};

function mapAlertUi(row: ProjectAlertRow): AlertUi {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    desc: row.desc,
    time: row.time,
    severity: row.severity,
  };
}

export async function fetchAlertsUi(): Promise<AlertUi[]> {
  const sb = supabase;
  const { data, error } = await sb
    .from('project_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ProjectAlertRow[]).map(mapAlertUi);
}

export async function updateAlertRow(
  id: string,
  patch: Pick<AlertUi, 'title' | 'desc' | 'severity'>
): Promise<void> {
  const sb = supabase;
  const { error } = await sb
    .from('project_alerts')
    .update({
      title: patch.title,
      desc: patch.desc,
      severity: patch.severity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAlertRow(id: string): Promise<void> {
  const sb = supabase;
  const { error } = await sb.from('project_alerts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
