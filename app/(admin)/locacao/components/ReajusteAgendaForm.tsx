"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import { formatarNumeroEditavel, parseNumeroFlexivel } from "@/lib/locacao/financeiro";
import { normalizarCodigoIndice } from "@/lib/indices/catalogo";
import type {
  AgendaLocacaoEvento,
  OpcoesReajusteAgenda,
  PainelIndiceReajuste,
} from "../actions/actions";

type Props = {
  evento: AgendaLocacaoEvento;
  indices: PainelIndiceReajuste[];
  pending: boolean;
  onApply: (opcoes: OpcoesReajusteAgenda) => void;
};

function calcularValor(valorAtual: number, percentual: number) {
  return Number((valorAtual * (1 + percentual / 100)).toFixed(2));
}

export function ReajusteAgendaForm({ evento, indices, pending, onApply }: Props) {
  const indiceInicial = normalizarCodigoIndice(evento.indiceReajuste)
    || normalizarCodigoIndice(indices[0]?.codigo)
    || "IGP-M";
  const painelInicial = indices.find(item => item.codigo === indiceInicial);
  const percentualInicial = painelInicial?.percentualAcumulado ?? 0;
  const valorAtual = evento.valorAluguel ?? 0;
  const [indice, setIndice] = useState<string>(indiceInicial);
  const [percentual, setPercentual] = useState(formatarNumeroEditavel(percentualInicial, 2));
  const [valor, setValor] = useState(formatarNumeroEditavel(calcularValor(valorAtual, percentualInicial), 2));
  const [manual, setManual] = useState(false);

  const selecionarIndice = (codigo: string) => {
    setIndice(codigo);
    const painel = indices.find(item => item.codigo === codigo);
    const novoPercentual = painel?.percentualAcumulado;
    if (novoPercentual == null) {
      setPercentual("");
      setValor("");
      return;
    }
    setPercentual(formatarNumeroEditavel(novoPercentual, 2));
    setValor(formatarNumeroEditavel(calcularValor(valorAtual, novoPercentual), 2));
    setManual(false);
  };

  const alterarPercentual = (texto: string) => {
    setPercentual(texto);
    setManual(true);
    const numero = parseNumeroFlexivel(texto);
    if (numero != null) setValor(formatarNumeroEditavel(calcularValor(valorAtual, numero), 2));
  };

  const alterarValor = (texto: string) => {
    setValor(texto);
    setManual(true);
    const numero = parseNumeroFlexivel(texto);
    if (numero != null && valorAtual > 0) {
      setPercentual(formatarNumeroEditavel(((numero / valorAtual) - 1) * 100, 2));
    }
  };

  const aplicar = () => {
    onApply({
      indice,
      percentualManual: manual ? parseNumeroFlexivel(percentual) : null,
      valorManual: manual ? parseNumeroFlexivel(valor) : null,
    });
  };

  const painel = indices.find(item => item.codigo === indice);

  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4" data-slot="reajuste-agenda-form">
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor={`indice-${evento.id}`} className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
            Índice do reajuste
          </label>
          <select
            id={`indice-${evento.id}`}
            value={indice}
            onChange={event => selecionarIndice(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#004777]/20"
          >
            {indices.map(item => (
              <option key={item.codigo} value={item.codigo}>{item.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`percentual-${evento.id}`} className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
            Percentual aplicado
          </label>
          <FormattedNumberInput
            id={`percentual-${evento.id}`}
            value={percentual}
            onValueChange={alterarPercentual}
            format="percentage"
            decimals={2}
            className="min-h-11 w-full rounded-lg border border-gray-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#004777]/20"
          />
        </div>
        <div>
          <label htmlFor={`valor-${evento.id}`} className="mb-1 block text-[10px] font-bold uppercase text-gray-500">
            Novo valor do aluguel
          </label>
          <FormattedNumberInput
            id={`valor-${evento.id}`}
            value={valor}
            onValueChange={alterarValor}
            format="currency"
            className="min-h-11 w-full rounded-lg border border-gray-200 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#004777]/20"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] text-gray-500">
          {manual
            ? "Ajuste manual: o valor informado será salvo exatamente como confirmado."
            : painel?.erro
              ? `Índice indisponível: ${painel.erro}`
              : `Prévia por ${painel?.nome || indice} com as taxas mensais do Banco Central. Você pode corrigir o percentual ou o valor antes de confirmar.`}
        </p>
        <button
          type="button"
          onClick={aplicar}
          disabled={pending || valorAtual <= 0 || (!manual && Boolean(painel?.erro))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Aplicando..." : "Confirmar reajuste"}
        </button>
      </div>
    </div>
  );
}
