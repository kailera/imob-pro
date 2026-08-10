"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Plus, Trash2, Wrench, X } from "lucide-react";
import { calculateRepasse } from "@/lib/financeiro/repasse-calculo";
import type {
  RepasseItem,
  RepasseNewMaintenance,
  RepasseOtherAddition,
  RepasseOtherDeduction,
  RepasseUpdateInput,
} from "@/lib/financeiro/repasse-types";

interface EditarRepasseProps {
  item: RepasseItem;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

export default function EditarRepasse({ item, onClose, onSaved }: EditarRepasseProps) {
  const [adminFeePercent, setAdminFeePercent] = useState(item.adminFeePercent);
  const [selectedIds, setSelectedIds] = useState(() => item.deductions.filter((deduction) => deduction.selected).map((deduction) => deduction.id));
  const [otherDeductions, setOtherDeductions] = useState<RepasseOtherDeduction[]>(item.otherDeductions);
  const [otherAdditions, setOtherAdditions] = useState<RepasseOtherAddition[]>(item.otherAdditions);
  const [newMaintenances, setNewMaintenances] = useState<RepasseNewMaintenance[]>([]);
  const [transferDueDate, setTransferDueDate] = useState(item.transferDueDate?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const calculation = useMemo(() => calculateRepasse({
    grossValue: item.grossValue,
    rentValue: item.rentValue,
    adminFeePercent,
    deductionValues: [
      ...item.deductions.filter((deduction) => selectedIds.includes(deduction.id)).map((deduction) => deduction.value),
      ...newMaintenances.filter((maintenance) => maintenance.deductFromOwner).map((maintenance) => maintenance.value),
    ],
    otherDeductionValues: otherDeductions.map((deduction) => deduction.value),
    additionValues: otherAdditions.map((addition) => addition.value),
  }), [adminFeePercent, item, newMaintenances, otherAdditions, otherDeductions, selectedIds]);

  const toggleDeduction = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
  };

  const addOtherDeduction = () => {
    setOtherDeductions((current) => [...current, {
      id: crypto.randomUUID(),
      description: "",
      value: 0,
    }]);
  };

  const updateOtherDeduction = (id: string, update: Partial<RepasseOtherDeduction>) => {
    setOtherDeductions((current) => current.map((deduction) => deduction.id === id ? { ...deduction, ...update } : deduction));
  };

  const addOtherAddition = () => {
    setOtherAdditions((current) => [...current, { id: crypto.randomUUID(), description: "", value: 0 }]);
  };

  const updateOtherAddition = (id: string, update: Partial<RepasseOtherAddition>) => {
    setOtherAdditions((current) => current.map((addition) => addition.id === id ? { ...addition, ...update } : addition));
  };

  const addMaintenance = () => {
    setNewMaintenances((current) => [...current, {
      id: crypto.randomUUID(),
      description: "",
      maintenanceDate: new Date().toISOString().slice(0, 10),
      value: 0,
      status: "FINALIZADA",
      deductFromOwner: true,
    }]);
  };

  const updateMaintenance = (id: string, update: Partial<RepasseNewMaintenance>) => {
    setNewMaintenances((current) => current.map((maintenance) => maintenance.id === id
      ? { ...maintenance, ...update }
      : maintenance));
  };

  const save = async () => {
    if (!item.rentTransactionId) {
      setError("Gere a cobrança mensal deste contrato antes de salvar o repasse.");
      return;
    }
    if (otherDeductions.some((deduction) => !deduction.description.trim() || deduction.value < 0)) {
      setError("Preencha a descrição e um valor válido em todos os outros descontos.");
      return;
    }
    if (otherAdditions.some((addition) => !addition.description.trim() || addition.value < 0)) {
      setError("Preencha a descrição e um valor válido em todos os acréscimos.");
      return;
    }
    if (newMaintenances.some((maintenance) => !maintenance.description.trim() || !maintenance.maintenanceDate || maintenance.value <= 0)) {
      setError("Preencha a descrição, a data e um valor maior que zero em todas as novas manutenções.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: RepasseUpdateInput = {
        leaseId: item.leaseId,
        legacyContractId: item.legacyContractId,
        rentTransactionId: item.rentTransactionId,
        repasseId: item.repasseId,
        competence: item.competence,
        adminFeePercent,
        selectedDeductionIds: selectedIds,
        otherDeductions,
        otherAdditions,
        newMaintenances,
        transferDueDate: transferDueDate || null,
      };
      const response = await fetch("/api/financeiro/repasses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "Não foi possível salvar o repasse.");
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o repasse.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#280003]/45 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="editar-repasse-title">
      <button type="button" aria-label="Fechar editor" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-[#F7F7F9] shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#004777]">Contrato {item.contractCode} · {item.competence}</p>
            <h2 id="editar-repasse-title" className="mt-1 text-xl font-black text-[#280003]">Editar repasse</h2>
            <p className="mt-1 text-sm text-gray-500">{item.owner.name} · {item.propertyTitle}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar editor" className="min-h-11 min-w-11 rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"><X className="mx-auto h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {error && <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-[#280003]">Base do cálculo</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ValueCard label="Aluguel contratual" value={currency(item.rentValue)} />
              <ValueCard label="Valor bruto recebido" value={currency(item.grossValue)} />
              <label className="rounded-2xl border border-gray-200 p-3"><span className="block text-[10px] font-bold uppercase text-gray-400">Taxa administrativa</span><div className="mt-1 flex items-center gap-1"><input type="number" min="0" max="100" step="0.01" value={adminFeePercent} onChange={(event) => setAdminFeePercent(Number(event.target.value))} className="w-full border-0 p-0 text-lg font-black text-red-600 outline-none" /><span className="font-bold text-red-600">%</span></div><span className="text-[10px] text-gray-400">− {currency(calculation.adminFeeValue)}</span></label>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[#280003]">Manutenções e despesas</h3><p className="mt-0.5 text-xs text-gray-400">Marque valores existentes ou registre uma nova manutenção.</p></div><button type="button" onClick={addMaintenance} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777]/10 px-3 text-xs font-bold text-[#004777] hover:bg-[#004777]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"><Wrench className="h-4 w-4" />Nova manutenção</button></div>
            <div className="mt-4 space-y-2">
              {item.deductions.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Nenhuma manutenção ou despesa elegível nesta competência.</p> : item.deductions.map((deduction) => (
                <label key={deduction.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gray-100 p-3 transition hover:bg-gray-50">
                  <div className="flex items-center gap-3"><input type="checkbox" checked={selectedIds.includes(deduction.id)} onChange={() => toggleDeduction(deduction.id)} className="h-4 w-4 accent-[#004777]" /><div><span className="block text-sm font-semibold text-gray-800">{deduction.description}</span><span className="text-[10px] font-bold uppercase text-gray-400">{deduction.type === "MANUTENCAO" ? "Manutenção programada" : "Despesa paga"}</span></div></div>
                  <strong className="whitespace-nowrap text-sm text-red-600">− {currency(deduction.value)}</strong>
                </label>
              ))}
              {newMaintenances.map((maintenance) => (
                <div key={maintenance.id} className="space-y-3 rounded-2xl border border-[#004777]/15 bg-[#004777]/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-black text-[#004777]"><Wrench className="h-4 w-4" />Nova manutenção</span><button type="button" aria-label="Excluir nova manutenção" onClick={() => setNewMaintenances((current) => current.filter((entry) => entry.id !== maintenance.id))} className="min-h-11 min-w-11 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="mx-auto h-4 w-4" /></button></div>
                  <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Descrição do serviço *</span><textarea rows={2} maxLength={3000} value={maintenance.description} onChange={(event) => updateMaintenance(maintenance.id, { description: event.target.value })} placeholder="Serviço realizado e observações" className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10" /></label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label><span className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Data *</span><input type="date" value={maintenance.maintenanceDate} onChange={(event) => updateMaintenance(maintenance.id, { maintenanceDate: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#004777]" /></label>
                    <label><span className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Valor (R$) *</span><input type="number" min="0.01" step="0.01" value={maintenance.value} onChange={(event) => updateMaintenance(maintenance.id, { value: Number(event.target.value) })} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#004777]" /></label>
                    <label><span className="mb-1 block text-[10px] font-bold uppercase text-gray-500">Status *</span><select value={maintenance.status} onChange={(event) => { const status = event.target.value as RepasseNewMaintenance["status"]; updateMaintenance(maintenance.id, { status, deductFromOwner: status === "FINALIZADA" ? maintenance.deductFromOwner : false }); }} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#004777]"><option value="EM_ANDAMENTO">Em andamento</option><option value="FINALIZADA">Finalizada</option></select></label>
                  </div>
                  <label className={`flex items-start gap-3 rounded-xl bg-white p-3 ${maintenance.status !== "FINALIZADA" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}><input type="checkbox" checked={maintenance.deductFromOwner} disabled={maintenance.status !== "FINALIZADA"} onChange={(event) => updateMaintenance(maintenance.id, { deductFromOwner: event.target.checked })} className="mt-0.5 h-5 w-5 accent-[#004777]" /><span><span className="block text-xs font-bold text-[#280003]">Descontar nesta competência</span><span className="block text-[11px] text-gray-500">Registra o desconto no banco de manutenções e o aplica ao cálculo atual.</span></span></label>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[#280003]">Acréscimos</h3><p className="mt-0.5 text-xs text-gray-400">Valores adicionais devidos ao proprietário.</p></div><button type="button" onClick={addOtherAddition} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Plus className="h-3.5 w-3.5" />Adicionar</button></div>
            <div className="mt-4 space-y-2">
              {otherAdditions.length === 0 && <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Nenhum acréscimo informado.</p>}
              {otherAdditions.map((addition) => (
                <div key={addition.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_130px_44px]">
                  <input type="text" value={addition.description} onChange={(event) => updateOtherAddition(addition.id, { description: event.target.value })} placeholder="Descrição do acréscimo" className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#004777]" />
                  <input type="number" min="0" step="0.01" value={addition.value} onChange={(event) => updateOtherAddition(addition.id, { value: Number(event.target.value) })} aria-label="Valor do acréscimo" className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#004777]" />
                  <button type="button" aria-label="Excluir acréscimo" onClick={() => setOtherAdditions((current) => current.filter((entry) => entry.id !== addition.id))} className="min-h-11 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="mx-auto h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-[#280003]">Outros descontos</h3><p className="mt-0.5 text-xs text-gray-400">Ex.: IPTU, condomínio, limpeza, troca de registro.</p></div><button type="button" onClick={addOtherDeduction} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#004777]/10 px-3 text-xs font-bold text-[#004777] hover:bg-[#004777]/15"><Plus className="h-3.5 w-3.5" />Adicionar</button></div>
            <div className="mt-4 space-y-2">
              {otherDeductions.length === 0 && <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">Nenhum outro desconto informado.</p>}
              {otherDeductions.map((deduction) => (
                <div key={deduction.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_130px_44px]">
                  <input type="text" value={deduction.description} onChange={(event) => updateOtherDeduction(deduction.id, { description: event.target.value })} placeholder="Descrição do desconto" className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#004777]" />
                  <input type="number" min="0" step="0.01" value={deduction.value} onChange={(event) => updateOtherDeduction(deduction.id, { value: Number(event.target.value) })} className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[#004777]" />
                  <button type="button" aria-label="Excluir desconto" onClick={() => setOtherDeductions((current) => current.filter((item) => item.id !== deduction.id))} className="min-h-11 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="mx-auto h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-[#004777] p-5 text-white shadow-lg shadow-[#004777]/15">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Valor líquido a repassar</p><strong className="mt-1 block text-3xl">{currency(calculation.netValue)}</strong></div><div className="text-right text-xs leading-relaxed text-white/70">Bruto {currency(calculation.grossValue)}<br />Acréscimos + {currency(calculation.additionTotal)}<br />Descontos − {currency(calculation.adminFeeValue + calculation.deductionTotal)}</div></div>
            <label className="mt-5 block border-t border-white/15 pt-4"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/60">Data prevista do repasse</span><input type="date" value={transferDueDate} onChange={(event) => setTransferDueDate(event.target.value)} className="min-h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white outline-none [color-scheme:dark]" /></label>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm font-bold text-gray-500 hover:bg-gray-100">Cancelar</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777] px-5 text-sm font-bold text-white shadow-md hover:bg-[#00385e] disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? "Salvando..." : "Salvar repasse"}</button>
        </footer>
      </aside>
    </div>
  );
}

function ValueCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-gray-200 p-3"><span className="block text-[10px] font-bold uppercase text-gray-400">{label}</span><strong className="mt-1 block text-lg text-[#280003]">{value}</strong></div>;
}
