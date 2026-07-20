import React from 'react';
import { Shield } from 'lucide-react';

interface CondicoesContratuaisSectionProps {
  selectedFiadorIndex: string;
  setSelectedFiadorIndex: (val: string) => void;
  pendingFiadorData: any | null;
  fiadores: any[];
  leasePrazo: string;
  setLeasePrazo: (val: string) => void;
  leaseVencimento: string;
  setLeaseVencimento: (val: string) => void;
  periodicidadeReajuste: string;
  setPeriodicidadeReajuste: (val: string) => void;
  leaseDataInicio: string;
  setLeaseDataInicio: (val: string) => void;
  descontoPontualidade: string;
  setDescontoPontualidade: (val: string) => void;
  validadeDescontoPontualidade: string;
  setValidadeDescontoPontualidade: (val: string) => void;
  multaQuebraContrato: string;
  setMultaQuebraContrato: (val: string) => void;
  quebraContratoVenceEm: string;
  setQuebraContratoVenceEm: (val: string) => void;
  multaAtraso: string;
  setMultaAtraso: (val: string) => void;
  cobrancaAposDias: string;
  setCobrancaAposDias: (val: string) => void;
  multaJurosMensal: string;
  setMultaJurosMensal: (val: string) => void;
  cobrancaAposDiasJuros: string;
  setCobrancaAposDiasJuros: (val: string) => void;
  honorarios: string;
  setHonorarios: (val: string) => void;
  carenciaDiasCorridos: string;
  setCarenciaDiasCorridos: (val: string) => void;
  periodoCarencia: string;
  setPeriodoCarencia: (val: string) => void;
  abrangenciaGarantia: string;
  setAbrangenciaGarantia: (val: string) => void;
}

export function CondicoesContratuaisSection({
  selectedFiadorIndex,
  setSelectedFiadorIndex,
  pendingFiadorData,
  fiadores,
  leasePrazo,
  setLeasePrazo,
  leaseVencimento,
  setLeaseVencimento,
  periodicidadeReajuste,
  setPeriodicidadeReajuste,
  leaseDataInicio,
  setLeaseDataInicio,
  descontoPontualidade,
  setDescontoPontualidade,
  validadeDescontoPontualidade,
  setValidadeDescontoPontualidade,
  multaQuebraContrato,
  setMultaQuebraContrato,
  quebraContratoVenceEm,
  setQuebraContratoVenceEm,
  multaAtraso,
  setMultaAtraso,
  cobrancaAposDias,
  setCobrancaAposDias,
  multaJurosMensal,
  setMultaJurosMensal,
  cobrancaAposDiasJuros,
  setCobrancaAposDiasJuros,
  honorarios,
  setHonorarios,
  carenciaDiasCorridos,
  setCarenciaDiasCorridos,
  periodoCarencia,
  setPeriodoCarencia,
  abrangenciaGarantia,
  setAbrangenciaGarantia
}: CondicoesContratuaisSectionProps) {
  return (
    <div id="section-condicoes" className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-3 md:col-span-2 scroll-mt-2">
      <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
        <Shield className="w-4 h-4" />
        3. Condições Contratuais & Fiador
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Selecionar Fiador</label>
          <select
            value={selectedFiadorIndex}
            onChange={e => setSelectedFiadorIndex(e.target.value)}
            disabled={pendingFiadorData !== null}
            className="block w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white disabled:bg-zinc-50"
          >
            {pendingFiadorData ? (
              <option value="pending-new">{pendingFiadorData.nome} (Criado)</option>
            ) : (
              <>
                <option value="">-- Sem Fiador / Outro --</option>
                {fiadores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </>
            )}
          </select>
          {pendingFiadorData && (
            <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Novo fiador criado no sub-form</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Prazo (Meses) *</label>
          <input
            type="number"
            value={leasePrazo}
            onChange={e => setLeasePrazo(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Vencimento *</label>
          <input
            type="number"
            value={leaseVencimento}
            onChange={e => setLeaseVencimento(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Periodicidade do Reajuste *</label>
          <input
            type="number"
            value={periodicidadeReajuste}
            onChange={e => setPeriodicidadeReajuste(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Data Início *</label>
          <input
            type="date"
            value={leaseDataInicio}
            onChange={e => setLeaseDataInicio(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div className="col-span-2 border-t border-zinc-100 pt-3">
          <span className="text-xs font-bold text-[#004777] block mb-2">Pontualidade</span>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Desconto de Pontualidade</label>
          <input
            type="text"
            value={descontoPontualidade}
            onChange={e => setDescontoPontualidade(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1"> Válido por quantos dias  </label>
          <input
            type="number"
            value={validadeDescontoPontualidade}
            onChange={e => setValidadeDescontoPontualidade(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1"> Multa por Quebra de Contrato</label>
          <input
            type="text"
            value={multaQuebraContrato}
            onChange={e => setMultaQuebraContrato(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Quebra de Contrato vence em:  </label>
          <input
            type="date"
            value={quebraContratoVenceEm}
            onChange={e => setQuebraContratoVenceEm(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div className="col-span-2 border-t border-zinc-100 pt-3">
          <span className="text-xs font-bold text-[#004777] block mb-2">Multas e Outros Encargos</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Multa por Atraso </label>
          <input
            type="text"
            value={multaAtraso}
            onChange={e => setMultaAtraso(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cobrar multa após quantos dias do vencimento: *</label>
          <input
            type="number"
            value={cobrancaAposDias}
            onChange={e => setCobrancaAposDias(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Juros Mensal (pró rata) *</label>
          <input
            type="text"
            value={multaJurosMensal}
            onChange={e => setMultaJurosMensal(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cobrar juros após quantos dias do vencimento (pró rata) *</label>
          <input
            type="number"
            value={cobrancaAposDiasJuros}
            onChange={e => setCobrancaAposDiasJuros(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Honorários Advocatícios</label>
          <input
            type="text"
            value={honorarios}
            onChange={e => setHonorarios(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>

        <div className="col-span-2 border-t border-zinc-100 pt-3">
          <span className="text-xs font-bold text-[#004777] block mb-2">Repasse</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Carência para repasse do aluguel (dias corridos): </label>
          <input
            type="number"
            value={carenciaDiasCorridos}
            onChange={e => setCarenciaDiasCorridos(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Período de Carência *</label>
          <select
            value={periodoCarencia}
            onChange={e => setPeriodoCarencia(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white"
          >
            <option value="NAO_GARANTIR">Não Garantir</option>
            <option value="GARANTIR_VIGENCIA_CONTRATOS">Garantir pela vigência do contrato</option>
            <option value="GARANTIR_DEVOLUCAO_CHAVES">Garantir até a devolução das chaves</option>
            <option value="GARANTIR_PAGAMENTO_1">Garantir 1 pagamento</option>
            <option value="GARANTIR_PAGAMENTO_2">Garantir 2 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_3">Garantir 3 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_4">Garantir 4 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_5">Garantir 5 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_6">Garantir 6 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_7">Garantir 7 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_8">Garantir 8 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_9">Garantir 9 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_10">Garantir 10 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_11">Garantir 11 pagamentos</option>
            <option value="GARANTIR_PAGAMENTO_12">Garantir 12 pagamentos</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Abrangência da garantia do aluguel</label>
          <select
            value={abrangenciaGarantia}
            onChange={e => setAbrangenciaGarantia(e.target.value)}
            required
            className="block w-full border border-zinc-200 rounded-lg px-3 py-1 text-xs bg-white"
          >
            <option value="SOMENTE_ALUGUEL">Somente o Aluguel</option>
            <option value="ALUGUEL_LANCAMENTOS">Aluguel e demais lançamentos</option>
          </select>
        </div>
      </div>
    </div>
  );
}
