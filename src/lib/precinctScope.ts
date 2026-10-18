import { subtreeIds } from './precinctStatus';

/** Що саме завантажувати для користувача: усе, лише свої штаби з підлеглими, або лише свої дільниці. */
export type PrecinctScope =
  | { kind: 'all' }
  | { kind: 'hqs'; hqIds: string[] }
  | { kind: 'precincts'; precinctIds: string[] };

export function resolvePrecinctScope(opts: {
  isAdmin: boolean;
  managedHqIds: Iterable<string>;
  hqs: { id: string; parent_id: string | null }[];
  myPrecinctIds: Iterable<string>;
  /** Юрист, керівник агітації чи аналітик бачать усю кампанію. */
  wideRole?: boolean;
}): PrecinctScope {
  if (opts.isAdmin || opts.wideRole) return { kind: 'all' };
  const managed = [...opts.managedHqIds];
  if (managed.length) {
    const all = new Set<string>();
    for (const id of managed) subtreeIds(opts.hqs, id).forEach((x) => all.add(x));
    return { kind: 'hqs', hqIds: [...all] };
  }
  return { kind: 'precincts', precinctIds: [...new Set(opts.myPrecinctIds)] };
}

/** Ділить список ID на частини, щоб запит не перевищував довжину адреси. */
export function chunk<T>(list: T[], size = 150): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
