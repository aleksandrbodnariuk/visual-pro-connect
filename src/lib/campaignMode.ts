export type CampaignMode = 'real' | 'test' | 'training' | 'demo';

export const CAMPAIGN_MODES: { value: CampaignMode; label: string; hint: string }[] = [
  { value: 'real', label: 'Справжня кампанія', hint: 'Бойові вибори' },
  { value: 'test', label: 'Тестовий режим', hint: 'Справжня робота людей на обраних дільницях, без підказок' },
  { value: 'training', label: 'Навчання', hint: 'Призначені люди проходять свої ролі, усі інші ролі виконує система; підрахунок справжній' },
  { value: 'demo', label: 'Демо режим', hint: 'Система сама подає дані замість спостерігачів, а всі підрахунки, табло й результати працюють по-справжньому' },
];

export const MODE_BADGE: Record<CampaignMode, string> = { real: '', test: 'Тест', training: 'Навчання', demo: 'Демо' };

export type TraineeRole = 'observer' | 'lawyer' | 'agitation' | 'analyst';
export const TRAINEE_ROLES: { value: TraineeRole; label: string }[] = [
  { value: 'observer', label: 'Спостерігач дільниці' },
  { value: 'lawyer', label: 'Юрист штабу' },
  { value: 'agitation', label: 'Керівник агітації' },
  { value: 'analyst', label: 'Керівник / аналітик штабу' },
];

/** Дільниці, що беруть участь у кампанії. Порожній перелік у тесті/навчанні/демо означає всю структуру. */
export function campaignPrecincts<T extends { id: string }>(all: T[], mode: CampaignMode | undefined, ids: string[] | null | undefined): T[] {
  if (!mode || mode === 'real' || !ids?.length) return all;
  const set = new Set(ids);
  return all.filter((p) => set.has(p.id));
}
