"use client";

import { ArrowRight, Building2, CalendarClock, ChevronDown, ClipboardList, FileText, Home, Pencil, UserRound } from "lucide-react";
import type { RepasseCompany, RepasseItem, RepasseOperation, RepasseResidentialReport } from "@/lib/financeiro/repasse-types";
import { printRepasseReceipt } from "./recibo-repasse";

type Props = {
  reports: RepasseResidentialReport[];
  items: RepasseItem[];
  company: RepasseCompany;
  onEdit: (item: RepasseItem) => void;
};

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";
const typeLabel: Record<RepasseOperation["type"], string> = {
  ALUGUEL: "Aluguel",
  CONTA: "Conta / serviço",
  TAXA_ADMINISTRACAO: "Taxa administrativa",
  MANUTENCAO: "Manutenção",
  DESCONTO: "Desconto",
  ACRESCIMO: "Acréscimo",
  REPASSE: "Repasse",
};

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "negative" | "positive" | "total" }) {
  const valueClass = tone === "negative" ? "text-red-600" : tone === "positive" ? "text-emerald-700" : tone === "total" ? "text-white" : "text-[#280003]";
  return <div className={`min-w-0 rounded-xl p-3 ${tone === "total" ? "bg-[#004777] text-white" : "bg-[#EEEEF3]/65"}`}><span className={`block text-[10px] font-bold uppercase tracking-wide ${tone === "total" ? "text-white/60" : "text-zinc-400"}`}>{label}</span><strong className={`mt-1 block break-words text-sm ${valueClass}`}>{value}</strong></div>;
}

function PropertyValue({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "negative" | "total" }) {
  const valueClass = tone === "negative" ? "text-red-600" : tone === "total" ? "text-[#004777]" : "text-[#280003]";
  return <div className={`min-w-0 border-zinc-100 px-2 py-3 lg:border-r ${tone === "total" ? "bg-[#004777]/[0.04]" : ""}`}><span className="block text-[9px] font-bold uppercase tracking-wide text-zinc-400 lg:hidden">{label}</span><strong className={`mt-0.5 block break-words text-right text-xs ${valueClass}`}>{value}</strong></div>;
}

function ResidentialProperty({ item, operations, company, onEdit }: { item: RepasseItem; operations: RepasseOperation[]; company: RepasseCompany; onEdit: (item: RepasseItem) => void }) {
  const status = !item.receivedAt ? "Aluguel não recebido" : item.status === "PAGO" ? "Repassado" : item.status === "PENDENTE" ? "Repasse pendente" : "Pronto para gerar";
  const statusClass = !item.receivedAt ? "bg-amber-50 text-amber-700" : item.status === "PAGO" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <article className="border-b border-zinc-200 bg-white last:border-b-0">
      <div className="grid grid-cols-2 items-stretch lg:grid-cols-[minmax(220px,2.2fr)_repeat(6,minmax(70px,1fr))_118px]">
        <section className="col-span-2 min-w-0 border-b border-zinc-100 bg-white px-3 py-3 lg:col-span-1 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-2"><span className="rounded-lg bg-[#004777]/10 p-2 text-[#004777]"><Home className="h-4 w-4"/></span><div className="min-w-0"><h4 className="break-words text-sm font-black text-[#280003]">{item.propertyAddress}</h4><p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Locatário: <strong className="text-[#280003]">{item.tenantNames.join(", ") || "não informado"}</strong></p></div></div>
          <div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{status}</span><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold text-zinc-600">Contrato {item.contractCode}</span></div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">{item.receivedAt && <span>Recebido em {date(item.receivedAt)}</span>}{item.transferDueDate && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3"/>Repasse em {date(item.transferDueDate)}</span>}</div>
        </section>

        <PropertyValue label="Aluguel" value={currency(item.rentValue)}/>
        <PropertyValue label="Demais contas" value={currency(item.chargeTotal)}/>
        <PropertyValue label="Bruto" value={currency(item.grossValue)}/>
        <PropertyValue label="Taxa adm." value={`− ${currency(item.adminFeeValue)}`} tone="negative"/>
        <PropertyValue label="Descontos" value={`− ${currency(item.deductionTotal)}`} tone="negative"/>
        <PropertyValue label="A repassar" value={currency(item.netValue)} tone="total"/>

        <section className="col-span-2 grid grid-cols-2 content-center gap-1.5 border-t border-zinc-100 px-3 py-3 lg:col-span-1 lg:grid-cols-1 lg:border-t-0">
          <button type="button" onClick={() => onEdit(item)} disabled={!item.rentTransactionId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-2 text-[11px] font-bold text-[#280003] transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"><Pencil className="h-3.5 w-3.5"/>Editar</button>
          <button type="button" onClick={() => printRepasseReceipt(item, company)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-[11px] font-bold text-[#004777] transition hover:bg-[#004777]/5"><FileText className="h-3.5 w-3.5"/>Recibo</button>
        </section>
      </div>

      <section aria-labelledby={`composition-${item.key}`} className="border-t border-zinc-100 bg-zinc-50/70">
        <div className="flex items-center justify-between gap-3 px-4 py-2"><h5 id={`composition-${item.key}`} className="text-[10px] font-black uppercase tracking-wide text-[#004777]">Contas deste imóvel</h5><span className="text-[10px] font-semibold text-zinc-400">{operations.length} lançamento(s)</span></div>
        <div className="hidden grid-cols-[82px_120px_minmax(0,1fr)_105px] gap-2 border-y border-zinc-100 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-zinc-400 sm:grid"><span>Data</span><span>Conta</span><span>Descrição</span><span className="text-right">Valor</span></div>
        <div className="divide-y divide-zinc-100">{operations.length === 0 ? <p className="px-3 py-3 text-xs text-zinc-400">Nenhum lançamento vinculado a este imóvel.</p> : operations.map(operation => <div key={operation.id} className="grid gap-1 bg-white/60 px-3 py-2 text-xs sm:grid-cols-[82px_120px_minmax(0,1fr)_105px] sm:items-center sm:gap-2"><span className="text-zinc-500">{date(operation.date)}</span><span><span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600">{typeLabel[operation.type]}</span></span><span className="min-w-0 break-words text-zinc-600">{operation.description}</span><strong className={`sm:text-right ${operation.direction === "DEBITO" ? "text-red-600" : operation.direction === "CREDITO" ? "text-emerald-700" : "text-[#004777]"}`}>{operation.direction === "DEBITO" ? "− " : operation.direction === "CREDITO" ? "+ " : ""}{currency(operation.value)}</strong></div>)}</div>
      </section>
    </article>
  );
}

export function RelatorioResidencial({ reports, items, company, onEdit }: Props) {
  if (reports.length === 0) return null;

  return (
    <section className="space-y-3">
      <div><h2 className="flex items-center gap-2 text-lg font-black text-[#280003]"><Building2 className="h-5 w-5 text-[#004777]"/>Repasses por residencial</h2><p className="mt-1 text-xs text-zinc-500">Visualização consolidada por proprietário. Expanda um residencial para conferir cada imóvel e todos os gastos do mês.</p></div>
      {reports.map(report => {
        const properties = items.filter(item => item.residential?.id === report.id);
        const owners = properties.flatMap(item => [item.owner, ...item.additionalOwners]).filter((owner, index, list) => list.findIndex(candidate => candidate.id === owner.id) === index);
        const primaryOwner = owners[0];
        const generalExpenses = report.operations.filter(operation => !operation.propertyId && operation.type !== "ALUGUEL" && operation.type !== "REPASSE");

        return <details key={report.id} className="group overflow-hidden rounded-3xl border border-[#004777]/10 bg-white shadow-sm transition-shadow open:shadow-md">
          <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004777]/30 sm:p-5 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="rounded-xl bg-[#004777]/10 p-2 text-[#004777]"><Building2 className="h-5 w-5"/></span><h3 className="break-words font-black text-[#280003]">{report.name}</h3><ArrowRight className="h-4 w-4 shrink-0 text-zinc-300"/><span className="inline-flex min-w-0 items-center gap-1.5 break-words text-sm font-bold text-zinc-600"><UserRound className="h-4 w-4 shrink-0 text-[#004777]"/>{report.ownerNames.join(", ") || "Proprietário não informado"}</span>{primaryOwner && <span className="break-all text-[10px] text-zinc-400">{primaryOwner.cpfCnpj || "Documento não informado"}{primaryOwner.pixKey ? ` · Pix ${primaryOwner.pixKey}` : ""}</span>}</div>
                <div className="flex min-h-11 items-center gap-2 text-xs font-bold text-[#004777]"><span className="group-open:hidden">Expandir</span><span className="hidden group-open:inline">Recolher</span><ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180"/></div>
              </div>

              <div className="grid gap-3 pt-4 lg:grid-cols-[150px_minmax(0,1fr)] lg:items-stretch">
                <section aria-label="Quantidade de imóveis" className="flex min-h-20 items-center gap-3 rounded-xl bg-[#004777]/[0.06] p-3 text-[#004777]"><Home className="h-5 w-5 shrink-0"/><div><strong className="block text-xl font-black">{report.propertyCount}</strong><span className="text-[10px] font-bold uppercase tracking-wide">{report.propertyCount === 1 ? "imóvel" : "imóveis"}</span><span className="mt-1 block text-[10px] text-zinc-400">{report.receivedCount} recebido(s)</span></div></section>
                <section aria-label="Resumo bruto do residencial" className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                  <Metric label="Aluguéis" value={currency(report.rentTotal)}/><Metric label="Demais contas" value={currency(report.chargeTotal)}/><Metric label="Bruto" value={currency(report.grossTotal)}/><Metric label="Taxas + descontos" value={`− ${currency(report.adminFeeTotal + report.deductionTotal)}`} tone="negative"/><Metric label="Gastos residencial" value={`− ${currency(report.maintenanceTotal)}`} tone="negative"/><Metric label="Resultado global" value={currency(report.globalResult)} tone="total"/>
                </section>
              </div>
            </div>
          </summary>

          <div className="space-y-5 border-t border-zinc-100 bg-[#EEEEF3]/40 p-3 sm:p-5">
            <section aria-labelledby={`properties-${report.id}`} className="space-y-3">
              <div><h4 id={`properties-${report.id}`} className="text-sm font-black text-[#280003]">Imóveis que compõem o residencial</h4><p className="mt-0.5 text-xs text-zinc-500">Clique em um imóvel para visualizar valores, contrato, datas, ações e todas as contas vinculadas.</p></div>
              <div className="space-y-2">{properties.map(item => {
                const itemOperations = report.operations.filter(operation => operation.propertyId === item.propertyId);
                return <details key={item.key} className="group/unit overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004777]/30 [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-start gap-3"><span className="rounded-lg bg-[#004777]/10 p-2 text-[#004777]"><Home className="h-4 w-4"/></span><div className="min-w-0"><h5 className="break-words text-sm font-black text-[#280003]">{item.propertyAddress}</h5><p className="mt-0.5 text-[11px] text-zinc-500">Locatário: <strong className="text-[#280003]">{item.tenantNames.join(", ") || "não informado"}</strong></p></div></div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-[#004777]"><span className="group-open/unit:hidden">Ver detalhes</span><span className="hidden group-open/unit:inline">Ocultar</span><ChevronDown className="h-4 w-4 transition-transform group-open/unit:rotate-180"/></div>
                  </summary>
                  <div className="border-t border-zinc-100"><div className="hidden grid-cols-[minmax(220px,2.2fr)_repeat(6,minmax(70px,1fr))_118px] bg-[#004777] text-[9px] font-bold uppercase tracking-wide text-white lg:grid"><span className="px-3 py-3">Imóvel</span><span className="px-2 py-3 text-right">Aluguel</span><span className="px-2 py-3 text-right">Demais contas</span><span className="px-2 py-3 text-right">Bruto</span><span className="px-2 py-3 text-right">Taxa adm.</span><span className="px-2 py-3 text-right">Descontos</span><span className="px-2 py-3 text-right">A repassar</span><span className="px-2 py-3 text-center">Ações</span></div><ResidentialProperty item={item} operations={itemOperations} company={company} onEdit={onEdit}/></div>
                </details>;
              })}</div>
            </section>

            {generalExpenses.length > 0 && <section aria-labelledby={`expenses-${report.id}`} className="space-y-3">
              <div><h4 id={`expenses-${report.id}`} className="flex items-center gap-2 text-sm font-black text-[#280003]"><ClipboardList className="h-4 w-4 text-[#004777]"/>Gastos gerais do residencial</h4><p className="mt-0.5 text-xs text-zinc-500">Lançamentos de áreas comuns que não pertencem exclusivamente a um imóvel.</p></div>
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="hidden grid-cols-[105px_140px_140px_1fr_115px] gap-3 bg-[#004777] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-white md:grid"><span>Data</span><span>Imóvel</span><span>Operação</span><span>Descrição</span><span className="text-right">Valor</span></div>
                <div className="divide-y divide-zinc-100">{generalExpenses.map(operation => <article key={operation.id} className="grid gap-2 px-4 py-3 text-xs md:grid-cols-[105px_140px_140px_1fr_115px] md:items-center md:gap-3"><span className="text-zinc-500">{date(operation.date)}</span><span className="font-bold text-[#280003]">Área geral</span><span><span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold text-zinc-600">{typeLabel[operation.type]}</span></span><span className="text-zinc-600">{operation.description}</span><strong className={`text-right ${operation.direction === "DEBITO" ? "text-red-600" : operation.direction === "CREDITO" ? "text-emerald-700" : "text-[#004777]"}`}>{operation.direction === "DEBITO" ? "− " : operation.direction === "CREDITO" ? "+ " : ""}{currency(operation.value)}</strong></article>)}</div>
              </div>
              <p className="flex items-start gap-2 text-[11px] text-zinc-500"><ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Os gastos residenciais informativos compõem o resultado global sem alterar automaticamente o líquido individual de cada imóvel.</p>
            </section>}
          </div>
        </details>;
      })}
    </section>
  );
}

