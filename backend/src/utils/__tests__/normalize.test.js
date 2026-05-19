import { normalizeCnpj, normalizeDocument, normalizeEmail, normalizeName } from '../normalize.js';

describe('Normalize utilities', () => {
  test('normalizeEmail lowercases and trims', () => {
    expect(normalizeEmail('  Test@Example.com ')).toBe('test@example.com');
  });

  test('normalizeName strips accents and collapses spaces', () => {
    expect(normalizeName('  Jose  da  Silva ')).toBe('jose da silva');
    expect(normalizeName('Jo\u00e3o   P\u00e9ReZ')).toBe('joao perez');
  });

  test('normalizeDocument keeps digits only', () => {
    expect(normalizeDocument('123.456.789-00')).toBe('12345678900');
  });

  test('normalizeCnpj keeps 14 digits', () => {
    expect(normalizeCnpj('12.345.678/0001-95')).toBe('12345678000195');
    expect(normalizeCnpj('123')).toBeNull();
  });
});
