/** ISO 3166-1 alpha-2 -> Ukrainian name */
export const countryNamesUk: Record<string, string> = {
  UA: 'Україна', PL: 'Польща', DE: 'Німеччина', US: 'США', GB: 'Великобританія',
  FR: 'Франція', IT: 'Італія', ES: 'Іспанія', CZ: 'Чехія', SK: 'Словаччина',
  RO: 'Румунія', HU: 'Угорщина', AT: 'Австрія', NL: 'Нідерланди', BE: 'Бельгія',
  PT: 'Португалія', SE: 'Швеція', NO: 'Норвегія', DK: 'Данія', FI: 'Фінляндія',
  CH: 'Швейцарія', IE: 'Ірландія', LT: 'Литва', LV: 'Латвія', EE: 'Естонія',
  BG: 'Болгарія', HR: 'Хорватія', SI: 'Словенія', RS: 'Сербія', BA: 'Боснія і Герцеговина',
  ME: 'Чорногорія', MK: 'Північна Македонія', AL: 'Албанія', GR: 'Греція', TR: 'Туреччина',
  CY: 'Кіпр', MT: 'Мальта', LU: 'Люксембург', IS: 'Ісландія', GE: 'Грузія',
  MD: 'Молдова', BY: 'Білорусь', RU: 'Росія', KZ: 'Казахстан', AZ: 'Азербайджан',
  AM: 'Вірменія', UZ: 'Узбекистан', TM: 'Туркменістан', KG: 'Киргизстан', TJ: 'Таджикистан',
  CA: 'Канада', MX: 'Мексика', BR: 'Бразилія', AR: 'Аргентина', CL: 'Чилі',
  CO: 'Колумбія', PE: 'Перу', VE: 'Венесуела', CN: 'Китай', JP: 'Японія',
  KR: 'Південна Корея', IN: 'Індія', TH: 'Таїланд', VN: 'В\'єтнам', PH: 'Філіппіни',
  ID: 'Індонезія', MY: 'Малайзія', SG: 'Сінгапур', AU: 'Австралія', NZ: 'Нова Зеландія',
  ZA: 'Південна Африка', EG: 'Єгипет', NG: 'Нігерія', KE: 'Кенія', MA: 'Марокко',
  IL: 'Ізраїль', AE: 'ОАЕ', SA: 'Саудівська Аравія', QA: 'Катар',
};

/** Get Ukrainian country name from ISO code, fallback to code */
export function getCountryNameUk(code: string | null | undefined): string {
  if (!code) return '—';
  const upper = code.toUpperCase();
  return countryNamesUk[upper] || upper;
}

/** Generate emoji flag from ISO 3166-1 alpha-2 code */
export function getFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  const codePoints = [...upper].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
