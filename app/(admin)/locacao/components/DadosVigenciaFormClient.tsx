"use client";

import React, { useMemo, useState } from "react";
import { FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import {
  calcularDescontoPontualidade,
  calcularMesesContrato,
  calcularMultaQuebra,
  converterMesesParaPercentual,
  converterPercentualParaMeses,
  formatarMoeda,
  formatarDataLocalISO,
  formatarPercentual,
  parseNumeroFlexivel,
} from "@/lib/locacao/financeiro";
import { updateImovelLocacao } from "../actions";

interface PeriodoResumo {
  dataInicio: string | Date;
  dataFim: string | Date;
  valorAluguel: number;
}

interface ParcelaIntermediacao {
  id?: string;
  dataVencimento: string | Date;
  valor: number;
  observacao?: string | null;
}

interface ImovelLocacaoData {
  id: string;
  dataInicio: string | Date;
  dataFim: string | Date;
  valorAluguel?: number | null;
  hasCondominio: boolean;
  hasIPTU: boolean;
  taxaAdministracao?: number | null;
  taxaMultasEncargos?: number | null;
  taxaIntermediacao?: number | null;
  irrfResponsabilidade?: string | null;
  carenciaRepasse?: number | null;
  indiceReajuste?: string | null;
  proximoReajuste?: string | Date | null;
  periodicidadeReajuste?: number | null;
  diaVencimento?: number | null;
  vencimentoOrigem?: string | null;
  multaQuebraContrato?: number | null;
  multaQuebraPercentual?: number | null;
  tipoMultaQuebra?: string | null;
  multaQuebraProporcional?: boolean | null;
  vencimentoQuebra?: string | Date | null;
  descontoPontualidade?: number | null;
  tipoDesconto?: string | null;
  diasAntecedenciaDesc?: number | null;
  multaAtrasoPercentual?: number | null;
  diasCarenciaMulta?: number | null;
  jurosAtrasoPercentual?: number | null;
  diasCarenciaJuros?: number | null;
  honorariosAdvPercentual?: number | null;
  carenciaHonorariosDias?: number | null;
  periodoGarantido?: string | null;
  abrangenciaGarantia?: string | null;
  periodos?: PeriodoResumo[];
  parcelasIntermediacao?: ParcelaIntermediacao[];
}

interface Props {
  imovelLocacao: ImovelLocacaoData | null;
  isEditMode: boolean;
  vencimentoDia?: number | null;
}

const inputClass = "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:border-[#004777] font-semibold text-gray-700 transition-all";
const labelClass = "text-gray-400 text-[10px] uppercase font-bold block mb-1";

function formatDateForInput(date: string | Date | null | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
}

function formatDateDisplay(date: string | Date | null | undefined) {
  return date ? new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-";
}

function numericString(value: number | null | undefined) {
  return value == null ? "" : String(value).replace(".", ",");
}

export default function DadosVigenciaFormClient({ imovelLocacao, isEditMode, vencimentoDia }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [dataInicio, setDataInicio] = useState(formatDateForInput(imovelLocacao?.dataInicio));
  const [dataFim, setDataFim] = useState(formatDateForInput(imovelLocacao?.dataFim));
  const [hasCondominio, setHasCondominio] = useState(imovelLocacao?.hasCondominio ?? false);
  const [hasIPTU, setHasIPTU] = useState(imovelLocacao?.hasIPTU ?? false);
  const [diaVencimento, setDiaVencimento] = useState(String(imovelLocacao?.diaVencimento ?? vencimentoDia ?? ""));
  const [periodicidadeReajuste, setPeriodicidadeReajuste] = useState(String(imovelLocacao?.periodicidadeReajuste ?? 12));
  const [indiceReajuste, setIndiceReajuste] = useState(imovelLocacao?.indiceReajuste ?? "");
  const [taxaAdministracao, setTaxaAdministracao] = useState(numericString(imovelLocacao?.taxaAdministracao));
  const [taxaMultasEncargos, setTaxaMultasEncargos] = useState(numericString(imovelLocacao?.taxaMultasEncargos));
  const [taxaIntermediacao, setTaxaIntermediacao] = useState(numericString(imovelLocacao?.taxaIntermediacao));
  const [irrfResponsabilidade, setIrrfResponsabilidade] = useState(imovelLocacao?.irrfResponsabilidade ?? "");
  const [carenciaRepasse, setCarenciaRepasse] = useState(String(imovelLocacao?.carenciaRepasse ?? ""));
  const [tipoMultaQuebra, setTipoMultaQuebra] = useState<"PERCENTUAL" | "MESES">(
    imovelLocacao?.tipoMultaQuebra === "MESES" ? "MESES" : "PERCENTUAL",
  );
  const [multaQuebra, setMultaQuebra] = useState(numericString(
    imovelLocacao?.multaQuebraContrato ?? imovelLocacao?.multaQuebraPercentual,
  ));
  const [multaQuebraProporcional, setMultaQuebraProporcional] = useState(imovelLocacao?.multaQuebraProporcional ?? true);
  const [vencimentoQuebra, setVencimentoQuebra] = useState(formatDateForInput(imovelLocacao?.vencimentoQuebra));
  const [tipoDesconto, setTipoDesconto] = useState<"PERCENTUAL" | "VALOR">(
    imovelLocacao?.tipoDesconto === "VALOR" ? "VALOR" : "PERCENTUAL",
  );
  const [descontoPontualidade, setDescontoPontualidade] = useState(numericString(imovelLocacao?.descontoPontualidade));
  const [diasAntecedenciaDesc, setDiasAntecedenciaDesc] = useState(String(imovelLocacao?.diasAntecedenciaDesc ?? ""));
  const [multaAtraso, setMultaAtraso] = useState(numericString(imovelLocacao?.multaAtrasoPercentual));
  const [diasCarenciaMulta, setDiasCarenciaMulta] = useState(String(imovelLocacao?.diasCarenciaMulta ?? ""));
  const [jurosAtraso, setJurosAtraso] = useState(numericString(imovelLocacao?.jurosAtrasoPercentual));
  const [diasCarenciaJuros, setDiasCarenciaJuros] = useState(String(imovelLocacao?.diasCarenciaJuros ?? ""));
  const [honorarios, setHonorarios] = useState(numericString(imovelLocacao?.honorariosAdvPercentual));
  const [carenciaHonorarios, setCarenciaHonorarios] = useState(String(imovelLocacao?.carenciaHonorariosDias ?? ""));
  const [periodoGarantido, setPeriodoGarantido] = useState(imovelLocacao?.periodoGarantido ?? "NAO_GARANTIR");
  const [abrangenciaGarantia, setAbrangenciaGarantia] = useState(imovelLocacao?.abrangenciaGarantia ?? "SOMENTE_ALUGUEL");
  const [parcelas, setParcelas] = useState(() => (imovelLocacao?.parcelasIntermediacao ?? []).map((parcela) => ({
    dataVencimento: formatDateForInput(parcela.dataVencimento),
    valor: numericString(parcela.valor),
    observacao: parcela.observacao ?? "",
  })));

  const aluguelPeriodoAtual = useMemo(() => {
    const hoje = new Date();
    const periodo = imovelLocacao?.periodos?.find((item) => {
      const inicio = new Date(item.dataInicio);
      const fim = new Date(item.dataFim);
      return hoje >= inicio && hoje <= fim;
    });
    return periodo?.valorAluguel ?? imovelLocacao?.valorAluguel ?? 0;
  }, [imovelLocacao]);

  const prazoMeses = dataInicio && dataFim ? calcularMesesContrato(dataInicio, dataFim) : 0;
  const multaEntrada = parseNumeroFlexivel(multaQuebra) ?? 0;
  const multaPercentual = tipoMultaQuebra === "MESES"
    ? converterMesesParaPercentual(multaEntrada, prazoMeses)
    : multaEntrada;
  const multaPreview = dataInicio && dataFim
    ? calcularMultaQuebra({
        aluguelPeriodo: aluguelPeriodoAtual,
        percentual: multaPercentual,
        dataInicioContrato: dataInicio,
        dataFimContrato: dataFim,
        dataRescisao: formatarDataLocalISO(),
        proporcional: multaQuebraProporcional,
      })
    : null;
  const descontoAtual = calcularDescontoPontualidade(
    aluguelPeriodoAtual,
    parseNumeroFlexivel(descontoPontualidade) ?? 0,
    tipoDesconto,
  );

  const changeTipoMulta = (novoTipo: "PERCENTUAL" | "MESES") => {
    const valor = parseNumeroFlexivel(multaQuebra) ?? 0;
    const convertido = novoTipo === "MESES"
      ? converterPercentualParaMeses(valor, prazoMeses)
      : converterMesesParaPercentual(valor, prazoMeses);
    setTipoMultaQuebra(novoTipo);
    setMultaQuebra(String(Number(convertido.toFixed(4))).replace(".", ","));
  };

  const changeTipoDesconto = (novoTipo: "PERCENTUAL" | "VALOR") => {
    const valorAtual = parseNumeroFlexivel(descontoPontualidade) ?? 0;
    const valorReais = calcularDescontoPontualidade(aluguelPeriodoAtual, valorAtual, tipoDesconto);
    const convertido = novoTipo === "VALOR"
      ? valorReais
      : aluguelPeriodoAtual > 0 ? (valorReais / aluguelPeriodoAtual) * 100 : 0;
    setTipoDesconto(novoTipo);
    setDescontoPontualidade(String(Number(convertido.toFixed(4))).replace(".", ","));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!imovelLocacao?.id) return;
    if (!dataInicio || !dataFim) return setErrorMsg("Data de início e término são obrigatórias.");
    const dia = Number(diaVencimento);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return setErrorMsg("Informe um dia de vencimento entre 1 e 31.");

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await updateImovelLocacao(imovelLocacao.id, {
        dataInicio,
        dataFim,
        hasCondominio,
        hasIPTU,
        diaVencimento: dia,
        periodicidadeReajuste: Number(periodicidadeReajuste) || null,
        indiceReajuste: indiceReajuste || null,
        taxaAdministracao: parseNumeroFlexivel(taxaAdministracao),
        taxaMultasEncargos: parseNumeroFlexivel(taxaMultasEncargos),
        taxaIntermediacao: parseNumeroFlexivel(taxaIntermediacao),
        irrfResponsabilidade: irrfResponsabilidade || null,
        carenciaRepasse: carenciaRepasse ? Number(carenciaRepasse) : null,
        multaQuebraContrato: parseNumeroFlexivel(multaQuebra),
        tipoMultaQuebra,
        multaQuebraProporcional,
        vencimentoQuebra: vencimentoQuebra || null,
        descontoPontualidade: parseNumeroFlexivel(descontoPontualidade),
        tipoDesconto,
        diasAntecedenciaDesc: diasAntecedenciaDesc ? Number(diasAntecedenciaDesc) : null,
        multaAtrasoPercentual: parseNumeroFlexivel(multaAtraso),
        diasCarenciaMulta: diasCarenciaMulta ? Number(diasCarenciaMulta) : null,
        jurosAtrasoPercentual: parseNumeroFlexivel(jurosAtraso),
        diasCarenciaJuros: diasCarenciaJuros ? Number(diasCarenciaJuros) : null,
        honorariosAdvPercentual: parseNumeroFlexivel(honorarios),
        carenciaHonorariosDias: carenciaHonorarios ? Number(carenciaHonorarios) : null,
        periodoGarantido,
        abrangenciaGarantia,
        parcelasIntermediacao: parcelas.filter((parcela) => parcela.dataVencimento && parseNumeroFlexivel(parcela.valor) != null).map((parcela) => ({
          dataVencimento: parcela.dataVencimento,
          valor: parseNumeroFlexivel(parcela.valor) ?? 0,
          observacao: parcela.observacao || null,
        })),
      });
      if (!response.success) return setErrorMsg(response.error || "Erro ao atualizar dados.");
      setSuccessMsg("Controle locatício atualizado com sucesso.");
      router.refresh();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditMode) {
    const multaMeses = converterPercentualParaMeses(imovelLocacao?.multaQuebraPercentual ?? 0, prazoMeses);
    return (
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
        <Title text="Dados de Vigência" />
        <div className="space-y-2 text-xs font-semibold text-gray-700">
          <ReadRow label="Vigência" value={`${formatDateDisplay(imovelLocacao?.dataInicio)} a ${formatDateDisplay(imovelLocacao?.dataFim)}`} />
          <ReadRow label="Vencimento" value={diaVencimento ? `Todo dia ${diaVencimento}` : "Não definido"} />
          <ReadRow label="Reajuste" value={`${imovelLocacao?.indiceReajuste || "Não definido"} / ${imovelLocacao?.periodicidadeReajuste || "-"} meses`} />
          <ReadRow label="Próximo reajuste" value={formatDateDisplay(imovelLocacao?.proximoReajuste)} />
          <ReadRow label="Multa por quebra" value={imovelLocacao?.multaQuebraPercentual != null ? `${formatarPercentual(imovelLocacao.multaQuebraPercentual)} (${multaMeses.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} meses), proporcional` : "-"} />
          <ReadRow label="Desconto pontualidade" value={imovelLocacao?.descontoPontualidade != null ? (imovelLocacao.tipoDesconto === "VALOR" ? formatarMoeda(imovelLocacao.descontoPontualidade) : formatarPercentual(imovelLocacao.descontoPontualidade)) : "-"} />
          <ReadRow label="Taxa de administração" value={imovelLocacao?.taxaAdministracao != null ? formatarPercentual(imovelLocacao.taxaAdministracao) : "-"} />
          <ReadRow label="Taxa de intermediação" value={imovelLocacao?.taxaIntermediacao != null ? formatarMoeda(imovelLocacao.taxaIntermediacao) : "-"} />
          <ReadRow label="IRRF" value={imovelLocacao?.irrfResponsabilidade || "-"} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-5">
      <Title text="Editar Controle Locatício" />
      {errorMsg && <div role="alert" className="p-3 text-xs bg-red-50 text-red-700 rounded-xl font-semibold">{errorMsg}</div>}
      {successMsg && <div className="p-3 text-xs bg-emerald-50 text-emerald-700 rounded-xl font-semibold">{successMsg}</div>}

      <Section title="Vigência e reajuste">
        <Field label="Data de início"><input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={inputClass} required /></Field>
        <Field label="Data de término"><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={inputClass} required /></Field>
        <Field label="Dia de vencimento"><input type="number" min={1} max={31} value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className={inputClass} required /></Field>
        {imovelLocacao?.vencimentoOrigem === "DIVERGENTE" && <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold text-amber-900">As cobranças importadas possuem dias diferentes. Informe e confirme aqui o dia contratual correto.</div>}
        {imovelLocacao?.vencimentoOrigem === "INFERIDO_COBRANCAS" && <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10px] font-semibold text-blue-900">Este dia foi inferido das cobranças existentes. Ao salvar, ele será confirmado como dado manual do contrato.</div>}
        <Field label="Periodicidade (meses)"><input type="number" min={1} value={periodicidadeReajuste} onChange={(e) => setPeriodicidadeReajuste(e.target.value)} className={inputClass} /></Field>
        <Field label="Índice de reajuste"><IndexSelect value={indiceReajuste} onChange={setIndiceReajuste} /></Field>
        <Field label="Condomínio"><BooleanSelect value={hasCondominio} onChange={setHasCondominio} /></Field>
        <Field label="IPTU"><BooleanSelect value={hasIPTU} onChange={setHasIPTU} /></Field>
      </Section>

      <Section title="Quebra do contrato">
        <Field label="Multa por quebra">
          <div className="flex gap-2">
            <FormattedNumberInput value={multaQuebra} onValueChange={setMultaQuebra} format={tipoMultaQuebra === "MESES" ? "number" : "percentage"} className={inputClass} />
            <select value={tipoMultaQuebra} onChange={(e) => changeTipoMulta(e.target.value as "PERCENTUAL" | "MESES")} className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 text-xs"><option value="PERCENTUAL">%</option><option value="MESES">Meses</option></select>
          </div>
        </Field>
        <Field label="Cobrança proporcional"><BooleanSelect value={multaQuebraProporcional} onChange={setMultaQuebraProporcional} /></Field>
        <Field label="Cláusula válida até"><input type="date" value={vencimentoQuebra} onChange={(e) => setVencimentoQuebra(e.target.value)} className={inputClass} /></Field>
        {multaPreview && <div className="col-span-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-[11px] text-gray-700">
          Base atual: <strong>{formatarMoeda(aluguelPeriodoAtual)}</strong>. Multa cheia: <strong>{formatarMoeda(multaPreview.multaMaxima)}</strong> ({multaPreview.mesesMultaCheia.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} meses / {formatarPercentual(multaPercentual)}). Proporcional hoje: <strong>{formatarMoeda(multaPreview.multaProporcional)}</strong>.
        </div>}
      </Section>

      <Section title="Pontualidade, multa e juros">
        <Field label="Desconto de pontualidade">
          <div className="flex gap-2">
            <FormattedNumberInput value={descontoPontualidade} onValueChange={setDescontoPontualidade} format={tipoDesconto === "VALOR" ? "currency" : "percentage"} className={inputClass} />
            <select value={tipoDesconto} onChange={(e) => changeTipoDesconto(e.target.value as "PERCENTUAL" | "VALOR")} className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 text-xs"><option value="PERCENTUAL">%</option><option value="VALOR">R$</option></select>
          </div>
          <small className="text-[10px] text-gray-500">Equivale hoje a {formatarMoeda(descontoAtual)}</small>
        </Field>
        <Field label="Dias antes do vencimento"><input type="number" min={0} value={diasAntecedenciaDesc} onChange={(e) => setDiasAntecedenciaDesc(e.target.value)} className={inputClass} /></Field>
        <Field label="Multa por atraso"><FormattedNumberInput value={multaAtraso} onValueChange={setMultaAtraso} format="percentage" className={inputClass} /></Field>
        <Field label="Carência da multa (dias)"><input type="number" min={0} value={diasCarenciaMulta} onChange={(e) => setDiasCarenciaMulta(e.target.value)} className={inputClass} /></Field>
        <Field label="Juros mensal pró-rata"><FormattedNumberInput value={jurosAtraso} onValueChange={setJurosAtraso} format="percentage" className={inputClass} /></Field>
        <Field label="Carência dos juros (dias)"><input type="number" min={0} value={diasCarenciaJuros} onChange={(e) => setDiasCarenciaJuros(e.target.value)} className={inputClass} /></Field>
        <Field label="Honorários advocatícios"><FormattedNumberInput value={honorarios} onValueChange={setHonorarios} format="percentage" className={inputClass} /></Field>
        <Field label="Carência dos honorários (dias)"><input type="number" min={0} value={carenciaHonorarios} onChange={(e) => setCarenciaHonorarios(e.target.value)} className={inputClass} /></Field>
      </Section>

      <Section title="Repasse e administração">
        <Field label="Carência do repasse (dias)"><input type="number" min={0} value={carenciaRepasse} onChange={(e) => setCarenciaRepasse(e.target.value)} className={inputClass} /></Field>
        <Field label="Período garantido"><GuaranteeSelect value={periodoGarantido} onChange={setPeriodoGarantido} /></Field>
        <Field label="Abrangência da garantia"><select value={abrangenciaGarantia} onChange={(e) => setAbrangenciaGarantia(e.target.value)} className={inputClass}><option value="SOMENTE_ALUGUEL">Somente o aluguel</option><option value="ALUGUEL_LANCAMENTOS">Aluguel e demais lançamentos</option></select></Field>
        <Field label="Taxa de administração"><FormattedNumberInput value={taxaAdministracao} onValueChange={setTaxaAdministracao} format="percentage" className={inputClass} /></Field>
        <Field label="Taxa sobre multas e encargos"><FormattedNumberInput value={taxaMultasEncargos} onValueChange={setTaxaMultasEncargos} format="percentage" className={inputClass} /></Field>
        <Field label="Taxa de intermediação"><FormattedNumberInput value={taxaIntermediacao} onValueChange={setTaxaIntermediacao} format="currency" className={inputClass} /></Field>
        <Field label="Responsabilidade IRRF"><select value={irrfResponsabilidade} onChange={(e) => setIrrfResponsabilidade(e.target.value)} className={inputClass}><option value="">Selecione...</option><option value="LOCADOR">Locador</option><option value="LOCATARIO">Locatário</option><option value="ADMINISTRADORA">Administradora</option><option value="ISENTO">Isento</option></select></Field>
      </Section>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#004777]">Parcelas de intermediação</h3><button type="button" onClick={() => setParcelas((current) => [...current, { dataVencimento: "", valor: "", observacao: "" }])} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#004777]"><Plus className="w-3.5 h-3.5" />Adicionar</button></div>
        {parcelas.length === 0 && <p className="text-[10px] text-gray-400">Nenhuma parcela cadastrada.</p>}
        {parcelas.map((parcela, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end rounded-xl bg-zinc-50 p-2">
          <Field label={`Vencimento ${index + 1}`}><input type="date" value={parcela.dataVencimento} onChange={(e) => setParcelas((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dataVencimento: e.target.value } : item))} className={inputClass} /></Field>
          <Field label="Valor"><FormattedNumberInput value={parcela.valor} onValueChange={(value) => setParcelas((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, valor: value } : item))} format="currency" className={inputClass} /></Field>
          <button type="button" aria-label={`Remover parcela ${index + 1}`} onClick={() => setParcelas((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="mb-1 p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>)}
      </div>

      <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-[#004777] text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-[#003355] disabled:bg-gray-300">
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Save className="w-4 h-4" />Salvar alterações</>}
      </button>
    </form>
  );
}

function Title({ text }: { text: string }) {
  return <h2 className="font-bold text-sm text-[#280003] uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-3"><FileText className="w-4 h-4 text-gray-600" />{text}</h2>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#004777]">{title}</h3><div className="grid grid-cols-2 gap-3">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 items-start py-1.5 border-b border-gray-50"><span className="text-gray-400 text-[10px] uppercase font-bold">{label}</span><span className="text-right">{value}</span></div>;
}

function BooleanSelect({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return <select value={String(value)} onChange={(e) => onChange(e.target.value === "true")} className={inputClass}><option value="false">Não</option><option value="true">Sim</option></select>;
}

function IndexSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}><option value="">Não definido</option>{["IGP", "IGPM", "INPC", "IPC", "IPC-DI", "IPCA"].map((index) => <option key={index} value={index}>{index}</option>)}</select>;
}

function GuaranteeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}><option value="NAO_GARANTIR">Não garantir</option><option value="GARANTIR_VIGENCIA_CONTRATOS">Garantir pela vigência</option><option value="GARANTIR_DEVOLUCAO_CHAVES">Até a devolução das chaves</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={`GARANTIR_PAGAMENTO_${count}`}>Garantir {count} pagamento{count > 1 ? "s" : ""}</option>)}</select>;
}
