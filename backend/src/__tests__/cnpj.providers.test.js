import { CnpjProvider } from '../services/CnpjProvider.js';
import { CnpjImportService } from '../services/CnpjImportService.js';

describe('CNPJ provider utilities', () => {
  test('normalizeCnpj strips formatting', () => {
    const provider = new CnpjProvider();
    expect(provider.normalizeCnpj('12.345.678/0001-95')).toBe('12345678000195');
  });

  test('normalizeCnpj rejects invalid input', () => {
    const provider = new CnpjProvider();
    expect(() => provider.normalizeCnpj('123')).toThrow('Invalid CNPJ format');
  });
});

describe('CnpjImportService provider fallback', () => {
  test('uses next provider when primary fails', async () => {
    const providers = [
      {
        getProviderName: () => 'primary',
        lookup: async () => {
          throw new Error('primary failed');
        },
      },
      {
        getProviderName: () => 'secondary',
        lookup: async (cnpj) => ({
          cnpj: String(cnpj).replace(/\D/g, ''),
          legalName: 'Acme LTDA',
          tradeName: 'Acme',
          status: 'ATIVA',
          address: null,
          people: [],
          phones: [],
          raw: {},
        }),
      },
    ];

    const service = new CnpjImportService({ providers });
    const result = await service.lookupWithFallback('12.345.678/0001-95');

    expect(result.providerName).toBe('secondary');
    expect(result.payload.cnpj).toBe('12345678000195');
  });
});
