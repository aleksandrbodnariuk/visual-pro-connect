import { describe, expect, it } from 'vitest';
import { nameMatches, normalizeName } from './nameSearch';

describe('nameSearch', () => {
  it('знаходить кирилицею латинське імʼя', () => {
    expect(nameMatches('Боднарюк', 'Galyna Bodnariuk')).toBe(true);
  });

  it('пробачає різницю y/i у транслітерації', () => {
    expect(nameMatches('bodnaryuk', 'Galyna Bodnariuk')).toBe(true);
    expect(nameMatches('bodnariuk', 'Галина Боднарюк')).toBe(true);
  });

  it('знаходить за частиною імені', () => {
    expect(nameMatches('galyna', 'Galyna Bodnariuk')).toBe(true);
    expect(nameMatches('Галина', 'Galyna Bodnariuk')).toBe(true);
  });

  it('враховує кілька слів запиту', () => {
    expect(nameMatches('галина боднарюк', 'Galyna Bodnariuk')).toBe(true);
    expect(nameMatches('галина інша', 'Galyna Bodnariuk')).toBe(false);
  });

  it('не знаходить сторонніх і повертає false для пустого запиту', () => {
    expect(nameMatches('petro', 'Galyna Bodnariuk')).toBe(false);
    expect(nameMatches('', 'Galyna Bodnariuk')).toBe(false);
  });

  it('згортає и/і/ї до однієї форми', () => {
    expect(normalizeName('Ирина')).toBe(normalizeName('Ірина'));
    expect(nameMatches('ирина', 'Ірина Шевчук')).toBe(true);
  });
});
