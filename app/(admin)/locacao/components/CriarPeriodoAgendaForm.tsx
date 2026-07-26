"use client";

import { useState } from "react";
import { History, Info, Loader2, Save, X } from "lucide-react";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import { INDICES_REAJUSTE } from "@/lib/indices/catalogo";
import { parseNumeroFlexivel } from "@/lib/locacao/financeiro";
import {
  criarPeriodoPelaAgenda,
  type SugestaoPeriodoAgenda,
} from "../actions/actions";

interface CriarPeriodoAgendaFormProps {
  eventoId: string;
  imovelLocacaoId: string;
  inquilino: string;
  sugestao: SugestaoPeriodoAgenda;
  onCancel: () => void;
  onSaved: (mensagem: string) => void;
}

export function CriarPeriodoAgendaForm({
  eventoId,
  imovelLocacaoId,
  inquilino,
  sugestao,
  onCancel,
  onSaved,
}: CriarPeriodoAgendaFormProps) {
  const [dataInicio, setDataInicio] = useState(sugestao.dataInicio);
  const [dataFim, setDataFim] = useState(sugestao.dataFim);
  const [valorAluguel, setValorAluguel] = useState(sugestao.valorAluguel.toFixed(2));
  const [indiceReajuste, setIndiceReajuste] = useState(sugestao.indiceReajuste);
  const [diaVencimento, setDiaVencimento] = useState(
    sugestao.diaVencimento?.toString() ?? "",
  );
  const [manterValorDeflacao, setManterValorDeflacao] = useState(
    sugestao.manterValorDeflacao,
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

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
      diaVencimento: diaVencimento ? Number(diaVencimento) : null,
      manterValorDeflacao,
      periodoProvisorioId: sugestao.periodoProvisorioId,
    });
    setSalvando(false);

    if (!resultado.success) {
      setErro(resultado.error || "Não foi possível criar o período.");
      return;
    }

    onSaved(
      resultado.data.substituiuProvisorio
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            onChange={(event) => setIndiceReajuste(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          >
            {INDICES_REAJUSTE.map((indice) => (
              <option key={indice.codigo} value={indice.codigo}>{indice.nome}</option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Dia de vencimento
          <input
            type="number"
            min={1}
            max={31}
            value={diaVencimento}
            onChange={(event) => setDiaVencimento(event.target.value)}
            placeholder="1 a 31"
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/30"
          />
        </label>
      </div>

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
              {salvando ? "Salvando..." : "Salvar período"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
