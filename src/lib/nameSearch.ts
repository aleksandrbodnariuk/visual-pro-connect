/**
 * Гнучкий пошук людей за ім'ям: пробачає різницю між кирилицею та
 * латиницею («Боднарюк» == «Bodnariuk») та типові варіанти транслітерації
 * («y»/«i», «и»/«і»). Використовується в панелях доступу організацій.
 */

const CYR2LAT: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
  'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'i', 'і': 'i', 'ї': 'yi', 'й': 'i',
  'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
  'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
  'ы': 'i', 'э': 'e', 'ъ': '', 'ё': 'e',
};

/** Нормалізує ім'я/запит: нижній регістр, транслітерація, згортання y→i. */
export function normalizeName(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[а-яґєіїёъыэ]/g, (ch) => CYR2LAT[ch] ?? ch)
    .replace(/y/g, 'i') // bodnaryuk == bodnariuk
    .replace(/h/g, 'g') // галина == galyna (Г офіційно «h», але пишуть і «g»)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** true, якщо кожне слово запиту входить у нормалізоване ім'я. */
export function nameMatches(query: string, fullName: string | null | undefined): boolean {
  const tokens = normalizeName(query).split(' ').filter(Boolean);
  if (!tokens.length) return false;
  const name = normalizeName(fullName || '');
  return tokens.every((t) => name.includes(t));
}
