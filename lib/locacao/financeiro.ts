import { adicionarDiasUTC, adicionarMesesUTC, normalizarDataUTC } from "./periodos";

const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentualFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function parseNumeroFlexivel(valor: string | number | null | undefined): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (!valor?.trim()) return null;

  let limpo = valor.trim().replace(/\s/g, "").replace(/R\$/gi, "").replace(/%/g, "");
  const negativo = limpo.startsWith("-");
  limpo = limpo.replace(/[^\d.,]/g, "");
  if (!limpo) return null;

  const ultimaVirgula = limpo.lastIndexOf(",");
  const ultimoPonto = limpo.lastIndexOf(".");
  let normalizado: string;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    const separadorDecimal = ultimaVirgula > ultimoPonto ? "," : ".";
    const separadorMilhar = separadorDecimal === "," ? "." : ",";
    normalizado = limpo.split(separadorMilhar).join("").replace(separadorDecimal, ".");
  } else if (ultimaVirgula >= 0) {
    const partes = limpo.split(",");
    normalizado = partes.length > 2
      ? `${partes.slice(0, -1).join("")}.${partes.at(-1)}`
      : limpo.replace(",", ".");
  } else if (ultimoPonto >= 0) {
    const partes = limpo.split(".");
    const pareceMilhar = partes.length > 2 || (partes.length === 2 && partes[1].length === 3);
    normalizado = pareceMilhar ? partes.join("") : limpo;
  } else {
    normalizado = limpo;
  }

  const numero = Number(`${negativo ? "-" : ""}${normalizado}`);
  return Number.isFinite(numero) ? numero : null;
}

export function arredondarMoeda(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function formatarMoeda(valor: number | null | undefined) {
  return moedaFormatter.format(Number.isFinite(valor) ? Number(valor) : 0);
}

export function formatarPercentual(valor: number | null | undefined) {
  return `${percentualFormatter.format(Number.isFinite(valor) ? Number(valor) : 0)}%`;
}

export function formatarNumeroEditavel(valor: number | null | undefined, casas = 2) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
    useGrouping: false,
  }).format(valor);
}

export function calcularMesesContrato(dataInicio: string | Date, dataFimInclusiva: string | Date) {
  const inicio = normalizarDataUTC(dataInicio);
  const fimExclusivo = adicionarDiasUTC(dataFimInclusiva, 1);
  let meses = (fimExclusivo.getUTCFullYear() - inicio.getUTCFullYear()) * 12
    + fimExclusivo.getUTCMonth() - inicio.getUTCMonth();

  if (adicionarMesesUTC(inicio, meses) > fimExclusivo) meses -= 1;
  const aniversario = adicionarMesesUTC(inicio, meses);
  if (aniversario.getTime() === fimExclusivo.getTime()) return Math.max(0, meses);

  const proximoAniversario = adicionarMesesUTC(inicio, meses + 1);
  const fracao = (fimExclusivo.getTime() - aniversario.getTime())
    / (proximoAniversario.getTime() - aniversario.getTime());
  return Math.max(0, meses + fracao);
}

export function calcularMesesRestantes(
  dataRescisao: string | Date,
  dataFimInclusiva: string | Date,
) {
  const rescisao = normalizarDataUTC(dataRescisao);
  const fimExclusivo = adicionarDiasUTC(dataFimInclusiva, 1);
  if (rescisao >= fimExclusivo) return 0;
  return calcularMesesContrato(rescisao, dataFimInclusiva);
}

export function converterPercentualParaMeses(percentual: number, prazoTotalMeses: number) {
  if (prazoTotalMeses <= 0) return 0;
  return (percentual / 100) * prazoTotalMeses;
}

export function converterMesesParaPercentual(meses: number, prazoTotalMeses: number) {
  if (prazoTotalMeses <= 0) return 0;
  return (meses / prazoTotalMeses) * 100;
}

export function calcularMultaQuebra(input: {
  aluguelPeriodo: number;
  percentual: number;
  dataInicioContrato: string | Date;
  dataFimContrato: string | Date;
  dataRescisao: string | Date;
  proporcional?: boolean;
}) {
  const prazoTotalMeses = calcularMesesContrato(input.dataInicioContrato, input.dataFimContrato);
  const mesesMultaCheia = converterPercentualParaMeses(input.percentual, prazoTotalMeses);
  const mesesRestantesEquivalentes = calcularMesesRestantes(input.dataRescisao, input.dataFimContrato);
  const multaMaxima = arredondarMoeda(input.aluguelPeriodo * mesesMultaCheia);
  const fatorRestante = prazoTotalMeses > 0 ? mesesRestantesEquivalentes / prazoTotalMeses : 0;
  const multaProporcional = input.proporcional === false
    ? multaMaxima
    : arredondarMoeda(multaMaxima * Math.min(1, Math.max(0, fatorRestante)));

  return {
    prazoTotalMeses,
    mesesMultaCheia,
    mesesRestantesEquivalentes,
    multaMaxima,
    multaProporcional,
  };
}

export function calcularDescontoPontualidade(
  aluguelPeriodo: number,
  valor: number,
  tipo: "PERCENTUAL" | "VALOR" | string,
) {
  return arredondarMoeda(tipo === "VALOR" ? valor : aluguelPeriodo * (valor / 100));
}

export function criarDataVencimento(ano: number, mes: number, dia: number) {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaSeguro = Math.min(Math.max(Math.trunc(dia), 1), ultimoDia);
  return new Date(Date.UTC(ano, mes - 1, diaSeguro));
}

export function calcularVencimentoMensal(
  ano: number,
  mes: number,
  diaVencimento: number,
  primeiroVencimento?: string | Date | null,
) {
  const vencimentoRegular = criarDataVencimento(ano, mes, diaVencimento);
  if (!primeiroVencimento) return vencimentoRegular;

  const primeiro = normalizarDataUTC(primeiroVencimento);
  const mesmoMes = primeiro.getUTCFullYear() === ano
    && primeiro.getUTCMonth() === mes - 1;
  if (mesmoMes) return primeiro;
  return vencimentoRegular < primeiro ? null : vencimentoRegular;
}

function extrairDiaFimPeriodo(fimPeriodo: string | null | undefined) {
  if (!fimPeriodo) return null;
  const correspondencia = fimPeriodo.match(/\d{1,2}/);
  if (!correspondencia) return null;
  const dia = Number(correspondencia[0]);
  return dia >= 1 && dia <= 31 ? dia : null;
}

export function calcularInicioCompetencia(
  competencia: string,
  fimPeriodo?: string | null,
) {
  const correspondencia = competencia.match(/^(\d{4})-(\d{2})$/);
  if (!correspondencia) {
    throw new Error(`Competência inválida: ${competencia}.`);
  }

  const ano = Number(correspondencia[1]);
  const mes = Number(correspondencia[2]);
  if (mes < 1 || mes > 12) {
    throw new Error(`Competência inválida: ${competencia}.`);
  }

  const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
  const diaFimPeriodo = extrairDiaFimPeriodo(fimPeriodo);
  if (diaFimPeriodo === null) return primeiroDia;

  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaInicioCiclo = diaFimPeriodo + 1;
  return diaInicioCiclo <= ultimoDiaDoMes
    ? new Date(Date.UTC(ano, mes - 1, diaInicioCiclo))
    : primeiroDia;
}

export interface PeriodoAluguelCompetencia {
  id: string;
  effectiveFrom: string | Date;
  effectiveTo: string | Date | null;
  rentAmount: number | string;
}

export interface ParcelaAluguelProporcional {
  periodoId: string;
  dias: number;
  valorMensal: number;
  subtotal: number;
}

/**
 * Rateia o aluguel quando uma mesma competência atravessa duas vigências.
 *
 * O divisor é a quantidade real de dias da competência contratual. Assim, uma
 * competência civil de agosto usa 31 dias; um ciclo de 11/08 a 10/09 também
 * usa os dias efetivamente contidos nesse ciclo. Se a mudança de valor coincide
 * com o início do ciclo, o resultado é o aluguel mensal integral, sem rateio.
 */
export function calcularAluguelProporcionalCompetencia(
  periodos: PeriodoAluguelCompetencia[],
  competencia: string,
  fimPeriodo?: string | null,
) {
  const inicio = calcularInicioCompetencia(competencia, fimPeriodo);
  const [ano, mes] = competencia.split("-").map(Number);
  const proximaCompetencia = new Date(Date.UTC(ano, mes, 1));
  const chaveProxima = `${proximaCompetencia.getUTCFullYear()}-${String(
    proximaCompetencia.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  const fimExclusivo = calcularInicioCompetencia(chaveProxima, fimPeriodo);
  const milissegundosPorDia = 24 * 60 * 60 * 1000;
  const diasTotais = Math.round((fimExclusivo.getTime() - inicio.getTime()) / milissegundosPorDia);
  if (diasTotais <= 0) throw new Error(`Competência inválida para rateio: ${competencia}.`);

  const normalizados = periodos.map((periodo) => ({
    ...periodo,
    effectiveFrom: normalizarDataUTC(periodo.effectiveFrom),
    effectiveTo: periodo.effectiveTo ? normalizarDataUTC(periodo.effectiveTo) : null,
    rentAmount: Number(periodo.rentAmount),
  }));
  const parcelas = new Map<string, ParcelaAluguelProporcional>();
  let acumulado = 0;

  for (let dia = 0; dia < diasTotais; dia += 1) {
    const referencia = adicionarDiasUTC(inicio, dia);
    const periodo = normalizados.find((item) => (
      referencia >= item.effectiveFrom
      && (!item.effectiveTo || referencia < item.effectiveTo)
    ));
    if (!periodo || !Number.isFinite(periodo.rentAmount) || periodo.rentAmount <= 0) {
      return null;
    }

    const valorDiario = periodo.rentAmount / diasTotais;
    acumulado += valorDiario;
    const parcela = parcelas.get(periodo.id) ?? {
      periodoId: periodo.id,
      dias: 0,
      valorMensal: periodo.rentAmount,
      subtotal: 0,
    };
    parcela.dias += 1;
    parcela.subtotal += valorDiario;
    parcelas.set(periodo.id, parcela);
  }

  const detalhamento = [...parcelas.values()].map((parcela) => ({
    ...parcela,
    subtotal: arredondarMoeda(parcela.subtotal),
  }));

  return {
    valor: arredondarMoeda(acumulado),
    inicio,
    fim: adicionarDiasUTC(fimExclusivo, -1),
    diasTotais,
    rateado: detalhamento.length > 1,
    parcelas: detalhamento,
  };
}

export function calcularCompetenciaPorVencimento(
  dataVencimento: string | Date,
  fimPeriodo: string | null | undefined,
) {
  const vencimento = normalizarDataUTC(dataVencimento);
  const diaFimPeriodo = extrairDiaFimPeriodo(fimPeriodo);
  const competencia = new Date(Date.UTC(
    vencimento.getUTCFullYear(),
    vencimento.getUTCMonth(),
    1,
  ));

  // Ex.: período de 21/08 a 20/09, com vencimento em 26/09,
  // pertence à competência 08/2026 (mês em que o ciclo começou).
  if (diaFimPeriodo !== null && diaFimPeriodo < vencimento.getUTCDate()) {
    competencia.setUTCMonth(competencia.getUTCMonth() - 1);
  }

  return `${competencia.getUTCFullYear()}-${String(competencia.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolverPeriodoEfetivoDaCobranca<T extends {
  effectiveFrom: Date;
  effectiveTo: Date | null;
}>(
  periodos: T[],
  competencia: string,
  dataVencimento: string | Date,
  fimPeriodo?: string | null,
) {
  const referenciaCompetencia = calcularInicioCompetencia(competencia, fimPeriodo);
  const periodoDaCompetencia = periodos.find(periodo =>
    referenciaCompetencia >= periodo.effectiveFrom
    && (!periodo.effectiveTo || referenciaCompetencia < periodo.effectiveTo),
  );

  if (periodoDaCompetencia) return periodoDaCompetencia;

  // No primeiro ciclo parcial, o início calculado da competência pode ser
  // anterior ao início do contrato. Nesse caso, o período vigente no vencimento
  // é a referência contratual disponível.
  const vencimento = normalizarDataUTC(dataVencimento);
  return periodos.find(periodo =>
    vencimento >= periodo.effectiveFrom
    && (!periodo.effectiveTo || vencimento < periodo.effectiveTo),
  ) ?? null;
}

/**
 * Resolve em conjunto o vencimento, a competência e a vigência contratual.
 * O cálculo é repetido porque o dia de vencimento também pode mudar entre
 * vigências e, por consequência, alterar a competência do ciclo.
 */
export function resolverVigenciaCobrancaMensal<T extends {
  effectiveFrom: Date;
  effectiveTo: Date | null;
  paymentDueDay: number;
}>(input: {
  periodos: T[];
  ano: number;
  mes: number;
  diaVencimentoPadrao: number;
  primeiroVencimento?: string | Date | null;
  fimPeriodo?: string | null;
}) {
  let diaVencimento = input.diaVencimentoPadrao;
  let resultado: { dataVencimento: Date; competencia: string; periodo: T } | null = null;

  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const dataVencimento = calcularVencimentoMensal(
      input.ano,
      input.mes,
      diaVencimento,
      input.primeiroVencimento,
    );
    if (!dataVencimento) return null;

    const competencia = calcularCompetenciaPorVencimento(dataVencimento, input.fimPeriodo);
    const periodo = resolverPeriodoEfetivoDaCobranca(
      input.periodos,
      competencia,
      dataVencimento,
      input.fimPeriodo,
    );
    if (!periodo) return { dataVencimento, competencia, periodo: null };

    resultado = { dataVencimento, competencia, periodo };
    if (periodo.paymentDueDay === diaVencimento) return resultado;
    diaVencimento = periodo.paymentDueDay;
  }

  return resultado;
}

export function resolverVigenciaCobrancaPorCompetencia<T extends {
  effectiveFrom: Date;
  effectiveTo: Date | null;
  paymentDueDay: number;
}>(input: {
  periodos: T[];
  competencia: string;
  diaVencimentoPadrao: number;
  primeiroVencimento?: string | Date | null;
  fimPeriodo?: string | null;
}) {
  const referencia = calcularInicioCompetencia(input.competencia);
  let diaVencimento = input.diaVencimentoPadrao;
  let resultado: { dataVencimento: Date; competencia: string; periodo: T } | null = null;

  // Na geração manual, o mês escolhido pelo usuário é também o mês do
  // vencimento. O ciclo contratual continua definindo a vigência e o valor,
  // mas não pode deslocar uma cobrança de setembro para outubro.
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const dataVencimento = calcularVencimentoMensal(
      referencia.getUTCFullYear(),
      referencia.getUTCMonth() + 1,
      diaVencimento,
      input.primeiroVencimento,
    );
    if (!dataVencimento) return null;

    const periodo = resolverPeriodoEfetivoDaCobranca(
      input.periodos,
      input.competencia,
      dataVencimento,
      input.fimPeriodo,
    );
    if (!periodo) {
      return { dataVencimento, competencia: input.competencia, periodo: null };
    }

    resultado = { dataVencimento, competencia: input.competencia, periodo };
    if (periodo.paymentDueDay === diaVencimento) return resultado;
    diaVencimento = periodo.paymentDueDay;
  }

  return resultado;
}

export function substituirCompetenciaNaDescricao(
  descricao: string,
  competencia: string,
) {
  const [ano, mes] = competencia.split("-");
  if (!ano || !mes) return descricao;
  const rotulo = `Competência ${mes}/${ano}`;

  if (/Competência\s+\d{2}\/\d{4}/i.test(descricao)) {
    return descricao.replace(/Competência\s+\d{2}\/\d{4}/i, rotulo);
  }

  return `${descricao} - ${rotulo}`;
}

export function calcularDataLimiteDesconto(
  dataVencimento: string | Date,
  diasAntecedencia: number,
) {
  return adicionarDiasUTC(dataVencimento, -Math.max(0, Math.trunc(diasAntecedencia)));
}

export function formatarDataLocalISO(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
