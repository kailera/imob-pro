export interface IptuParaCobranca {
  amount: number | string | { toString(): string } | null;
  paymentStartDate: Date | null;
  installments: string | null;
}

export function parseQuantidadeParcelas(valor: string | null | undefined) {
  const texto = valor?.trim() ?? "";
  if (!/^\d+$/.test(texto)) return null;
  const quantidade = Number(texto);
  return Number.isSafeInteger(quantidade) && quantidade > 0 ? quantidade : null;
}

function diferencaMeses(inicio: Date, fim: Date) {
  return (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12
    + fim.getUTCMonth() - inicio.getUTCMonth();
}

export function calcularIptuDaCobranca(
  iptu: IptuParaCobranca | null | undefined,
  dataVencimento: Date,
) {
  const valor = Number(iptu?.amount ?? 0);
  const quantidade = parseQuantidadeParcelas(iptu?.installments);
  const inicio = iptu?.paymentStartDate;
  if (!inicio || !quantidade || !Number.isFinite(valor) || valor <= 0) {
    return { valor: 0, numeroParcela: null, quantidadeParcelas: quantidade };
  }

  const inicioNormalizado = new Date(Date.UTC(
    inicio.getUTCFullYear(),
    inicio.getUTCMonth(),
    inicio.getUTCDate(),
  ));
  const vencimentoNormalizado = new Date(Date.UTC(
    dataVencimento.getUTCFullYear(),
    dataVencimento.getUTCMonth(),
    dataVencimento.getUTCDate(),
  ));
  const primeiroMes = new Date(Date.UTC(
    inicioNormalizado.getUTCFullYear(),
    inicioNormalizado.getUTCMonth() + (
      vencimentoNormalizado.getUTCDate() < inicioNormalizado.getUTCDate() ? 1 : 0
    ),
    1,
  ));
  const numeroParcela = diferencaMeses(primeiroMes, vencimentoNormalizado) + 1;
  if (vencimentoNormalizado < inicioNormalizado || numeroParcela < 1 || numeroParcela > quantidade) {
    return { valor: 0, numeroParcela: null, quantidadeParcelas: quantidade };
  }

  return {
    valor: Number(valor.toFixed(2)),
    numeroParcela,
    quantidadeParcelas: quantidade,
  };
}
