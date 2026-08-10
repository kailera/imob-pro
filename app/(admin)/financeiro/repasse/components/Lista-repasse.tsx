"use client";

import { Building2, CalendarClock, FileText, Pencil, WalletCards } from "lucide-react";
import type { RepasseCompany, RepasseItem, RepasseStatus } from "@/lib/financeiro/repasse-types";
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

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = !item.receivedAt ? STATUS.AGUARDANDO_RECEBIMENTO : STATUS[item.status];
        const missingBankData = !item.owner.pixKey && !item.owner.bankAccount;

        return (
          <article key={item.key} className="min-w-0 rounded-3xl border border-white/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
            <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12 xl:items-start">
              <section className="min-w-0 xl:col-span-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-black leading-snug text-[#280003]">{item.owner.name}</h3>
                    <p className="mt-0.5 break-all text-xs text-gray-500">{item.owner.cpfCnpj || "Documento não informado"}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold ${status.textClassName}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} aria-hidden="true" />
                    <span>{status.label}</span>
                  </span>
                </div>
                {item.additionalOwners.length > 0 && (
                  <p className="mt-2 text-[11px] font-semibold text-[#004777]">+ {item.additionalOwners.length} coproprietário(s)</p>
                )}
                {missingBankData && (
                  <p className="mt-1 text-[10px] font-semibold text-amber-700">Dados bancários pendentes</p>
                )}
              </section>

              <section className="min-w-0 xl:col-span-3">
                <div className="flex min-w-0 items-start gap-2 font-bold text-gray-800">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#004777]" />
                  <span className="min-w-0 break-words">{item.propertyCode} · {item.propertyTitle}</span>
                </div>
                <p className="mt-1.5 break-words text-xs leading-relaxed text-gray-500">{item.propertyAddress}</p>
                <p className="mt-1 text-[11px] text-gray-400">Contrato {item.contractCode}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  {item.receivedAt && <span>Recebido em {date(item.receivedAt)}</span>}
                  {item.transferDueDate && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />Repasse em {date(item.transferDueDate)}
                    </span>
                  )}
                </div>
              </section>

              <section aria-label="Cálculo do repasse" className="grid min-w-0 grid-cols-2 gap-2 xl:col-span-4">
                <ValueBlock label="Aluguel bruto" value={currency(item.grossValue)} />
                <ValueBlock label={`Taxa adm. · ${item.adminFeePercent.toLocaleString("pt-BR")}%`} value={`− ${currency(item.adminFeeValue)}`} tone="negative" />
                <ValueBlock label="Outros descontos" value={`− ${currency(item.deductionTotal)}`} tone="negative" />
                <ValueBlock label="A repassar" value={currency(item.netValue)} tone="total" />
              </section>

              <section className="flex min-w-0 flex-col gap-2 md:flex-row xl:col-span-2 xl:flex-col">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  disabled={!item.rentTransactionId}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#280003] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pencil className="h-4 w-4" />Editar
                </button>
                <button
                  type="button"
                  onClick={() => printRepasseReceipt(item, company)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004777] px-3 text-xs font-bold text-white transition hover:bg-[#00385e]"
                >
                  <FileText className="h-4 w-4" />Recibo
                </button>
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}
