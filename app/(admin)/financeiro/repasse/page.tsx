"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Download, Filter, LoaderCircle, RefreshCcw, Search, WalletCards } from "lucide-react";
import ListaRepasse from "./components/Lista-repasse";
import EditarRepasse from "./components/editar-repasse";
import type { RepasseCompany, RepasseItem, RepasseListResponse, RepasseStatus, RepasseSummary } from "@/lib/financeiro/repasse-types";

const currentCompetence = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const currency = (value: number) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(value);

const emptySummary: RepasseSummary = { contracts: 0, received: 0, grossTotal: 0, adminFeeTotal: 0, deductionTotal: 0, netTotal: 0 };
const emptyCompany: RepasseCompany = { name: "Imobiliária", legalName: null, cnpj: null, creci: null, phone: null, email: null, logoUrl: null, address: "" };

export default function RepassePage() {
  const [competence, setCompetence] = useState(currentCompetence);
  const [items, setItems] = useState<RepasseItem[]>([]);
  const [summary, setSummary] = useState<RepasseSummary>(emptySummary);
  const [company, setCompany] = useState<RepasseCompany>(emptyCompany);
  const [status, setStatus] = useState<"" | RepasseStatus>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RepasseItem | null>(null);

  const monthOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => ({
      value: `${year}-${String(index + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, index, 1)),
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/financeiro/repasses?competencia=${encodeURIComponent(competence)}`);
      const result = await response.json() as RepasseListResponse | { error?: string };
      if (!response.ok || !("success" in result)) {
        const message = "error" in result ? result.error : null;
        throw new Error(message || "Não foi possível carregar os repasses.");
      }
      setItems(result.data);
      setSummary(result.summary);
      setCompany(result.company);
    } catch (loadError) {
      setItems([]);
      setSummary(emptySummary);
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os repasses.");
    } finally {
      setLoading(false);
    }
  }, [competence]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      if (status && item.status !== status) return false;
      if (!term) return true;
      return [
        item.owner.name,
        item.owner.cpfCnpj,
        item.propertyCode,
        item.propertyTitle,
        item.propertyAddress,
        item.contractCode,
        ...item.tenantNames,
      ].some((value) => value.toLocaleLowerCase("pt-BR").includes(term));
    });
  }, [items, search, status]);

  const exportCsv = () => {
    const header = ["Proprietário", "CPF/CNPJ", "Contrato", "Imóvel", "Endereço", "Valor bruto", "Taxa adm.", "Manutenções/outros", "Valor líquido", "Situação"];
    const rows = filteredItems.map((item) => [
      item.owner.name,
      item.owner.cpfCnpj,
      item.contractCode,
      `${item.propertyCode} - ${item.propertyTitle}`,
      item.propertyAddress,
      item.grossValue.toFixed(2).replace(".", ","),
      item.adminFeeValue.toFixed(2).replace(".", ","),
      item.deductionTotal.toFixed(2).replace(".", ","),
      item.netValue.toFixed(2).replace(".", ","),
      item.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `repasses-${competence}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Link href="/financeiro" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 transition hover:text-[#004777]"><ArrowLeft className="h-3.5 w-3.5" />Voltar ao financeiro</Link>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-[#280003] sm:text-3xl"><span className="rounded-2xl bg-[#004777] p-2.5 text-white"><WalletCards className="h-6 w-6" /></span>Repasses a proprietários</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">Consolidação dos contratos ativos, aluguéis recebidos, taxas administrativas, manutenções e valor líquido de cada proprietário.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 shadow-sm hover:bg-gray-50"><RefreshCcw className="h-4 w-4" />Atualizar</button>
            <button type="button" onClick={exportCsv} disabled={filteredItems.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777] px-4 text-sm font-bold text-white shadow-md hover:bg-[#00385e] disabled:opacity-40"><Download className="h-4 w-4" />Exportar planilha</button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard label="Contratos ativos" value={String(summary.contracts)} detail={`${summary.received} aluguel(is) recebido(s)`} />
          <SummaryCard label="Valor bruto" value={currency(summary.grossTotal)} detail="Aluguéis da competência" />
          <SummaryCard label="Taxas administrativas" value={`− ${currency(summary.adminFeeTotal)}`} detail="Receita da imobiliária" negative />
          <SummaryCard label="Manutenções e outros" value={`− ${currency(summary.deductionTotal)}`} detail="Descontos do proprietário" negative />
          <SummaryCard label="Total a repassar" value={currency(summary.netTotal)} detail="Líquido consolidado" highlighted />
        </section>

        <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2"><Filter className="h-4 w-4 text-[#004777]" /><h2 className="text-sm font-black text-[#280003]">Filtros da relação de repasses</h2></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_240px_1fr]">
            <label><span className="mb-1.5 flex items-center gap-1 text-xs font-bold text-gray-500"><CalendarDays className="h-3.5 w-3.5" />Competência</span><select value={competence} onChange={(event) => setCompetence(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-[#280003] outline-none focus:border-[#004777]">{monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label.charAt(0).toUpperCase() + month.label.slice(1)}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-bold text-gray-500">Situação</span><select value={status} onChange={(event) => setStatus(event.target.value as "" | RepasseStatus)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-[#280003] outline-none focus:border-[#004777]"><option value="">Todas</option><option value="AGUARDANDO_RECEBIMENTO">Aguardando aluguel</option><option value="PRONTO">Pronto para gerar</option><option value="PENDENTE">Repasse pendente</option><option value="PAGO">Repassado</option></select></label>
            <label><span className="mb-1.5 block text-xs font-bold text-gray-500">Proprietário, imóvel, contrato ou locatário</span><div className="relative"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite para pesquisar" className="min-h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-[#004777]" /></div></label>
          </div>
        </section>

        {loading ? <div className="flex min-h-64 items-center justify-center gap-2 rounded-3xl bg-white font-semibold text-gray-500"><LoaderCircle className="h-5 w-5 animate-spin text-[#004777]" />Buscando contratos e calculando repasses...</div> : error ? <div className="rounded-3xl border border-red-100 bg-red-50 p-10 text-center"><p className="font-bold text-red-700">{error}</p><button type="button" onClick={() => void load()} className="mt-3 text-sm font-bold text-[#004777] hover:underline">Tentar novamente</button></div> : <ListaRepasse items={filteredItems} company={company} onEdit={setEditing} />}
      </div>

      {editing && <EditarRepasse item={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function SummaryCard({ label, value, detail, negative = false, highlighted = false }: { label: string; value: string; detail: string; negative?: boolean; highlighted?: boolean }) {
  return <article className={`rounded-3xl p-4 shadow-sm sm:p-5 ${highlighted ? "bg-[#004777] text-white" : "bg-white text-[#280003]"}`}><span className={`block text-[10px] font-bold uppercase tracking-wider ${highlighted ? "text-white/60" : "text-gray-400"}`}>{label}</span><strong className={`mt-2 block text-lg sm:text-xl ${negative && !highlighted ? "text-red-600" : ""}`}>{value}</strong><span className={`mt-1 block text-[10px] ${highlighted ? "text-white/60" : "text-gray-400"}`}>{detail}</span></article>;
}
