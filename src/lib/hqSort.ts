/** Номер округу з назви або регіону штабу ("Округ № 12", "ОВО 24"); null — якщо номера немає. */
export function okrugNumber(h: { name: string; region?: string | null }): number | null {
  const m = `${h.name} ${h.region || ''}`.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** Штаби за номером округу (1, 2, … 10), без номера — в кінці за назвою. */
export function sortHqsByOkrug<T extends { name: string; region?: string | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const na = okrugNumber(a), nb = okrugNumber(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na === null && nb !== null) return 1;
    if (na !== null && nb === null) return -1;
    return a.name.localeCompare(b.name, 'uk', { numeric: true });
  });
}
