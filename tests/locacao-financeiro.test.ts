import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularInicioCompetencia,
  calcularCompetenciaPorVencimento,
  calcularDescontoPontualidade,
  calcularDataLimiteDesconto,
  calcularMesesContrato,
  calcularMultaQuebra,
  calcularVencimentoMensal,
  converterMesesParaPercentual,
  converterPercentualParaMeses,
  criarDataVencimento,
  parseNumeroFlexivel,
  resolverPeriodoEfetivoDaCobranca,
  resolverVigenciaCobrancaPorCompetencia,
  resolverVigenciaCobrancaMensal,
  substituirCompetenciaNaDescricao,
} from "../lib/locacao/financeiro";
import { resolverPeriodoDaCobranca } from "../lib/locacao/resolverPeriodoCobranca";
import {
  calcularComposicaoPeriodo,
  cobrancaPodeSerSincronizada,
} from "../lib/locacao/sincronizarCobrancas";
import {
  composicaoFoiEditadaManualmente,
  resolverPeriodoLegadoAntesDaEmissao,
} from "../lib/locacao/reconciliarCobrancaAntesEmissao";

test("aceita números digitados nos formatos comum e brasileiro", () => {
  assert.equal(parseNumeroFlexivel("1050"), 1050);
  assert.equal(parseNumeroFlexivel("1050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("1.050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("R$ 1.050,50"), 1050.5);
  assert.equal(parseNumeroFlexivel("9.52%"), 9.52);
  assert.equal(parseNumeroFlexivel(""), null);
});

test("calcula a competência pelo início do ciclo encerrado antes do vencimento", () => {
  assert.equal(
    calcularCompetenciaPorVencimento("2026-09-26", "Dia 20"),
    "2026-08",
  );
  assert.equal(
    calcularCompetenciaPorVencimento("2026-01-26", "Dia 20"),
    "2025-12",
  );
  assert.equal(
    calcularCompetenciaPorVencimento("2026-09-10", "Último dia do mês"),
    "2026-09",
  );
});

test("usa o início real da competência como referência do reajuste", () => {
  assert.equal(
    calcularInicioCompetencia("2026-08").toISOString().slice(0, 10),
    "2026-08-01",
  );
  assert.equal(
    calcularInicioCompetencia("2026-08", "Dia 20").toISOString().slice(0, 10),
    "2026-08-21",
  );
});

test("corrige a competência exibida na descrição do boleto", () => {
  assert.equal(
    substituirCompetenciaNaDescricao(
      "Aluguel - Karine - Competência 09/2026",
      "2026-08",
    ),
    "Aluguel - Karine - Competência 08/2026",
  );
});

test("respeita a data exata do primeiro vencimento e não cobra antes dela", () => {
  assert.equal(
    calcularVencimentoMensal(2027, 8, 26, "2027-08-27")?.toISOString().slice(0, 10),
    "2027-08-27",
  );
  assert.equal(
    calcularVencimentoMensal(2027, 7, 26, "2027-08-27"),
    null,
  );
  assert.equal(
    calcularVencimentoMensal(2027, 9, 26, "2027-08-27")?.toISOString().slice(0, 10),
    "2027-09-26",
  );
});

test("resolve o período do primeiro ciclo parcial pelo vencimento", () => {
  const periodoInicial = {
    id: "inicial",
    effectiveFrom: new Date("2026-07-24T00:00:00.000Z"),
    effectiveTo: new Date("2027-07-24T00:00:00.000Z"),
  };

  assert.equal(
    resolverPeriodoEfetivoDaCobranca(
      [periodoInicial],
      "2026-07",
      "2026-08-24",
    )?.id,
    "inicial",
  );
});

test("não antecipa reajuste ocorrido no meio da competência mensal", () => {
  const periodos = [
    {
      id: "base",
      effectiveFrom: new Date("2025-08-12T00:00:00.000Z"),
      effectiveTo: new Date("2026-08-12T00:00:00.000Z"),
    },
    {
      id: "reajuste",
      effectiveFrom: new Date("2026-08-12T00:00:00.000Z"),
      effectiveTo: null,
    },
  ];

  assert.equal(
    resolverPeriodoEfetivoDaCobranca(periodos, "2026-08", "2026-08-20")?.id,
    "base",
  );
  assert.equal(
    resolverPeriodoEfetivoDaCobranca(periodos, "2026-09", "2026-09-20")?.id,
    "reajuste",
  );
});

test("respeita o início do ciclo não-calendário ao aplicar reajuste", () => {
  const periodos = [
    {
      id: "base",
      effectiveFrom: new Date("2025-08-21T00:00:00.000Z"),
      effectiveTo: new Date("2026-08-21T00:00:00.000Z"),
    },
    {
      id: "reajuste",
      effectiveFrom: new Date("2026-08-21T00:00:00.000Z"),
      effectiveTo: null,
    },
  ];

  assert.equal(
    resolverPeriodoEfetivoDaCobranca(
      periodos,
      "2026-08",
      "2026-09-26",
      "Dia 20",
    )?.id,
    "reajuste",
  );
});

test("usa o dia e o valor da vigência atual mesmo com termos principais desatualizados", () => {
  const periodos = [
    {
      id: "base",
      effectiveFrom: new Date("2025-08-01T00:00:00.000Z"),
      effectiveTo: new Date("2026-08-01T00:00:00.000Z"),
      paymentDueDay: 10,
      rentAmount: 1000,
    },
    {
      id: "reajuste",
      effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
      effectiveTo: null,
      paymentDueDay: 20,
      rentAmount: 1150,
    },
  ];

  const resultado = resolverVigenciaCobrancaMensal({
    periodos,
    ano: 2026,
    mes: 8,
    diaVencimentoPadrao: 10,
  });

  assert.equal(resultado?.periodo?.id, "reajuste");
  assert.equal(resultado?.periodo?.rentAmount, 1150);
  assert.equal(resultado?.dataVencimento.toISOString().slice(0, 10), "2026-08-20");
});

test("mantém a competência escolhida quando o vencimento ocorre no mês seguinte", () => {
  const resultado = resolverVigenciaCobrancaPorCompetencia({
    periodos: [{
      id: "periodo",
      effectiveFrom: new Date("2026-01-21T00:00:00.000Z"),
      effectiveTo: null,
      paymentDueDay: 26,
    }],
    competencia: "2026-09",
    diaVencimentoPadrao: 26,
    fimPeriodo: "Dia 20",
  });

  assert.equal(resultado?.competencia, "2026-09");
  assert.equal(resultado?.dataVencimento.toISOString().slice(0, 10), "2026-10-26");
});

test("converte a cláusula entre percentual e meses sem alterar a equivalência", () => {
  assert.equal(calcularMesesContrato("2024-10-30", "2027-10-29"), 36);
  assert.equal(converterPercentualParaMeses(10, 36), 3.6);
  assert.equal(converterMesesParaPercentual(3.6, 36), 10);
});

test("calcula a multa proporcional do exemplo confirmado", () => {
  const resultado = calcularMultaQuebra({
    aluguelPeriodo: 1050,
    percentual: 10,
    dataInicioContrato: "2024-10-30",
    dataFimContrato: "2027-10-29",
    dataRescisao: "2026-07-30",
  });

  assert.equal(resultado.prazoTotalMeses, 36);
  assert.equal(resultado.mesesMultaCheia, 3.6);
  assert.equal(resultado.mesesRestantesEquivalentes, 15);
  assert.equal(resultado.multaMaxima, 3780);
  assert.equal(resultado.multaProporcional, 1575);
});

test("mantém desconto fixo e recalcula desconto percentual sobre o aluguel do período", () => {
  assert.equal(calcularDescontoPontualidade(1050, 9.52, "PERCENTUAL"), 99.96);
  assert.equal(calcularDescontoPontualidade(1400, 100, "VALOR"), 100);
});

test("limita vencimentos ao último dia do mês", () => {
  assert.equal(criarDataVencimento(2027, 2, 31).toISOString().slice(0, 10), "2027-02-28");
  assert.equal(criarDataVencimento(2028, 2, 31).toISOString().slice(0, 10), "2028-02-29");
});

test("calcula a data-limite do desconto pela antecedência", () => {
  assert.equal(calcularDataLimiteDesconto("2026-08-15", 5).toISOString().slice(0, 10), "2026-08-10");
});

test("resolve o período pela identificação registrada na cobrança", () => {
  const periodos = [
    { id: "base", dataInicio: "2025-01-20", dataFim: "2026-01-19" },
    { id: "reajuste", dataInicio: "2026-01-20", dataFim: "2027-01-19" },
  ];
  assert.equal(resolverPeriodoDaCobranca(periodos, { periodId: "base" }, "2026-01-27")?.id, "base");
});

test("usa a competência para cobranças antigas sem identificação do período", () => {
  const periodos = [
    { id: "base", dataInicio: "2025-01-20", dataFim: "2026-01-19" },
    { id: "reajuste", dataInicio: "2026-01-20", dataFim: "2027-01-19" },
  ];
  assert.equal(resolverPeriodoDaCobranca(periodos, { competence: "2026-01" }, "2026-01-27")?.id, "base");
});

test("mantém o valor anterior na competência em que o reajuste começa no meio do mês", () => {
  const periodos = [
    { id: "base", dataInicio: "2025-08-12", dataFim: "2026-08-11" },
    { id: "reajuste", dataInicio: "2026-08-12", dataFim: "2027-08-11" },
  ];
  assert.equal(
    resolverPeriodoDaCobranca(periodos, { competence: "2026-08" }, "2026-08-20")?.id,
    "base",
  );
  assert.equal(
    resolverPeriodoDaCobranca(periodos, { competence: "2026-09" }, "2026-09-20")?.id,
    "reajuste",
  );
});

test("recalcula a cobrança com aluguel e encargos do período reajustado", () => {
  const composicao = calcularComposicaoPeriodo({
    id: "reajuste",
    dataInicio: new Date("2026-07-14T00:00:00.000Z"),
    dataFim: new Date("2027-07-13T00:00:00.000Z"),
    valorAluguel: 2063.55,
    hasCondominio: true,
    valorCondominio: 150,
    hasIPTU: false,
    valorIPTU: 80,
    diaVencimento: 15,
  });
  assert.deepEqual(composicao, {
    aluguel: 2063.55,
    condominio: 150,
    iptu: 0,
    total: 2213.55,
  });
});

test("só permite sincronizar cobrança pendente ainda não enviada ao banco", () => {
  const pendente = {
    status: "PENDENTE",
    metadata: { competence: "2026-08" },
    interNossoNumero: null,
    interCodigoSolicitacao: null,
    interTxId: null,
    interBarcode: null,
  };
  assert.equal(cobrancaPodeSerSincronizada(pendente), true);
  assert.equal(cobrancaPodeSerSincronizada({ ...pendente, status: "LIQUIDADO" }), false);
  assert.equal(cobrancaPodeSerSincronizada({ ...pendente, interNossoNumero: "123" }), false);
  assert.equal(cobrancaPodeSerSincronizada({
    ...pendente,
    metadata: {
      fonte: "dataset-scatolin-cobranca-csv",
      situacaoOriginal: "Recepcionado",
    },
  }), false);
});

test("antes da emissão usa a vigência da competência e ignora periodId antigo", () => {
  const periodos = [
    {
      id: "base-antiga",
      dataInicio: new Date("2025-08-01T00:00:00.000Z"),
      dataFim: new Date("2026-07-31T00:00:00.000Z"),
      valorAluguel: 1200,
    },
    {
      id: "vigencia-reajustada",
      dataInicio: new Date("2026-08-01T00:00:00.000Z"),
      dataFim: new Date("2027-07-31T00:00:00.000Z"),
      valorAluguel: 1233.24,
    },
  ];

  const periodo = resolverPeriodoLegadoAntesDaEmissao(
    periodos,
    { competence: "2026-09", periodId: "base-antiga", rentValue: 1233.12 },
    new Date("2026-09-15T00:00:00.000Z"),
  );

  assert.equal(periodo?.id, "vigencia-reajustada");
  assert.equal(periodo?.valorAluguel, 1233.24);
});

test("preserva uma composição avulsa editada explicitamente pelo usuário", () => {
  assert.equal(composicaoFoiEditadaManualmente({ compositionEditedAt: "2026-08-28T10:00:00Z" }), true);
  assert.equal(composicaoFoiEditadaManualmente({ competence: "2026-09" }), false);
});
