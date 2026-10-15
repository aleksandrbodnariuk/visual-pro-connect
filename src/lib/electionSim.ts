/** Генератор даних «за спостерігачів» для демо й навчання. Лише подає вхідні дані; підрахунок робить система. */

export type SimStage = 'opened' | '12' | '16' | '20' | 'incidents' | 'protocols';

export const SIM_STAGES: { value: SimStage; label: string; time: string }[] = [
  { value: 'opened', label: 'Відкриття дільниць і кворум', time: '07:00' },
  { value: '12', label: 'Явка на 12:00', time: '12:00' },
  { value: '16', label: 'Явка на 16:00', time: '16:00' },
  { value: '20', label: 'Явка на 20:00', time: '20:00' },
  { value: 'incidents', label: 'Повідомлення про порушення', time: 'протягом дня' },
  { value: 'protocols', label: 'Протоколи підрахунку голосів', time: '22:00+' },
];

/** Детермінований псевдовипадковий генератор: одна дільниця завжди дає ті самі дані. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5; let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Підсумкова явка дільниці (частка) і накопичувальна явка на 12/16/20. */
export function precinctTurnout(seed: string, voters: number) {
  const r = seeded(seed);
  const final = 0.45 + r() * 0.25;
  const t12 = Math.round(voters * final * (0.25 + r() * 0.08));
  const t16 = Math.max(t12, Math.round(voters * final * (0.58 + r() * 0.1)));
  const t20 = Math.max(t16, Math.round(voters * final));
  return { '12': t12, '16': t16, '20': t20 } as Record<'12' | '16' | '20', number>;
}

/** Протокол: видані бюлетені = явка 20:00; голоси + недійсні точно дорівнюють виданим. */
export function precinctProtocol(seed: string, voters: number, candidateIds: string[]) {
  const issued = precinctTurnout(seed, voters)['20'];
  const r = seeded(seed + ':v');
  const invalid = Math.round(issued * (0.01 + r() * 0.02));
  const valid = issued - invalid;
  const weights = candidateIds.map(() => 0.3 + r());
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const votes: Record<string, number> = {};
  let left = valid;
  candidateIds.forEach((id, i) => {
    const v = i === candidateIds.length - 1 ? left : Math.min(left, Math.floor((valid * weights[i]) / sum));
    votes[id] = v; left -= v;
  });
  return { voters_on_list: voters, ballots_issued: issued, invalid_ballots: invalid, votes };
}

export const SIM_INCIDENTS = [
  'Видача бюлетеня без пред’явлення документа',
  'Агітація біля приміщення дільниці',
  'Фотографування заповненого бюлетеня',
  'Перешкоджання роботі офіційного спостерігача',
  'Підвезення виборців організованими групами',
];

/** Приблизно кожна восьма дільниця повідомляє про порушення. */
export function precinctIncident(seed: string): string | null {
  const r = seeded(seed + ':i');
  if (r() > 0.12) return null;
  return SIM_INCIDENTS[Math.floor(r() * SIM_INCIDENTS.length)];
}
