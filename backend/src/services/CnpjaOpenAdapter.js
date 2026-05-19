import axios from 'axios';
import CnpjProvider from './CnpjProvider.js';

/**
 * CnpjaOpenAdapter - CNPJA Open API provider implementation
 * Default baseUrl: https://cnpja.com/api/open
 */

export class CnpjaOpenAdapter extends CnpjProvider {
  constructor(config = {}) {
    super(config);

    this.baseUrl = config.baseUrl || 'https://cnpja.com/api/open';
    this.lookupPath = config.lookupPath || '/cnpj';
    this.timeoutMs = config.timeoutMs || 8000;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
    });
  }

  getProviderName() {
    return 'cnpja_open';
  }

  async lookup(cnpj) {
    const normalized = this.normalizeCnpj(cnpj);

    try {
      const response = await this.client.get(`${this.lookupPath}/${normalized}`);
      const payload = response.data || {};

      return this.normalizePayload(normalized, payload);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`CNPJA Open lookup failed: ${message}`);
    }
  }

  normalizePayload(cnpj, payload) {
    const root = payload.company || payload.empresa || payload.estabelecimento || payload;

    const address = normalizeAddress({
      street: root.logradouro || root.endereco || root.street,
      number: root.numero || root.number,
      district: root.bairro || root.district,
      city: root.municipio || root.city,
      state: root.uf || root.state,
      zip: root.cep || root.zip,
    });

    return {
      cnpj,
      legalName: root.razao_social || root.legal_name || root.nome || null,
      tradeName: root.nome_fantasia || root.trade_name || null,
      status: root.situacao_cadastral || root.status || null,
      address,
      phones: extractPhones(payload, root),
      people: extractPeople(payload, root),
      raw: payload,
    };
  }
}

function normalizeAddress(address) {
  const hasAny = Object.values(address).some((value) => Boolean(value));
  return hasAny ? address : null;
}

function extractPhones(payload, root) {
  const candidates = [
    root.ddd_telefone_1,
    root.ddd_telefone_2,
    root.telefone,
    root.telefone1,
    root.telefone2,
  ].filter(Boolean);

  if (Array.isArray(payload.telefones)) {
    payload.telefones.forEach((entry) => {
      if (entry?.numero) {
        candidates.push(entry.numero);
      }
    });
  }

  return candidates.map((raw) => ({ raw }));
}

function extractPeople(payload, root) {
  const qsa = Array.isArray(root.qsa) ? root.qsa : Array.isArray(payload.qsa) ? payload.qsa : [];

  return qsa.map((entry) => ({
    fullName: entry.nome_socio || entry.nome || null,
    roleTitle: entry.qualificacao_socio || entry.cargo || null,
    document: entry.cnpj_cpf_do_socio || entry.documento || null,
  }));
}

export default CnpjaOpenAdapter;
