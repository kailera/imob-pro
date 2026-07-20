"use client";

import React, { useState, useEffect, useActionState, useRef } from "react";
import { X, DollarSign, Key, Loader2, AlertTriangle, Image as ImageIcon, Trash2, Plus, Eye } from "lucide-react";
import { TipoImovel } from "@/generated/prisma";
import { saveOrUpdateImovelAction, getLocadores, createLocador } from "@/app/actions/imoveisActions";
import { uploadMediaToRustFS } from "@/app/actions/uploadMedia";
import { formatBRL, formatCEP, formatCpfCnpj } from "@/app/(admin)/locacao/utils/formatters";
import { PropertyCard, Property } from "@/components/public/PropertyCard";

interface Imovel {
  id: string;
  codigo: string;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
  cep: number;
  tipo: TipoImovel;
  forVenda: boolean;
  forLocacao: boolean;
  valorAluguel: number | null;
  valorCondominio: number | null;
  valorIPTU: number | null;
  valorVenda: number | null;
  valorTotal: number | null;
  loteamentoId?: string | null;
  loteamento?: { id: string; nome: string } | null;
  aluguelDados?: any;
  publicado?: boolean;
  titulo?: string;
  descricao?: string | null;
  quartos?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  area?: number;
  imagens?: string[];
}

interface ImovelFormModalProps {
  isOpen: boolean;
  editingImovel: Imovel | null;
  loteamentos: any[];
  onClose: () => void;
  onSaveSuccess: (msg: string) => void;
}

export default function ImovelFormModal({
  isOpen,
  editingImovel,
  loteamentos,
  onClose,
  onSaveSuccess,
}: ImovelFormModalProps) {
  // Form State using React 19's useActionState
  const [state, formAction, isPending] = useActionState(saveOrUpdateImovelAction, {
    success: false,
    error: null,
    message: null,
  });

  // Local state for UI toggles and fields that require client-side interaction
  const [tipo, setTipo] = useState<TipoImovel>("CASA");
  const [cep, setCep] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");

  const numeroInputRef = useRef<HTMLInputElement>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [forVenda, setForVenda] = useState(false);
  const [forLocacao, setForLocacao] = useState(false);
  const [valorVenda, setValorVenda] = useState("");
  const [valorAluguel, setValorAluguel] = useState("");
  const [valorCondominio, setValorCondominio] = useState("");
  const [valorIPTU, setValorIPTU] = useState("");

  const [loteamentoId, setLoteamentoId] = useState("");
  const [isCreatingLoteamento, setIsCreatingLoteamento] = useState(false);
  const [newLoteamentoNome, setNewLoteamentoNome] = useState("");

  // Detailed Condomínio States
  const [condAdminNome, setCondAdminNome] = useState("");
  const [condAdminTel, setCondAdminTel] = useState("");
  const [condAdminEmail, setCondAdminEmail] = useState("");
  const [condAdminSite, setCondAdminSite] = useState("");
  const [condSindicoNome, setCondSindicoNome] = useState("");
  const [condSindicoTel, setCondSindicoTel] = useState("");
  const [condResponsavelPag, setCondResponsavelPag] = useState("");
  const [condDataChecagem, setCondDataChecagem] = useState("");
  const [condDocDescricao, setCondDocDescricao] = useState("");

  // Detailed Rental States
  const [indiceReajuste, setIndiceReajuste] = useState("8,33");
  const [multaRescisao, setMultaRescisao] = useState("");
  const [dataVenceQuebra, setDataVenceQuebra] = useState("2027-11-19");
  const [descontoPontualidade, setDescontoPontualidade] = useState("9,44");
  const [diasDescontoPontualidade, setDiasDescontoPontualidade] = useState("5");
  const [multaAtraso, setMultaAtraso] = useState("10,00");
  const [carenciaMulta, setCarenciaMulta] = useState("1");
  const [jurosMensal, setJurosMensal] = useState("1,00");
  const [carenciaJuros, setCarenciaJuros] = useState("1");
  const [honorariosAdv, setHonorariosAdv] = useState("100,00");
  const [carenciaHonorarios, setCarenciaHonorarios] = useState("90");
  const [carenciaRepasse, setCarenciaRepasse] = useState("10");
  const [taxaAdministracao, setTaxaAdministracao] = useState("10,00");
  const [taxaMultasEncargos, setTaxaMultasEncargos] = useState("50,00");
  const [irrfResponsabilidade, setIrrfResponsabilidade] = useState("LOCADOR");
  const [parcelasIntermediacao, setParcelasIntermediacao] = useState<{ data: string; valor: string }[]>([]);
  const [novaParcelaData, setNovaParcelaData] = useState("");
  const [novaParcelaValor, setNovaParcelaValor] = useState("");

  // Locadores / Proprietários
  const [allLocadores, setAllLocadores] = useState<any[]>([]);
  const [proprietarioId, setProprietarioId] = useState("");
  const [showNewLocadorModal, setShowNewLocadorModal] = useState(false);
  const [newLocadorNome, setNewLocadorNome] = useState("");
  const [newLocadorCpf, setNewLocadorCpf] = useState("");
  const [newLocadorEmail, setNewLocadorEmail] = useState("");
  const [newLocadorTelefone, setNewLocadorTelefone] = useState("");
  const [newLocadorCep, setNewLocadorCep] = useState("");
  const [newLocadorLogradouro, setNewLocadorLogradouro] = useState("");
  const [newLocadorNumero, setNewLocadorNumero] = useState("");
  const [newLocadorComplemento, setNewLocadorComplemento] = useState("");
  const [newLocadorBairro, setNewLocadorBairro] = useState("");
  const [newLocadorCidade, setNewLocadorCidade] = useState("");
  const [newLocadorEstado, setNewLocadorEstado] = useState("");

  // Garantias
  const [periodoCarencia, setPeriodoCarencia] = useState("NAO_GARANTIR");
  const [abrangenciaGarantia, setAbrangenciaGarantia] = useState("SOMENTE_ALUGUEL");

  useEffect(() => {
    if (isOpen) {
      getLocadores().then((res) => {
        if (res.success && res.data) {
          setAllLocadores(res.data);
        }
      });
    }
  }, [isOpen]);

  // Vitrine / Institutional states
  const [publicado, setPublicado] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quartos, setQuartos] = useState("0");
  const [banheiros, setBanheiros] = useState("0");
  const [vagas, setVagas] = useState("0");
  const [area, setArea] = useState("0");
  const [imagens, setImagens] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);

  // Populate local states when editingImovel changes or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editingImovel) {
      setTipo(editingImovel.tipo);
      setCep(editingImovel.cep ? formatCEP(String(editingImovel.cep)) : "");
      setCidade(editingImovel.cidade);
      setUf(editingImovel.uf);
      setBairro(editingImovel.bairro);
      setNumero(String(editingImovel.numero));
      setForVenda(editingImovel.forVenda);
      setForLocacao(editingImovel.forLocacao);
      setValorVenda(editingImovel.valorVenda ? formatBRL(String(editingImovel.valorVenda)) : "");
      setValorAluguel(editingImovel.valorAluguel ? formatBRL(String(editingImovel.valorAluguel)) : "");
      setValorCondominio(editingImovel.valorCondominio ? formatBRL(String(editingImovel.valorCondominio)) : "");
      setValorIPTU(editingImovel.valorIPTU ? formatBRL(String(editingImovel.valorIPTU)) : "");
      setLoteamentoId(editingImovel.loteamentoId || "");
      setIsCreatingLoteamento(false);
      setNewLoteamentoNome("");

      // Load Condomínio details
      const cd = (editingImovel.loteamento as any)?.dadosCondominio || {};
      setCondAdminNome(cd.adminNome || "");
      setCondAdminTel(cd.adminTel || "");
      setCondAdminEmail(cd.adminEmail || "");
      setCondAdminSite(cd.adminSite || "");
      setCondSindicoNome(cd.sindicoNome || "");
      setCondSindicoTel(cd.sindicoTel || "");
      setCondResponsavelPag(cd.responsavelPag || "");
      setCondDataChecagem(cd.dataChecagem || "");
      setCondDocDescricao(cd.docDescricao || "");

      // Load aluguelDados
      const d = editingImovel.aluguelDados as any || {};
      setIndiceReajuste(d.indiceReajuste || "IGPM");
      setMultaRescisao(d.multaRescisao ? formatBRL(d.multaRescisao.replace(/\D/g, "")) : "");
      setDataVenceQuebra(d.dataVenceQuebra || "2027-11-19");
      setDescontoPontualidade(d.descontoPontualidade || "9,44");
      setDiasDescontoPontualidade(d.diasDescontoPontualidade || "5");
      setMultaAtraso(d.multaAtraso || "10,00");
      setCarenciaMulta(d.carenciaMulta || "1");
      setJurosMensal(d.jurosMensal || "1,00");
      setCarenciaJuros(d.carenciaJuros || "1");
      setHonorariosAdv(d.honorariosAdv || "100,00");
      setCarenciaHonorarios(d.carenciaHonorarios || "90");
      setCarenciaRepasse(d.carenciaRepasse || "10");
      setTaxaAdministracao(d.taxaAdministracao || "10,00");
      setTaxaMultasEncargos(d.taxaMultasEncargos || "50,00");
      setIrrfResponsabilidade(d.irrfResponsabilidade || "LOCADOR");
      setParcelasIntermediacao(d.parcelasIntermediacao || [{ data: "2024-12-19", valor: "1050,00" }]);
      setPrecisaAtualizar(d.precisaAtualizar === true);
      setProprietarioId(d.proprietarioId || "");
      setPeriodoCarencia(d.periodoCarencia || "NAO_GARANTIR");
      setAbrangenciaGarantia(d.abrangenciaGarantia || "SOMENTE_ALUGUEL");

      setPublicado(editingImovel.publicado || false);
      setTitulo(editingImovel.titulo || "");
      setDescricao(editingImovel.descricao || "");
      setQuartos(String(editingImovel.quartos ?? 0));
      setBanheiros(String(editingImovel.banheiros ?? 0));
      setVagas(String(editingImovel.vagas ?? 0));
      setArea(String(editingImovel.area ?? 0));
      setImagens(editingImovel.imagens || []);
    } else {
      // Defaults for a new property
      setTipo("CASA");
      setCep("");
      setCidade("");
      setUf("");
      setBairro("");
      setNumero("");
      setForVenda(true);
      setForLocacao(false);
      setValorVenda("");
      setValorAluguel("");
      setValorCondominio("");
      setValorIPTU("");
      setLoteamentoId("");
      setIsCreatingLoteamento(false);
      setNewLoteamentoNome("");
      setCondAdminNome("");
      setCondAdminTel("");
      setCondAdminEmail("");
      setCondAdminSite("");
      setCondSindicoNome("");
      setCondSindicoTel("");
      setCondResponsavelPag("");
      setCondDataChecagem("");
      setCondDocDescricao("");
      setIndiceReajuste("IGPM");
      setMultaRescisao("");
      setDataVenceQuebra("2027-11-19");
      setDescontoPontualidade("9,44");
      setDiasDescontoPontualidade("5");
      setMultaAtraso("10,00");
      setCarenciaMulta("1");
      setJurosMensal("1,00");
      setCarenciaJuros("1");
      setHonorariosAdv("100,00");
      setCarenciaHonorarios("90");
      setCarenciaRepasse("10");
      setTaxaAdministracao("10,00");
      setTaxaMultasEncargos("50,00");
      setIrrfResponsabilidade("LOCADOR");
      setParcelasIntermediacao([{ data: "2024-12-19", valor: "1050,00" }]);
      setProprietarioId("");
      setPeriodoCarencia("NAO_GARANTIR");
      setAbrangenciaGarantia("SOMENTE_ALUGUEL");

      setPublicado(false);
      setTitulo("");
      setDescricao("");
      setQuartos("0");
      setBanheiros("0");
      setVagas("0");
      setArea("0");
      setImagens([]);
      setPrecisaAtualizar(false);
    }
    setNovaParcelaData("");
    setNovaParcelaValor("");
  }, [editingImovel, isOpen]);

  // Fetch CEP address details automatically
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    let active = true;
    const fetchCep = async () => {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (active && data && !data.erro) {
          setCidade(data.localidade || "");
          setUf(data.uf || "");
          setBairro(data.bairro || "");
          setRua(data.logradouro || "");
          
          // Focus the 'numero' input after a small timeout to let react state commit
          setTimeout(() => {
            numeroInputRef.current?.focus();
          }, 50);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        if (active) {
          setIsFetchingCep(false);
        }
      }
    };

    fetchCep();

    return () => {
      active = false;
    };
  }, [cep]);

  // Handle successful save from useActionState response
  useEffect(() => {
    if (state.success) {
      onSaveSuccess(state.message || "Salvo com sucesso!");
    }
  }, [state, onSaveSuccess]);

  // Rule: LOTE cannot have locacao
  useEffect(() => {
    if (tipo === "LOTE") {
      setForLocacao(false);
      setValorAluguel("");
      setValorCondominio("");
      setValorIPTU("");
    }
  }, [tipo]);

  const handleAddParcela = () => {
    if (!novaParcelaData || !novaParcelaValor) return;
    setParcelasIntermediacao([
      ...parcelasIntermediacao,
      { data: novaParcelaData, valor: novaParcelaValor },
    ]);
    setNovaParcelaData("");
    setNovaParcelaValor("");
  };

  const handleRemoveParcela = (index: number) => {
    setParcelasIntermediacao(parcelasIntermediacao.filter((_, i) => i !== index));
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await uploadMediaToRustFS(formData);
        if (res && res.url) {
          setImagens((prev) => [...prev, res.url]);
        }
      }
    } catch (err) {
      console.error("Erro ao fazer upload da foto:", err);
      alert("Erro ao fazer upload da foto.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    setImagens((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const handleCurrencyChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatBRL(e.target.value));
  };

  const handleCepChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatCEP(e.target.value));
  };

  const handleCreateLocador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocadorNome || !newLocadorCpf || !newLocadorEmail) {
      alert("Por favor, preencha nome, CPF/CNPJ e e-mail.");
      return;
    }
    try {
      const res = await createLocador({
        nome: newLocadorNome,
        cpfCnpj: newLocadorCpf.replace(/\D/g, ""),
        email: newLocadorEmail,
        telefone: [{ tipo: "Principal", numero: newLocadorTelefone, observacao: "" }],
        endereco: [{
          cep: newLocadorCep.replace(/\D/g, ""),
          logradouro: newLocadorLogradouro,
          numero: newLocadorNumero,
          complemento: newLocadorComplemento,
          bairro: newLocadorBairro,
          municipio: newLocadorCidade,
          estado: newLocadorEstado
        }],
        dataNasc: "01/01/1980",
        rg: "",
        orgaoEmissor: "",
        estadoCivil: "Solteiro(a)",
        profissao: "",
        nacionalidade: "Brasileira",
        genero: "Masculino"
      });
      if (res.success && res.data) {
        setAllLocadores(prev => [...prev, res.data].sort((a,b) => a.nome.localeCompare(b.nome)));
        setProprietarioId(res.data.id);
        setShowNewLocadorModal(false);
        // Clear fields
        setNewLocadorNome("");
        setNewLocadorCpf("");
        setNewLocadorEmail("");
        setNewLocadorTelefone("");
        setNewLocadorCep("");
        setNewLocadorLogradouro("");
        setNewLocadorNumero("");
        setNewLocadorComplemento("");
        setNewLocadorBairro("");
        setNewLocadorCidade("");
        setNewLocadorEstado("");
      } else {
        alert(res.error || "Erro ao cadastrar proprietário.");
      }
    } catch (err: any) {
      alert("Erro ao cadastrar: " + err.message);
    }
  };

  if (!isOpen) return null;

  // Prepare aluguelDados JSON payload for form submission
  const aluguelDadosJsonString = JSON.stringify({
    indiceReajuste,
    multaRescisao,
    dataVenceQuebra,
    descontoPontualidade,
    diasDescontoPontualidade,
    multaAtraso,
    carenciaMulta,
    jurosMensal,
    carenciaJuros,
    honorariosAdv,
    carenciaHonorarios,
    carenciaRepasse,
    taxaAdministracao,
    taxaMultasEncargos,
    irrfResponsabilidade,
    parcelasIntermediacao,
    precisaAtualizar,
    proprietarioId,
    proprietario: allLocadores.find(l => l.id === proprietarioId) || (editingImovel?.aluguelDados as any)?.proprietario || null,
    periodoCarencia,
    abrangenciaGarantia,
  });

  return (
    <>
      <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-zinc-200 transform transition-all duration-300 scale-100 animate-scale-up">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
            <h3 className="text-lg font-bold text-[#280003]">
              {editingImovel ? `Editar Imóvel: ${editingImovel.codigo}` : "Cadastrar Novo Imóvel"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Error alert */}
          {state.error && (
            <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Form bound to action */}
          <form action={formAction} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {precisaAtualizar && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1 animate-fade-in flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">⚠️ Pendência Administrativa</p>
                  <p className="text-amber-700/90 leading-relaxed">
                    {editingImovel?.aluguelDados?.motivo || "Este imóvel foi importado sem proprietário ou dados contratuais definidos. Atualize as informações necessárias e desmarque o aviso de pendência abaixo."}
                  </p>
                </div>
              </div>
            )}
            {/* Hidden inputs to feed Server Action */}
            <input type="hidden" name="id" value={editingImovel?.id || ""} />
            <input type="hidden" name="aluguelDados" value={aluguelDadosJsonString} />
            <input type="hidden" name="imagens" value={JSON.stringify(imagens)} />
            {isCreatingLoteamento && (
              <input type="hidden" name="isCreatingLoteamento" value="on" />
            )}

            {/* Seção 1: Dados Gerais */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Informações Básicas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Código */}
                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Código do Imóvel</label>
                  <input
                    type="text"
                    name="codigo"
                    readOnly
                    placeholder="(Gerado automaticamente)"
                    value={editingImovel ? editingImovel.codigo : "(Gerado automaticamente)"}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003]/60 bg-zinc-50 cursor-not-allowed"
                  />
                </div>

                {/* Tipo de Imóvel */}
                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Tipo do Imóvel *</label>
                  <select
                    name="tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoImovel)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white cursor-pointer"
                  >
                    <option value="CASA">Casa</option>
                    <option value="CONDOMINIO">Condomínio / Apartamento</option>
                    <option value="LOTE">Lote</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="RURAL">Rural</option>
                    <option value="KITNET">Kitnet</option>
                  </select>
                </div>

                {/* Proprietário (Locador) */}
                <div className="col-span-1 sm:col-span-2 p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-emerald-950">Proprietário (Locador)</label>
                    <button
                      type="button"
                      onClick={() => setShowNewLocadorModal(true)}
                      className="text-[10px] font-bold text-[#004777] hover:underline cursor-pointer bg-transparent border-0"
                    >
                      + Cadastrar Novo Proprietário
                    </button>
                  </div>
                  <select
                    value={proprietarioId}
                    onChange={(e) => setProprietarioId(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white cursor-pointer"
                  >
                    <option value="">Selecione um proprietário existente...</option>
                    {allLocadores.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nome} ({formatCpfCnpj(loc.cpfCnpj)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condomínio Association */}
                {tipo === "CONDOMINIO" && (
                  <div className="col-span-1 sm:col-span-2 p-4 bg-[#EEEEF3]/25 border border-zinc-150 rounded-2xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-[#280003]">Vincular a um Condomínio *</label>
                      <button
                        type="button"
                        onClick={() => setIsCreatingLoteamento(!isCreatingLoteamento)}
                        className="text-xs font-semibold text-[#004777] hover:underline cursor-pointer"
                      >
                        {isCreatingLoteamento ? "Buscar existente" : "Criar condomínio na hora"}
                      </button>
                    </div>

                    {isCreatingLoteamento ? (
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Nome do Condomínio ou Edifício *</label>
                          <input
                            type="text"
                            name="newLoteamentoNome"
                            placeholder="Nome do Novo Condomínio"
                            required={isCreatingLoteamento}
                            value={newLoteamentoNome}
                            onChange={(e) => setNewLoteamentoNome(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777]"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">A cidade e UF do formulário de endereço serão usadas para este condomínio.</p>
                        </div>

                        {/* Administradora */}
                        <div className="border-t border-zinc-200/60 pt-3 space-y-3">
                          <h5 className="text-[11px] font-bold uppercase text-[#280003]/60 tracking-wider">Administradora</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Nome da Administradora</label>
                              <input
                                type="text"
                                name="condAdminNome"
                                placeholder="Ex: Administradora Parra"
                                value={condAdminNome}
                                onChange={(e) => setCondAdminNome(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Telefone da Administradora</label>
                              <input
                                type="text"
                                name="condAdminTel"
                                placeholder="Ex: (18) 3743-1000"
                                value={condAdminTel}
                                onChange={(e) => setCondAdminTel(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">E-mail da Administradora</label>
                              <input
                                type="email"
                                name="condAdminEmail"
                                placeholder="Ex: contato@admin.com"
                                value={condAdminEmail}
                                onChange={(e) => setCondAdminEmail(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Site da Administradora</label>
                              <input
                                type="text"
                                name="condAdminSite"
                                placeholder="Ex: www.admin.com"
                                value={condAdminSite}
                                onChange={(e) => setCondAdminSite(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Síndico */}
                        <div className="border-t border-zinc-200/60 pt-3 space-y-3">
                          <h5 className="text-[11px] font-bold uppercase text-[#280003]/60 tracking-wider">Síndico</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Nome do Síndico</label>
                              <input
                                type="text"
                                name="condSindicoNome"
                                placeholder="Ex: João da Silva"
                                value={condSindicoNome}
                                onChange={(e) => setCondSindicoNome(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Telefone do Síndico</label>
                              <input
                                type="text"
                                name="condSindicoTel"
                                placeholder="Ex: (18) 99999-9999"
                                value={condSindicoTel}
                                onChange={(e) => setCondSindicoTel(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Outras Informações & Documentos */}
                        <div className="border-t border-zinc-200/60 pt-3 space-y-3">
                          <h5 className="text-[11px] font-bold uppercase text-[#280003]/60 tracking-wider">Outras Informações & Documentos</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Responsável pelo Pagamento</label>
                              <input
                                type="text"
                                name="condResponsavelPag"
                                placeholder="Ex: Proprietário / Imobiliária"
                                value={condResponsavelPag}
                                onChange={(e) => setCondResponsavelPag(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Data da Última Checagem</label>
                              <input
                                type="date"
                                name="condDataChecagem"
                                value={condDataChecagem}
                                onChange={(e) => setCondDataChecagem(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-[#280003] mb-1">Descrição dos Documentos Digitalizados</label>
                              <textarea
                                name="condDocDescricao"
                                placeholder="Ex: Convenção, regulamento interno, última ata de eleição de síndico..."
                                rows={2}
                                value={condDocDescricao}
                                onChange={(e) => setCondDocDescricao(e.target.value)}
                                className="block w-full border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <select
                        name="loteamentoId"
                        value={loteamentoId}
                        onChange={(e) => setLoteamentoId(e.target.value)}
                        className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white cursor-pointer"
                      >
                        <option value="">Selecione um condomínio existente...</option>
                        {loteamentos.map((lote) => (
                          <option key={lote.id} value={lote.id}>
                            {lote.nome} ({lote.cidade} - {lote.uf})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Seção 2: Endereço */}
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Endereço Completo</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* CEP */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">CEP *</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cep"
                      placeholder="00000-000"
                      required
                      maxLength={9}
                      value={cep}
                      onChange={handleCepChange(setCep)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white pr-9"
                    />
                    {isFetchingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Cidade */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Cidade *</label>
                  <input
                    type="text"
                    name="cidade"
                    placeholder="Ex: São Paulo"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>

                {/* UF */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">UF *</label>
                  <input
                    type="text"
                    name="uf"
                    placeholder="Ex: SP"
                    required
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>

                {/* Bairro */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Bairro *</label>
                  <input
                    type="text"
                    name="bairro"
                    placeholder="Ex: Jardim Paulista"
                    required
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>

                {/* Rua */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Rua *</label>
                  <input
                    type="text"
                    name="rua"
                    placeholder="Ex: Rua das Flores"
                    required
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>

                {/* Complemento */}
                <div className="col-span-3">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Complemento *</label>
                  <input
                    type="text"
                    name="complemento"
                    placeholder="Ex: Bloco 1, Casa 1"
                    required
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>

                {/* Número */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Número *</label>
                  <input
                    type="number"
                    name="numero"
                    ref={numeroInputRef}
                    placeholder="Ex: 15"
                    required
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Modalidades & Preços */}
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Modalidades de Comercialização</h4>

              <div className="flex flex-col sm:flex-row gap-6 p-4 bg-[#EEEEF3]/25 rounded-xl border border-zinc-100">
                {/* Option Venda */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="forVenda"
                    checked={forVenda}
                    onChange={(e) => setForVenda(e.target.checked)}
                    className="mt-0.5 h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-300 accent-[#004777]"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-[#280003]">Disponível para Venda</span>
                    <span className="text-xs text-[#280003]/50">Habilita o cadastro do preço total de venda.</span>
                  </div>
                </label>

                {/* Option Locação (Desabilitada para LOTES) */}
                <label className={`flex items-start gap-3 cursor-pointer select-none ${tipo === "LOTE" ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <input
                    type="checkbox"
                    name="forLocacao"
                    checked={forLocacao}
                    disabled={tipo === "LOTE"}
                    onChange={(e) => setForLocacao(e.target.checked)}
                    className="mt-0.5 h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-300 accent-[#004777]"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-[#280003]">
                      Disponível para Locação
                    </span>
                    {tipo === "LOTE" ? (
                      <span className="text-xs font-bold text-amber-600 block mt-0.5">
                        Indisponível para Loteamento (Lote)
                      </span>
                    ) : (
                      <span className="text-xs text-[#280003]/50">Habilita aluguel, condomínio e IPTU.</span>
                    )}
                  </div>
                </label>
              </div>

              {/* Dinamic price inputs rendering */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Preço de Venda */}
                {forVenda && (
                  <div className="border border-zinc-100 bg-[#EEEEF3]/10 p-4 rounded-xl space-y-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[#004777] font-semibold text-xs uppercase">
                      <DollarSign className="w-4 h-4" />
                      Finanças de Venda
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#280003] mb-1">Preço de Venda (R$) *</label>
                      <input
                        type="text"
                        name="valorVenda"
                        placeholder="0,00"
                        required={forVenda}
                        value={valorVenda}
                        onChange={handleCurrencyChange(setValorVenda)}
                        className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] placeholder-[#280003]/30 focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] transition-all bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Preço de Locação e Encargos */}
                {forLocacao && tipo !== "LOTE" && (
                  <div className="border border-zinc-200 bg-[#EEEEF3]/10 p-5 rounded-2xl space-y-6 col-span-1 sm:col-span-2 grid grid-cols-1 gap-6 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[#004777] font-bold text-sm uppercase border-b border-zinc-200 pb-2">
                      <Key className="w-5 h-5" />
                      Configurações Detalhadas de Locação
                    </div>

                    {/* Sub-seção: Valores Básicos */}
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Valores Básicos</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Valor Aluguel */}
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Valor do Aluguel (R$/mês) *</label>
                          <input
                            type="text"
                            name="valorAluguel"
                            placeholder="0,00"
                            required={forLocacao}
                            value={valorAluguel}
                            onChange={handleCurrencyChange(setValorAluguel)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        {/* Valor Condomínio */}
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Valor Condomínio (R$)</label>
                          <input
                            type="text"
                            name="valorCondominio"
                            placeholder="0,00"
                            value={valorCondominio}
                            onChange={handleCurrencyChange(setValorCondominio)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        {/* Valor IPTU */}
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Valor IPTU (R$)</label>
                          <input
                            type="text"
                            name="valorIPTU"
                            placeholder="0,00"
                            value={valorIPTU}
                            onChange={handleCurrencyChange(setValorIPTU)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Aluguel, Reajuste e Quebra */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Reajuste e Rescisão</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Índice de Reajuste</label>
                          <select
                            value={indiceReajuste}
                            onChange={(e) => setIndiceReajuste(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          >
                            <option value="IGP">IGP</option>
                            <option value="IGPM">IGPM</option>
                            <option value="INPC">INPC</option>
                            <option value="IPC">IPC</option>
                            <option value="IPC-DI">IPC-DI</option>
                            <option value="IPCA">IPCA</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Multa por Quebra (R$) *</label>
                          <input
                            type="text"
                            placeholder="Ex: 3.000,00"
                            required={forLocacao}
                            value={multaRescisao}
                            onChange={handleCurrencyChange(setMultaRescisao)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Quebra Vence em</label>
                          <input
                            type="date"
                            value={dataVenceQuebra}
                            onChange={(e) => setDataVenceQuebra(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Pontualidade */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Pontualidade</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Desconto Pontualidade (%)</label>
                          <input
                            type="text"
                            placeholder="Ex: 9,44"
                            value={descontoPontualidade}
                            onChange={(e) => setDescontoPontualidade(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Desc. até quantos dias antes? *</label>
                          <input
                            type="number"
                            required={forLocacao}
                            value={diasDescontoPontualidade}
                            onChange={(e) => setDiasDescontoPontualidade(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Multa e outros encargos */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Multas e Encargos de Atraso</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Multa por Atraso (%)</label>
                          <input
                            type="text"
                            placeholder="Ex: 10,00"
                            value={multaAtraso}
                            onChange={(e) => setMultaAtraso(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Cobrar multa após quantos dias? *</label>
                          <input
                            type="number"
                            required={forLocacao}
                            value={carenciaMulta}
                            onChange={(e) => setCarenciaMulta(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Juros Mensal pro-rata (%)</label>
                          <input
                            type="text"
                            placeholder="Ex: 1,00"
                            value={jurosMensal}
                            onChange={(e) => setJurosMensal(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Cobrar juros após quantos dias? *</label>
                          <input
                            type="number"
                            required={forLocacao}
                            value={carenciaJuros}
                            onChange={(e) => setCarenciaJuros(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Honorários Advocatícios (%)</label>
                          <input
                            type="text"
                            placeholder="Ex: 100,00"
                            value={honorariosAdv}
                            onChange={(e) => setHonorariosAdv(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Carência dos honorários (dias)</label>
                          <input
                            type="number"
                            value={carenciaHonorarios}
                            onChange={(e) => setCarenciaHonorarios(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Repasse */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Repasse e Garantia</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Carência Repasse (dias úteis/corridos) *</label>
                          <input
                            type="text"
                            required={forLocacao}
                            value={carenciaRepasse}
                            onChange={(e) => setCarenciaRepasse(e.target.value.replace(/\D/g, ""))}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Período Garantido *</label>
                          <select
                            value={periodoCarencia}
                            onChange={(e) => setPeriodoCarencia(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
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

                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-xs font-bold text-[#280003] mb-1">Abrangência da garantia do aluguel *</label>
                          <select
                            value={abrangenciaGarantia}
                            onChange={(e) => setAbrangenciaGarantia(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          >
                            <option value="SOMENTE_ALUGUEL">Somente o Aluguel</option>
                            <option value="ALUGUEL_LANCAMENTOS">Aluguel e demais lançamentos</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Administração */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Administração</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Taxa de Administração (%) *</label>
                          <input
                            type="text"
                            placeholder="Ex: 10,00"
                            required={forLocacao}
                            value={taxaAdministracao}
                            onChange={(e) => setTaxaAdministracao(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#280003] mb-1">Taxa sobre Multas e Encargos (%)</label>
                          <input
                            type="text"
                            placeholder="Ex: 50,00"
                            value={taxaMultasEncargos}
                            onChange={(e) => setTaxaMultasEncargos(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Retenção IRRF */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Retenção IRRF</h5>
                      <div>
                        <label className="block text-xs font-bold text-[#280003] mb-2">Responsabilidade de retenção</label>
                        <div className="flex flex-wrap gap-4">
                          {["LOCATARIO", "ADMINISTRADORA", "LOCADOR"].map((role) => (
                            <label key={role} className="flex items-center gap-2 text-sm font-medium text-[#280003] cursor-pointer">
                              <input
                                type="radio"
                                value={role}
                                checked={irrfResponsabilidade === role}
                                onChange={() => setIrrfResponsabilidade(role)}
                                className="h-4.5 w-4.5 text-[#004777] accent-[#004777]"
                              />
                              {role === "LOCATARIO" ? "Locatário" : role === "ADMINISTRADORA" ? "Administradora" : "Locador"}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sub-seção: Parcelas de Intermediação */}
                    <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                      <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider">Parcelas de Intermediação (apenas para conferência)</h5>

                      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#EEEEF3]/40 border-b border-zinc-200">
                            <tr>
                              <th className="px-4 py-2 font-bold text-[#280003]/60">Data</th>
                              <th className="px-4 py-2 font-bold text-[#280003]/60">Valor</th>
                              <th className="px-4 py-2 font-bold text-[#280003]/60 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-150">
                            {parcelasIntermediacao.map((p, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2">{p.data.split("-").reverse().join("/")}</td>
                                <td className="px-4 py-2">R$ {p.valor}</td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParcela(idx)}
                                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {parcelasIntermediacao.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-center text-[#280003]/40">Nenhuma parcela cadastrada.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Add installment inline inputs */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <div className="flex-1">
                          <input
                            type="date"
                            value={novaParcelaData}
                            onChange={(e) => setNovaParcelaData(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Valor (Ex: 1.050,00)"
                            value={novaParcelaValor}
                            onChange={(e) => setNovaParcelaValor(e.target.value)}
                            className="block w-full border border-zinc-200 rounded-xl px-3.5 py-1.5 text-xs text-[#280003] bg-white focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddParcela}
                          className="bg-[#004777] text-white px-4 py-1.5 rounded-xl hover:bg-[#003355] text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Adicionar Parcela
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Seção 4: Vitrine do Site Institucional */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#280003]/50">Vitrine do Site Institucional</h4>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEEEF3] hover:bg-[#EEEEF3]/80 text-[#280003] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs border border-zinc-200"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar Preview
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#EEEEF3]/25 rounded-xl border border-zinc-100">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="publicado"
                    checked={publicado}
                    onChange={(e) => setPublicado(e.target.checked)}
                    className="mt-0.5 h-4.5 w-4.5 text-[#004777] focus:ring-[#004777]/20 rounded border-zinc-300 accent-[#004777]"
                  />
                  <div>
                     <span className="block text-sm font-semibold text-[#280003]">Publicar imóvel no site institucional</span>
                     <span className="text-xs text-[#280003]/50">Habilita a exibição pública do imóvel na vitrine digital e buscas.</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-200/50">
                <label className="flex items-start gap-3 cursor-pointer select-none w-full">
                  <input
                    type="checkbox"
                    checked={precisaAtualizar}
                    onChange={(e) => setPrecisaAtualizar(e.target.checked)}
                    className="mt-0.5 h-4.5 w-4.5 text-amber-600 focus:ring-amber-500/20 rounded border-zinc-300 accent-amber-600"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Imóvel com pendência administrativa / sem proprietário
                    </span>
                    <span className="text-xs text-amber-700/85">
                      Mantém a sinalização de aviso no painel até que o proprietário e dados financeiros da locação sejam preenchidos.
                    </span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Título da Vitrine (Amigável) {publicado && "*"}</label>
                  <input
                    type="text"
                    name="titulo"
                    required={publicado}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Maravilhosa Casa de 3 Quartos com Área de Lazer"
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Descrição Pública {publicado && "*"}</label>
                  <textarea
                    name="descricao"
                    required={publicado}
                    rows={4}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva detalhadamente o imóvel para atrair clientes interessados no site..."
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Área Útil (m²) {publicado && "*"}</label>
                  <input
                    type="number"
                    name="area"
                    required={publicado}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Quantidade de Quartos</label>
                  <input
                    type="number"
                    name="quartos"
                    value={quartos}
                    onChange={(e) => setQuartos(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Quantidade de Banheiros</label>
                  <input
                    type="number"
                    name="banheiros"
                    value={banheiros}
                    onChange={(e) => setBanheiros(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#280003] mb-1.5">Vagas de Garagem</label>
                  <input
                    type="number"
                    name="vagas"
                    value={vagas}
                    onChange={(e) => setVagas(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-sm text-[#280003] bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>
              </div>

              {/* Gerenciador de Fotos da Vitrine */}
              <div className="space-y-3 pt-4 border-t border-zinc-200/60">
                <h5 className="text-xs font-bold uppercase text-[#280003]/60 tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#004777]" />
                  Fotos do Imóvel (Vitrine)
                </h5>

                {/* Upload Dropzone/File input */}
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed rounded-xl cursor-pointer bg-zinc-50 hover:bg-zinc-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin text-[#004777] mb-2" />
                          <p className="text-xs font-bold text-zinc-500">Enviando mídia para o storage...</p>
                        </>
                      ) : (
                        <>
                          <Plus className="w-8 h-8 text-zinc-450 mb-2" />
                          <p className="text-xs font-bold text-zinc-500">Clique para enviar fotos</p>
                          <p className="text-[10px] text-zinc-400 mt-1">PNG, JPG ou WEBP</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Photos Grid preview */}
                {imagens.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 pt-2">
                    {imagens.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 shadow-sm">
                        <img
                          src={url}
                          alt={`Imóvel foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(url)}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-all cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold py-1 text-center truncate">
                          Foto {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic text-center py-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                    Nenhuma imagem carregada para a vitrine.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:text-zinc-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? "Salvando..." : "Salvar Imóvel"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Real-time Property Card Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-zinc-150 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h4 className="font-bold text-sm text-[#280003] uppercase tracking-wider">Preview na Vitrine</h4>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-zinc-450 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rendering the original PropertyCard from public portal */}
            <PropertyCard
              property={{
                id: editingImovel?.id || "preview-id",
                title: titulo || "Imóvel Scatolin",
                type: tipo === "CASA" ? "Casa" : tipo === "CONDOMINIO" ? "Apartamento" : tipo === "LOTE" ? "Lote" : tipo === "COMERCIAL" ? "Comercial" : "Rural",
                price: forLocacao ? (valorAluguel ? parseFloat(valorAluguel) : 0) : (valorVenda ? parseFloat(valorVenda) : 0),
                operation: forLocacao ? "locacao" : "venda",
                beds: parseInt(quartos) || 0,
                baths: parseInt(banheiros) || 0,
                parking: parseInt(vagas) || 0,
                area: parseInt(area) || 0,
                image: imagens[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                images: imagens,
                description: descricao || "Nenhuma descrição adicional fornecida.",
                neighborhood: bairro || "Bairro",
                city: `${cidade || "Cidade"}/${uf || "UF"}`
              }}
            />
          </div>
        </div>
      )}

      {/* Sub-modal para Cadastrar Novo Proprietário */}
      {showNewLocadorModal && (
        <div className="fixed inset-0 bg-[#280003]/40 z-[100] backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 transform transition-all duration-300 scale-100 animate-scale-up space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200">
              <h4 className="font-bold text-sm text-[#280003]">Cadastrar Novo Proprietário</h4>
              <button 
                type="button" 
                onClick={() => setShowNewLocadorModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLocador} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#280003] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newLocadorNome}
                  onChange={(e) => setNewLocadorNome(e.target.value)}
                  className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                  placeholder="Nome do Proprietário"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#280003] mb-1">CPF / CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={newLocadorCpf}
                    onChange={(e) => setNewLocadorCpf(formatCpfCnpj(e.target.value))}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                    placeholder="Somente números"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#280003] mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newLocadorTelefone}
                    onChange={(e) => setNewLocadorTelefone(e.target.value)}
                    className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#280003] mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newLocadorEmail}
                  onChange={(e) => setNewLocadorEmail(e.target.value)}
                  className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="border-t border-zinc-150 pt-2 space-y-2">
                <span className="block font-bold text-[10px] text-gray-400 uppercase">Endereço</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#280003] mb-1">CEP</label>
                    <input
                      type="text"
                      value={newLocadorCep}
                      onChange={(e) => setNewLocadorCep(formatCEP(e.target.value))}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-[#280003] mb-1">Logradouro / Rua</label>
                    <input
                      type="text"
                      value={newLocadorLogradouro}
                      onChange={(e) => setNewLocadorLogradouro(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                      placeholder="Av / Rua..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#280003] mb-1">Número</label>
                    <input
                      type="text"
                      value={newLocadorNumero}
                      onChange={(e) => setNewLocadorNumero(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                      placeholder="Nº"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#280003] mb-1">Bairro</label>
                    <input
                      type="text"
                      value={newLocadorBairro}
                      onChange={(e) => setNewLocadorBairro(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#280003] mb-1">Cidade</label>
                    <input
                      type="text"
                      value={newLocadorCidade}
                      onChange={(e) => setNewLocadorCidade(e.target.value)}
                      className="block w-full border border-zinc-200 rounded-xl px-3.5 py-2 text-xs text-[#280003] focus:outline-none focus:ring-2 focus:ring-[#004777]/20 focus:border-[#004777] bg-white"
                      placeholder="Cidade"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowNewLocadorModal(false)}
                  className="px-3.5 py-1.5 text-zinc-550 hover:bg-zinc-50 rounded-lg transition-all font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#004777] text-white rounded-lg transition-all font-bold hover:bg-[#003355] cursor-pointer"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
