"use client";

import React, { useState } from "react";
import { TrendingUp, Plus, Trash2, X, Loader2, Calculator } from "lucide-react";
import {
  addPeriodoContratoLocacao,
  updatePeriodoContratoLocacao,
  deletePeriodoContratoLocacao,
  calcularIndiceReajuste,
} from "../actions";

interface Periodo {
  id: string;
  dataInicio: any;
  dataFim: any;
  valorAluguel: number;
  hasCondominio: boolean;
  valorCondominio: number | null;
  hasIPTU: boolean;
  valorIPTU: number | null;
  valorTotal: number;
  descontoPontualidade: number | null;
  tipoDesconto: string | null;
  diasAntecedenciaDesc: number | null;
  multaAtrasoPercentual: number | null;
  diasCarenciaMulta: number | null;
  jurosAtrasoPercentual: number | null;
  diasCarenciaJuros: number | null;
  indiceReajuste?: string | null;
  valorAluguelAnterior?: number | null;
  percentualReajuste?: number | null;
  reajusteAutomatico?: boolean;
  dataCalculoReajuste?: string | Date | null;
}

interface ControleLocaticioClientProps {
  periodos: Periodo[];
  imovelLocacaoId: string;
  isEditMode?: boolean;
  onAddPeriodo?: () => void;
  onEditPeriodo?: (periodo: Periodo) => void;
}

export default function ControleLocaticioClient({
  periodos,
  imovelLocacaoId,
  isEditMode = false,
  onAddPeriodo,
  onEditPeriodo,
}: ControleLocaticioClientProps) {
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>(
    periodos.length > 0 ? periodos[periodos.length - 1].id : ""
  );

  const activePeriodo = periodos.find((p) => p.id === selectedPeriodoId) || periodos[0];

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"ADD" | "EDIT">("ADD");
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Form Fields State
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [valorAluguel, setValorAluguel] = useState("");
  const [hasCondominioState, setHasCondominioState] = useState(false);
  const [valorCondominio, setValorCondominio] = useState("");
  const [hasIPTUState, setHasIPTUState] = useState(false);
  const [valorIPTU, setValorIPTU] = useState("");
  const [descontoPontualidade, setDescontoPontualidade] = useState("");
  const [tipoDesconto, setTipoDesconto] = useState("VALOR");
  const [diasAntecedenciaDesc, setDiasAntecedenciaDesc] = useState("");
  const [multaAtrasoPercentual, setMultaAtrasoPercentual] = useState("");
  const [diasCarenciaMulta, setDiasCarenciaMulta] = useState("");
  const [jurosAtrasoPercentual, setJurosAtrasoPercentual] = useState("");
  const [diasCarenciaJuros, setDiasCarenciaJuros] = useState("");
  const [indiceReajuste, setIndiceReajuste] = useState("IGPM");
  const [valorAluguelAnterior, setValorAluguelAnterior] = useState("");
  const [percentualReajuste, setPercentualReajuste] = useState("");
  const [reajusteAutomatico, setReajusteAutomatico] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculoInfo, setCalculoInfo] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatDateForInput = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const openAddModal = () => {
    const ultimoPeriodo = [...periodos].sort(
      (a, b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime()
    )[0];
    setModalType("ADD");
    setEditingPeriodId(null);
    setDataInicio("");
    setDataFim("");
    setValorAluguel(ultimoPeriodo?.valorAluguel?.toFixed(2) || "");
    setHasCondominioState(false);
    setValorCondominio("");
    setHasIPTUState(false);
    setValorIPTU("");
    setDescontoPontualidade("");
    setTipoDesconto("VALOR");
    setDiasAntecedenciaDesc("");
    setMultaAtrasoPercentual("");
    setDiasCarenciaMulta("");
    setJurosAtrasoPercentual("");
    setDiasCarenciaJuros("");
    setIndiceReajuste(ultimoPeriodo?.indiceReajuste || "IGPM");
    setValorAluguelAnterior(ultimoPeriodo?.valorAluguel?.toFixed(2) || "");
    setPercentualReajuste("");
    setReajusteAutomatico(false);
    setCalculoInfo("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Periodo) => {
    setModalType("EDIT");
    setEditingPeriodId(p.id);
    setDataInicio(formatDateForInput(p.dataInicio));
    setDataFim(formatDateForInput(p.dataFim));
    setValorAluguel(p.valorAluguel.toString());
    setHasCondominioState(p.hasCondominio);
    setValorCondominio(p.valorCondominio?.toString() || "");
    setHasIPTUState(p.hasIPTU);
    setValorIPTU(p.valorIPTU?.toString() || "");
    setDescontoPontualidade(p.descontoPontualidade?.toString() || "");
    setTipoDesconto(p.tipoDesconto || "VALOR");
    setDiasAntecedenciaDesc(p.diasAntecedenciaDesc?.toString() || "");
    setMultaAtrasoPercentual(p.multaAtrasoPercentual?.toString() || "");
    setDiasCarenciaMulta(p.diasCarenciaMulta?.toString() || "");
    setJurosAtrasoPercentual(p.jurosAtrasoPercentual?.toString() || "");
    setDiasCarenciaJuros(p.diasCarenciaJuros?.toString() || "");
    setIndiceReajuste(p.indiceReajuste || "IGPM");
    setValorAluguelAnterior(p.valorAluguelAnterior?.toString() || "");
    setPercentualReajuste(p.percentualReajuste?.toString() || "");
    setReajusteAutomatico(p.reajusteAutomatico ?? false);
    setCalculoInfo("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio || !dataFim || !valorAluguel) {
      alert("Por favor, preencha as datas de vigência e o valor do aluguel.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        imovelLocacaoId,
        dataInicio,
        dataFim,
        valorAluguel: parseFloat(valorAluguel),
        hasCondominio: hasCondominioState,
        valorCondominio: hasCondominioState ? parseFloat(valorCondominio) || 0 : 0,
        hasIPTU: hasIPTUState,
        valorIPTU: hasIPTUState ? parseFloat(valorIPTU) || 0 : 0,
        descontoPontualidade: parseFloat(descontoPontualidade) || null,
        tipoDesconto: descontoPontualidade ? tipoDesconto : null,
        diasAntecedenciaDesc: parseInt(diasAntecedenciaDesc) || null,
        multaAtrasoPercentual: parseFloat(multaAtrasoPercentual) || null,
        diasCarenciaMulta: parseInt(diasCarenciaMulta) || null,
        jurosAtrasoPercentual: parseFloat(jurosAtrasoPercentual) || null,
        diasCarenciaJuros: parseInt(diasCarenciaJuros) || null,
        indiceReajuste: indiceReajuste || null,
        valorAluguelAnterior: parseFloat(valorAluguelAnterior) || null,
        percentualReajuste: percentualReajuste === "" ? null : parseFloat(percentualReajuste),
        reajusteAutomatico,
      };

      let res;
      if (modalType === "ADD") {
        res = await addPeriodoContratoLocacao(payload);
      } else {
        if (!editingPeriodId) return;
        res = await updatePeriodoContratoLocacao(editingPeriodId, payload);
      }

      if (res.success && res.data) {
        setIsModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error || "Erro ao salvar período.");
      }
    } catch (err: any) {
      alert("Erro ao realizar operação: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const aplicarPercentual = (percentual: string, base = valorAluguelAnterior) => {
    const baseNumerica = Number(base);
    const percentualNumerico = Number(percentual);
    if (Number.isFinite(baseNumerica) && Number.isFinite(percentualNumerico)) {
      setValorAluguel((baseNumerica * (1 + percentualNumerico / 100)).toFixed(2));
    }
  };

  const calcularAutomaticamente = async (novoIndice = indiceReajuste) => {
    const periodoAnterior = [...periodos].sort(
      (a, b) => new Date(b.dataFim).getTime() - new Date(a.dataFim).getTime()
    )[0];
    if (!periodoAnterior) {
      setCalculoInfo("Não foi encontrado um período anterior para calcular o reajuste.");
      return;
    }
    if (!valorAluguelAnterior) {
      setCalculoInfo("Informe o aluguel anterior antes de calcular.");
      return;
    }
    setIsCalculating(true);
    const inicioConsulta = formatDateForInput(periodoAnterior.dataInicio);
    const fimConsulta = formatDateForInput(periodoAnterior.dataFim);
    setCalculoInfo(`Consultando ${novoIndice} de ${formatDate(periodoAnterior.dataInicio)} a ${formatDate(periodoAnterior.dataFim)}...`);
    try {
      const resultado = await calcularIndiceReajuste(novoIndice, inicioConsulta, fimConsulta);
      if (resultado.success && resultado.percentual !== undefined) {
        const percentual = resultado.percentual.toString();
        setPercentualReajuste(percentual);
        aplicarPercentual(percentual);
        setReajusteAutomatico(true);
        setCalculoInfo(`Aplicado: ${resultado.mesesConsiderados} competências, de ${resultado.competenciaInicial} a ${resultado.competenciaFinal}.`);
      } else {
        setReajusteAutomatico(false);
        setCalculoInfo(resultado.error || "Informe o percentual manualmente.");
      }
    } catch (error: unknown) {
      setReajusteAutomatico(false);
      setCalculoInfo(error instanceof Error ? `Falha na consulta: ${error.message}` : "Falha ao consultar o índice oficial.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este período contratual?")) return;
    setIsSubmitting(true);
    try {
      const res = await deletePeriodoContratoLocacao(id);
      if (res.success) {
        window.location.reload();
      } else {
        alert("Erro ao excluir período.");
      }
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#004777]" />
          Controle Locatício
        </h2>
        {(isEditMode || onAddPeriodo) && (
          <button
            onClick={onAddPeriodo || openAddModal}
            className="flex items-center gap-1 text-[10px] font-bold text-[#004777] hover:underline cursor-pointer bg-transparent border-0 font-sans"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Período
          </button>
        )}
      </div>

      {periodos.length > 0 ? (
        <div className="space-y-4">
          {/* Abas dos Períodos */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-100 pb-2">
            {periodos.map((p) => {
              const isSelected = p.id === selectedPeriodoId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriodoId(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#004777]/10 text-[#004777] border-[#004777]/20"
                      : "bg-gray-50 text-gray-500 border-gray-150 hover:bg-gray-100"
                  }`}
                >
                  {formatDate(p.dataInicio)}
                </button>
              );
            })}
          </div>

          {activePeriodo && (
            <div className="space-y-4 text-xs font-semibold text-gray-700">
              <div className="flex justify-between items-center pb-2 border-b border-gray-55/10">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Aluguel Vigente</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-brand-dark text-sm">{formatCurrency(activePeriodo.valorAluguel)}</span>
                  {isEditMode && periodos.length > 1 && (
                    <button
                      onClick={() => handleDelete(activePeriodo.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                      title="Excluir Período"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bloco: Pontualidade */}
              <div className="space-y-1.5 pb-3 border-b border-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Desconto Pontualidade</span>
                  {(isEditMode || onEditPeriodo) && (
                    <button
                      onClick={() => onEditPeriodo ? onEditPeriodo(activePeriodo) : openEditModal(activePeriodo)}
                      className="text-[9px] font-bold text-[#004777] hover:underline bg-transparent border-0 font-sans"
                    >
                      Editar Período
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Valor/Percentual</span>
                  <span className="font-bold text-emerald-600">
                    {activePeriodo.tipoDesconto === "PERCENTUAL"
                      ? `${activePeriodo.descontoPontualidade}%`
                      : formatCurrency(activePeriodo.descontoPontualidade)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Antecedência</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.diasAntecedenciaDesc ? `Até ${activePeriodo.diasAntecedenciaDesc} dias antes` : "-"}
                  </span>
                </div>
              </div>

              {/* Bloco: Multa e Juros (Atraso) */}
              <div className="space-y-1.5 pb-3 border-b border-gray-50">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Encargos por Atraso</span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Multa</span>
                  <span className="font-bold text-rose-600">
                    {activePeriodo.multaAtrasoPercentual}% (Após {activePeriodo.diasCarenciaMulta} dias)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Juros (Pro Rata)</span>
                  <span className="font-bold text-rose-600">
                    {activePeriodo.jurosAtrasoPercentual}% (Após {activePeriodo.diasCarenciaJuros} dias)
                  </span>
                </div>
              </div>

              {/* Bloco: Encargos Inclusos */}
              <div className="space-y-1.5">
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Encargos Inclusos</span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Condomínio</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.hasCondominio ? formatCurrency(activePeriodo.valorCondominio) : "Não incluso"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">IPTU</span>
                  <span className="font-bold text-brand-dark">
                    {activePeriodo.hasIPTU ? formatCurrency(activePeriodo.valorIPTU) : "Não incluso"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-100 pt-1.5 mt-1.5">
                  <span className="text-gray-500">Índice de Reajuste</span>
                  <span className="font-bold text-[#004777]">
                    {activePeriodo.indiceReajuste || "Não definido"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Variação aplicada</span>
                  <span className="font-bold text-[#004777]">
                    {activePeriodo.percentualReajuste != null ? `${activePeriodo.percentualReajuste.toLocaleString("pt-BR")}%` : "-"}
                  </span>
                </div>
                {activePeriodo.valorAluguelAnterior != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Aluguel anterior</span>
                    <span className="font-bold text-brand-dark">{formatCurrency(activePeriodo.valorAluguelAnterior)}</span>
                  </div>
                )}
                {activePeriodo.percentualReajuste != null && (
                  <div className="rounded-xl bg-[#004777]/5 border border-[#004777]/10 px-3 py-2 text-[10px] text-[#004777]">
                    {activePeriodo.reajusteAutomatico ? "Calculado automaticamente pela série oficial" : "Percentual informado manualmente"}
                    {activePeriodo.dataCalculoReajuste ? ` em ${formatDate(activePeriodo.dataCalculoReajuste)}` : ""}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Nenhum período cadastrado.</p>
      )}

      {/* Modal / Dialog para Adicionar ou Editar Período */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#280003]">
                {modalType === "ADD" ? "Adicionar Novo Período Contratual" : "Editar Período Contratual"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Vigência Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Vigência Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#004777]/15 bg-[#004777]/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#004777] font-bold">
                  <Calculator className="w-4 h-4" /> Cálculo do reajuste
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Aluguel anterior</label>
                    <input type="number" step="0.01" value={valorAluguelAnterior} onChange={(e) => { setValorAluguelAnterior(e.target.value); aplicarPercentual(percentualReajuste, e.target.value); setReajusteAutomatico(false); }} className="w-full px-3 py-2 border border-zinc-200 rounded-xl font-semibold bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Variação (%)</label>
                    <input type="number" step="0.0001" value={percentualReajuste} onChange={(e) => { setPercentualReajuste(e.target.value); aplicarPercentual(e.target.value); setReajusteAutomatico(false); }} className="w-full px-3 py-2 border border-zinc-200 rounded-xl font-semibold bg-white" />
                  </div>
                </div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Índice de Reajuste *
                </label>
                <select
                  value={indiceReajuste}
                  onChange={(e) => { setIndiceReajuste(e.target.value); void calcularAutomaticamente(e.target.value); }}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold bg-white cursor-pointer"
                >
                  <option value="IGP">IGP</option>
                  <option value="IGPM">IGPM</option>
                  <option value="INPC">INPC</option>
                  <option value="IPC">IPC</option>
                  <option value="IPC-DI">IPC-DI</option>
                  <option value="IPCA">IPCA</option>
                </select>
                <button type="button" disabled={isCalculating || !valorAluguelAnterior} onClick={() => void calcularAutomaticamente()} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#004777]/20 bg-white px-3 py-2 font-bold text-[#004777] disabled:opacity-50">
                  {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  {isCalculating ? "Consultando índice..." : "Atualizar pelo índice oficial"}
                </button>
                {calculoInfo && <p className={`text-[10px] ${reajusteAutomatico ? "text-emerald-700" : "text-amber-700"}`}>{calculoInfo}</p>}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Novo aluguel *</label>
                  <input type="number" step="0.01" required value={valorAluguel} onChange={(e) => setValorAluguel(e.target.value)} className="w-full px-3 py-2 border border-[#004777]/30 rounded-xl font-black text-sm text-[#280003] bg-white" />
                </div>
              </div>

              {/* Condomínio */}
              <div className="space-y-2 border-t border-dashed border-zinc-100 pt-3">
                <label className="flex items-center gap-2 font-semibold text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCondominioState}
                    onChange={(e) => setHasCondominioState(e.target.checked)}
                    className="rounded text-[#004777] focus:ring-[#004777]"
                  />
                  <span>Possui taxas adicionais de Condomínio?</span>
                </label>
                {hasCondominioState && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor do Condomínio"
                    value={valorCondominio}
                    onChange={(e) => setValorCondominio(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                  />
                )}
              </div>

              {/* IPTU */}
              <div className="space-y-2 border-t border-dashed border-zinc-100 pt-3">
                <label className="flex items-center gap-2 font-semibold text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasIPTUState}
                    onChange={(e) => setHasIPTUState(e.target.checked)}
                    className="rounded text-[#004777] focus:ring-[#004777]"
                  />
                  <span>Possui taxas adicionais de IPTU?</span>
                </label>
                {hasIPTUState && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor do IPTU"
                    value={valorIPTU}
                    onChange={(e) => setValorIPTU(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                  />
                )}
              </div>

              {/* Pontualidade e Desconto */}
              <div className="border-t border-dashed border-zinc-100 pt-3 space-y-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Configuração de Desconto Pontualidade
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Valor do Desconto</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={descontoPontualidade}
                      onChange={(e) => setDescontoPontualidade(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Tipo do Desconto</label>
                    <select
                      value={tipoDesconto}
                      onChange={(e) => setTipoDesconto(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    >
                      <option value="VALOR">Fixo (BRL)</option>
                      <option value="PERCENTUAL">Percentual (%)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1 font-semibold">
                    Dias de antecedência máxima para aplicar
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 5"
                    value={diasAntecedenciaDesc}
                    onChange={(e) => setDiasAntecedenciaDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                  />
                </div>
              </div>

              {/* Encargos e Atrasos */}
              <div className="border-t border-dashed border-zinc-100 pt-3 space-y-3">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Multas e Juros (Encargos de Atraso)
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Multa (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 10"
                      value={multaAtrasoPercentual}
                      onChange={(e) => setMultaAtrasoPercentual(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Carença Multa (Dias)</label>
                    <input
                      type="number"
                      placeholder="Ex: 0"
                      value={diasCarenciaMulta}
                      onChange={(e) => setDiasCarenciaMulta(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Juros Mensal (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1"
                      value={jurosAtrasoPercentual}
                      onChange={(e) => setJurosAtrasoPercentual(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1 font-semibold">Carença Juros (Dias)</label>
                    <input
                      type="number"
                      placeholder="Ex: 0"
                      value={diasCarenciaJuros}
                      onChange={(e) => setDiasCarenciaJuros(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#004777] font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#004777] text-white rounded-xl font-bold hover:bg-[#003355] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalType === "ADD" ? "Criar Período" : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
