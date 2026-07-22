"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
  Wrench,
} from "lucide-react";
import { deleteManutencao } from "../actions";
import type {
  ContratoManutencaoOption,
  ManutencaoView,
  PrestadorManutencaoOption,
  StatusManutencaoValue,
} from "../types";
import { ManutencoesFormModal } from "./ManutencoesFormModal";

type ManutencoesClientProps = {
  initialManutencoes: ManutencaoView[];
  contratos: ContratoManutencaoOption[];
  prestadores: PrestadorManutencaoOption[];
  initialError: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function ManutencoesClient({
  initialManutencoes,
  contratos,
  prestadores,
  initialError,
}: ManutencoesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManutencaoView | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODAS" | StatusManutencaoValue>("TODAS");
  const [error, setError] = useState<string | null>(initialError);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return initialManutencoes.filter((item) => {
      if (statusFilter !== "TODAS" && item.status !== statusFilter) return false;
      if (!term) return true;
      return normalize([
        item.descricao,
        item.imovel.codigo,
        item.imovel.titulo,
        item.imovel.endereco,
        item.locatario,
        item.locador,
        item.prestador?.nome || "",
      ].join(" ")).includes(term);
    });
  }, [initialManutencoes, query, statusFilter]);

  const summary = useMemo(() => ({
    total: initialManutencoes.length,
    inProgress: initialManutencoes.filter((item) => item.status === "EM_ANDAMENTO").length,
    finished: initialManutencoes.filter((item) => item.status === "FINALIZADA").length,
    scheduled: initialManutencoes.reduce(
      (total, item) => total + item.descontos.filter((discount) => discount.status === "PROGRAMADO").reduce((sum, discount) => sum + discount.valor, 0),
      0,
    ),
  }), [initialManutencoes]);

  function openCreate() {
    setEditing(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: ManutencaoView) {
    setEditing(item);
    setOpenMenuId(null);
    setError(null);
    setModalOpen(true);
  }

  function handleDelete(item: ManutencaoView) {
    setOpenMenuId(null);
    if (!window.confirm(`Excluir a manutenção "${item.descricao.slice(0, 60)}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteManutencao(item.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#004777]"><Wrench className="h-5 w-5" /><span className="text-xs font-extrabold uppercase tracking-[0.18em]">Operacional</span></div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#280003] sm:text-3xl">Manutenções</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">Acompanhe serviços, recibos e descontos programados nos repasses dos proprietários.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-4 text-sm font-bold text-white shadow-md shadow-[#004777]/15 transition hover:bg-[#00385a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] focus-visible:ring-offset-2"><Plus className="h-4 w-4" />Nova manutenção</button>
      </header>

      {(error || initialError) && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{error || initialError}</span></div>
      )}

      <section aria-label="Resumo das manutenções" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total</p><div className="mt-2 flex items-center justify-between"><strong className="text-2xl text-[#280003]">{summary.total}</strong><Wrench className="h-5 w-5 text-[#004777]" /></div></div>
        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Em andamento</p><div className="mt-2 flex items-center justify-between"><strong className="text-2xl text-amber-600">{summary.inProgress}</strong><AlertCircle className="h-5 w-5 text-amber-500" /></div></div>
        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Finalizadas</p><div className="mt-2 flex items-center justify-between"><strong className="text-2xl text-emerald-600">{summary.finished}</strong><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div></div>
        <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Descontos programados</p><div className="mt-2 flex items-center justify-between gap-2"><strong className="truncate text-lg text-[#004777]">{formatCurrency(summary.scheduled)}</strong><WalletCards className="h-5 w-5 shrink-0 text-[#004777]" /></div></div>
      </section>

      <section className="overflow-visible rounded-3xl border border-white/70 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar imóvel, inquilino, proprietário..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#004777] focus:bg-white focus:ring-2 focus:ring-[#004777]/15" /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-[#280003] outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15"><option value="TODAS">Todos os status</option><option value="EM_ANDAMENTO">Em andamento</option><option value="FINALIZADA">Finalizadas</option></select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="mb-4 rounded-2xl bg-[#EEEEF3] p-4 text-zinc-400"><Wrench className="h-7 w-7" /></div><h2 className="font-bold text-[#280003]">Nenhuma manutenção encontrada</h2><p className="mt-1 max-w-sm text-sm text-zinc-500">{initialManutencoes.length === 0 ? "Crie o primeiro registro para começar o acompanhamento." : "Tente alterar os filtros de pesquisa."}</p>{initialManutencoes.length === 0 && <button type="button" onClick={openCreate} className="mt-5 min-h-11 rounded-xl bg-[#004777] px-4 text-sm font-bold text-white">Criar manutenção</button>}</div>
        ) : (
          <>
            <div className="divide-y divide-zinc-100 lg:hidden">
              {filtered.map((item) => (
                <article key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#280003]">{item.imovel.codigo} · {item.locatario}</p><p className="mt-0.5 text-xs text-zinc-500">{item.imovel.endereco}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "FINALIZADA" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "FINALIZADA" ? "Finalizada" : "Em andamento"}</span></div>
                  <p className="line-clamp-2 text-xs text-zinc-600">{item.descricao}</p>
                  <div className="flex items-center justify-between text-xs"><div><span className="text-zinc-400">{formatDate(item.dataManutencao)}</span><strong className="ml-3 text-[#280003]">{formatCurrency(item.valor)}</strong></div><button type="button" onClick={() => openEdit(item)} className="min-h-11 rounded-lg px-3 font-bold text-[#004777]">Ver / editar</button></div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#EEEEF3]/55 text-[11px] font-bold uppercase tracking-wider text-zinc-500"><tr><th className="px-5 py-3.5">Data</th><th className="px-5 py-3.5">Imóvel / contrato</th><th className="px-5 py-3.5">Serviço</th><th className="px-5 py-3.5">Prestador</th><th className="px-5 py-3.5">Valor</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Ações</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="transition hover:bg-zinc-50/70">
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-zinc-600">{formatDate(item.dataManutencao)}</td>
                      <td className="max-w-[240px] px-5 py-4"><p className="truncate font-bold text-[#280003]">{item.imovel.codigo} · {item.locatario}</p><p className="truncate text-xs text-zinc-400">{item.imovel.endereco}</p></td>
                      <td className="max-w-[260px] px-5 py-4"><p className="line-clamp-2 text-xs text-zinc-600">{item.descricao}</p>{item.documentos.length > 0 && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#004777]"><FileText className="h-3 w-3" />{item.documentos.length} anexo(s)</span>}</td>
                      <td className="px-5 py-4"><p className="text-xs font-semibold text-[#280003]">{item.prestador?.nome || "Não informado"}</p><p className="text-[10px] text-zinc-400">{item.prestador?.area || ""}</p></td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-[#280003]">{formatCurrency(item.valor)}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "FINALIZADA" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "FINALIZADA" ? "Finalizada" : "Em andamento"}</span>{item.repassarProprietario && <p className="mt-1 text-[10px] font-semibold text-[#004777]">Com desconto</p>}</td>
                      <td className="relative px-5 py-4 text-right"><button type="button" onClick={() => setOpenMenuId((current) => current === item.id ? null : item.id)} aria-label="Abrir ações" className="min-h-11 min-w-11 rounded-xl text-zinc-500 hover:bg-zinc-100"><MoreHorizontal className="mx-auto h-5 w-5" /></button>{openMenuId === item.id && <div className="absolute right-5 top-13 z-20 w-40 rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-xl"><button type="button" onClick={() => openEdit(item)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#280003] hover:bg-zinc-50"><Pencil className="h-4 w-4 text-[#004777]" />Editar</button><button type="button" disabled={isPending} onClick={() => handleDelete(item)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Excluir</button></div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {modalOpen && (
        <ManutencoesFormModal
          open
          manutencao={editing}
          contratos={contratos}
          prestadores={prestadores}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
