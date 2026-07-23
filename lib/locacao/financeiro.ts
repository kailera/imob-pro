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

export function calcularDataLimiteDesconto(
  dataVencimento: string | Date,
  diasAntecedencia: number,
) {
  return adicionarDiasUTC(dataVencimento, -Math.max(0, Math.trunc(diasAntecedencia)));
}

export function formatarDataLocalISO(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
