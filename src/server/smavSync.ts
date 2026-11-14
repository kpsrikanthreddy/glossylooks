/** Server-only Glossy Looks → SMAV identity gateway. No service_role key is used here. */
export type SyncStaff = {
  sourceId: string; username?: string; email: string; name: string;
  phone?: string; role: string; active: boolean; password?: string;
};

const url = () => (process.env.SMAV_SUPABASE_URL || '').replace(/\/$/, '');
const integrationKey = () => process.env.GLOSSYLOOKS_INTEGRATION_KEY || '';

async function invoke(action: string, payload: Record<string, unknown>) {
  if (!url() || !integrationKey()) throw new Error('SMAV_SUPABASE_URL and GLOSSYLOOKS_INTEGRATION_KEY must be set on the salon server');
  const response = await fetch(`${url()}/functions/v1/smav-identity-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Business-Source': 'glossylooks',
      'X-Integration-Key': integrationKey(),
      // Supabase gateway must allow function-side authorization for integration calls.
      ...(process.env.SMAV_SUPABASE_ANON_KEY ? { apikey: process.env.SMAV_SUPABASE_ANON_KEY } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) throw new Error(result.error || result.message || `SMAV gateway HTTP ${response.status}`);
  return result;
}

export async function syncSmavStaff(_outletCode: 'glossylooks' | 'mozz', staff: SyncStaff) {
  if (!staff.sourceId || !staff.email?.includes('@')) throw new Error('SMAV sync requires a staff source ID and email');
  const result = await invoke('sync-glossylooks', {
    staff: [{
      id: staff.sourceId, externalStaffId: staff.sourceId,
      username: staff.username || '', email: staff.email.trim().toLowerCase(),
      name: staff.name, phone: staff.phone || '', role: staff.role,
      isActive: staff.active,
    }],
  });
  const row = result.results?.[0];
  if (!row || row.status !== 'synced') throw new Error(row?.error || row?.reason || 'SMAV sync did not confirm success');
  // Never send passwords via bulk synchronization; use the dedicated privileged reset endpoint.
  if (staff.password) {
    if (staff.password.length < 8) throw new Error('Central SMAV password must be at least 8 characters');
    const reset = await invoke('reset-password', {
      email: staff.email.trim().toLowerCase(), outletCode: 'glossylooks', newPassword: staff.password,
    });
    if (!reset.success) throw new Error('SMAV password reset not confirmed');
  }
  return { synced: true, outletCode: 'glossylooks', status: row.status };
}
