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

const STATUS: Record<RepasseStatus, { label: string; className: string }> = {
  AGUARDANDO_RECEBIMENTO: { label: "Aguardando aluguel", className: "bg-amber-50 text-amber-700 border-amber-100" },
  PRONTO: { label: "Pronto para gerar", className: "bg-blue-50 text-blue-700 border-blue-100" },
  PENDENTE: { label: "Repasse pendente", className: "bg-violet-50 text-violet-700 border-violet-100" },
  PAGO: { label: "Repassado", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

export default function ListaRepasse({ items, company, onEdit }: RepasseListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <WalletCards className="mx-auto h-9 w-9 text-gray-300" />
        <p className="mt-3 font-semibold text-gray-600">Nenhum contrato encontrado para os filtros selecionados.</p>
        <p className="mt-1 text-sm text-gray-400">Altere o mês, o status ou o nome pesquisado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#EEEEF3]/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-5 py-4">Proprietário</th>
              <th className="px-5 py-4">Imóvel / contrato</th>
              <th className="px-5 py-4">Recebimento</th>
              <th className="px-5 py-4 text-right">Bruto</th>
              <th className="px-5 py-4 text-right">Taxa adm.</th>
              <th className="px-5 py-4 text-right">Descontos</th>
              <th className="px-5 py-4 text-right">A repassar</th>
              <th className="px-5 py-4">Situação</th>
              <th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEEF3]">
            {items.map((item) => {
              const status = STATUS[item.status];
              const missingBankData = !item.owner.pixKey && !item.owner.bankAccount;
              return (
                <tr key={item.key} className="align-top transition-colors hover:bg-[#EEEEF3]/25">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#280003]">{item.owner.name}</div>
                    <div className="mt-0.5 text-xs text-gray-500">{item.owner.cpfCnpj || "Documento não informado"}</div>
                    {item.additionalOwners.length > 0 && <div className="mt-1 text-[11px] font-medium text-[#004777]">+ {item.additionalOwners.length} coproprietário(s)</div>}
                    {missingBankData && <div className="mt-1 text-[10px] font-semibold text-amber-700">Dados bancários pendentes</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 font-semibold text-gray-800"><Building2 className="h-3.5 w-3.5 text-[#004777]" />{item.propertyCode} · {item.propertyTitle}</div>
                    <div className="mt-1 max-w-[250px] text-xs leading-relaxed text-gray-500">{item.propertyAddress}</div>
                    <div className="mt-1 text-[11px] text-gray-400">Contrato {item.contractCode}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-700">{date(item.receivedAt)}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400"><CalendarClock className="h-3 w-3" />Repasse: {date(item.transferDueDate)}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-800">{currency(item.grossValue)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-semibold text-red-600">− {currency(item.adminFeeValue)}</div>
                    <div className="text-[10px] text-gray-400">{item.adminFeePercent.toLocaleString("pt-BR")}%</div>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-red-600">− {currency(item.deductionTotal)}</td>
                  <td className="px-5 py-4 text-right text-base font-black text-[#004777]">{currency(item.netValue)}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(item)} disabled={!item.rentTransactionId} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-bold text-[#280003] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <Pencil className="h-3.5 w-3.5" />Editar
                      </button>
                      <button type="button" onClick={() => printRepasseReceipt(item, company)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#004777] px-3 text-xs font-bold text-white transition hover:bg-[#00385e]">
                        <FileText className="h-3.5 w-3.5" />Recibo
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
