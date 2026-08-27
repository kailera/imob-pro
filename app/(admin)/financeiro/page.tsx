"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Coins,
  FileCheck,
  Filter,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  FinancialPeriodMetrics,
  type FinancialPeriodMetricsData,
} from "@/components/financeiro/FinancialPeriodMetrics";

type TransactionType = "RECEITA" | "DESPESA";
type TransactionStatus = "PENDENTE" | "LIQUIDADO" | "CANCELADO";
type TransactionCategory =
  | "ALUGUEL"
  | "REPASSE"
  | "TAXA_ADM"
  | "COMISSAO"
  | "CUSTO_OPERACIONAL"
  | "OUTRO";

interface TenantSummary {
  nome: string;
  cpfCnpj: string;
}

interface FinancialTransaction {
  id: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  categoria: TransactionCategory;
  status: TransactionStatus;
  dataVencimento: string;
  dataPagamento?: string | null;
  interDataRecebimento?: string | null;
  interValorRecebido?: number | string | null;
  contrato?: { locatarios: TenantSummary[] } | null;
}

const EMPTY_PERIOD_METRICS: FinancialPeriodMetricsData = {
  activeContracts: 0,
  contractCharges: 0,
  generatedBills: 0,
  settledBills: 0,
};

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  ALUGUEL: "Aluguel",
  REPASSE: "Repasse",
  TAXA_ADM: "Taxa administrativa",
  COMISSAO: "Comissão",
  CUSTO_OPERACIONAL: "Custo operacional",
  OUTRO: "Outro",
};

const currentMonth = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

const monthRange = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });

const formatDocument = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value || "—";
};

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [paidTransactions, setPaidTransactions] = useState<FinancialTransaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [periodMetrics, setPeriodMetrics] = useState(EMPTY_PERIOD_METRICS);
  const [periodMetricsLoading, setPeriodMetricsLoading] = useState(true);
  const [periodMetricsError, setPeriodMetricsError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCpf, setFilterCpf] = useState("");
  const [filterName, setFilterName] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("RECEITA");
  const [category, setCategory] = useState<TransactionCategory>("ALUGUEL");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TransactionStatus>("PENDENTE");

  const monthOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, index) => {
      const value = `${year}-${String(index + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, index, 1));

      return {
        value,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      };
    });
  }, []);

  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const label = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedMonth]);

  const loadPeriodMetrics = useCallback(async () => {
    setPeriodMetricsLoading(true);
    setPeriodMetricsError("");
    try {
      const response = await fetch(
        `/api/financeiro/metricas?month=${encodeURIComponent(selectedMonth)}`,
      );
      if (!response.ok) throw new Error("Falha ao carregar os indicadores.");
      const data = await response.json() as FinancialPeriodMetricsData;
      setPeriodMetrics(data);
    } catch (loadError) {
      console.error("Erro ao buscar indicadores financeiros:", loadError);
      setPeriodMetrics(EMPTY_PERIOD_METRICS);
      setPeriodMetricsError("Não foi possível carregar os indicadores do período.");
    } finally {
      setPeriodMetricsLoading(false);
    }
  }, [selectedMonth]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const range = monthRange(selectedMonth);
      const listParams = new URLSearchParams({
        dateField: "vencimento",
        ...range,
      });
      const paidParams = new URLSearchParams({
        dateField: "pagamento",
        status: "LIQUIDADO",
        ...range,
      });
      const pendingParams = new URLSearchParams({
        dateField: "vencimento",
        status: "PENDENTE",
        ...range,
      });

      if (filterStatus) listParams.set("status", filterStatus);
      if (filterCategory) listParams.set("categoria", filterCategory);
      if (filterCpf.trim()) listParams.set("cpf", filterCpf.trim());
      if (filterName.trim()) listParams.set("nome", filterName.trim());

      const [listResponse, paidResponse, pendingResponse] = await Promise.all([
        fetch(`/api/financeiro/transacoes?${listParams.toString()}`),
        fetch(`/api/financeiro/transacoes?${paidParams.toString()}`),
        fetch(`/api/financeiro/transacoes?${pendingParams.toString()}`),
      ]);

      if (!listResponse.ok || !paidResponse.ok || !pendingResponse.ok) {
        throw new Error("Não foi possível carregar as transações.");
      }

      const [listData, paidData, pendingData] = await Promise.all([
        listResponse.json() as Promise<FinancialTransaction[]>,
        paidResponse.json() as Promise<FinancialTransaction[]>,
        pendingResponse.json() as Promise<FinancialTransaction[]>,
      ]);

      setTransactions(listData);
      setPaidTransactions(paidData);
      setPendingTransactions(pendingData);
    } catch (loadError) {
      console.error("Erro ao buscar transações:", loadError);
      setTransactions([]);
      setPaidTransactions([]);
      setPendingTransactions([]);
      setError("Não foi possível carregar os dados financeiros. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterCpf, filterName, filterStatus, selectedMonth]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadTransactions(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadTransactions]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPeriodMetrics(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadPeriodMetrics]);

  const metrics = useMemo(() => {
    const totalReceipts = paidTransactions
      .filter((transaction) => transaction.tipo === "RECEITA")
      .reduce(
        (total, transaction) => total + Number(transaction.interValorRecebido ?? transaction.valor),
        0,
      );
    const totalExpenses = paidTransactions
      .filter((transaction) => transaction.tipo === "DESPESA")
      .reduce((total, transaction) => total + transaction.valor, 0);
    const pendingReceipts = pendingTransactions
      .filter((transaction) => transaction.tipo === "RECEITA")
      .reduce((total, transaction) => total + transaction.valor, 0);
    const pendingExpenses = pendingTransactions
      .filter((transaction) => transaction.tipo === "DESPESA")
      .reduce((total, transaction) => total + transaction.valor, 0);

    return {
      totalReceipts,
      totalExpenses,
      pendingReceipts,
      pendingExpenses,
      netResult: totalReceipts - totalExpenses,
    };
  }, [paidTransactions, pendingTransactions]);

  const resetFilters = () => {
    setSelectedMonth(currentMonth());
    setFilterStatus("");
    setFilterCategory("");
    setFilterCpf("");
    setFilterName("");
  };

  const handleAddTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description || !amount || !dueDate) return;

    try {
      const response = await fetch("/api/financeiro/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: description,
          valor: Number(amount),
          tipo: type,
          categoria: category,
          status,
          dataVencimento: dueDate,
          dataPagamento: status === "LIQUIDADO" ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) throw new Error("Falha ao criar lançamento.");

      setShowModal(false);
      setDescription("");
      setAmount("");
      setDueDate("");
      setStatus("PENDENTE");
      await loadTransactions();
    } catch (creationError) {
      console.error("Erro ao criar transação:", creationError);
      setError("Não foi possível salvar o lançamento.");
    }
  };

  return (
    <div className="min-h-screen bg-[#EEEEF3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#280003] sm:text-3xl">Gestão Financeira</h1>
            <p className="mt-1 text-sm text-gray-500">
              Fluxo de caixa real e consolidado mensal da imobiliária.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/financeiro/repasse" className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-[#280003] shadow-sm transition-colors hover:bg-gray-50">
              <WalletCards className="h-4 w-4 text-[#004777]" />
              Repasses
            </Link>
            <Link href="/comissoes" className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-[#280003] shadow-sm transition-colors hover:bg-gray-50">
              <UserCheck className="h-4 w-4 text-[#004777]" />
              Gerenciar Comissões
            </Link>
            <Link href="/conciliacao" className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-[#280003] shadow-sm transition-colors hover:bg-gray-50">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              Conciliação Bancária
            </Link>
            <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-[#004777] px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#00385e]">
              <Plus className="h-4 w-4" />
              Lançamento manual
            </button>
          </div>
        </header>

        <section aria-label={`Resumo financeiro de ${selectedMonthLabel}`} className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,2.15fr)]">
          <FinancialPeriodMetrics
            data={periodMetrics}
            periodLabel={selectedMonthLabel}
            loading={periodMetricsLoading}
            error={periodMetricsError}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Receitas liquidadas" value={metrics.totalReceipts} detail={`A receber: ${formatCurrency(metrics.pendingReceipts)}`} tone="positive" icon={<ArrowUpRight className="h-6 w-6" />} />
            <MetricCard label="Despesas pagas" value={metrics.totalExpenses} detail={`A pagar: ${formatCurrency(metrics.pendingExpenses)}`} tone="negative" icon={<ArrowDownRight className="h-6 w-6" />} />
            <MetricCard label="Resultado líquido" value={metrics.netResult} detail={`Valores de ${selectedMonthLabel}`} tone={metrics.netResult >= 0 ? "neutral" : "warning"} icon={<Coins className="h-6 w-6" />} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-xl bg-[#004777]/10 p-2 text-[#004777]"><Filter className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold text-[#280003]">Filtros do fluxo de caixa</h2>
              <p className="text-xs text-gray-500">Os dados são atualizados automaticamente ao alterar os campos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterField label="Mês de referência" icon={<CalendarDays className="h-4 w-4" />}>
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#280003] outline-none transition focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10">
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Situação">
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#280003] outline-none transition focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10">
                <option value="">Todas</option>
                <option value="PENDENTE">Pendente</option>
                <option value="LIQUIDADO">Liquidado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </FilterField>
            <FilterField label="Categoria">
              <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#280003] outline-none transition focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10">
                <option value="">Todas</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </FilterField>
            <FilterField label="CPF/CNPJ" icon={<Search className="h-4 w-4" />}>
              <input type="search" inputMode="numeric" value={filterCpf} onChange={(event) => setFilterCpf(event.target.value)} placeholder="Digite o documento" className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#280003] outline-none transition placeholder:text-gray-400 focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10" />
            </FilterField>
            <FilterField label="Nome" icon={<Search className="h-4 w-4" />}>
              <input type="search" value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Digite o nome" className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#280003] outline-none transition placeholder:text-gray-400 focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/10" />
            </FilterField>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#280003]">
              <RotateCcw className="h-4 w-4" /> Limpar filtros
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-[#EEEEF3] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-[#280003]">Fluxo de caixa</h2>
              <p className="text-xs text-gray-500">{selectedMonthLabel} · {transactions.length} {transactions.length === 1 ? "transação" : "transações"}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 font-semibold text-gray-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Carregando fluxo de caixa...</div>
          ) : error ? (
            <div className="p-12 text-center"><p className="text-sm font-medium text-red-600">{error}</p><button type="button" onClick={() => void loadTransactions()} className="mt-3 text-sm font-bold text-[#004777] hover:underline">Tentar novamente</button></div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center"><p className="font-semibold text-gray-500">Nenhuma transação encontrada.</p><p className="mt-1 text-sm text-gray-400">Altere os filtros ou registre um novo lançamento.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm text-[#280003]">
                <thead className="bg-[#EEEEF3]/50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <tr><th className="px-6 py-4">Vencimento</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Pessoa</th><th className="px-6 py-4">CPF/CNPJ</th><th className="px-6 py-4">Categoria</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Situação</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3]">
                  {transactions.map((transaction) => {
                    const tenant = transaction.contrato?.locatarios?.[0];
                    return (
                      <tr key={transaction.id} className="transition-colors hover:bg-[#EEEEF3]/20">
                        <td className="whitespace-nowrap px-6 py-4 font-medium">{formatDate(transaction.dataVencimento)}</td>
                        <td className="max-w-[240px] px-6 py-4 font-semibold"><span className="line-clamp-2">{transaction.descricao}</span></td>
                        <td className="px-6 py-4">{tenant?.nome || "—"}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">{formatDocument(tenant?.cpfCnpj || "")}</td>
                        <td className="px-6 py-4"><span className="rounded-full bg-[#EEEEF3] px-2.5 py-1 text-xs font-medium">{CATEGORY_LABELS[transaction.categoria]}</span></td>
                        <td className={`whitespace-nowrap px-6 py-4 font-bold ${transaction.tipo === "RECEITA" ? "text-emerald-700" : "text-red-600"}`}>{transaction.tipo === "RECEITA" ? "+" : "−"} {formatCurrency(transaction.valor)}</td>
                        <td className="px-6 py-4"><StatusBadge status={transaction.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#280003]/40 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="new-transaction-title">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#EEEEF3] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEEEF3] bg-[#EEEEF3]/30 p-6">
              <h2 id="new-transaction-title" className="text-lg font-extrabold text-[#280003]">Novo lançamento manual</h2>
              <button type="button" aria-label="Fechar" onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#EEEEF3] hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4 p-6">
              <FormField label="Descrição"><input type="text" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Energia do escritório" className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20" required /></FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Valor (R$)"><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20" required /></FormField>
                <FormField label="Data de vencimento"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20" required /></FormField>
                <FormField label="Tipo"><select value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20"><option value="RECEITA">Receita (+)</option><option value="DESPESA">Despesa (−)</option></select></FormField>
                <FormField label="Categoria"><select value={category} onChange={(event) => setCategory(event.target.value as TransactionCategory)} className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20">{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FormField>
              </div>
              <FormField label="Situação"><select value={status} onChange={(event) => setStatus(event.target.value as TransactionStatus)} className="min-h-11 w-full rounded-xl border-0 bg-[#EEEEF3]/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#004777]/20"><option value="PENDENTE">Pendente</option><option value="LIQUIDADO">Liquidado / pago</option></select></FormField>
              <div className="flex items-center justify-end gap-3 border-t border-[#EEEEF3] pt-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-[#EEEEF3]">Cancelar</button><button type="submit" className="rounded-xl bg-[#004777] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#00385e]">Confirmar lançamento</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail, tone, icon }: { label: string; value: number; detail: string; tone: "positive" | "negative" | "neutral" | "warning"; icon: React.ReactNode }) {
  const tones = { positive: "text-emerald-600 bg-emerald-50", negative: "text-red-600 bg-red-50", neutral: "text-[#004777] bg-[#004777]/5", warning: "text-amber-600 bg-amber-50" };
  const [textTone, backgroundTone] = tones[tone].split(" ");
  return <article className="flex items-center justify-between rounded-3xl border border-white/60 bg-white p-6 shadow-sm"><div className="space-y-2"><span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span><strong className={`block text-2xl ${textTone}`}>{formatCurrency(value)}</strong><span className="block text-xs text-gray-500">{detail}</span></div><div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${backgroundTone} ${textTone}`}>{icon}</div></article>;
}

function FilterField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="flex items-center gap-1.5 text-xs font-bold text-[#280003]/70">{icon}{label}</span>{children}</label>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase text-gray-500">{label}</span>{children}</label>;
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const styles = status === "LIQUIDADO" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : status === "CANCELADO" ? "border-gray-200 bg-gray-100 text-gray-500" : "border-amber-100 bg-amber-50 text-amber-700";
  const dot = status === "LIQUIDADO" ? "bg-emerald-600" : status === "CANCELADO" ? "bg-gray-400" : "bg-amber-500";
  const label = status === "LIQUIDADO" ? "Liquidado" : status === "CANCELADO" ? "Cancelado" : "Pendente";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</span>;
}
