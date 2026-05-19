import axios from 'axios';
import CnpjProvider from './CnpjProvider.js';

/**
 * BrasilApiCnpjAdapter - Brasil API CNPJ provider implementation
 * Default baseUrl: https://brasilapi.com.br/api
 */

export class BrasilApiCnpjAdapter extends CnpjProvider {
  constructor(config = {}) {
    super(config);

    this.baseUrl = config.baseUrl || 'https://brasilapi.com.br/api';
    this.lookupPath = config.lookupPath || '/cnpj/v1';
    this.timeoutMs = config.timeoutMs || 8000;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
    });
  }

  getProviderName() {
    return 'brasilapi';
  }

  async lookup(cnpj) {
    const normalized = this.normalizeCnpj(cnpj);

    try {
      const response = await this.client.get(`${this.lookupPath}/${normalized}`);
      const payload = response.data || {};

      return this.normalizePayload(normalized, payload);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Brasil API lookup failed: ${message}`);
    }
  }

  normalizePayload(cnpj, payload) {
    const address = normalizeAddress({
      street: payload.logradouro,
      number: payload.numero,
      district: payload.bairro,
      city: payload.municipio,
      state: payload.uf,
      zip: payload.cep,
    });

    return {
      cnpj,
      legalName: payload.razao_social || null,
      tradeName: payload.nome_fantasia || null,
      status: payload.descricao_situacao_cadastral || payload.situacao_cadastral || null,
      address,
      phones: extractPhones(payload),
      people: extractPeople(payload),
      raw: payload,
    };
  }
}

function normalizeAddress(address) {
  const hasAny = Object.values(address).some((value) => Boolean(value));
  return hasAny ? address : null;
}

function extractPhones(payload) {
  const candidates = [
    payload.ddd_telefone_1,
    payload.ddd_telefone_2,
    payload.telefone,
    payload.telefone1,
    payload.telefone2,
  ].filter(Boolean);

  return candidates.map((raw) => ({ raw }));
}

function extractPeople(payload) {
  if (!Array.isArray(payload.qsa)) {
    return [];
  }

  return payload.qsa.map((entry) => ({
    fullName: entry.nome_socio || entry.nome || null,
    roleTitle: entry.qualificacao_socio || entry.cargo || null,
    document: entry.cnpj_cpf_do_socio || entry.documento || null,
  }));
}

export default BrasilApiCnpjAdapter;
