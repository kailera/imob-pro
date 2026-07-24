/**
 * Formata o endereço completo do imóvel para exibição nas listas e fichas de vistoria.
 * Exemplo com logradouro e número: "Rua XV de Novembro, 123 - Centro, São Paulo/SP"
 * Exemplo sem logradouro: "Nº 123 - Centro, São Paulo/SP" ou "Centro, São Paulo/SP"
 */
export function formatImovelAddress(imovel?: {
  logradouro?: string | null;
  numero?: number | string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
} | null): string {
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
