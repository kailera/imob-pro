"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ImovelResidencialView } from "../types";
import { imovelCorrespondeABusca } from "@/lib/residenciais/busca-imovel";

type Props = {
  imoveis: ImovelResidencialView[];
  selectedIds: string[];
  mode: "single" | "multiple";
  onChange: (id: string, selected: boolean) => void;
  showTenant?: boolean;
  required?: boolean;
};

const inputClass = "w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#004777] focus:ring-2 focus:ring-[#004777]/15";

export function ImovelDetalhadoSelector({
  imoveis,
  selectedIds,
  mode,
  onChange,
  showTenant = false,
  required = false,
}: Props) {
  const [busca, setBusca] = useState("");
  const resultados = useMemo(
    () => imoveis.filter(imovel => imovelCorrespondeABusca(imovel, busca)),
    [busca, imoveis],
  );
  const selectedSet = new Set(selectedIds);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400"/>
        <input
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder={showTenant
            ? "Buscar por endereço, proprietário, inquilino, código ou título..."
            : "Buscar por endereço, proprietário, código ou título..."}
          aria-label="Buscar imóvel"
          className={`${inputClass} pl-10`}
        />
      </div>
      <div className="max-h-72 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
        {resultados.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Search className="mx-auto h-6 w-6 text-zinc-300"/>
            <p className="mt-2 text-sm font-semibold text-zinc-500">Nenhum imóvel encontrado</p>
            <p className="mt-1 text-xs text-zinc-400">Tente outro endereço ou nome de pessoa.</p>
          </div>
        ) : resultados.map(imovel => {
          const selected = selectedSet.has(imovel.id);
          return (
            <label key={imovel.id} className={`flex cursor-pointer items-start gap-3 p-3 transition-colors ${selected ? "bg-[#004777]/5" : "hover:bg-zinc-50"}`}>
              <input
                type={mode === "single" ? "radio" : "checkbox"}
                name={mode === "single" ? "residencial-manutencao-imovel" : undefined}
                required={mode === "single" && required && selectedIds.length === 0}
                checked={selected}
                onChange={event => onChange(imovel.id, event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#004777]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#280003]">{imovel.codigo} · {imovel.titulo || "Imóvel"}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{imovel.endereco}</span>
                <span className="mt-1 block text-[11px] font-semibold text-[#004777]">Proprietário: {imovel.proprietarios.length > 0 ? imovel.proprietarios.join(", ") : "não informado"}</span>
                {showTenant && <span className="mt-0.5 block text-[11px] font-semibold text-emerald-700">Inquilino: {imovel.inquilinos.length > 0 ? imovel.inquilinos.join(", ") : "imóvel desocupado ou não informado"}</span>}
              </span>
              {selected && <span className="rounded-full bg-[#004777]/10 px-2 py-1 text-[10px] font-bold text-[#004777]">{mode === "multiple" ? "Vinculado" : "Selecionado"}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}
