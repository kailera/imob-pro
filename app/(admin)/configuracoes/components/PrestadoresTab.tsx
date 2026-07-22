"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import {
  createOrUpdatePrestadorServico,
  getPrestadoresServico,
  setPrestadorServicoAtivo,
  type PrestadorServicoInput,
  type PrestadorServicoView,
} from "../prestadoresActions";

type PrestadoresTabProps = {
  isAdmin: boolean;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function PrestadoresTab({ isAdmin }: PrestadoresTabProps) {
  const [isPending, startTransition] = useTransition();
  const [prestadores, setPrestadores] = useState<PrestadorServicoView[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrestadorServicoView | null>(null);
  const [nome, setNome] = useState("");
  const [area, setArea] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pix, setPix] = useState("");
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadPrestadores = useCallback(async () => {
    setLoading(true);
    const result = await getPrestadoresServico();
    if (result.success) {
      setPrestadores(result.data);
    } else {
      setMessage({ type: "error", text: result.error });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPrestadoresServico().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setPrestadores(result.data);
      } else {
        setMessage({ type: "error", text: result.error });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return prestadores.filter((prestador) => {
      if (!showInactive && !prestador.ativo) return false;
      if (!term) return true;
      return normalize(`${prestador.nome} ${prestador.area} ${prestador.telefone || ""} ${prestador.pix || ""}`).includes(term);
    });
  }, [prestadores, query, showInactive]);

  function resetForm() {
    setEditing(null);
    setNome("");
    setArea("");
    setTelefone("");
    setPix("");
    setFormOpen(false);
  }

  function openCreate() {
    setEditing(null);
    setNome("");
    setArea("");
    setTelefone("");
    setPix("");
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(prestador: PrestadorServicoView) {
    setEditing(prestador);
    setNome(prestador.nome);
    setArea(prestador.area);
    setTelefone(prestador.telefone || "");
    setPix(prestador.pix || "");
    setMessage(null);
    setFormOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const input: PrestadorServicoInput = { nome, area, telefone: telefone || null, pix: pix || null };

    startTransition(async () => {
      const result = await createOrUpdatePrestadorServico(input, editing?.id);
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      const successText = editing ? "Prestador atualizado com sucesso." : "Prestador cadastrado com sucesso.";
      resetForm();
      await loadPrestadores();
      setMessage({ type: "success", text: successText });
    });
  }

  function toggleActive(prestador: PrestadorServicoView) {
    const action = prestador.ativo ? "inativar" : "reativar";
    if (!window.confirm(`Deseja ${action} ${prestador.nome}?`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await setPrestadorServicoAtivo(prestador.id, !prestador.ativo);
      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      await loadPrestadores();
      setMessage({ type: "success", text: `Prestador ${result.data.ativo ? "reativado" : "inativado"} com sucesso.` });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[#004777]"><Wrench className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Equipe operacional</span></div>
          <h3 className="text-xl font-bold text-[#280003]">Prestadores de Serviço</h3>
          <p className="mt-1 max-w-xl text-sm text-gray-500">Cadastre os profissionais que podem ser vinculados às manutenções dos imóveis.</p>
        </div>
        {isAdmin && !formOpen && (
          <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#00385a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777] focus-visible:ring-offset-2"><Plus className="h-4 w-4" />Novo prestador</button>
        )}
      </div>

      {message && (
        <div role="status" className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-medium ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[#004777]/15 bg-[#004777]/5 p-5">
          <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-[#280003]">{editing ? "Editar prestador" : "Cadastrar prestador"}</h4><p className="text-xs text-gray-500">Nome e área são obrigatórios. Telefone e Pix são opcionais.</p></div><button type="button" onClick={resetForm} disabled={isPending} aria-label="Fechar formulário" className="min-h-11 min-w-11 rounded-xl text-gray-500 hover:bg-white disabled:opacity-50"><X className="mx-auto h-5 w-5" /></button></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label htmlFor="prestador-nome" className="mb-1.5 block text-xs font-bold text-[#280003]">Nome *</label><input id="prestador-nome" required maxLength={120} autoFocus value={nome} disabled={isPending} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: João da Silva" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-gray-100" /></div>
            <div><label htmlFor="prestador-area" className="mb-1.5 block text-xs font-bold text-[#280003]">Área de atuação *</label><input id="prestador-area" required maxLength={100} value={area} disabled={isPending} onChange={(event) => setArea(event.target.value)} placeholder="Ex.: Elétrica, hidráulica, pintura" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-gray-100" /></div>
            <div><label htmlFor="prestador-telefone" className="mb-1.5 block text-xs font-bold text-[#280003]">Telefone <span className="font-normal text-gray-400">(opcional)</span></label><input id="prestador-telefone" type="tel" maxLength={30} value={telefone} disabled={isPending} onChange={(event) => setTelefone(formatPhone(event.target.value))} placeholder="(18) 99999-9999" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-gray-100" /></div>
            <div><label htmlFor="prestador-pix" className="mb-1.5 block text-xs font-bold text-[#280003]">Chave Pix <span className="font-normal text-gray-400">(opcional)</span></label><input id="prestador-pix" maxLength={180} value={pix} disabled={isPending} onChange={(event) => setPix(event.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-gray-100" /></div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#004777]/10 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={resetForm} disabled={isPending} className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancelar</button><button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-5 text-sm font-bold text-white hover:bg-[#00385a] disabled:opacity-50">{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isPending ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar prestador"}</button></div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, área, telefone ou Pix" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#004777] focus:bg-white focus:ring-2 focus:ring-[#004777]/15" /></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-gray-500"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-4 w-4 accent-[#004777]" />Mostrar inativos</label>
      </div>

      {loading ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/40"><Loader2 className="mb-2 h-7 w-7 animate-spin text-[#004777]" /><p className="text-xs font-medium text-gray-500">Carregando prestadores...</p></div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-6 text-center"><div className="mb-3 rounded-2xl bg-white p-3 text-gray-400 shadow-sm"><Wrench className="h-6 w-6" /></div><p className="text-sm font-bold text-[#280003]">Nenhum prestador encontrado</p><p className="mt-1 text-xs text-gray-500">{prestadores.length === 0 ? "Cadastre o primeiro prestador para utilizá-lo nas manutenções." : "Tente alterar a busca ou exibir os inativos."}</p></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="divide-y divide-gray-100 md:hidden">
            {filtered.map((prestador) => (
              <article key={prestador.id} className={`space-y-3 p-4 ${!prestador.ativo ? "bg-gray-50 opacity-75" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#280003]">{prestador.nome}</p><p className="text-xs font-semibold text-[#004777]">{prestador.area}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${prestador.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{prestador.ativo ? "Ativo" : "Inativo"}</span></div><div className="space-y-1 text-xs text-gray-500">{prestador.telefone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{prestador.telefone}</p>}{prestador.pix && <p className="flex items-center gap-2 break-all"><WalletCards className="h-3.5 w-3.5" />{prestador.pix}</p>}</div>{isAdmin && <div className="flex justify-end gap-2"><button type="button" onClick={() => openEdit(prestador)} className="min-h-11 rounded-lg px-3 text-xs font-bold text-[#004777]">Editar</button><button type="button" onClick={() => toggleActive(prestador)} disabled={isPending} className={`min-h-11 rounded-lg px-3 text-xs font-bold ${prestador.ativo ? "text-red-600" : "text-emerald-700"}`}>{prestador.ativo ? "Inativar" : "Reativar"}</button></div>}</article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead><tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-bold uppercase tracking-wider text-gray-500"><th className="px-5 py-4">Prestador</th><th className="px-5 py-4">Contato</th><th className="px-5 py-4">Pix</th><th className="px-5 py-4">Manutenções</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((prestador) => <tr key={prestador.id} className={`transition hover:bg-gray-50/60 ${!prestador.ativo ? "bg-gray-50/50 text-gray-400" : ""}`}><td className="px-5 py-4"><p className="text-sm font-bold text-[#280003]">{prestador.nome}</p><p className="text-xs font-semibold text-[#004777]">{prestador.area}</p></td><td className="px-5 py-4 text-sm text-gray-600">{prestador.telefone || "—"}</td><td className="max-w-56 px-5 py-4"><p className="truncate text-sm text-gray-600" title={prestador.pix || undefined}>{prestador.pix || "—"}</p></td><td className="px-5 py-4 text-sm font-semibold text-gray-600">{prestador.manutencoesCount}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${prestador.ativo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{prestador.ativo ? "Ativo" : "Inativo"}</span></td><td className="px-5 py-4 text-right">{isAdmin && <div className="inline-flex items-center gap-1"><button type="button" onClick={() => openEdit(prestador)} title="Editar prestador" className="min-h-11 min-w-11 rounded-lg text-[#004777] hover:bg-[#004777]/5"><Pencil className="mx-auto h-4 w-4" /></button><button type="button" onClick={() => toggleActive(prestador)} disabled={isPending} className={`min-h-11 rounded-lg px-3 text-xs font-bold hover:bg-gray-50 disabled:opacity-50 ${prestador.ativo ? "text-red-600" : "text-emerald-700"}`}>{prestador.ativo ? "Inativar" : "Reativar"}</button></div>}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
