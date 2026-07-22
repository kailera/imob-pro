"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarPlus, Loader2, Plus, Trash2, Wrench, X } from "lucide-react";
import { createOrUpdateManutencoes } from "../actions";
import type {
  ContratoManutencaoOption,
  DescontoManutencaoInput,
  DocumentoManutencaoInput,
  ManutencaoInput,
  ManutencaoView,
  PrestadorManutencaoOption,
  StatusManutencaoValue,
} from "../types";
import ContratoSearch from "./ContratoSearch";
import DocumentosManutencao from "./DocumentosManutencao";

type ManutencoesFormModalProps = {
  open: boolean;
  manutencao: ManutencaoView | null;
  contratos: ContratoManutencaoOption[];
  prestadores: PrestadorManutencaoOption[];
  onClose: () => void;
  onSaved: () => void;
};

type DiscountDraft = { competencia: string; valor: string };

function todayInput() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parseMoney(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function ManutencoesFormModal({
  open,
  manutencao,
  contratos,
  prestadores,
  onClose,
  onSaved,
}: ManutencoesFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [contratoId, setContratoId] = useState(manutencao?.contratoId || "");
  const [prestadorId, setPrestadorId] = useState(manutencao?.prestadorId || "");
  const [descricao, setDescricao] = useState(manutencao?.descricao || "");
  const [dataManutencao, setDataManutencao] = useState(manutencao?.dataManutencao || todayInput());
  const [valor, setValor] = useState(manutencao ? String(manutencao.valor) : "");
  const [status, setStatus] = useState<StatusManutencaoValue>(manutencao?.status || "EM_ANDAMENTO");
  const [repassarProprietario, setRepassarProprietario] = useState(manutencao?.repassarProprietario || false);
  const [descontos, setDescontos] = useState<DiscountDraft[]>(
    manutencao?.descontos
      .filter((item) => item.status !== "CANCELADO")
      .map((item) => ({ competencia: item.competencia, valor: String(item.valor) })) || [],
  );
  const [documentos, setDocumentos] = useState<DocumentoManutencaoInput[]>(manutencao?.documentos || []);
  const [error, setError] = useState<string | null>(null);

  const hasAppliedDiscount = manutencao?.descontos.some((item) => item.status === "APLICADO") ?? false;
  const maintenanceValue = parseMoney(valor);
  const totalDiscount = useMemo(
    () => descontos.reduce((total, item) => total + parseMoney(item.valor), 0),
    [descontos],
  );
  const agencyValue = Math.max(0, maintenanceValue - totalDiscount);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isPending, onClose]);

  if (!open) return null;

  function addDiscount() {
    setDescontos((current) => [...current, { competencia: "", valor: "" }]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanDiscounts: DescontoManutencaoInput[] = descontos.map((item) => ({
      competencia: item.competencia,
      valor: parseMoney(item.valor),
    }));
    const input: ManutencaoInput = {
      contratoId,
      prestadorId: prestadorId || null,
      descricao,
      dataManutencao,
      valor: maintenanceValue,
      status,
      repassarProprietario,
      documentos: documentos.map((item) => ({
        nomeOriginal: item.nomeOriginal,
        url: item.url,
        storageKey: item.storageKey,
        mimeType: item.mimeType,
        tamanhoBytes: item.tamanhoBytes,
      })),
      descontos: cleanDiscounts,
    };

    startTransition(async () => {
      const result = await createOrUpdateManutencoes(input, manutencao?.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#280003]/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manutencao-modal-title"
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-[#EEEEF3]/45 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#004777]/10 p-2.5 text-[#004777]"><Wrench className="h-5 w-5" /></div>
            <div>
              <h2 id="manutencao-modal-title" className="text-lg font-extrabold text-[#280003]">
                {manutencao ? "Editar manutenção" : "Nova manutenção"}
              </h2>
              <p className="text-xs text-zinc-500">Vincule o serviço ao contrato e registre os comprovantes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Fechar formulário"
            className="min-h-11 min-w-11 rounded-xl p-2 text-zinc-500 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] disabled:opacity-50"
          >
            <X className="mx-auto h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            {hasAppliedDiscount && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                Esta manutenção possui desconto aplicado. O registro está disponível apenas para consulta.
              </p>
            )}

            <ContratoSearch
              contratos={contratos}
              selectedId={contratoId}
              disabled={isPending || hasAppliedDiscount}
              onSelect={(contrato) => setContratoId(contrato.id)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="manutencao-data" className="mb-1.5 block text-xs font-bold text-[#280003]">Data da manutenção *</label>
                <input id="manutencao-data" type="date" required value={dataManutencao} disabled={isPending || hasAppliedDiscount} onChange={(event) => setDataManutencao(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100" />
              </div>
              <div>
                <label htmlFor="manutencao-valor" className="mb-1.5 block text-xs font-bold text-[#280003]">Valor total (R$) *</label>
                <input id="manutencao-valor" type="number" min="0.01" step="0.01" required value={valor} disabled={isPending || hasAppliedDiscount} onChange={(event) => setValor(event.target.value)} placeholder="0,00" className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100" />
              </div>
              <div>
                <label htmlFor="manutencao-prestador" className="mb-1.5 block text-xs font-bold text-[#280003]">Prestador de serviço</label>
                <select id="manutencao-prestador" value={prestadorId} disabled={isPending || hasAppliedDiscount} onChange={(event) => setPrestadorId(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100">
                  <option value="">Não informado</option>
                  {prestadores.map((prestador) => <option key={prestador.id} value={prestador.id}>{prestador.nome} · {prestador.area}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="manutencao-status" className="mb-1.5 block text-xs font-bold text-[#280003]">Status *</label>
                <select
                  id="manutencao-status"
                  value={status}
                  disabled={isPending || hasAppliedDiscount}
                  onChange={(event) => {
                    const nextStatus = event.target.value as StatusManutencaoValue;
                    setStatus(nextStatus);
                    if (nextStatus !== "FINALIZADA") {
                      setRepassarProprietario(false);
                      setDescontos([]);
                    }
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100"
                >
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="manutencao-descricao" className="mb-1.5 block text-xs font-bold text-[#280003]">Descrição do serviço *</label>
              <textarea id="manutencao-descricao" required rows={4} maxLength={3000} value={descricao} disabled={isPending || hasAppliedDiscount} onChange={(event) => setDescricao(event.target.value)} placeholder="Descreva o problema, o serviço realizado e observações relevantes..." className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100" />
              <p className="mt-1 text-right text-[10px] text-zinc-400">{descricao.length}/3000</p>
            </div>

            <DocumentosManutencao documentos={documentos} onChange={setDocumentos} disabled={isPending || hasAppliedDiscount} />

            {status === "FINALIZADA" && (
              <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={repassarProprietario} disabled={isPending || hasAppliedDiscount} onChange={(event) => { setRepassarProprietario(event.target.checked); if (!event.target.checked) setDescontos([]); }} className="mt-0.5 h-5 w-5 accent-[#004777]" />
                  <span><span className="block text-sm font-bold text-[#280003]">Descontar do repasse ao proprietário</span><span className="block text-xs text-zinc-500">Desmarcado significa que a imobiliária assumirá integralmente o pagamento.</span></span>
                </label>

                {repassarProprietario && (
                  <div className="space-y-3 border-t border-zinc-200 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><h4 className="text-xs font-bold text-[#280003]">Descontos programados</h4><p className="text-[11px] text-zinc-500">Distribua o desconto entre as competências desejadas.</p></div>
                      <button type="button" onClick={addDiscount} disabled={isPending || hasAppliedDiscount} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777]/10 px-3 text-xs font-bold text-[#004777] hover:bg-[#004777]/15 disabled:opacity-50"><Plus className="h-4 w-4" />Adicionar mês</button>
                    </div>

                    {descontos.length === 0 ? (
                      <button type="button" onClick={addDiscount} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-5 text-xs font-bold text-zinc-500 hover:border-[#004777] hover:text-[#004777]"><CalendarPlus className="h-4 w-4" />Definir primeira competência</button>
                    ) : descontos.map((desconto, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_44px] items-end gap-2">
                        <div><label className="mb-1 block text-[10px] font-bold uppercase text-zinc-500">Competência</label><input type="month" required value={desconto.competencia} disabled={isPending || hasAppliedDiscount} onChange={(event) => setDescontos((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, competencia: event.target.value } : item))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#004777]" /></div>
                        <div><label className="mb-1 block text-[10px] font-bold uppercase text-zinc-500">Valor (R$)</label><input type="number" min="0.01" step="0.01" required value={desconto.valor} disabled={isPending || hasAppliedDiscount} onChange={(event) => setDescontos((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, valor: event.target.value } : item))} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#004777]" /></div>
                        <button type="button" onClick={() => setDescontos((items) => items.filter((_, itemIndex) => itemIndex !== index))} disabled={isPending || hasAppliedDiscount} aria-label="Remover competência" className="min-h-11 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="mx-auto h-4 w-4" /></button>
                      </div>
                    ))}

                    <div className="grid grid-cols-1 gap-2 rounded-xl bg-white p-3 text-xs sm:grid-cols-3">
                      <div><span className="block text-zinc-400">Manutenção</span><strong className="text-[#280003]">{formatCurrency(maintenanceValue)}</strong></div>
                      <div><span className="block text-zinc-400">Proprietário</span><strong className={totalDiscount > maintenanceValue ? "text-red-600" : "text-[#004777]"}>{formatCurrency(totalDiscount)}</strong></div>
                      <div><span className="block text-zinc-400">Imobiliária</span><strong className="text-[#280003]">{formatCurrency(agencyValue)}</strong></div>
                    </div>
                    {totalDiscount > maintenanceValue && <p role="alert" className="text-xs font-bold text-red-600">O desconto supera o valor da manutenção.</p>}
                  </div>
                )}
              </section>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-zinc-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} disabled={isPending} className="min-h-11 rounded-xl border border-zinc-200 px-5 text-sm font-bold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50">{hasAppliedDiscount ? "Fechar" : "Cancelar"}</button>
            {!hasAppliedDiscount && <button type="submit" disabled={isPending || totalDiscount > maintenanceValue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#00385a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] focus-visible:ring-offset-2 disabled:opacity-50">{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isPending ? "Salvando..." : manutencao ? "Salvar alterações" : "Criar manutenção"}</button>}
          </footer>
        </form>
      </div>
    </div>
  );
}
