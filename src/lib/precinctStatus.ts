export type PrecinctStatus = 'silent' | 'opened' | 'turnout' | 'counting' | 'accepted';

export const STATUS_META: Record<PrecinctStatus, { label: string; cls: string }> = {
  silent: { label: "Не вийшла на зв'язок", cls: 'bg-muted text-muted-foreground' },
  opened: { label: 'Відкрилась', cls: 'bg-blue-500/20 text-blue-400' },
  turnout: { label: 'Явка внесена', cls: 'bg-yellow-500/20 text-yellow-400' },
  counting: { label: 'Йде підрахунок', cls: 'bg-orange-500/20 text-orange-400' },
  accepted: { label: 'Протокол прийнято', cls: 'bg-green-500/20 text-green-400' },
};
export const STATUS_ORDER: PrecinctStatus[] = ['silent', 'opened', 'turnout', 'counting', 'accepted'];

/** Status of one precinct from its election-day reports and protocol. */
export function precinctStatus(reports: { kind: string; slot: string | null }[], hasProtocol: boolean): PrecinctStatus {
  if (hasProtocol) return 'accepted';
  if (reports.some((r) => r.kind === 'turnout' && r.slot === '20')) return 'counting';
  if (reports.some((r) => r.kind === 'turnout')) return 'turnout';
  if (reports.some((r) => r.kind === 'opened')) return 'opened';
  return 'silent';
}

/** All hq ids in the subtree rooted at `rootId` (inclusive). */
export function subtreeIds(hqs: { id: string; parent_id: string | null }[], rootId: string): Set<string> {
  const out = new Set([rootId]);
  let grew = true;
  while (grew) { grew = false; for (const h of hqs) if (h.parent_id && out.has(h.parent_id) && !out.has(h.id)) { out.add(h.id); grew = true; } }
  return out;
}
