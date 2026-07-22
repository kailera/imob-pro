export type StatusManutencaoValue = "EM_ANDAMENTO" | "FINALIZADA";

export type DocumentoManutencaoInput = {
  nomeOriginal: string;
  url: string;
  storageKey?: string | null;
  mimeType: string;
  tamanhoBytes?: number | null;
};

export type DescontoManutencaoInput = {
  competencia: string;
  valor: number;
};

export type ManutencaoInput = {
  contratoId: string;
  prestadorId?: string | null;
  descricao: string;
  dataManutencao: string;
  valor: number;
  status: StatusManutencaoValue;
  repassarProprietario: boolean;
  documentos: DocumentoManutencaoInput[];
  descontos: DescontoManutencaoInput[];
};

export type ContratoManutencaoOption = {
  id: string;
  imovelId: string;
  codigoImovel: string;
  tituloImovel: string;
  endereco: string;
  locatario: string;
  locador: string;
  dataInicio: string | null;
  dataFim: string | null;
  valorAluguel: number | null;
  situacao: "ATIVO" | "ENCERRADO" | "FUTURO" | "SEM_VIGENCIA";
};

export type PrestadorManutencaoOption = {
  id: string;
  nome: string;
  area: string;
};

export type ManutencaoView = {
  id: string;
  contratoId: string;
  imovelId: string;
  prestadorId: string | null;
  descricao: string;
  dataManutencao: string;
  valor: number;
  status: StatusManutencaoValue;
  repassarProprietario: boolean;
  createdAt: string;
  imovel: {
    codigo: string;
    titulo: string;
    endereco: string;
  };
  locatario: string;
  locador: string;
  prestador: PrestadorManutencaoOption | null;
  documentos: Array<DocumentoManutencaoInput & { id: string }>;
  descontos: Array<DescontoManutencaoInput & {
    id: string;
    status: "PROGRAMADO" | "APLICADO" | "CANCELADO";
    repasseId: string | null;
  }>;
};

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
