"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileClock,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  executarReajusteAutomatico,
  getAgendaVencimentosLocacao,
  getPainelIndicesReajuste,
  type AgendaLocacaoEvento,
  type OpcoesReajusteAgenda,
  type PainelIndiceReajuste,
} from "../actions/actions";
import { normalizarCodigoIndice } from "@/lib/indices/catalogo";
import { CriarPeriodoAgendaForm } from "./CriarPeriodoAgendaForm";
import { ReajusteAgendaForm } from "./ReajusteAgendaForm";

interface AgendaVencimentosLocacaoProps {
  initialAno: number;
  initialMes: number;
  initialEventos: AgendaLocacaoEvento[];
  initialIndices: PainelIndiceReajuste[];
}

const formatarMoeda = (valor: number | null) => valor == null
  ? "—"
  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarData = (valor: string) => new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const formatarCompetencia = (valor: string | null) => valor
  ? new Date(valor).toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "")
  : "—";
const formatarPercentual = (valor: number | null) => valor == null
  ? "—"
  : `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export default function AgendaVencimentosLocacao({
  initialAno,
  initialMes,
  initialEventos,
  initialIndices,
}: AgendaVencimentosLocacaoProps) {
  const [ano, setAno] = useState(initialAno);
  const [mes, setMes] = useState(initialMes);
  const [eventos, setEventos] = useState(initialEventos);
  const [indices, setIndices] = useState(initialIndices);
  const [erro, setErro] = useState("");
  const [executandoId, setExecutandoId] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState("");
  const [mostrarIndices, setMostrarIndices] = useState(false);
  const [detalheAbertoId, setDetalheAbertoId] = useState<string | null>(null);
  const [criandoPeriodoId, setCriandoPeriodoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resumo = useMemo(() => ({
    reajustes: eventos.filter((evento) => evento.tipo === "REAJUSTE_PERIODO" && evento.situacao !== "TRATADO").length,
    contratos: eventos.filter((evento) => evento.tipo === "VENCIMENTO_CONTRATO").length,
    atrasados: eventos.filter((evento) => evento.situacao === "ATRASADO").length,
    revisar: eventos.filter((evento) => evento.situacao === "REVISAR_HISTORICO").length,
    tratados: eventos.filter((evento) => evento.situacao === "TRATADO").length,
  }), [eventos]);

  const tituloMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, mes - 1, 1)));

  const carregarMes = (novoAno: number, novoMes: number) => {
    setAno(novoAno);
    setMes(novoMes);
    setErro("");
    setDetalheAbertoId(null);
    setCriandoPeriodoId(null);
    startTransition(async () => {
      const [resultado, painel] = await Promise.all([
        getAgendaVencimentosLocacao(novoAno, novoMes),
        getPainelIndicesReajuste(novoAno, novoMes),
      ]);
      if (resultado.success) setEventos(resultado.data);
      else setErro(resultado.error || "Não foi possível carregar a agenda.");
      if (painel.success) setIndices(painel.data);
    });
  };

  const navegar = (delta: number) => {
    const referencia = new Date(Date.UTC(ano, mes - 1 + delta, 1));
    carregarMes(referencia.getUTCFullYear(), referencia.getUTCMonth() + 1);
  };

  const reajustarAutomaticamente = (
    evento: AgendaLocacaoEvento,
    opcoes: OpcoesReajusteAgenda = {},
  ) => {
    if (!evento.periodoId || !evento.podeReajustar) return;
    const ajusteManual = opcoes.percentualManual != null || opcoes.valorManual != null;
    const indice = opcoes.indice || evento.indiceReajuste;
    const confirmado = window.confirm(
      ajusteManual
        ? `Confirmar o reajuste manual do contrato de ${evento.inquilino} pelo ${indice}?`
        : `Reajustar automaticamente o contrato de ${evento.inquilino} pelo ${indice}?`
    );
    if (!confirmado) return;

    setErro("");
    setSucesso("");
    setExecutandoId(evento.id);
    startTransition(async () => {
      const resultado = await executarReajusteAutomatico(evento.periodoId!, opcoes);
      if (!resultado.success) {
        setErro(resultado.error || "Não foi possível executar o reajuste.");
        setExecutandoId(null);
        return;
      }

      const agendaAtualizada = await getAgendaVencimentosLocacao(ano, mes);
      if (agendaAtualizada.success) setEventos(agendaAtualizada.data);
      setSucesso(
        `Contrato reajustado para ${formatarMoeda(resultado.data.valorReajustado)} `
        + `(${formatarPercentual(resultado.data.percentualReajuste)} – ${resultado.data.indice}).`
      );
      setExecutandoId(null);
    });
  };

  const configuracaoSituacao = (situacao: AgendaLocacaoEvento["situacao"]) => {
    if (situacao === "TRATADO") return { label: "Tratado", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", Icone: CheckCircle2 };
    if (situacao === "ATRASADO") return { label: "Atrasado", classe: "bg-rose-50 text-rose-700 border-rose-200", Icone: AlertTriangle };
    if (situacao === "REVISAR_HISTORICO") return { label: "Revisar histórico", classe: "bg-amber-50 text-amber-800 border-amber-200", Icone: RefreshCw };
    return { label: "A vencer", classe: "bg-blue-50 text-blue-700 border-blue-200", Icone: CalendarClock };
  };

  return (
    <section className="space-y-4 rounded-3xl border border-gray-150 bg-white p-4 shadow-xs sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-black text-[#280003]">
            <CalendarClock className="h-5 w-5 text-[#004777]" /> Agenda de vigências
          </h2>
          <p className="mt-1 text-xs text-gray-500">Reajustes de períodos e vencimentos totais do contrato, sem confundir com boletos.</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-150 bg-gray-50 p-1 sm:justify-start">
          <button type="button" onClick={() => navegar(-1)} disabled={isPending} className="rounded-xl p-2 text-[#004777] hover:bg-white disabled:opacity-50" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-40 px-3 text-center text-xs font-black capitalize text-[#280003]">
            {isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : tituloMes}
          </span>
          <button type="button" onClick={() => navegar(1)} disabled={isPending} className="rounded-xl p-2 text-[#004777] hover:bg-white disabled:opacity-50" aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ["Reajustes pendentes", resumo.reajustes, "text-[#004777]"],
          ["Contratos vencendo", resumo.contratos, "text-purple-700"],
          ["Atrasados", resumo.atrasados, "text-rose-700"],
          ["Revisar histórico", resumo.revisar, "text-amber-700"],
          ["Tratados", resumo.tratados, "text-emerald-700"],
        ].map(([label, valor, classe]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
            <p className={`mt-1 text-xl font-black ${classe}`}>{valor}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/40">
        <button
          type="button"
          onClick={() => setMostrarIndices((atual) => !atual)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
          aria-expanded={mostrarIndices}
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#004777]" />
            <span>
              <span className="block text-xs font-black text-[#280003]">Índices usados nos reajustes</span>
              <span className="block text-[10px] text-gray-500">Última competência e acumulado das 12 competências anteriores ao mês selecionado.</span>
            </span>
          </span>
          {mostrarIndices ? <ChevronUp className="h-4 w-4 text-[#004777]" /> : <ChevronDown className="h-4 w-4 text-[#004777]" />}
        </button>

        {mostrarIndices && (
          <div className="grid gap-2 border-t border-blue-100 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {indices.map((indice) => (
              <div key={indice.codigo} className="rounded-xl border border-white bg-white p-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-[#280003]">{indice.nome}</p>
                  <span className={`h-2 w-2 rounded-full ${indice.erro ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
                </div>
                {indice.erro ? (
                  <p className="mt-2 text-[9px] leading-snug text-amber-700">{indice.erro}</p>
                ) : (
                  <>
                    <p className="mt-2 text-xl font-black text-[#004777]">{formatarPercentual(indice.percentualAcumulado)}</p>
                    <p className="text-[9px] font-bold uppercase text-gray-400">Acumulado em 12 meses</p>
                    <div className="mt-2 border-t border-gray-100 pt-2 text-[9px] text-gray-500">
                      <p>{formatarCompetencia(indice.competenciaInicial)} a {formatarCompetencia(indice.competenciaFinal)}</p>
                      <p className="mt-0.5">Último mês: <strong>{formatarPercentual(indice.taxaUltimaCompetencia)}</strong></p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{erro}</p>}
      {sucesso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{sucesso}</p>}

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
        {eventos.map((evento) => {
          const situacao = configuracaoSituacao(evento.situacao);
          const codigoIndice = normalizarCodigoIndice(evento.indiceReajuste);
          const indicePainel = indices.find((indice) => indice.codigo === codigoIndice);
          const detalheAberto = detalheAbertoId === evento.id;
          const criandoPeriodo = criandoPeriodoId === evento.id;
          const percentualProjetado = indicePainel?.percentualAcumulado ?? null;
          const percentualAplicavel = percentualProjetado != null
            && percentualProjetado < 0
            && evento.manterValorDeflacao
            ? 0
            : percentualProjetado;
          const valorProjetado = evento.valorAluguel != null && percentualAplicavel != null
            ? Number((evento.valorAluguel * (1 + percentualAplicavel / 100)).toFixed(2))
            : null;

          return (
            <div key={evento.id}>
              <article className="grid gap-3 p-4 hover:bg-gray-50 md:grid-cols-[100px_1.35fr_1.15fr_1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-black text-[#280003]">{formatarData(evento.dataEvento)}</p>
                  <p className="text-[9px] font-bold uppercase text-gray-400">
                    {evento.tipo === "REAJUSTE_PERIODO" ? "Reajuste" : "Fim do contrato"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#280003]">{evento.inquilino}</p>
                  <p className="truncate text-[10px] text-gray-500" title={evento.imovel}>{evento.imovel}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase text-gray-400">
                    {evento.situacao === "TRATADO" ? "Antes / reajustado" : "Aluguel / índice"}
                  </p>
                  <p className="text-xs font-bold text-[#280003]">
                    {formatarMoeda(evento.valorAluguel)}
                    {evento.situacao === "TRATADO" && evento.valorReajustado != null
                      ? <> → <span className="text-emerald-700">{formatarMoeda(evento.valorReajustado)}</span></>
                      : <> · {evento.indiceReajuste || "—"}</>}
                  </p>
                  {evento.percentualReajuste != null && (
                    <p className="mt-1 text-[9px] font-black text-emerald-700">
                      {evento.indiceReajuste} {formatarPercentual(evento.percentualReajuste)} aplicado
                    </p>
                  )}
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black ${situacao.classe}`}>
                    <situacao.Icone className="h-3 w-3" /> {situacao.label}
                  </span>
                  <p className="mt-1 text-[9px] text-gray-400">
                    {evento.fonte === "SICADI" ? "Data informada pelo Sicadi" : evento.fonte === "CONTRATO" ? "Vigência total" : "Período confirmado"}
                  </p>
                  {evento.reajusteExecutadoPor && (
                    <p className="mt-1 text-[9px] text-gray-500">
                      Por {evento.reajusteExecutadoPor}
                      {evento.reajusteExecutadoEm ? ` em ${formatarData(evento.reajusteExecutadoEm)}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex min-w-36 flex-col gap-1.5">
                  {evento.situacao === "REVISAR_HISTORICO" && evento.sugestaoPeriodo && (
                    <button
                      type="button"
                      onClick={() => {
                        setCriandoPeriodoId(criandoPeriodo ? null : evento.id);
                        setDetalheAbertoId(null);
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-[#280003] hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                      aria-expanded={criandoPeriodo}
                      aria-controls={`criar-periodo-${evento.id}`}
                    >
                      {criandoPeriodo ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      {criandoPeriodo ? "Fechar cadastro" : "Criar período"}
                    </button>
                  )}
                  {evento.tipo === "REAJUSTE_PERIODO" && indicePainel && (
                    <button
                      type="button"
                      onClick={() => setDetalheAbertoId(detalheAberto ? null : evento.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[#004777]/20 bg-blue-50 px-3 py-2 text-[10px] font-black text-[#004777] hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
                      aria-expanded={detalheAberto}
                      aria-controls={`calculo-${evento.id}`}
                    >
                      {detalheAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {detalheAberto ? "Ocultar cálculo" : "Ver cálculo"}
                    </button>
                  )}
                  {evento.podeReajustar && (
                    <button
                      type="button"
                      onClick={() => reajustarAutomaticamente(evento)}
                      disabled={isPending || executandoId === evento.id}
                      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {executandoId === evento.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                      {executandoId === evento.id ? "Reajustando..." : "Reajustar automático"}
                    </button>
                  )}
                  <Link href={`/locacao/view-locacao/${evento.contratoId}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#004777] px-3 py-2 text-[10px] font-black text-white hover:bg-[#003355]">
                    <FileClock className="h-3.5 w-3.5" /> Abrir contrato
                  </Link>
                  {!evento.podeReajustar && evento.motivoBloqueio && evento.tipo === "REAJUSTE_PERIODO" && (
                    <p className="text-center text-[9px] leading-tight text-amber-700">{evento.motivoBloqueio}</p>
                  )}
                </div>
              </article>

              {criandoPeriodo && evento.sugestaoPeriodo && (
                <CriarPeriodoAgendaForm
                  eventoId={evento.id}
                  imovelLocacaoId={evento.imovelLocacaoId}
                  inquilino={evento.inquilino}
                  sugestao={evento.sugestaoPeriodo}
                  indices={indices}
                  onCancel={() => setCriandoPeriodoId(null)}
                  onSaved={(mensagem) => {
                    setCriandoPeriodoId(null);
                    setSucesso(mensagem);
                    carregarMes(ano, mes);
                  }}
                />
              )}

              {detalheAberto && !criandoPeriodo && indicePainel && (
                <div id={`calculo-${evento.id}`} className="border-t border-blue-100 bg-blue-50/50 px-4 py-4">
                  {indicePainel.erro ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p><strong>Índice indisponível:</strong> {indicePainel.erro}</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[#004777]" />
                          <p className="text-xs font-black text-[#280003]">
                            Prévia do reajuste por {indicePainel.nome}
                          </p>
                        </div>
                        <p className="text-[9px] text-gray-500">
                          Fonte: Banco Central · atualização consultada em{" "}
                          {indicePainel.consultadoEm ? formatarData(indicePainel.consultadoEm) : "—"}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {[
                          ["Período considerado", `${formatarCompetencia(indicePainel.competenciaInicial)} a ${formatarCompetencia(indicePainel.competenciaFinal)}`],
                          ["Competências", `${indicePainel.mesesConsiderados} de 12 meses`],
                          ["Acumulado", formatarPercentual(indicePainel.percentualAcumulado)],
                          ["Aluguel atual", formatarMoeda(evento.valorAluguel)],
                          ["Valor projetado", formatarMoeda(valorProjetado)],
                        ].map(([rotulo, valor]) => (
                          <div key={rotulo} className="rounded-xl border border-white bg-white px-3 py-2 shadow-xs">
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{rotulo}</p>
                            <p className="mt-1 text-xs font-black text-[#280003]">{valor}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 text-[10px] sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-gray-500">
                          Última competência: <strong>{formatarCompetencia(indicePainel.competenciaFinal)}</strong>
                          {" · "}variação mensal: <strong>{formatarPercentual(indicePainel.taxaUltimaCompetencia)}</strong>
                        </p>
                        {percentualProjetado != null && percentualProjetado < 0 && evento.manterValorDeflacao && (
                          <p className="font-bold text-amber-700">Deflação identificada: o aluguel atual será mantido.</p>
                        )}
                      </div>
                    </>
                  )}

                  {!evento.podeReajustar && evento.motivoBloqueio && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        <strong>Esta é apenas uma prévia.</strong> {evento.motivoBloqueio} Abra o contrato e complete o histórico antes de aplicar o reajuste.
                      </p>
                    </div>
                  )}
                  {evento.podeReajustar && (
                    <ReajusteAgendaForm
                      evento={evento}
                      indices={indices}
                      pending={isPending || executandoId === evento.id}
                      onApply={opcoes => reajustarAutomaticamente(evento, opcoes)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!isPending && eventos.length === 0 && (
          <div className="px-4 py-10 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
            <p className="mt-2 text-sm font-black text-[#280003]">Nenhum vencimento neste mês</p>
            <p className="mt-1 text-xs text-gray-500">Não há períodos para reajustar nem contratos encerrando na referência selecionada.</p>
          </div>
        )}
      </div>
    </section>
  );
}
