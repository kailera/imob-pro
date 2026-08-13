"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Check, CircleDollarSign, Home, Loader2, Plus, Wrench, X } from "lucide-react";
import { saveDespesaResidencial, saveManutencaoResidencial, saveResidencial, toggleDespesaResidencial } from "../actions";
import type { CategoriaDespesa, ResidenciaisPageData, ResidencialView, TipoRateio } from "../types";
import { ImovelDetalhadoSelector } from "./ImovelDetalhadoSelector";

type Props = { initialData: ResidenciaisPageData; initialError: string | null };
type Modal = "residencial" | "despesa" | "manutencao" | null;
const hoje = new Date().toISOString().slice(0, 10);

const categoriaLabel: Record<CategoriaDespesa, string> = {
  INTERNET: "Internet", GAS: "Gás", LIMPEZA: "Limpeza", SEGURANCA: "Segurança",
  JARDINAGEM: "Jardinagem", ENERGIA_COMUM: "Energia comum", OUTROS: "Outros",
};

function dinheiro(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function dataBr(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); }

export function ResidenciaisClient({ initialData, initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(initialData.residenciais[0]?.id ?? "");
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<ResidencialView | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const selected = initialData.residenciais.find(item => item.id === selectedId) ?? initialData.residenciais[0] ?? null;
  const disponiveis = useMemo(() => [...initialData.imoveisDisponiveis, ...(editing?.imoveis ?? [])], [initialData.imoveisDisponiveis, editing]);

  function finish(result: { success: boolean; error?: string; warning?: string }) {
    if (!result.success) { setError(result.error || "Não foi possível concluir a operação."); return; }
    setError(result.warning ?? null); setModal(null); setEditing(null); router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[#004777]"><Building2 className="h-5 w-5"/><span className="text-xs font-extrabold uppercase tracking-[.18em]">Patrimônio agrupado</span></div><h1 className="text-3xl font-extrabold text-[#280003]">Residenciais e condomínios</h1><p className="mt-1 max-w-3xl text-sm text-zinc-500">Agrupe imóveis, centralize despesas compartilhadas e organize manutenções gerais ou por unidade.</p></div>
        <button onClick={() => { setEditing(null); setModal("residencial"); setError(null); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#004777] px-4 text-sm font-bold text-white"><Plus className="h-4 w-4"/>Novo residencial</button>
      </header>

      {error && <div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${error.includes("prioridade") ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-100 bg-red-50 text-red-700"}`}><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/>{error}</div>}

      {initialData.residenciais.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><Building2 className="mx-auto h-10 w-10 text-zinc-300"/><h2 className="mt-4 font-bold text-[#280003]">Nenhum residencial cadastrado</h2><p className="mt-1 text-sm text-zinc-500">Crie o primeiro agrupamento e selecione as casas ou apartamentos que pertencem a ele.</p></section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border border-zinc-100 bg-white p-2 shadow-sm">
            {initialData.residenciais.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${selected?.id === item.id ? "bg-[#004777] text-white" : "hover:bg-zinc-50"}`}><span className="block text-sm font-bold">{item.nome}</span><span className={`text-xs ${selected?.id === item.id ? "text-white/70" : "text-zinc-400"}`}>{item.imoveis.length} unidade(s) · {item.tipo === "CONDOMINIO" ? "Condomínio" : "Residencial"}</span></button>)}
          </aside>

          {selected && <main className="space-y-5">
            <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#004777]/10 px-2.5 py-1 text-[10px] font-bold uppercase text-[#004777]">{selected.tipo === "CONDOMINIO" ? "Condomínio" : "Residencial"}</span><h2 className="mt-3 text-2xl font-extrabold text-[#280003]">{selected.nome}</h2><p className="mt-1 text-sm text-zinc-500">{selected.descricao || "Sem descrição."}</p></div><button onClick={() => { setEditing(selected); setModal("residencial"); }} className="min-h-11 rounded-xl border border-zinc-200 px-4 text-xs font-bold text-[#004777]">Editar</button></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{selected.imoveis.map(imovel => <div key={imovel.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3"><div className="flex gap-2"><Home className="mt-0.5 h-4 w-4 shrink-0 text-[#004777]"/><div><p className="text-sm font-bold text-[#280003]">{imovel.codigo} · {imovel.titulo || "Imóvel"}</p><p className="mt-0.5 text-xs text-zinc-500">{imovel.endereco}</p></div></div></div>)}</div>
            </section>

            <section className="rounded-3xl border border-zinc-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 p-5"><div><h3 className="flex items-center gap-2 font-extrabold text-[#280003]"><CircleDollarSign className="h-5 w-5 text-[#004777]"/>Despesas compartilhadas</h3><p className="mt-1 text-xs text-zinc-500">Entram automaticamente na composição mensal dos boletos durante a vigência.</p></div><button onClick={() => setModal("despesa")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777]/10 px-3 text-xs font-bold text-[#004777]"><Plus className="h-4 w-4"/>Despesa</button></div>
              <div className="divide-y divide-zinc-100">{selected.despesas.length === 0 ? <p className="p-6 text-center text-sm text-zinc-400">Nenhuma despesa cadastrada.</p> : selected.despesas.map(item => <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-sm font-bold text-[#280003]">{item.nome}</p><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">{categoriaLabel[item.categoria]}</span>{!item.ativo && <span className="text-[10px] font-bold text-red-500">Inativa</span>}</div><p className="mt-1 text-xs text-zinc-400">Desde {dataBr(item.inicioVigencia)}{item.fimVigencia ? ` até ${dataBr(item.fimVigencia)}` : " · sem data final"}</p></div><div className="flex items-center gap-3"><strong className="text-sm text-[#004777]">{dinheiro(item.valor)}/unidade</strong><button disabled={pending} onClick={() => startTransition(async () => finish(await toggleDespesaResidencial(item.id)))} className="min-h-11 rounded-lg px-3 text-xs font-bold text-zinc-500">{item.ativo ? "Desativar" : "Ativar"}</button></div></div>)}</div>
            </section>

            <section className="rounded-3xl border border-zinc-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 p-5"><div><h3 className="flex items-center gap-2 font-extrabold text-[#280003]"><Wrench className="h-5 w-5 text-[#004777]"/>Serviços e manutenções</h3><p className="mt-1 text-xs text-zinc-500">Registros gerais ou de uma unidade, com modelo de rateio.</p></div><button onClick={() => setModal("manutencao")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777]/10 px-3 text-xs font-bold text-[#004777]"><Plus className="h-4 w-4"/>Manutenção</button></div>
              <div className="divide-y divide-zinc-100">{selected.manutencoes.length === 0 ? <p className="p-6 text-center text-sm text-zinc-400">Nenhuma manutenção cadastrada.</p> : selected.manutencoes.map(item => <div key={item.id} className="grid gap-2 p-4 sm:grid-cols-[100px_1fr_auto]"><p className="text-xs font-semibold text-zinc-500">{dataBr(item.dataManutencao)}</p><div><p className="text-sm font-bold text-[#280003]">{item.descricao}</p><p className="mt-1 text-xs text-zinc-400">{item.imovel ? `Unidade ${item.imovel.codigo}` : "Área geral"} · Rateio: {item.tipoRateio.toLowerCase().replaceAll("_", " ")}</p></div><div className="text-right"><strong className="text-sm text-[#004777]">{dinheiro(item.valor)}</strong><p className={`text-[10px] font-bold ${item.status === "FINALIZADA" ? "text-emerald-600" : "text-amber-600"}`}>{item.status === "FINALIZADA" ? "Finalizada" : "Em andamento"}</p></div></div>)}</div>
            </section>
          </main>}
        </div>
      )}

      {modal === "residencial" && <ResidencialModal editing={editing} imoveis={disponiveis} pending={pending} onClose={() => setModal(null)} onSave={input => startTransition(async () => finish(await saveResidencial(input)))} />}
      {modal === "despesa" && selected && <DespesaModal pending={pending} onClose={() => setModal(null)} onSave={input => startTransition(async () => { let result = await saveDespesaResidencial({ ...input, residencialId: selected.id }); if (!result.success && result.gasConflictCount && window.confirm(`${result.error}\n\nDeseja confirmar a sobrescrita?`)) result = await saveDespesaResidencial({ ...input, residencialId: selected.id, confirmarSobrescritaGas: true }); finish(result); })}/>} 
      {modal === "manutencao" && selected && <ManutencaoModal residencial={selected} pending={pending} onClose={() => setModal(null)} onSave={input => startTransition(async () => finish(await saveManutencaoResidencial({ ...input, residencialId: selected.id })))} />}
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#280003]/45 p-3 backdrop-blur-sm"><div role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="text-lg font-extrabold text-[#280003]">{title}</h2><button onClick={onClose} aria-label="Fechar" className="min-h-11 min-w-11 rounded-xl hover:bg-zinc-100"><X className="mx-auto h-5 w-5"/></button></header>{children}</div></div>;
}

const inputClass = "w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15";
const labelClass = "mb-1.5 block text-xs font-bold text-[#280003]";

function ResidencialModal({ editing, imoveis, pending, onClose, onSave }: { editing: ResidencialView | null; imoveis: ResidenciaisPageData["imoveisDisponiveis"]; pending: boolean; onClose: () => void; onSave: (input: { id?: string; nome: string; tipo: "RESIDENCIAL" | "CONDOMINIO"; descricao: string; imovelIds: string[] }) => void }) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [tipo, setTipo] = useState<"RESIDENCIAL" | "CONDOMINIO">(editing?.tipo ?? "RESIDENCIAL");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [ids, setIds] = useState(editing?.imoveis.map(i => i.id) ?? []);

  function alternarImovel(id: string, vincular: boolean) {
    setIds(current => vincular ? [...new Set([...current, id])] : current.filter(item => item !== id));
  }

  return (
    <ModalShell title={editing ? "Editar residencial" : "Novo residencial"} onClose={onClose}>
      <form onSubmit={event => { event.preventDefault(); onSave({ id: editing?.id, nome, tipo, descricao, imovelIds: ids }); }} className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelClass}>Nome *</label><input required value={nome} onChange={event => setNome(event.target.value)} className={inputClass}/></div>
          <div><label className={labelClass}>Tipo</label><select value={tipo} onChange={event => setTipo(event.target.value as typeof tipo)} className={inputClass}><option value="RESIDENCIAL">Residencial</option><option value="CONDOMINIO">Condomínio</option></select></div>
        </div>
        <div><label className={labelClass}>Descrição</label><textarea rows={3} value={descricao} onChange={event => setDescricao(event.target.value)} className={inputClass}/></div>
        <fieldset className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <legend className={labelClass}>Vincular casas e apartamentos</legend>
            <span className="text-xs font-semibold text-[#004777]">{ids.length} selecionado(s)</span>
          </div>
          <ImovelDetalhadoSelector imoveis={imoveis} selectedIds={ids} mode="multiple" onChange={alternarImovel}/>
        </fieldset>
        <Footer pending={pending} onClose={onClose}/>
      </form>
    </ModalShell>
  );
}

function DespesaModal({ pending, onClose, onSave }: { pending: boolean; onClose: () => void; onSave: (input: { nome: string; categoria: CategoriaDespesa; valor: number; inicioVigencia: string; fimVigencia?: string; observacao?: string }) => void }) {
  const [nome, setNome] = useState(""); const [categoria, setCategoria] = useState<CategoriaDespesa>("INTERNET"); const [valor, setValor] = useState(""); const [inicio, setInicio] = useState(hoje); const [fim, setFim] = useState(""); const [observacao, setObservacao] = useState("");
  return <ModalShell title="Nova despesa compartilhada" onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave({ nome, categoria, valor: Number(valor), inicioVigencia: inicio, fimVigencia: fim || undefined, observacao }); }} className="space-y-5 p-5"><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Água e IPTU não aparecem aqui porque continuam individualizados por locação. O valor cadastrado será cobrado de cada unidade ocupada.</div><div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Nome *</label><input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Internet coletiva" className={inputClass}/></div><div><label className={labelClass}>Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaDespesa)} className={inputClass}>{Object.entries(categoriaLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className={labelClass}>Valor por unidade *</label><input required type="number" min="0.01" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Início da vigência *</label><input required type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Fim da vigência</label><input type="date" min={inicio} value={fim} onChange={e => setFim(e.target.value)} className={inputClass}/></div></div>{categoria === "GAS" && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0"/>Se já houver gás na locação, o valor do residencial terá prioridade. Você receberá uma confirmação antes de salvar.</div>}<div><label className={labelClass}>Observação</label><textarea rows={3} value={observacao} onChange={e => setObservacao(e.target.value)} className={inputClass}/></div><Footer pending={pending} onClose={onClose}/></form></ModalShell>;
}

function ManutencaoModal({ residencial, pending, onClose, onSave }: { residencial: ResidencialView; pending: boolean; onClose: () => void; onSave: (input: { imovelId?: string; descricao: string; dataManutencao: string; valor: number; status: "EM_ANDAMENTO" | "FINALIZADA"; tipoRateio: TipoRateio; rateio?: Record<string, number> }) => void }) {
  const [escopo, setEscopo] = useState<"GERAL" | "IMOVEL">("GERAL");
  const [imovelId, setImovelId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(hoje);
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<"EM_ANDAMENTO" | "FINALIZADA">("EM_ANDAMENTO");
  const [tipoRateio, setTipoRateio] = useState<TipoRateio>("NAO_RATEAR");
  const [rateio, setRateio] = useState<Record<string, string>>({});

  return (
    <ModalShell title="Nova manutenção do residencial" onClose={onClose}>
      <form onSubmit={event => {
        event.preventDefault();
        onSave({
          imovelId: escopo === "IMOVEL" ? imovelId : undefined,
          descricao,
          dataManutencao: data,
          valor: Number(valor),
          status,
          tipoRateio,
          rateio: Object.fromEntries(Object.entries(rateio).map(([id, value]) => [id, Number(value)])),
        });
      }} className="space-y-5 p-5">
        <fieldset className="space-y-3">
          <legend className={labelClass}>Escopo</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" aria-pressed={escopo === "GERAL"} onClick={() => { setEscopo("GERAL"); setImovelId(""); }} className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors ${escopo === "GERAL" ? "border-[#004777] bg-[#004777]/5 text-[#004777]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}><Building2 className="h-5 w-5 shrink-0"/><span><span className="block text-sm font-bold">Geral / áreas comuns</span><span className="text-[11px] opacity-70">Serviço do residencial inteiro</span></span></button>
            <button type="button" aria-pressed={escopo === "IMOVEL"} onClick={() => setEscopo("IMOVEL")} className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition-colors ${escopo === "IMOVEL" ? "border-[#004777] bg-[#004777]/5 text-[#004777]" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}><Home className="h-5 w-5 shrink-0"/><span><span className="block text-sm font-bold">Imóvel específico</span><span className="text-[11px] opacity-70">Escolher uma casa ou apartamento</span></span></button>
          </div>
          {escopo === "IMOVEL" && (
            <ImovelDetalhadoSelector
              imoveis={residencial.imoveis}
              selectedIds={imovelId ? [imovelId] : []}
              mode="single"
              showTenant
              required
              onChange={(id, selected) => setImovelId(selected ? id : "")}
            />
          )}
        </fieldset>
        <div><label className={labelClass}>Serviço ou manutenção *</label><textarea required rows={3} value={descricao} onChange={event => setDescricao(event.target.value)} className={inputClass}/></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelClass}>Data *</label><input required type="date" value={data} onChange={event => setData(event.target.value)} className={inputClass}/></div>
          <div><label className={labelClass}>Valor *</label><input required type="number" min="0.01" step="0.01" value={valor} onChange={event => setValor(event.target.value)} className={inputClass}/></div>
          <div><label className={labelClass}>Status</label><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className={inputClass}><option value="EM_ANDAMENTO">Em andamento</option><option value="FINALIZADA">Finalizada</option></select></div>
          <div><label className={labelClass}>Modelo de rateio</label><select value={tipoRateio} onChange={event => setTipoRateio(event.target.value as TipoRateio)} className={inputClass}><option value="NAO_RATEAR">Não ratear</option><option value="IGUALITARIO">Igual entre unidades</option><option value="VALOR_FIXO">Valor por unidade</option><option value="PERCENTUAL">Percentual por unidade</option></select></div>
        </div>
        {["VALOR_FIXO", "PERCENTUAL"].includes(tipoRateio) && <fieldset className="space-y-2 rounded-xl border p-3"><legend className={labelClass}>Distribuição por unidade</legend>{residencial.imoveis.map(i => <div key={i.id} className="grid grid-cols-[1fr_130px] items-center gap-3"><label className="text-xs font-semibold text-zinc-600">{i.codigo} · {i.titulo || "Imóvel"}</label><input type="number" min="0" step="0.01" required value={rateio[i.id] ?? ""} onChange={event => setRateio(current => ({ ...current, [i.id]: event.target.value }))} placeholder={tipoRateio === "PERCENTUAL" ? "%" : "R$"} className={inputClass}/></div>)}</fieldset>}
        <Footer pending={pending} onClose={onClose}/>
      </form>
    </ModalShell>
  );
}

function Footer({ pending, onClose }: { pending: boolean; onClose: () => void }) { return <footer className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border px-5 text-sm font-bold text-zinc-600">Cancelar</button><button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004777] px-5 text-sm font-bold text-white disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}Salvar</button></footer>; }
