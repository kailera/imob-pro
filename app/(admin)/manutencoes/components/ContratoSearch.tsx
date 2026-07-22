"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarDays, Check, Search, UserRound } from "lucide-react";
import type { ContratoManutencaoOption } from "../types";

type ContratoSearchProps = {
  contratos: ContratoManutencaoOption[];
  selectedId: string;
  onSelect: (contrato: ContratoManutencaoOption) => void;
  disabled?: boolean;
};

const situationLabel = {
  ATIVO: "Contrato ativo",
  ENCERRADO: "Contrato encerrado",
  FUTURO: "Vigência futura",
  SEM_VIGENCIA: "Sem vigência cadastrada",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function ContratoSearch({
  contratos,
  selectedId,
  onSelect,
  disabled = false,
}: ContratoSearchProps) {
  const selected = contratos.find((contrato) => contrato.id === selectedId) || null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (term.length < 2) return [];
    return contratos
      .filter((contrato) =>
        normalize([
          contrato.codigoImovel,
          contrato.tituloImovel,
          contrato.endereco,
          contrato.locatario,
          contrato.locador,
        ].join(" ")).includes(term),
      )
      .slice(0, 8);
  }, [contratos, query]);

  function handleSelect(contrato: ContratoManutencaoOption) {
    onSelect(contrato);
    setQuery("");
    setOpen(false);
  }

  return (
    <section className="space-y-3" aria-labelledby="contrato-search-title">
      <div>
        <label id="contrato-search-title" htmlFor="contrato-search" className="block text-xs font-bold text-[#280003] mb-1.5">
          Contrato e imóvel <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
          <input
            id="contrato-search"
            type="search"
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            placeholder="Busque por inquilino, proprietário, código ou endereço"
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[#280003] outline-none transition focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15 disabled:bg-zinc-100"
          />

          {open && query.trim().length >= 2 && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
              {results.length > 0 ? results.map((contrato) => (
                <button
                  key={contrato.id}
                  type="button"
                  onClick={() => handleSelect(contrato)}
                  className="flex min-h-14 w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#EEEEF3]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004777]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#280003]">
                      {contrato.codigoImovel} · {contrato.locatario}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{contrato.endereco}</p>
                    <p className="truncate text-[11px] text-zinc-400">Proprietário: {contrato.locador}</p>
                  </div>
                  {contrato.id === selectedId && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />}
                </button>
              )) : (
                <p className="px-3 py-5 text-center text-xs text-zinc-500">Nenhum contrato encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-[#004777]/15 bg-[#004777]/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#280003]">{selected.codigoImovel} · {selected.tituloImovel || "Imóvel sem título"}</p>
              <p className="mt-1 text-xs text-zinc-600">{selected.endereco}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              selected.situacao === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {situationLabel[selected.situacao]}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 text-[#004777]" />
              <div><p className="text-[10px] font-bold uppercase text-zinc-400">Inquilino</p><p className="text-xs font-semibold text-[#280003]">{selected.locatario}</p></div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-[#004777]" />
              <div><p className="text-[10px] font-bold uppercase text-zinc-400">Proprietário</p><p className="text-xs font-semibold text-[#280003]">{selected.locador}</p></div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 text-[#004777]" />
              <div><p className="text-[10px] font-bold uppercase text-zinc-400">Vigência</p><p className="text-xs font-semibold text-[#280003]">{formatDate(selected.dataInicio)} a {formatDate(selected.dataFim)}</p></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
