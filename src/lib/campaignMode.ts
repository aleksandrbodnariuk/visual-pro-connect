export type CampaignMode = 'real' | 'test' | 'training';

export const CAMPAIGN_MODES: { value: CampaignMode; label: string; hint: string }[] = [
  { value: 'real', label: 'Справжня кампанія', hint: 'Бойові вибори' },
  { value: 'test', label: 'Тестовий режим', hint: 'Справжня робота людей на обраних дільницях, без підказок' },
  { value: 'training', label: 'Навчання', hint: 'Той самий процес із покроковими підказками для команди' },
];

/** Дільниці, що беруть участь у кампанії. Порожній перелік у тесті/навчанні означає всю структуру. */
export function campaignPrecincts<T extends { id: string }>(all: T[], mode: CampaignMode | undefined, ids: string[] | null | undefined): T[] {
  if (!mode || mode === 'real' || !ids?.length) return all;
  const set = new Set(ids);
  return all.filter((p) => set.has(p.id));
}
