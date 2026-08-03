/**
 * Formata o endereço completo do imóvel para exibição nas listas e fichas de vistoria.
 * Exemplo com logradouro e número: "Rua XV de Novembro, 123 - Centro, São Paulo/SP"
 * Exemplo sem logradouro: "Nº 123 - Centro, São Paulo/SP" ou "Centro, São Paulo/SP"
 */
export type VistoriaAddress = {
  logradouro?: string | null;
  numero?: number | string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
};

export function normalizeVistoriaAddress(value: unknown): VistoriaAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const address = value as Record<string, unknown>;
  return {
    logradouro: typeof address.logradouro === "string" ? address.logradouro : null,
    numero: typeof address.numero === "number" || typeof address.numero === "string" ? address.numero : null,
    complemento: typeof address.complemento === "string" ? address.complemento : null,
    bairro: typeof address.bairro === "string" ? address.bairro : null,
    cidade: typeof address.cidade === "string" ? address.cidade : null,
    uf: typeof address.uf === "string" ? address.uf : null,
  };
}

export function snapshotVistoriaAddress(imovel: VistoriaAddress): VistoriaAddress {
  return normalizeVistoriaAddress(imovel) ?? {};
}

export function getVistoriaAddress(vistoria?: {
  enderecoSnapshot?: unknown;
  imovel?: VistoriaAddress | null;
} | null): VistoriaAddress | null {
  return normalizeVistoriaAddress(vistoria?.enderecoSnapshot) ?? vistoria?.imovel ?? null;
}

export function formatImovelAddress(imovel?: VistoriaAddress | null): string {
  if (!imovel) return "";

  const streetName = imovel.logradouro ? imovel.logradouro.trim() : "";
  const num = imovel.numero && String(imovel.numero).trim() !== "0" ? String(imovel.numero).trim() : null;

  let street = "";
  if (streetName && num) {
    street = `${streetName}, ${num}`;
  } else if (streetName) {
    street = streetName;
  } else if (num) {
    street = `Nº ${num}`;
  }

  const cityUf = [imovel.cidade?.trim(), imovel.uf?.trim()].filter(Boolean).join("/");
  const location = [imovel.bairro?.trim(), cityUf].filter(Boolean).join(", ");

  if (street && location) return `${street} - ${location}`;
  return street || location || "";
}
