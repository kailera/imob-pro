export type CategoriaDespesa = "INTERNET" | "GAS" | "LIMPEZA" | "SEGURANCA" | "JARDINAGEM" | "ENERGIA_COMUM" | "OUTROS";
export type TipoRateio = "IGUALITARIO" | "VALOR_FIXO" | "PERCENTUAL" | "NAO_RATEAR";

export type ImovelResidencialView = {
  id: string;
  codigo: string;
  titulo: string;
  endereco: string;
  proprietarios: string[];
  inquilinos: string[];
};

export type DespesaResidencialView = {
  id: string;
  nome: string;
  categoria: CategoriaDespesa;
  valor: number;
  inicioVigencia: string;
  fimVigencia: string | null;
  ativo: boolean;
  observacao: string | null;
};

export type ManutencaoResidencialView = {
  id: string;
  descricao: string;
  dataManutencao: string;
  valor: number;
  status: "EM_ANDAMENTO" | "FINALIZADA";
  escopo: "GERAL" | "IMOVEL_ESPECIFICO";
  tipoRateio: TipoRateio;
  rateio: Record<string, number> | null;
  imovel: ImovelResidencialView | null;
};

export type ResidencialView = {
  id: string;
  nome: string;
  tipo: "RESIDENCIAL" | "CONDOMINIO";
  descricao: string | null;
  ativo: boolean;
  imoveis: ImovelResidencialView[];
  despesas: DespesaResidencialView[];
  manutencoes: ManutencaoResidencialView[];
};

export type ResidenciaisPageData = {
  residenciais: ResidencialView[];
  imoveisDisponiveis: ImovelResidencialView[];
};

export type ActionResult<T = undefined> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string; gasConflictCount?: number };
