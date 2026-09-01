export const INDICES_REAJUSTE = [
  { codigo: "IGP-M", nome: "IGP-M", serieBcb: 189 },
  { codigo: "IGP-DI", nome: "IGP-DI", serieBcb: 190 },
  { codigo: "INPC", nome: "INPC", serieBcb: 188 },
  { codigo: "IPC-FIPE", nome: "IPC-Fipe", serieBcb: 193 },
  // O código interno IPC-DI é mantido para não invalidar contratos legados.
  // A série 191 do SGS é oficialmente o IPC-Br (FGV).
  { codigo: "IPC-DI", nome: "IPC-Br (FGV)", serieBcb: 191 },
  { codigo: "IPCA", nome: "IPCA", serieBcb: 433 },
] as const;

export type CodigoIndiceReajuste = (typeof INDICES_REAJUSTE)[number]["codigo"];

const ALIASES: Record<string, CodigoIndiceReajuste> = {
  "IGP-M": "IGP-M",
  IGPM: "IGP-M",
  "IGP-DI": "IGP-DI",
  IGPDI: "IGP-DI",
  INPC: "INPC",
  "IPC-FIPE": "IPC-FIPE",
  IPCFIPE: "IPC-FIPE",
  "IPC-DI": "IPC-DI",
  IPCDI: "IPC-DI",
  "IPC-BR": "IPC-DI",
  IPCBR: "IPC-DI",
  IPCA: "IPCA",
};

export function normalizarCodigoIndice(valor: string | null | undefined): CodigoIndiceReajuste | null {
  if (!valor) return null;
  return ALIASES[valor.trim().toUpperCase()] || null;
}

export function obterConfiguracaoIndice(codigo: CodigoIndiceReajuste) {
  return INDICES_REAJUSTE.find((indice) => indice.codigo === codigo)!;
}
