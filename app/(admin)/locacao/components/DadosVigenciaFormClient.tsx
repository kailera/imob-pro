"use client";

import React, { useState } from "react";
import { FileText, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateImovelLocacao } from "../actions";

interface ImovelLocacaoData {
  id: string;
  dataInicio: any;
  dataFim: any;
  hasCondominio: boolean;
  hasIPTU: boolean;
  taxaAdministracao?: number | null;
  taxaMultasEncargos?: number | null;
  taxaIntermediacao?: number | null;
  irrfResponsabilidade?: string | null;
  carenciaRepasse?: number | null;
}

interface DadosVigenciaFormClientProps {
  imovelLocacao: ImovelLocacaoData | null;
  isEditMode: boolean;
  vencimentoDia?: number | null;
}

export default function DadosVigenciaFormClient({
  imovelLocacao,
  isEditMode,
  vencimentoDia,
}: DadosVigenciaFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states initialized with database values
  const [dataInicio, setDataInicio] = useState(
    formatDateForInput(imovelLocacao?.dataInicio)
  );
  const [dataFim, setDataFim] = useState(
    formatDateForInput(imovelLocacao?.dataFim)
  );
  const [hasCondominio, setHasCondominio] = useState(
    imovelLocacao?.hasCondominio ?? false
  );
  const [hasIPTU, setHasIPTU] = useState(
    imovelLocacao?.hasIPTU ?? false
  );
  const [taxaAdministracao, setTaxaAdministracao] = useState(
    imovelLocacao?.taxaAdministracao?.toString() || ""
  );
  const [taxaMultasEncargos, setTaxaMultasEncargos] = useState(
    imovelLocacao?.taxaMultasEncargos?.toString() || ""
  );
  const [taxaIntermediacao, setTaxaIntermediacao] = useState(
    imovelLocacao?.taxaIntermediacao?.toString() || ""
  );
  const [irrfResponsabilidade, setIrrfResponsabilidade] = useState(
    imovelLocacao?.irrfResponsabilidade || ""
  );
  const [carenciaRepasse, setCarenciaRepasse] = useState(
    imovelLocacao?.carenciaRepasse?.toString() || ""
  );

  function formatDateForInput(date: any) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDateDisplay = (date: any) => {
    if (!date) return "-";
    // We add 12 hours to avoid timezone shifting to previous day
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imovelLocacao?.id) return;
    if (!dataInicio || !dataFim) {
      setErrorMsg("Data de início e término são obrigatórias.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await updateImovelLocacao(imovelLocacao.id, {
        dataInicio,
        dataFim,
        hasCondominio,
        hasIPTU,
        taxaAdministracao: taxaAdministracao ? parseFloat(taxaAdministracao) : null,
        taxaMultasEncargos: taxaMultasEncargos ? parseFloat(taxaMultasEncargos) : null,
        taxaIntermediacao: taxaIntermediacao ? parseFloat(taxaIntermediacao) : null,
        irrfResponsabilidade: irrfResponsabilidade || null,
        carenciaRepasse: carenciaRepasse ? parseInt(carenciaRepasse, 10) : null,
      });

      if (res.success) {
        setSuccessMsg("Dados de vigência atualizados com sucesso!");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Erro ao atualizar dados.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode) {
    return (
      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4"
      >
        <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
          <FileText className="w-4 h-4 text-gray-600" />
          Editar Dados de Vigência
        </h2>

        {errorMsg && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 text-xs bg-emerald-50 text-emerald-600 rounded-xl font-semibold">
            {successMsg}
          </div>
        )}

        <div className="space-y-3 text-xs font-semibold text-gray-700">
          <div>
            <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
              Data de Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
            />
          </div>

          <div>
            <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
              Data de Término
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Possui Condomínio?
              </label>
              <select
                value={String(hasCondominio)}
                onChange={(e) => setHasCondominio(e.target.value === "true")}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Possui IPTU?
              </label>
              <select
                value={String(hasIPTU)}
                onChange={(e) => setHasIPTU(e.target.value === "true")}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Taxa Adm (%)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 10.0"
                value={taxaAdministracao}
                onChange={(e) => setTaxaAdministracao(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Taxa Intermediação (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 500.00"
                value={taxaIntermediacao}
                onChange={(e) => setTaxaIntermediacao(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Taxa Multa/Encargo (%)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 50.0"
                value={taxaMultasEncargos}
                onChange={(e) => setTaxaMultasEncargos(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              />
            </div>

            <div>
              <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
                Carência Repasse (dias)
              </label>
              <input
                type="number"
                placeholder="Ex: 10"
                value={carenciaRepasse}
                onChange={(e) => setCarenciaRepasse(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-[10px] uppercase font-bold block mb-1">
              Responsabilidade IRRF
            </label>
            <select
              value={irrfResponsabilidade}
              onChange={(e) => setIrrfResponsabilidade(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all"
            >
              <option value="">Selecione...</option>
              <option value="LOCADOR">Locador</option>
              <option value="LOCATARIO">Locatário</option>
            </select>
          </div>

          {vencimentoDia !== undefined && (
            <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-xl mt-2">
              <span className="text-[#004777] font-bold block text-[9px] uppercase tracking-wider">Dia de Vencimento</span>
              <span className="text-xs font-bold text-gray-700">
                {vencimentoDia ? `Definido nas cobranças como todo dia ${vencimentoDia}` : "Sem cobranças geradas para definir o dia."}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-[#004777] text-white py-2 rounded-xl text-xs font-semibold shadow-xs hover:bg-[#003355] transition-all cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </form>
    );
  }

  // Read-only/View Mode
  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
      <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3">
        <FileText className="w-4 h-4 text-gray-600" />
        Dados de Vigência
      </h2>
      <div className="space-y-3 text-xs font-semibold text-gray-700">
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Data de Início</span>
          <span>{formatDateDisplay(imovelLocacao?.dataInicio)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Data de Término</span>
          <span>{formatDateDisplay(imovelLocacao?.dataFim)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Has Condomínio</span>
          <span className={imovelLocacao?.hasCondominio ? "text-emerald-600" : "text-gray-400"}>
            {imovelLocacao?.hasCondominio ? "Sim" : "Não"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Has IPTU</span>
          <span className={imovelLocacao?.hasIPTU ? "text-emerald-600" : "text-gray-400"}>
            {imovelLocacao?.hasIPTU ? "Sim" : "Não"}
          </span>
        </div>

        {/* New additional fields in read-only view */}
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Taxa de Administração</span>
          <span>
            {imovelLocacao?.taxaAdministracao !== null && imovelLocacao?.taxaAdministracao !== undefined
              ? `${imovelLocacao.taxaAdministracao}%`
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Taxa de Intermediação</span>
          <span>
            {imovelLocacao?.taxaIntermediacao !== null && imovelLocacao?.taxaIntermediacao !== undefined
              ? formatCurrency(imovelLocacao.taxaIntermediacao)
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Taxa Multas/Encargos</span>
          <span>
            {imovelLocacao?.taxaMultasEncargos !== null && imovelLocacao?.taxaMultasEncargos !== undefined
              ? `${imovelLocacao.taxaMultasEncargos}%`
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Responsabilidade IRRF</span>
          <span>{imovelLocacao?.irrfResponsabilidade || "-"}</span>
        </div>
        <div className="flex justify-between items-center py-1.5">
          <span className="text-gray-400 text-[10px] uppercase font-bold">Carência de Repasse</span>
          <span>
            {imovelLocacao?.carenciaRepasse !== null && imovelLocacao?.carenciaRepasse !== undefined
              ? `${imovelLocacao.carenciaRepasse} dias`
              : "-"}
          </span>
        </div>
        
        {vencimentoDia !== undefined && (
          <div className="flex justify-between items-center py-1.5 border-t border-gray-100 mt-1.5 pt-1.5">
            <span className="text-gray-400 text-[10px] uppercase font-bold">Dia de Vencimento</span>
            <span className="text-[#004777] font-extrabold text-sm">
              {vencimentoDia ? `Todo dia ${vencimentoDia}` : "-"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
