"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileClock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getAgendaVencimentosLocacao, type AgendaLocacaoEvento } from "../actions";

interface AgendaVencimentosLocacaoProps {
  initialAno: number;
  initialMes: number;
  initialEventos: AgendaLocacaoEvento[];
}

const formatarMoeda = (valor: number | null) => valor == null
  ? "—"
  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarData = (valor: string) => new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default function AgendaVencimentosLocacao({
  initialAno,
  initialMes,
  initialEventos,
}: AgendaVencimentosLocacaoProps) {
  const [ano, setAno] = useState(initialAno);
  const [mes, setMes] = useState(initialMes);
  const [eventos, setEventos] = useState(initialEventos);
  const [erro, setErro] = useState("");
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
    startTransition(async () => {
      const resultado = await getAgendaVencimentosLocacao(novoAno, novoMes);
      if (resultado.success) setEventos(resultado.data);
      else setErro(resultado.error || "Não foi possível carregar a agenda.");
    });
  };

  const navegar = (delta: number) => {
    const referencia = new Date(Date.UTC(ano, mes - 1 + delta, 1));
    carregarMes(referencia.getUTCFullYear(), referencia.getUTCMonth() + 1);
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

      {erro && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{erro}</p>}

      <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
        {eventos.map((evento) => {
          const situacao = configuracaoSituacao(evento.situacao);
          return (
            <article key={evento.id} className="grid gap-3 p-4 hover:bg-gray-50 md:grid-cols-[100px_1.5fr_1fr_1fr_auto] md:items-center">
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
                <p className="text-[9px] font-bold uppercase text-gray-400">Aluguel / índice</p>
                <p className="text-xs font-bold text-[#280003]">{formatarMoeda(evento.valorAluguel)} · {evento.indiceReajuste || "—"}</p>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black ${situacao.classe}`}>
                  <situacao.Icone className="h-3 w-3" /> {situacao.label}
                </span>
                <p className="mt-1 text-[9px] text-gray-400">
                  {evento.fonte === "SICADI" ? "Data informada pelo Sicadi" : evento.fonte === "CONTRATO" ? "Vigência total" : "Período confirmado"}
                </p>
              </div>
              <Link href={`/locacao/view-locacao/${evento.contratoId}`} className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#004777] px-3 py-2 text-[10px] font-black text-white hover:bg-[#003355]">
                <FileClock className="h-3.5 w-3.5" /> Abrir contrato
              </Link>
            </article>
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
