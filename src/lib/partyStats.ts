import type { PartyHq, PartyMember } from '@/hooks/orgs/useOrganizations';

/** Повертає id штабу та всіх його підлеглих. */
export function subtreeIds(hqs: PartyHq[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const h of hqs) if (h.parent_id && ids.has(h.parent_id) && !ids.has(h.id)) { ids.add(h.id); grew = true; }
  }
  return ids;
}

const norm = (s: string | null | undefined) => (s || '').trim().toLowerCase();

/** Члени, чий осередок (unit_name) належить до вибраних штабів. */
export function membersInScope(members: PartyMember[], hqs: PartyHq[], scope: Set<string> | null): PartyMember[] {
  if (!scope) return members;
  const names = new Set(hqs.filter((h) => scope.has(h.id)).map((h) => norm(h.name)));
  return members.filter((m) => names.has(norm(m.unit_name)));
}

export function statusCounts(members: PartyMember[]) {
  const c = { active: 0, candidate: 0, honorary: 0, suspended: 0 };
  members.forEach((m) => { c[m.status] = (c[m.status] || 0) + 1; });
  return c;
}

/** Кількість членів у кожному безпосередньо підлеглому штабі (разом з його гілкою). */
export function membersByChild(members: PartyMember[], hqs: PartyHq[], parentId: string | null) {
  const children = hqs.filter((h) => (parentId ? h.parent_id === parentId : h.level === 'oblast'));
  return children.map((c) => {
    const sub = membersInScope(members, hqs, subtreeIds(hqs, c.id));
    const s = statusCounts(sub);
    return { name: c.name, members: s.active + s.honorary, candidates: s.candidate, total: sub.length };
  }).sort((a, b) => b.total - a.total);
}

/** Члени, чий осередок не збігається з жодним штабом (не потрапляють у діаграми). */
export function unmatchedMembers(members: PartyMember[], hqs: PartyHq[]): PartyMember[] {
  const names = new Set(hqs.map((h) => norm(h.name)));
  return members.filter((m) => !names.has(norm(m.unit_name)));
}
