import { normalizarBuscaSemAcentos } from "../financeiro/search-normalization";

export function getVistoriaTenantNames(vistoria: {
  locatario?: { nome: string } | null;
  locatariosAutorizados?: { locatario: { nome: string } }[];
}) {
  return [...new Set([
    vistoria.locatario?.nome,
    ...(vistoria.locatariosAutorizados ?? []).map(({ locatario }) => locatario.nome),
  ].filter(Boolean))].join(", ") || "Não vinculado";
}

export function matchesVistoriaSearch(vistoria: {
  codigo?: string;
  imovelCodigo?: string;
  endereco?: string;
  inquilino?: string;
  proprietario?: string;
  vistoriador?: string;
}, query: string) {
  const search = normalizarBuscaSemAcentos(query);
  return [vistoria.codigo, vistoria.imovelCodigo, vistoria.endereco,
    vistoria.inquilino, vistoria.proprietario, vistoria.vistoriador]
    .some((value) => normalizarBuscaSemAcentos(value ?? "").includes(search));
}
