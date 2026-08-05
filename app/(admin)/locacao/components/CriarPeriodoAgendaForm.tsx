"use client";

import { useState } from "react";
import { History, Info, Loader2, Save, X } from "lucide-react";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import { INDICES_REAJUSTE } from "@/lib/indices/catalogo";
import { parseNumeroFlexivel } from "@/lib/locacao/financeiro";
import {
  criarPeriodoPelaAgenda,
  type PainelIndiceReajuste,
  type SugestaoPeriodoAgenda,
} from "../actions/actions";

interface CriarPeriodoAgendaFormProps {
  eventoId: string;
  imovelLocacaoId: string;
  inquilino: string;
  sugestao: SugestaoPeriodoAgenda;
  indices: PainelIndiceReajuste[];
  onCancel: () => void;
  onSaved: (mensagem: string) => void;
}

export function CriarPeriodoAgendaForm({
  eventoId,
  imovelLocacaoId,
  inquilino,
  sugestao,
  indices,
  onCancel,
  onSaved,
}: CriarPeriodoAgendaFormProps) {
  const [dataInicio, setDataInicio] = useState(sugestao.dataInicio);
  const [dataFim, setDataFim] = useState(sugestao.dataFim);
  const [valorAluguel, setValorAluguel] = useState(sugestao.valorAluguel.toFixed(2));
  const [indiceReajuste, setIndiceReajuste] = useState(sugestao.indiceReajuste);
  const [manterValorDeflacao, setManterValorDeflacao] = useState(
    sugestao.manterValorDeflacao,
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [valorReajusteManual, setValorReajusteManual] = useState<string | null>(null);
  const indiceSelecionado = indices.find((indice) => indice.codigo === indiceReajuste);
  const aluguelBase = parseNumeroFlexivel(valorAluguel) ?? 0;
  const percentualIndice = indiceSelecionado?.percentualAcumulado ?? null;
  const percentualOficialAplicado = percentualIndice != null
    ? percentualIndice < 0 && manterValorDeflacao ? 0 : percentualIndice
    : null;
  const aluguelCalculado = percentualOficialAplicado != null
    ? Number((aluguelBase * (1 + percentualOficialAplicado / 100)).toFixed(2))
    : null;
  const aluguelCorrigido = valorReajusteManual == null
    ? aluguelCalculado
    : parseNumeroFlexivel(valorReajusteManual);
  const percentualAplicado = aluguelCorrigido != null && aluguelBase > 0
    ? Number((((aluguelCorrigido / aluguelBase) - 1) * 100).toFixed(2))
    : null;
  const aumentoEmReais = aluguelCorrigido != null
    ? Number((aluguelCorrigido - aluguelBase).toFixed(2))
    : null;
  const podeCriarReajuste = sugestao.tipoPeriodo === "BASE"
    && Boolean(sugestao.proximoPeriodoInicio && sugestao.proximoPeriodoFim)
    && percentualIndice != null
    && aluguelCorrigido != null
    && aluguelCorrigido > 0
    && !indiceSelecionado?.erro;

  const salvar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const aluguel = parseNumeroFlexivel(valorAluguel);
    if (!dataInicio || !dataFim || aluguel == null || aluguel <= 0) {
      setErro("Preencha as datas e informe um aluguel maior que zero.");
      return;
    }

    setErro("");
    setSalvando(true);
    const resultado = await criarPeriodoPelaAgenda({
      imovelLocacaoId,
      dataInicio,
      dataFim,
      valorAluguel: aluguel,
      indiceReajuste,
      manterValorDeflacao,
      periodoProvisorioId: sugestao.periodoProvisorioId,
      criarReajusteSeguinte: podeCriarReajuste,
      valorReajusteSeguinte: valorReajusteManual == null ? null : aluguelCorrigido,
    });
    setSalvando(false);

    if (!resultado.success) {
      setErro(resultado.error || "Não foi possível criar o período.");
      return;
    }

    onSaved(
      resultado.data.reajusteCriado
        ? `Período-base confirmado e novo período criado com aluguel de ${formatarMoeda(resultado.data.valorReajustado)}.`
        : resultado.data.substituiuProvisorio
        ? "Período provisório confirmado e histórico atualizado."
        : "Período criado e histórico atualizado.",
    );
  };

  return (
    <form
      id={`criar-periodo-${eventoId}`}
      onSubmit={salvar}
      className="border-t border-amber-200 bg-amber-50/60 px-4 py-4"
      aria-labelledby={`titulo-criar-periodo-${eventoId}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <h3 id={`titulo-criar-periodo-${eventoId}`} className="text-xs font-black text-[#280003]">
              Criar período sem sair da agenda
            </h3>
            <p className="mt-1 text-[10px] text-gray-600">
              {inquilino} · {sugestao.tipoPeriodo === "BASE" ? "período-base" : "período de reajuste"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={salvando}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
          aria-label="Fechar criação do período"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 text-[10px] text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{sugestao.aviso}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Vigência inicial
          <input
            type="date"
            required
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Vigência final
          <input
            type="date"
            required
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Valor do aluguel
          <FormattedNumberInput
            required
            value={valorAluguel}
            onValueChange={setValorAluguel}
            format="currency"
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-black text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Índice
          <select
            required
            value={indiceReajuste}
            onChange={(event) => {
              setIndiceReajuste(event.target.value);
              setValorReajusteManual(null);
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          >
            {INDICES_REAJUSTE.map((indice) => (
              <option key={indice.codigo} value={indice.codigo}>{indice.nome}</option>
            ))}
          </select>
        </label>
      </div>

      {sugestao.tipoPeriodo === "BASE" && sugestao.proximoPeriodoInicio && sugestao.proximoPeriodoFim && (
        <section className="mt-4 rounded-2xl border border-[#004777]/20 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-black text-[#280003]">Novo período com reajuste</h4>
              <p className="mt-1 text-[10px] text-gray-500">
                {formatarData(sugestao.proximoPeriodoInicio)} a {formatarData(sugestao.proximoPeriodoFim)}
              </p>
            </div>
            <span className="rounded-full bg-[#004777]/10 px-3 py-1 text-[10px] font-black text-[#004777]">
              {indiceSelecionado?.nome || indiceReajuste}
            </span>
          </div>

          {indiceSelecionado?.erro ? (
            <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800">
              Índice indisponível: {indiceSelecionado.erro}
            </p>
          ) : percentualIndice == null ? (
            <p className="mt-3 text-[10px] font-bold text-amber-700">Não há valor acumulado disponível para este índice.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ResumoCalculo rotulo="Índice acumulado" valor={formatarPercentual(percentualIndice)} />
              <ResumoCalculo rotulo="Percentual aplicado" valor={formatarPercentual(percentualAplicado)} />
              <ResumoCalculo rotulo="Aumento do aluguel" valor={formatarMoeda(aumentoEmReais)} />
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <label htmlFor={`novo-aluguel-${eventoId}`} className="text-[9px] font-bold uppercase tracking-wide text-gray-500">
                  Novo aluguel
                </label>
                <FormattedNumberInput
                  id={`novo-aluguel-${eventoId}`}
                  value={valorReajusteManual ?? (aluguelCalculado?.toFixed(2) || "")}
                  onValueChange={setValorReajusteManual}
                  format="currency"
                  className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-black text-emerald-700 outline-none"
                />
                <p className="mt-1 text-[9px] font-semibold text-emerald-700">
                  {valorReajusteManual == null ? "Calculado pelo índice; você pode editar." : "Valor final informado manualmente."}
                </p>
              </div>
            </div>
          )}

          {podeCriarReajuste && (
            <p className="mt-3 text-[10px] font-semibold text-emerald-700">
              Ao salvar, o período-base e este novo período reajustado serão criados juntos.
            </p>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[10px] font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={manterValorDeflacao}
            onChange={(event) => setManterValorDeflacao(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#004777] focus:ring-[#004777]"
          />
          Manter o aluguel atual se o índice for negativo
        </label>
        <div className="flex flex-col gap-2 sm:items-end">
          {erro && <p role="alert" className="text-[10px] font-bold text-rose-700">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={salvando}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[10px] font-black text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-4 text-[10px] font-black text-white hover:bg-[#003355] disabled:cursor-wait disabled:opacity-60"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {salvando ? "Salvando..." : podeCriarReajuste ? "Salvar base e reajuste" : "Salvar período"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function formatarMoeda(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null) {
  if (valor == null) return "—";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatarData(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function ResumoCalculo({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${destaque ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{rotulo}</p>
      <p className={`mt-1 text-sm font-black ${destaque ? "text-emerald-700" : "text-[#280003]"}`}>{valor}</p>
    </div>
  );
}
