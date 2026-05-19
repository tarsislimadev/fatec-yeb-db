export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

export function normalizeName(name) {
  if (!name || typeof name !== 'string') {
    return null;
  }

  const trimmed = name.trim();
  if (trimmed === '') {
    return null;
  }

  const deaccented = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return deaccented.replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeDocument(document) {
  if (!document) {
    return null;
  }

  const digits = String(document).replace(/\D/g, '');
  return digits === '' ? null : digits;
}

export function normalizeCnpj(cnpj) {
  if (!cnpj) {
    return null;
  }

  const digits = String(cnpj).replace(/\D/g, '');
  return digits.length === 14 ? digits : null;
}
