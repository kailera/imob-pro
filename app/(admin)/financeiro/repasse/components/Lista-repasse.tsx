"use client";

import { Building2, CalendarClock, ChevronDown, FileText, Pencil, UserRound, WalletCards } from "lucide-react";
import type { RepasseCompany, RepasseItem, RepasseStatus } from "@/lib/financeiro/repasse-types";
import { groupRepassesByOwner } from "@/lib/financeiro/repasse-grouping";
import { printRepasseReceipt } from "./recibo-repasse";

interface RepasseListProps {
  items: RepasseItem[];
  company: RepasseCompany;
  onEdit: (item: RepasseItem) => void;
}

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

const date = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const STATUS: Record<RepasseStatus, { label: string; dotClassName: string; textClassName: string }> = {
  AGUARDANDO_RECEBIMENTO: {
    label: "Aluguel não recebido",
    dotClassName: "bg-amber-500",
    textClassName: "text-amber-700",
  },
  PRONTO: {
    label: "Pronto para gerar",
    dotClassName: "bg-blue-500",
    textClassName: "text-blue-700",
  },
  PENDENTE: {
    label: "Repasse pendente",
    dotClassName: "bg-violet-500",
    textClassName: "text-violet-700",
  },
  PAGO: {
    label: "Repassado",
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-700",
  },
};

function ValueBlock({ label, value, tone = "default" }: {
  label: string;
  value: string;
  tone?: "default" | "negative" | "total";
}) {
  const valueClassName = tone === "negative"
    ? "text-red-600"
    : tone === "total"
      ? "text-[#004777]"
      : "text-gray-800";

  return (
    <div className={`min-w-0 rounded-2xl p-3 ${tone === "total" ? "bg-[#004777]/[0.06]" : "bg-[#EEEEF3]/55"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 break-words text-sm font-black sm:text-base ${valueClassName}`}>{value}</div>
    </div>
  );
}

export default function ListaRepasse({ items, company, onEdit }: RepasseListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
        <WalletCards className="mx-auto h-9 w-9 text-gray-300" />
        <p className="mt-3 font-semibold text-gray-600">Nenhum contrato encontrado para os filtros selecionados.</p>
        <p className="mt-1 text-sm text-gray-400">Altere o mês, o status ou o nome pesquisado.</p>
      </div>
    );
  }

  const ownerGroups = groupRepassesByOwner(items);

  return (
    <div className="space-y-4">
      {ownerGroups.map((group) => (
        <details key={group.key} open className="group overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm transition-shadow open:shadow-md">
          <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004777]/30 sm:p-5 [&::-webkit-details-marker]:hidden">
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
              <section className="min-w-0 lg:col-span-3">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-[#004777]/10 p-2 text-[#004777]">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words font-black leading-snug text-[#280003]">{group.owner.name}</h3>
                    <p className="mt-0.5 break-all text-xs text-gray-500">{group.owner.cpfCnpj || "Documento não informado"}</p>
                    {group.missingBankData && <p className="mt-1 text-[10px] font-semibold text-amber-700">Dados bancários pendentes</p>}
                  </div>
                </div>
              </section>

              <section className="flex flex-wrap gap-2 text-[11px] font-bold lg:col-span-2">
                <span className="rounded-full bg-[#004777]/10 px-2.5 py-1 text-[#004777]">
                  {group.items.length} {group.items.length === 1 ? "imóvel" : "imóveis"}
                </span>
                <span className={`rounded-full px-2.5 py-1 ${group.receivedCount === group.items.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {group.receivedCount}/{group.items.length} recebido(s)
                </span>
              </section>

              <section aria-label="Totais do proprietário" className="grid min-w-0 grid-cols-2 gap-2 lg:col-span-6 xl:grid-cols-4">
                <ValueBlock label="Bruto consolidado" value={currency(group.grossTotal)} />
                <ValueBlock label="Taxas adm." value={`− ${currency(group.adminFeeTotal)}`} tone="negative" />
                <ValueBlock label="Outros descontos" value={`− ${currency(group.deductionTotal)}`} tone="negative" />
                <ValueBlock label="Total a repassar" value={currency(group.netTotal)} tone="total" />
              </section>

              <div className="flex items-center justify-end gap-2 text-xs font-bold text-[#004777] lg:col-span-1">
                <span className="group-open:hidden">Exibir</span>
                <span className="hidden group-open:inline">Ocultar</span>
                <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
              </div>
            </div>
          </summary>

          <div className="space-y-3 border-t border-gray-100 bg-[#EEEEF3]/45 p-3 sm:p-4">
            {group.items.map((item) => {
              const status = !item.receivedAt ? STATUS.AGUARDANDO_RECEBIMENTO : STATUS[item.status];

              return (
                <article key={item.key} className="min-w-0 rounded-2xl border border-white bg-white p-4 shadow-sm">
                  <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12 xl:items-start">
                    <section className="min-w-0 xl:col-span-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2 font-bold text-gray-800">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#004777]" />
                          <span className="min-w-0 break-words">{item.propertyCode} · {item.propertyTitle}</span>
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold ${status.textClassName}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} aria-hidden="true" />
                          <span>{status.label}</span>
                        </span>
                      </div>
                      <p className="mt-1.5 break-words text-xs leading-relaxed text-gray-500">{item.propertyAddress}</p>
                      <p className="mt-1 text-[11px] text-gray-400">Contrato {item.contractCode}</p>
                      {item.additionalOwners.length > 0 && <p className="mt-1 text-[10px] font-semibold text-[#004777]">+ {item.additionalOwners.length} coproprietário(s)</p>}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                        {item.receivedAt && <span>Recebido em {date(item.receivedAt)}</span>}
                        {item.transferDueDate && (
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Repasse em {date(item.transferDueDate)}</span>
                        )}
                      </div>
                    </section>

                    <section aria-label={`Cálculo do repasse de ${item.propertyCode}`} className="grid min-w-0 grid-cols-2 gap-2 xl:col-span-6 xl:grid-cols-4">
                      <ValueBlock label="Aluguel bruto" value={currency(item.grossValue)} />
                      <ValueBlock label={`Taxa adm. · ${item.adminFeePercent.toLocaleString("pt-BR")}%`} value={`− ${currency(item.adminFeeValue)}`} tone="negative" />
                      <ValueBlock label="Outros descontos" value={`− ${currency(item.deductionTotal)}`} tone="negative" />
                      <ValueBlock label="A repassar" value={currency(item.netValue)} tone="total" />
                    </section>

                    <section className="flex min-w-0 flex-col gap-2 md:flex-row xl:col-span-2 xl:flex-col">
                      <button type="button" onClick={() => onEdit(item)} disabled={!item.rentTransactionId} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#280003] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <Pencil className="h-4 w-4" />Editar
                      </button>
                      <button type="button" onClick={() => printRepasseReceipt(item, company)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004777] px-3 text-xs font-bold text-white transition hover:bg-[#00385e]">
                        <FileText className="h-4 w-4" />Recibo
                      </button>
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
