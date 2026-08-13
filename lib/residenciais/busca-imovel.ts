export type ImovelPesquisavel = {
  codigo: string;
  titulo: string;
  endereco: string;
  proprietarios: string[];
  inquilinos?: string[];
};

export function normalizarBuscaImovel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function imovelCorrespondeABusca(imovel: ImovelPesquisavel, busca: string) {
  const termos = normalizarBuscaImovel(busca).split(" ").filter(Boolean);
  if (termos.length === 0) return true;
  const texto = normalizarBuscaImovel([
    imovel.codigo,
    imovel.titulo,
    imovel.endereco,
    ...imovel.proprietarios,
    ...(imovel.inquilinos ?? []),
  ].join(" "));
  return termos.every(termo => texto.includes(termo));
}
