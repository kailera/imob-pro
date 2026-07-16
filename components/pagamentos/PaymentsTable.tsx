"use client";

import React, { useState, useEffect } from "react";
import { FileText, Eye, Download, X, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  getDespesasManutencaoDisponiveis, 
  atualizarRepasseAjustadoAction, 
  liquidarRepasseAction 
} from "@/app/actions/financeiroActions";

export interface PaymentData {
  id: string;
  ownerName: string;
  ownerCpf: string;
  propertyRef: string;
  competence: string;
  grossValue: number;
  admFeeString: string;
  netValue: number;
  paymentStatus: "Pago" | "Pendente";
  nfeStatus: "Emitida" | "Aguardando" | "Erro na NF-e" | "Pendente";
  imovelId?: string | null;
  metadata?: any;
}

interface PaymentsTableProps {
  payments: PaymentData[];
}

export default function PaymentsTable({ payments }: PaymentsTableProps) {
  const router = useRouter();
  
  // Modal states
  const [adjustingPayment, setAdjustingPayment] = useState<PaymentData | null>(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<any[]>([]);
  const [selectedDeductionIds, setSelectedDeductionIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic values calculated locally
  const [localNetValue, setLocalNetValue] = useState(0);

  // Recalculate net value when checklist selection changes
  useEffect(() => {
    if (!adjustingPayment) return;
    
    const meta = adjustingPayment.metadata || {};
    const grossTotal = adjustingPayment.grossValue; // Rent + Condo + IPTU
    const adminFee = meta.adminFeeValue || (adjustingPayment.grossValue * 0.1);
    
    // Sum selected maintenance costs
    const selectedMaintenanceTotal = maintenanceExpenses
      .filter((exp) => selectedDeductionIds.includes(exp.id))
      .reduce((sum, exp) => sum + exp.valor, 0);
      
    const computedNet = grossTotal - adminFee - selectedMaintenanceTotal;
    setLocalNetValue(computedNet < 0 ? 0 : computedNet);
  }, [selectedDeductionIds, maintenanceExpenses, adjustingPayment]);

  const handleOpenAdjustModal = async (payment: PaymentData) => {
    setAdjustingPayment(payment);
    setSelectedDeductionIds(payment.metadata?.deductedMaintenanceIds || []);
    setLocalNetValue(payment.netValue);
    setMaintenanceExpenses([]);
    setErrorMsg(null);
    
    if (payment.imovelId && payment.metadata?.competence) {
      setLoadingMaintenance(true);
      try {
        const res = await getDespesasManutencaoDisponiveis(payment.imovelId, payment.metadata.competence);
        if (res.success && res.data) {
          // Merge already checked expenses if they are not in the response list anymore
          const fetchedList = res.data;
          const checkedIds = payment.metadata.deductedMaintenanceIds || [];
          
          setMaintenanceExpenses(fetchedList);
        } else {
          setErrorMsg(res.error || "Erro ao carregar despesas de manutenção.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Erro inesperado.");
      } finally {
        setLoadingMaintenance(false);
      }
    }
  };

  const handleToggleDeduction = (id: string) => {
    setSelectedDeductionIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSaveAdjustment = async (liquidate: boolean) => {
    if (!adjustingPayment) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // 1. Atualizar o repasse no banco
      const res = await atualizarRepasseAjustadoAction(
        adjustingPayment.id,
        selectedDeductionIds,
        localNetValue
      );
      
      if (!res.success) {
        throw new Error(res.error || "Erro ao salvar os ajustes de repasse.");
      }
      
      // 2. Opcionalmente liquidar o repasse
      if (liquidate) {
        const liqRes = await liquidarRepasseAction(adjustingPayment.id);
        if (!liqRes.success) {
          throw new Error(liqRes.error || "Erro ao liquidar o repasse.");
        }
      }
      
      setAdjustingPayment(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na operação.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "Pago":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#708D81]/10 text-[#708D81]">
            Pago
          </span>
        );
      case "Pendente":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0D18A]/20 text-yellow-800">
            Pendente
          </span>
        );
    }
  };

  const getNfeBadge = (status: string) => {
    switch (status) {
      case "Emitida":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#708D81]/10 text-[#708D81]">
            Emitida
          </span>
        );
      case "Aguardando":
      case "Pendente":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
      case "Erro na NF-e":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
            Erro na NF-e
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100/50">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-white">
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Proprietário
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Imóvel Referência
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Competência
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Valor Bruto
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Taxa Adm
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Valor Líquido
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status Pagamento
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Status NF-e
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[#280003]">
                    {payment.ownerName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {payment.ownerCpf}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {payment.propertyRef}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-700">
                    {payment.competence}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-700">
                    {formatCurrency(payment.grossValue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-500">
                    {payment.admFeeString}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-[#280003]">
                    {formatCurrency(payment.netValue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getPaymentBadge(payment.paymentStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getNfeBadge(payment.nfeStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {payment.paymentStatus === "Pendente" && (
                      <button
                        onClick={() => handleOpenAdjustModal(payment)}
                        className="inline-flex items-center px-3 py-1.5 border border-zinc-250 rounded-lg text-xs font-semibold text-[#280003] hover:bg-zinc-50 shadow-sm transition-colors cursor-pointer"
                      >
                        Ajustar Repasse
                      </button>
                    )}
                    
                    {payment.nfeStatus === "Emitida" ? (
                      <>
                        <button
                          className="inline-flex items-center p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Visualizar NF-e"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex items-center p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Baixar NF-e"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-[#004777] hover:bg-[#00385e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004777] transition-colors">
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        Emitir NF-e
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE AJUSTE DE REPASSE */}
      {adjustingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
            
            {/* Header */}
            <div className="bg-[#280003] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Ajustar Repasse</h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {adjustingPayment.ownerName} - {adjustingPayment.competence}
                </p>
              </div>
              <button 
                onClick={() => setAdjustingPayment(null)}
                disabled={isSaving}
                className="p-1 rounded-full hover:bg-white/10 text-white/90 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Valores Principais */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Aluguel Bruto (Recebido)</span>
                  <span className="text-lg font-bold text-gray-800">{formatCurrency(adjustingPayment.grossValue)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Taxa de Administração</span>
                  <span className="text-lg font-bold text-red-600">
                    - {formatCurrency(
                      adjustingPayment.metadata?.adminFeeValue || (adjustingPayment.grossValue * 0.1)
                    )}
                  </span>
                </div>
              </div>

              {/* Manutenções / Deduções Opcionais */}
              <div className="space-y-3">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                  Despesas de Manutenção (Deduções do Mês)
                </span>

                {loadingMaintenance ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#280003]" />
                    <span>Carregando manutenções associadas...</span>
                  </div>
                ) : maintenanceExpenses.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-zinc-50 border border-zinc-100 rounded-xl p-3.5">
                    Nenhuma despesa de manutenção liquidada para este imóvel nesta competência.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-150 rounded-xl p-3 bg-zinc-50/50">
                    {maintenanceExpenses.map((exp) => (
                      <label 
                        key={exp.id} 
                        className="flex items-center justify-between p-2 hover:bg-zinc-100/50 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedDeductionIds.includes(exp.id)}
                            onChange={() => handleToggleDeduction(exp.id)}
                            disabled={isSaving}
                            className="h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-350 accent-[#280003] cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">{exp.descricao}</span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              Pago em {new Date(exp.dataPagamento).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-red-600">- {formatCurrency(exp.valor)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Resultado Líquido */}
              <div className="bg-[#280003]/5 border border-[#280003]/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Valor Líquido a Repassar</span>
                  <span className="text-xs text-gray-400">Total menos encargos e manutenções</span>
                </div>
                <span className="text-2xl font-black text-[#280003]">{formatCurrency(localNetValue)}</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAdjustingPayment(null)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-gray-700 text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAdjustment(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-[#280003] text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar Apenas"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAdjustment(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#280003] hover:bg-[#280003]/90 text-white text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Check className="w-4.5 h-4.5 text-emerald-400" />
                  )}
                  <span>Confirmar e Liquidar</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
