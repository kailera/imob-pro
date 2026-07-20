export function valorPorExtenso(valor: number): string {
  return `${valor.toLocaleString('pt-BR')} reais`;
}

export function cleanCurrency(val: string): number | undefined {
  if (!val) return undefined;
  const clean = val.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return isNaN(Number(clean)) ? undefined : Number(clean);
}

export function sanitizePercent(val: string): string {
  if (!val) return "";
  return val.replace(/%/g, '').replace(/,/g, '.').trim();
}

export function formatCpfCnpj(value: string): string {
  const raw = value.replace(/\D/g, '');
  if (raw.length <= 11) {
    // CPF: 999.999.999-99
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 99.999.999/9999-99
    return raw
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

export function formatPhone(value: string): string {
  const raw = value.replace(/\D/g, '');
  if (raw.length <= 10) {
    return raw
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else {
    return raw
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{1})(\d{4})(\d{4})$/, '$1 $2-$3');
  }
}

export function formatBirthDate(value: string): string {
  const raw = value.replace(/\D/g, '');
  return raw
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}

export function formatRendaMensal(value: string): string {
  const raw = value.replace(/\D/g, '');
  if (!raw) return '';
  const num = (Number(raw) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `R$ ${num}`;
}

export const serializeEndereco = (cep: string, logr: string, num: string, comp: string, bair: string, cid: string, est: string) => {
  return { cep, logradouro: logr, numero: num, complemento: comp, bairro: bair, municipio: cid, estado: est };
};

export const serializeTelefoneLegacy = (tel: string) => [
  JSON.stringify({ telefone: tel, qualificacao: 'Principal', observacao: '' })
];

export const serializeEnderecoLegacy = (cep: string, logr: string, num: string, comp: string, bair: string, cid: string, est: string) => [
  JSON.stringify({ cep, logradouro: logr, numero: num, complemento: comp, bairro: bair, municipio: cid, estado: est })
];

export const getAddressStr = (addrArray: string[]) => {
  if (!addrArray || addrArray.length === 0) return '';
  try {
    const parsed = JSON.parse(addrArray[0]);
    return `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.complemento || ''} - ${parsed.bairro || ''}, ${parsed.municipio || ''}/${parsed.estado || ''} CEP: ${parsed.cep || ''}`;
  } catch (e) {
    return addrArray[0] || '';
  }
};

export function formatBRL(value: string): string {
  const raw = value.replace(/\D/g, '');
  if (!raw) return '';
  return (Number(raw) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatCEP(value: string): string {
  const raw = value.replace(/\D/g, '');
  return raw
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}
