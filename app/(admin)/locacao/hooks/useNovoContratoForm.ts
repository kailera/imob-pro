import { useState, useEffect } from 'react';
import { createLocatario, updateLocatario, updateLocador, updateImovel, searchImovelWithResolution, createContratoLocacao } from '@/app/(admin)/contratos/actions';
import { getImoveis } from '@/app/actions/imoveisActions';
import {
  cleanCurrency,
  sanitizePercent,
  serializeEndereco,
  serializeEnderecoLegacy,
  serializeTelefoneLegacy,
  valorPorExtenso
} from '../utils/formatters';
import {
  calcularDataLimiteDesconto,
  calcularDescontoPontualidade,
  criarDataVencimento,
  formatarMoeda,
  formatarPercentual,
  parseNumeroFlexivel,
} from '@/lib/locacao/financeiro';

interface UseNovoContratoFormProps {
  isOpen: boolean;
  initialLocatarios: any[];
  initialFiadores: any[];
  allLocador: any[];
  templates: any[];
  onSuccess: (newContract: any, contractFields: Record<string, string>, templateId: string) => void;
  onClose: () => void;
}

export function useNovoContratoForm({
  isOpen,
  initialLocatarios,
  initialFiadores,
  allLocador,
  templates,
  onSuccess,
  onClose
}: UseNovoContratoFormProps) {
  // ── ESTADOS DO MODAL ──
  const [modalView, setModalView] = useState<'MAIN' | 'CREATE_TENANT' | 'EDIT_TENANT' | 'EDIT_LANDLORD' | 'EDIT_PROPERTY'>('MAIN');
  const [isSavingLocatario, setIsSavingLocatario] = useState(false);
  const [isSavingLocador, setIsSavingLocador] = useState(false);
  const [isSavingImovel, setIsSavingImovel] = useState(false);

  // ── ESTADOS DE EDIÇÃO E ANEXOS ──
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  
  const [editingLocadorId, setEditingLocadorId] = useState<string | null>(null);
  const [locadorNome, setLocadorNome] = useState('');
  const [locadorCpf, setLocadorCpf] = useState('');
  const [locadorEmail, setLocadorEmail] = useState('');
  const [locadorTelefone, setLocadorTelefone] = useState('');
  const [locadorCep, setLocadorCep] = useState('');
  const [locadorLogradouro, setLocadorLogradouro] = useState('');
  const [locadorNumero, setLocadorNumero] = useState('');
  const [locadorComplemento, setLocadorComplemento] = useState('');
  const [locadorBairro, setLocadorBairro] = useState('');
  const [locadorCidade, setLocadorCidade] = useState('');
  const [locadorEstado, setLocadorEstado] = useState('');
  const [locadorDataNasc, setLocadorDataNasc] = useState('');
  const [locadorRg, setLocadorRg] = useState('');
  const [locadorOrgao, setLocadorOrgao] = useState('');
  const [locadorEstadoCivil, setLocadorEstadoCivil] = useState('solteiro(a)');
  const [locadorProfissao, setLocadorProfissao] = useState('');
  const [locadorNacionalidade, setLocadorNacionalidade] = useState('brasileiro(a)');
  const [locadorGenero, setLocadorGenero] = useState('masculino');

  const [editingImovelId, setEditingImovelId] = useState<string | null>(null);
  const [imovelTipo, setImovelTipo] = useState('CASA');
  const [imovelCep, setImovelCep] = useState('');
  const [imovelCidade, setImovelCidade] = useState('');
  const [imovelUf, setImovelUf] = useState('');
  const [imovelBairro, setImovelBairro] = useState('');
  const [imovelNumero, setImovelNumero] = useState('');
  const [imovelArea, setImovelArea] = useState('');

  const [tenantUploadedDocs, setTenantUploadedDocs] = useState<{ descricao: string; url: string }[]>([]);
  const [contractUploadedDocs, setContractUploadedDocs] = useState<{ descricao: string; url: string }[]>([]);

  // Dados atualizados localmente caso o usuário crie um novo na hora
  const [locatarios, setLocatarios] = useState(initialLocatarios);
  const [fiadores, setFiadores] = useState(initialFiadores);
  const [dbImoveis, setDbImoveis] = useState<any[]>([]);

  // ── ESTADOS DO FORMULÁRIO PRINCIPAL ──
  const [selectedInquilinoIndex, setSelectedInquilinoIndex] = useState<string>('');
  const [selectedProprietarioIndex, setSelectedProprietarioIndex] = useState<string>('');
  const [selectedFiadorIndex, setSelectedFiadorIndex] = useState<string>('');
  const [selectedImovelId, setSelectedImovelId] = useState<string>('');
  const [selectedTemplateIdForNew, setSelectedTemplateIdForNew] = useState<string>('res-simples');

  const [customAluguel, setCustomAluguel] = useState<string>('');
  const [customCondominio, setCustomCondominio] = useState<string>('');
  const [customIptu, setCustomIptu] = useState<string>('');
  const [leasePrazo, setLeasePrazo] = useState<string>('36');
  const [leaseVencimento, setLeaseVencimento] = useState<string>('10');
  const [leaseDataInicio, setLeaseDataInicio] = useState<string>('');

  // ── ESTADOS DE PESQUISA DE IMÓVEL ──
  const [imovelSearchQuery, setImovelSearchQuery] = useState('');
  const [imovelSearchResults, setImovelSearchResults] = useState<any[]>([]);
  const [selectedImovelData, setSelectedImovelData] = useState<any | null>(null);
  const [resolvedLandlord, setResolvedLandlord] = useState<any | null>(null);
  const [vistoriaStatus, setVistoriaStatus] = useState<string>('');

  // ── ESTADOS DO NOVO INQUILINO (LOCATÁRIO) ──
  const [tenantNome, setTenantNome] = useState('');
  const [tenantCpf, setTenantCpf] = useState('');
  const [tenantRg, setTenantRg] = useState('');
  const [tenantOrgao, setTenantOrgao] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  
  // Suporte a múltiplos telefones
  const [tenantTelefonesList, setTenantTelefonesList] = useState<{ tipo: string; numero: string; observacao?: string }[]>([
    { tipo: 'celular', numero: '' }
  ]);
  const [tenantTelefone, setTenantTelefone] = useState(''); // Keep as placeholder/fallback
  
  const [tenantCep, setTenantCep] = useState('');
  const [tenantLogradouro, setTenantLogradouro] = useState('');
  const [tenantNumero, setTenantNumero] = useState('');
  const [tenantComplemento, setTenantComplemento] = useState('');
  const [tenantBairro, setTenantBairro] = useState('');
  const [tenantCidade, setTenantCidade] = useState('');
  const [tenantEstado, setTenantEstado] = useState('');
  const [tenantDataNasc, setTenantDataNasc] = useState('');
  const [tenantEstadoCivil, setTenantEstadoCivil] = useState('solteiro(a)');
  const [tenantProfissao, setTenantProfissao] = useState('');
  const [tenantNacionalidade, setTenantNacionalidade] = useState('brasileiro(a)');
  const [tenantGenero, setTenantGenero] = useState('masculino');
  const [tenantRendaMensal, setTenantRendaMensal] = useState('');
  const [tenantRne, setTenantRne] = useState('');

  // Dados do Cônjuge
  const [conjugeNome, setConjugeNome] = useState('');
  const [conjugeCpf, setConjugeCpf] = useState('');
  const [conjugeRg, setConjugeRg] = useState('');
  const [conjugeOrgao, setConjugeOrgao] = useState('');
  const [conjugeEmail, setConjugeEmail] = useState('');
  const [conjugeDataNasc, setConjugeDataNasc] = useState('');
  const [conjugeProfissao, setConjugeProfissao] = useState('');
  const [conjugeRendaMensal, setConjugeRendaMensal] = useState('');
  const [conjugeNacionalidade, setConjugeNacionalidade] = useState('brasileira');
  const [conjugeRne, setConjugeRne] = useState('');
  const [conjugeTelefonesList, setConjugeTelefonesList] = useState<{ tipo: string; numero: string; observacao?: string }[]>([
    { tipo: 'celular', numero: '' }
  ]);

  // Documentos digitalizados (Urls do S3)
  const [docPessoalUrl, setDocPessoalUrl] = useState('');
  const [comprovanteResidenciaUrl, setComprovanteResidenciaUrl] = useState('');
  const [holeriteConjugeUrl, setHoleriteConjugeUrl] = useState('');
  const [holerite1NilsonUrl, setHolerite1NilsonUrl] = useState('');
  const [holerite2NilsonUrl, setHolerite2NilsonUrl] = useState('');

  // ── ESTADOS DO NOVO FIADOR ──
  const [addFiador, setAddFiador] = useState(false);
  const [pendingFiadorData, setPendingFiadorData] = useState<any | null>(null);
  const [fiadorNome, setFiadorNome] = useState('');
  const [fiadorCpf, setFiadorCpf] = useState('');
  const [fiadorRg, setFiadorRg] = useState('');
  const [fiadorOrgao, setFiadorOrgao] = useState('');
  const [fiadorEmail, setFiadorEmail] = useState('');
  const [fiadorTelefone, setFiadorTelefone] = useState('');
  const [fiadorCep, setFiadorCep] = useState('');
  const [fiadorLogradouro, setFiadorLogradouro] = useState('');
  const [fiadorNumero, setFiadorNumero] = useState('');
  const [fiadorComplemento, setFiadorComplemento] = useState('');
  const [fiadorBairro, setFiadorBairro] = useState('');
  const [fiadorCidade, setFiadorCidade] = useState('');
  const [fiadorEstado, setFiadorEstado] = useState('');
  const [fiadorDataNasc, setFiadorDataNasc] = useState('');
  const [fiadorEstadoCivil, setFiadorEstadoCivil] = useState('solteiro(a)');
  const [fiadorProfissao, setFiadorProfissao] = useState('');
  const [fiadorNacionalidade, setFiadorNacionalidade] = useState('brasileiro(a)');
  const [fiadorGenero, setFiadorGenero] = useState('masculino');

  // ── ESTADOS ADICIONAIS DO CONTRATO ──
  const [descontoPontualidade, setDescontoPontualidade] = useState<string>('');
  const [validadeDescontoPontualidade, setValidadeDescontoPontualidade] = useState<string>('');
  const [multaQuebraContrato, setMultaQuebraContrato] = useState<string>('');
  const [tipoMultaQuebra, setTipoMultaQuebra] = useState<'PERCENTUAL' | 'MESES'>('PERCENTUAL');
  const [tipoDescontoPontualidade, setTipoDescontoPontualidade] = useState<'PERCENTUAL' | 'VALOR'>('PERCENTUAL');
  const [quebraContratoVenceEm, setQuebraContratoVenceEm] = useState<string>('');
  const [multaAtraso, setMultaAtraso] = useState<string>('');
  const [cobrancaAposDias, setCobrancaAposDias] = useState<string>('');
  const [multaJurosMensal, setMultaJurosMensal] = useState<string>('');
  const [cobrancaAposDiasJuros, setCobrancaAposDiasJuros] = useState<string>('');
  const [honorarios, setHonorarios] = useState<string>('');
  const [carenciaDiasCorridos, setCarenciaDiasCorridos] = useState<string>('');
  const [periodoCarencia, setPeriodoCarencia] = useState<string>('NAO_GARANTIR');
  const [abrangenciaGarantia, setAbrangenciaGarantia] = useState<string>('SOMENTE_ALUGUEL');
  const [periodicidadeReajuste, setPeriodicidadeReajuste] = useState<string>('12');
  const [indiceReajuste, setIndiceReajuste] = useState<string>('IGPM');

  // Novos campos adicionais
  const [taxaAdministracao, setTaxaAdministracao] = useState<string>('10,00');
  const [taxaMultasEncargos, setTaxaMultasEncargos] = useState<string>('50,00');
  const [taxaIntermediacao, setTaxaIntermediacao] = useState<string>('100,00');
  const [irrfResponsabilidade, setIrrfResponsabilidade] = useState<string>('LOCADOR');
  const [carenciaRepasse, setCarenciaRepasse] = useState<string>('10');
  const [carenciaHonorarios, setCarenciaHonorarios] = useState<string>('90');

  // Primeiro período de cobrança / vencimento em aberto
  const [inicioPrimeiroPeriodo, setInicioPrimeiroPeriodo] = useState<string>('');
  const [fimPrimeiroPeriodo, setFimPrimeiroPeriodo] = useState<string>('');
  const [vencimentoPrimeiroPeriodo, setVencimentoPrimeiroPeriodo] = useState<string>('');

  // Sync initial lists
  useEffect(() => {
    setLocatarios(initialLocatarios);
  }, [initialLocatarios]);

  useEffect(() => {
    setFiadores(initialFiadores);
  }, [initialFiadores]);

  // Efeito ao abrir
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setLeaseDataInicio(`${yyyy}-${mm}-${dd}`);

      getImoveis().then(res => {
        if (res.success && res.data) setDbImoveis(res.data);
      });
    }
  }, [isOpen]);

  const handlePropertySearch = async (val: string) => {
    setImovelSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setImovelSearchResults([]);
      return;
    }
    try {
      const res = await searchImovelWithResolution(val);
      if (res.success && res.data) setImovelSearchResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSearchedProperty = (imovel: any) => {
    setSelectedImovelId(imovel.id);
    setSelectedImovelData(imovel);
    setImovelSearchQuery(`${imovel.codigo} - ${imovel.bairro}, ${imovel.cidade}`);
    setImovelSearchResults([]);

    setCustomAluguel(imovel.valorAluguel ? String(imovel.valorAluguel / 100) : '0');
    setCustomCondominio(imovel.valorCondominio ? String(imovel.valorCondominio / 100) : '0');
    setCustomIptu(imovel.valorIPTU ? String(imovel.valorIPTU / 100) : '0');

    if (imovel.imovelLocacaos && imovel.imovelLocacaos.length > 0) {
      const activeLocacao = imovel.imovelLocacaos[0];
      if (activeLocacao.locadors && activeLocacao.locadors.length > 0) {
        setResolvedLandlord(activeLocacao.locadors[0]);
        setSelectedProprietarioIndex(activeLocacao.locadors[0].id);
      } else if (imovel.aluguelDados && imovel.aluguelDados.proprietario) {
        setResolvedLandlord(imovel.aluguelDados.proprietario);
        setSelectedProprietarioIndex(imovel.aluguelDados.proprietario.id);
      }
    } else if (imovel.aluguelDados && imovel.aluguelDados.proprietario) {
      setResolvedLandlord(imovel.aluguelDados.proprietario);
      setSelectedProprietarioIndex(imovel.aluguelDados.proprietario.id);
    }

    if (imovel.aluguelDados) {
      const d = imovel.aluguelDados;
      if (d.indiceReajuste) setIndiceReajuste(d.indiceReajuste);
      if (d.descontoPontualidade) setDescontoPontualidade(d.descontoPontualidade);
      if (d.diasDescontoPontualidade) setValidadeDescontoPontualidade(d.diasDescontoPontualidade);
      if (d.multaRescisao || d.multaQuebraValor) setMultaQuebraContrato(d.multaRescisao || d.multaQuebraValor);
      if (d.dataVenceQuebra) setQuebraContratoVenceEm(d.dataVenceQuebra);
      if (d.multaAtraso) setMultaAtraso(d.multaAtraso);
      if (d.carenciaMulta) setCobrancaAposDias(d.carenciaMulta);
      if (d.jurosMensal) setMultaJurosMensal(d.jurosMensal);
      if (d.carenciaJuros) setCobrancaAposDiasJuros(d.carenciaJuros);
      if (d.honorariosAdv) setHonorarios(d.honorariosAdv);
      if (d.carenciaHonorarios) setCarenciaHonorarios(d.carenciaHonorarios);
      if (d.periodoCarencia) setPeriodoCarencia(d.periodoCarencia);
      if (d.abrangenciaGarantia) setAbrangenciaGarantia(d.abrangenciaGarantia);

      if (d.taxaAdministracao) setTaxaAdministracao(d.taxaAdministracao);
      if (d.taxaMultasEncargos) setTaxaMultasEncargos(d.taxaMultasEncargos);
      if (d.taxaIntermediacao) setTaxaIntermediacao(d.taxaIntermediacao);
      if (d.irrfResponsabilidade) setIrrfResponsabilidade(d.irrfResponsabilidade);
      if (d.carenciaRepasse) setCarenciaRepasse(d.carenciaRepasse);
    }

    if (imovel.vistorias && imovel.vistorias.length > 0) {
      const latestVistoria = imovel.vistorias[0];
      setVistoriaStatus(`Última vistoria: ${latestVistoria.codigo} (${latestVistoria.tipo}) - Status: ${latestVistoria.status}`);
    } else {
      setVistoriaStatus('Nenhuma vistoria encontrada para este imóvel.');
    }
  };

  const handleCreateTenantAndFiador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantNome || !tenantCpf || !tenantEmail) {
      alert("Por favor, preencha nome, CPF e e-mail do inquilino.");
      return;
    }

    setIsSavingLocatario(true);
    try {
      const isCasado = tenantEstadoCivil.toLowerCase().includes('casado');

      const locatarioPayload = {
        nome: tenantNome,
        cpfCnpj: tenantCpf,
        telefone: tenantTelefonesList.filter(t => t.numero.trim() !== ''),
        email: tenantEmail,
        endereco: serializeEndereco(tenantCep, tenantLogradouro, tenantNumero, tenantComplemento, tenantBairro, tenantCidade, tenantEstado),
        dataNasc: tenantDataNasc,
        rg: tenantRg,
        orgaoEmissor: tenantOrgao,
        estadoCivil: tenantEstadoCivil,
        profissao: tenantProfissao,
        nacionalidade: tenantNacionalidade,
        genero: tenantGenero,
        rendaMensal: cleanCurrency(tenantRendaMensal),
        rne: tenantRne || null,

        // Dados do cônjuge se casado
        conjugeNome: isCasado ? conjugeNome : null,
        conjugeCpf: isCasado ? conjugeCpf : null,
        conjugeRg: isCasado ? conjugeRg : null,
        conjugeOrgaoEmissor: isCasado ? conjugeOrgao : null,
        conjugeEmail: isCasado ? conjugeEmail : null,
        conjugeDataNasc: isCasado ? conjugeDataNasc : null,
        conjugeProfissao: isCasado ? conjugeProfissao : null,
        conjugeRendaMensal: isCasado ? cleanCurrency(conjugeRendaMensal) : null,
        conjugeNacionalidade: isCasado ? conjugeNacionalidade : null,
        conjugeRne: isCasado ? conjugeRne : null,
        conjugeTelefone: isCasado ? conjugeTelefonesList.filter(t => t.numero.trim() !== '') : null,

        // Documentação
        documentoUrl: {
          docPessoal: docPessoalUrl || null,
          comprovanteResidencia: comprovanteResidenciaUrl || null,
          holeriteConjuge: isCasado ? holeriteConjugeUrl : null,
          holerite1Nilson: holerite1NilsonUrl || null,
          holerite2Nilson: holerite2NilsonUrl || null
        }
      };
      
      const res = editingTenantId
        ? await updateLocatario(editingTenantId, locatarioPayload as any)
        : await createLocatario(locatarioPayload as any);

      if (res.success && res.data) {
        const newLoc = res.data;
        if (editingTenantId) {
          setLocatarios(prev => prev.map(l => l.id === newLoc.id ? newLoc : l));
        } else {
          setLocatarios(prev => [newLoc, ...prev]);
        }

        if (addFiador) {
          const fiadorPayload = {
            nome: fiadorNome,
            cpfCnpj: fiadorCpf,
            telefone: serializeTelefoneLegacy(fiadorTelefone),
            email: fiadorEmail,
            endereco: serializeEnderecoLegacy(fiadorCep, fiadorLogradouro, fiadorNumero, fiadorComplemento, fiadorBairro, fiadorCidade, fiadorEstado),
            dataNasc: fiadorDataNasc,
            rg: fiadorRg,
            orgaoEmissor: fiadorOrgao,
            estadoCivil: fiadorEstadoCivil,
            profissao: fiadorProfissao,
            nacionalidade: fiadorNacionalidade,
            genero: fiadorGenero,
          };
          setPendingFiadorData(fiadorPayload);
        } else {
          setPendingFiadorData(null);
        }

        setSelectedInquilinoIndex(newLoc.id);
        setModalView('MAIN');
        setEditingTenantId(null);

        // Reset tenant form
        setTenantNome(''); setTenantCpf(''); setTenantRg(''); setTenantOrgao(''); setTenantEmail(''); setTenantTelefone('');
        setTenantCep(''); setTenantLogradouro(''); setTenantNumero(''); setTenantComplemento(''); setTenantBairro(''); setTenantCidade(''); setTenantEstado('');
        setTenantDataNasc(''); setTenantEstadoCivil('solteiro(a)'); setTenantProfissao(''); setTenantNacionalidade('brasileiro(a)'); setTenantGenero('masculino');
        setTenantRendaMensal(''); setTenantRne('');
        setTenantTelefonesList([{ tipo: 'celular', numero: '' }]);

        // Reset spouse
        setConjugeNome(''); setConjugeCpf(''); setConjugeRg(''); setConjugeOrgao(''); setConjugeEmail(''); setConjugeDataNasc('');
        setConjugeProfissao(''); setConjugeRendaMensal(''); setConjugeNacionalidade('brasileira'); setConjugeRne('');
        setConjugeTelefonesList([{ tipo: 'celular', numero: '' }]);

        // Reset docs
        setDocPessoalUrl(''); setComprovanteResidenciaUrl(''); setHoleriteConjugeUrl(''); setHolerite1NilsonUrl(''); setHolerite2NilsonUrl('');

        setAddFiador(false);
        // Reset fiador form
        setFiadorNome(''); setFiadorCpf(''); setFiadorRg(''); setFiadorOrgao(''); setFiadorEmail(''); setFiadorTelefone('');
        setFiadorCep(''); setFiadorLogradouro(''); setFiadorNumero(''); setFiadorComplemento(''); setFiadorBairro(''); setFiadorCidade(''); setFiadorEstado('');
        setFiadorDataNasc(''); setFiadorEstadoCivil('solteiro(a)'); setFiadorProfissao(''); setFiadorNacionalidade('brasileiro(a)'); setFiadorGenero('masculino');
      } else {
        alert("Erro ao salvar inquilino: " + res.error);
      }
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar inquilino: " + e.message);
    } finally {
      setIsSavingLocatario(false);
    }
  };

  const startEditTenant = () => {
    if (!selectedInquilinoIndex) return;
    const t = locatarios.find(i => i.id === selectedInquilinoIndex);
    if (!t) return;

    setEditingTenantId(t.id);
    setTenantNome(t.nome || '');
    setTenantCpf(t.cpfCnpj || '');
    setTenantRg(t.rg || '');
    setTenantOrgao(t.orgaoEmissor || '');
    setTenantEmail(t.email || '');

    // parse telefone
    if (t.telefone) {
      try {
        const telList = typeof t.telefone === 'string' ? JSON.parse(t.telefone) : t.telefone;
        if (Array.isArray(telList)) {
          setTenantTelefonesList(telList);
        }
      } catch (e) {
        setTenantTelefonesList([{ tipo: 'celular', numero: t.telefone.toString() }]);
      }
    }

    // parse endereco
    if (t.endereco) {
      try {
        const addr = typeof t.endereco === 'string' ? JSON.parse(t.endereco) : t.endereco;
        setTenantCep(addr.cep || '');
        setTenantLogradouro(addr.logradouro || '');
        setTenantNumero(addr.numero || '');
        setTenantComplemento(addr.complemento || '');
        setTenantBairro(addr.bairro || '');
        setTenantCidade(addr.municipio || addr.cidade || '');
        setTenantEstado(addr.estado || '');
      } catch (e) {
        setTenantLogradouro(t.endereco.toString());
      }
    }

    setTenantDataNasc(t.dataNasc || '');
    setTenantEstadoCivil(t.estadoCivil || 'solteiro(a)');
    setTenantProfissao(t.profissao || '');
    setTenantNacionalidade(t.nacionalidade || 'brasileiro(a)');
    setTenantGenero(t.genero || 'masculino');
    setTenantRendaMensal(t.rendaMensal ? String(t.rendaMensal) : '');
    setTenantRne(t.rne || '');

    setConjugeNome(t.conjugeNome || '');
    setConjugeCpf(t.conjugeCpf || '');
    setConjugeRg(t.conjugeRg || '');
    setConjugeOrgao(t.conjugeOrgaoEmissor || '');
    setConjugeEmail(t.conjugeEmail || '');
    setConjugeDataNasc(t.conjugeDataNasc || '');
    setConjugeProfissao(t.conjugeProfissao || '');
    setConjugeRendaMensal(t.conjugeRendaMensal ? String(t.conjugeRendaMensal) : '');
    setConjugeNacionalidade(t.conjugeNacionalidade || 'brasileira');
    setConjugeRne(t.conjugeRne || '');
    if (t.conjugeTelefone) {
      try {
        const ctelList = typeof t.conjugeTelefone === 'string' ? JSON.parse(t.conjugeTelefone) : t.conjugeTelefone;
        if (Array.isArray(ctelList)) {
          setConjugeTelefonesList(ctelList);
        }
      } catch (e) {}
    }

    if (t.documentoUrl) {
      try {
        const d = typeof t.documentoUrl === 'string' ? JSON.parse(t.documentoUrl) : t.documentoUrl;
        setDocPessoalUrl(d.docPessoal || '');
        setComprovanteResidenciaUrl(d.comprovanteResidencia || '');
        setHoleriteConjugeUrl(d.holeriteConjuge || '');
        setHolerite1NilsonUrl(d.holerite1Nilson || '');
        setHolerite2NilsonUrl(d.holerite2Nilson || '');
      } catch (e) {}
    }

    setModalView('EDIT_TENANT');
  };

  const startEditLocador = () => {
    if (!resolvedLandlord) return;
    const l = resolvedLandlord;
    setEditingLocadorId(l.id);
    setLocadorNome(l.nome || '');
    setLocadorCpf(l.cpfCnpj || '');
    setLocadorEmail(l.email || '');
    setLocadorDataNasc(l.dataNasc || '');
    setLocadorRg(l.rg || '');
    setLocadorOrgao(l.orgaoEmissor || '');
    setLocadorEstadoCivil(l.estadoCivil || 'solteiro(a)');
    setLocadorProfissao(l.profissao || '');
    setLocadorNacionalidade(l.nacionalidade || 'brasileiro(a)');
    setLocadorGenero(l.genero || 'masculino');

    let tel = '';
    if (l.telefone) {
      try {
        const parsed = typeof l.telefone === 'string' ? JSON.parse(l.telefone) : l.telefone;
        tel = Array.isArray(parsed) ? parsed[0] || '' : parsed;
      } catch (e) {
        tel = l.telefone.toString();
      }
    }
    setLocadorTelefone(tel);

    if (l.endereco) {
      try {
        const parsed = typeof l.endereco === 'string' ? JSON.parse(l.endereco) : l.endereco;
        const addr = Array.isArray(parsed) ? parsed[0] : parsed;
        setLocadorCep(addr.cep || '');
        setLocadorLogradouro(addr.logradouro || '');
        setLocadorNumero(addr.numero || '');
        setLocadorComplemento(addr.complemento || '');
        setLocadorBairro(addr.bairro || '');
        setLocadorCidade(addr.municipio || addr.cidade || '');
        setLocadorEstado(addr.estado || '');
      } catch (e) {
        setLocadorLogradouro(l.endereco.toString());
      }
    }

    setModalView('EDIT_LANDLORD');
  };

  const handleUpdateLocador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocadorId || !locadorNome) return;
    setIsSavingLocador(true);
    try {
      const payload = {
        nome: locadorNome,
        cpfCnpj: locadorCpf,
        email: locadorEmail,
        telefone: [locadorTelefone],
        endereco: [serializeEndereco(locadorCep, locadorLogradouro, locadorNumero, locadorComplemento, locadorBairro, locadorCidade, locadorEstado)],
        dataNasc: locadorDataNasc,
        rg: locadorRg,
        orgaoEmissor: locadorOrgao,
        estadoCivil: locadorEstadoCivil,
        profissao: locadorProfissao,
        nacionalidade: locadorNacionalidade,
        genero: locadorGenero,
      };
      const res = await updateLocador(editingLocadorId, payload);
      if (res.success && res.data) {
        setResolvedLandlord(res.data);
        setModalView('MAIN');
      } else {
        alert("Erro ao atualizar locador: " + res.error);
      }
    } catch (err: any) {
      alert("Erro ao atualizar locador: " + err.message);
    } finally {
      setIsSavingLocador(false);
    }
  };

  const startEditImovel = () => {
    const imovel = dbImoveis.find(i => i.id === selectedImovelId) || selectedImovelData;
    if (!imovel) return;
    setEditingImovelId(imovel.id);
    setImovelTipo(imovel.tipo || 'CASA');
    setImovelCep(imovel.cep ? String(imovel.cep) : '');
    setImovelCidade(imovel.cidade || '');
    setImovelUf(imovel.uf || '');
    setImovelBairro(imovel.bairro || '');
    setImovelNumero(imovel.numero ? String(imovel.numero) : '');
    setImovelArea(imovel.area ? String(imovel.area) : '');

    setModalView('EDIT_PROPERTY');
  };

  const handleUpdateImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImovelId) return;
    setIsSavingImovel(true);
    try {
      const payload = {
        tipo: imovelTipo,
        cep: imovelCep,
        cidade: imovelCidade,
        uf: imovelUf,
        bairro: imovelBairro,
        numero: imovelNumero,
        area: imovelArea,
        valorAluguel: customAluguel,
        valorCondominio: customCondominio,
        valorIPTU: customIptu
      };
      const res = await updateImovel(editingImovelId, payload);
      if (res.success && res.data) {
        const updated = res.data;
        setDbImoveis(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
        if (selectedImovelData && selectedImovelData.id === updated.id) {
          setSelectedImovelData((prev: any) => ({ ...prev, ...updated }));
        }
        setModalView('MAIN');
      } else {
        alert("Erro ao atualizar imóvel: " + res.error);
      }
    } catch (err: any) {
      alert("Erro ao atualizar imóvel: " + err.message);
    } finally {
      setIsSavingImovel(false);
    }
  };

  const handleGenerateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquilinoIndex || !selectedImovelId) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const inquilino = locatarios.find((i) => i.id === selectedInquilinoIndex);
    const imovel = dbImoveis.find(i => i.id === selectedImovelId) || selectedImovelData;
    const template = templates.find(t => t.id === selectedTemplateIdForNew) || templates[0];

    let proprietario = resolvedLandlord;
    if (!proprietario && selectedProprietarioIndex) {
      proprietario = allLocador?.find(p => p.id === selectedProprietarioIndex);
    }
    if (!proprietario) {
      proprietario = allLocador?.[0]; // fallback
    }

    let fiador = pendingFiadorData;
    if (!fiador && selectedFiadorIndex) {
      fiador = fiadores.find(f => f.id === selectedFiadorIndex);
    }

    if (!inquilino || !imovel) return;

    // Calculate dates
    const start = new Date(leaseDataInicio + 'T12:00:00');
    const months = Number(leasePrazo) || 36;
    const end = new Date(start);
    end.setMonth(start.getMonth() + months);

    const dataInicioStr = start.toLocaleDateString('pt-BR');
    const dataFimStr = end.toLocaleDateString('pt-BR');

    const aluguelNum = parseNumeroFlexivel(customAluguel) || 0;
    const descontoInformado = parseNumeroFlexivel(descontoPontualidade) || 0;
    const bonificacaoNum = calcularDescontoPontualidade(
      aluguelNum,
      descontoInformado,
      tipoDescontoPontualidade,
    );
    const aluguelBonificadoNum = Math.max(0, aluguelNum - bonificacaoNum);

    const vencimentoReferencia = vencimentoPrimeiroPeriodo
      ? new Date(`${vencimentoPrimeiroPeriodo}T00:00:00Z`)
      : criarDataVencimento(
          start.getFullYear(),
          start.getMonth() + 2,
          Number(leaseVencimento) || 1,
        );
    const dataLimiteBonificacao = calcularDataLimiteDesconto(
      vencimentoReferencia,
      Number(validadeDescontoPontualidade) || 0,
    );
    const diaPagamentoBonificado = String(dataLimiteBonificacao.getUTCDate());

    const aluguelExtenso = valorPorExtenso(aluguelNum);
    const aluguelBonificadoExtenso = valorPorExtenso(aluguelBonificadoNum);

    // Persist to DB
    let dbContratoId: string | undefined = undefined;
    try {
      const landlordPayload = resolvedLandlord ? {
        nome: resolvedLandlord.nome,
        cpfCnpj: resolvedLandlord.cpfCnpj,
        telefone: resolvedLandlord.telefone || [],
        email: resolvedLandlord.email || 'contato@locador.com',
        endereco: resolvedLandlord.endereco || [],
        dataNasc: resolvedLandlord.dataNasc || '01/01/1970',
        rg: resolvedLandlord.rg || '',
        orgaoEmissor: resolvedLandlord.orgaoEmissor || '',
        estadoCivil: resolvedLandlord.estadoCivil || '',
        profissao: resolvedLandlord.profissao || '',
        nacionalidade: resolvedLandlord.nacionalidade || 'brasileiro(a)',
        genero: resolvedLandlord.genero || 'masculino',
      } : (proprietario ? {
        nome: proprietario.nome,
        cpfCnpj: proprietario.cpfCnpj,
        telefone: proprietario.telefone || [],
        email: proprietario.email || 'contato@locador.com',
        endereco: proprietario.endereco || [],
        dataNasc: proprietario.dataNasc || '01/01/1970',
        rg: proprietario.rg || '',
        orgaoEmissor: proprietario.orgaoEmissor || '',
        estadoCivil: proprietario.estadoCivil || '',
        profissao: proprietario.profissao || '',
        nacionalidade: proprietario.nacionalidade || 'brasileiro(a)',
        genero: proprietario.genero || 'masculino',
      } : null);

      const res = await createContratoLocacao({
        imovelId: imovel.id,
        locatarioId: inquilino.id,
        fiadorData: pendingFiadorData ? {
          nome: pendingFiadorData.nome,
          cpfCnpj: pendingFiadorData.cpfCnpj,
          telefone: pendingFiadorData.telefone,
          email: pendingFiadorData.email,
          endereco: pendingFiadorData.endereco,
          dataNasc: pendingFiadorData.dataNasc,
          rg: pendingFiadorData.rg,
          orgaoEmissor: pendingFiadorData.orgaoEmissor,
          estadoCivil: pendingFiadorData.estadoCivil,
          profissao: pendingFiadorData.profissao,
          nacionalidade: pendingFiadorData.nacionalidade,
          genero: pendingFiadorData.genero,
        } : null,
        selectedFiadorId: selectedFiadorIndex && !String(selectedFiadorIndex).startsWith('mock-') ? selectedFiadorIndex : null,
        landlordData: landlordPayload,
        dataInicio: leaseDataInicio,
        dataFim: end.toISOString().split('T')[0],
        valorAluguel: aluguelNum,
        valorCondominio: parseNumeroFlexivel(customCondominio) || 0,
        valorIPTU: parseNumeroFlexivel(customIptu) || 0,
        documentoUrl: contractUploadedDocs,
        tenantUploadedDocs: tenantUploadedDocs,

        // Novos campos
        taxaAdministracao: parseNumeroFlexivel(taxaAdministracao),
        taxaMultasEncargos: parseNumeroFlexivel(taxaMultasEncargos),
        taxaIntermediacao: parseNumeroFlexivel(taxaIntermediacao),
        irrfResponsabilidade: irrfResponsabilidade || null,
        carenciaRepasse: carenciaRepasse ? parseInt(carenciaRepasse) : null,
        diaVencimento: leaseVencimento ? parseInt(leaseVencimento, 10) : null,
        periodicidadeReajuste: periodicidadeReajuste ? parseInt(periodicidadeReajuste) : null,
        indiceReajuste: indiceReajuste || null,
        multaQuebraContrato: parseNumeroFlexivel(multaQuebraContrato),
        tipoMultaQuebra,
        vencimentoQuebra: quebraContratoVenceEm || null,
        descontoPontualidade: parseNumeroFlexivel(descontoPontualidade),
        tipoDesconto: tipoDescontoPontualidade,
        diasAntecedenciaDesc: validadeDescontoPontualidade ? parseInt(validadeDescontoPontualidade) : null,
        multaAtrasoPercentual: parseNumeroFlexivel(multaAtraso),
        diasCarenciaMulta: cobrancaAposDias ? parseInt(cobrancaAposDias) : null,
        jurosAtrasoPercentual: parseNumeroFlexivel(multaJurosMensal),
        diasCarenciaJuros: cobrancaAposDiasJuros ? parseInt(cobrancaAposDiasJuros) : null,
        honorariosAdvPercentual: parseNumeroFlexivel(honorarios),
        carenciaHonorariosDias: carenciaHonorarios ? parseInt(carenciaHonorarios, 10) : null,
        periodoGarantido: periodoCarencia || null,
        abrangenciaGarantia: abrangenciaGarantia || null,

        // Primeiro período de cobrança (Vencimento em aberto)
        dataInicioPeriodo: inicioPrimeiroPeriodo || null,
        dataFimPeriodo: fimPrimeiroPeriodo || null,
      });

      if (!res.success) {
        alert("Erro ao salvar contrato no banco: " + res.error);
        return;
      }
      dbContratoId = res.data?.id;
    } catch (err: any) {
      console.error(err);
      alert("Erro de rede ao salvar contrato: " + err.message);
      return;
    }

    const getAddressStrLocal = (addrArray: string[]) => {
      if (!addrArray || addrArray.length === 0) return '';
      try {
        const parsed = JSON.parse(addrArray[0]);
        return `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.complemento || ''} - ${parsed.bairro || ''}, ${parsed.municipio || ''}/${parsed.estado || ''} CEP: ${parsed.cep || ''}`;
      } catch (e) {
        return addrArray[0] || '';
      }
    };

    // Build variables for templates/render
    const fields: Record<string, string> = {
      NOME_LOCADOR: proprietario?.nome || '_______________________',
      CPF_LOCADOR: proprietario?.cpfCnpj || '_______________________',
      RG_LOCADOR: proprietario?.rg || 'ISENTO',
      ENDERECO_LOCADOR: Array.isArray(proprietario?.endereco) ? getAddressStrLocal(proprietario.endereco) : (proprietario?.endereco || '_______________________'),
      NACIONALIDADE_LOCADOR: proprietario?.nacionalidade || 'brasileiro(a)',
      ESTADO_CIVIL_LOCADOR: proprietario?.estadoCivil || 'solteiro(a)',
      PROFISSÃO_LOCADOR: proprietario?.profissao || 'proprietário(a)',
      CIDADE_LOCADOR: 'Ilha Solteira',
      ESTADO_LOCADOR: 'SP',
      CEP_LOCADOR: '15385-000',

      NOME_LOCATARIO: inquilino.nome,
      CPF_LOCATARIO: inquilino.cpfCnpj,
      RG_LOCATARIO: inquilino.rg || 'ISENTO',
      ENDERECO_ATUAL_LOCATARIO: Array.isArray(inquilino.endereco) ? getAddressStrLocal(inquilino.endereco.map((e: any) => {
        try { return JSON.parse(e); } catch (err) { return e; }
      })) : inquilino.endereco as any,
      NACIONALIDADE_LOCATARIO: inquilino.nacionalidade || 'brasileiro(a)',
      ESTADO_CIVIL_LOCATARIO: inquilino.estadoCivil || 'solteiro(a)',
      PROFISSÃO_LOCATARIO: inquilino.profissao || 'professor(a)',
      CIDADE_LOCATARIO: 'Ilha Solteira',
      ESTADO_LOCATARIO: 'SP',
      CEP_LOCATARIO: '15385-000',

      NOME_FIADOR: fiador ? fiador.nome : '_______________________',
      CPF_FIADOR: fiador ? fiador.cpfCnpj : '_______________________',
      RG_FIADOR: fiador ? (fiador.rg || 'ISENTO') : '_______________________',
      ENDERECO_FIADOR: fiador ? (Array.isArray(fiador.endereco) ? getAddressStrLocal(fiador.endereco) : fiador.endereco) : '_______________________',
      NACIONALIDADE_FIADOR: fiador ? (fiador.nacionalidade || 'brasileiro(a)') : 'brasileiro(a)',
      ESTADO_CIVIL_FIADOR: fiador ? (fiador.estadoCivil || 'solteiro(a)') : 'solteiro(a)',
      PROFISSÃO_FIADOR: fiador ? (fiador.profissao || 'professor(a)') : 'professor(a)',
      CIDADE_FIADOR: 'Ilha Solteira',
      ESTADO_FIADOR: 'SP',
      CEP_FIADOR: '15385-000',
      MATRICULA_IMOBILIARIA_FIADOR: '_______________________',
      FICHA_IMOBILIARIA_FIADOR: '_______________________',
      ENDERECO_IMOBILIARIA_FIADOR: fiador ? (Array.isArray(fiador.endereco) ? getAddressStrLocal(fiador.endereco) : fiador.endereco) : '_______________________',

      NOME_FIADOR2: '_______________________',
      CPF_FIADOR2: '_______________________',
      RG_FIADOR2: '_______________________',
      NACIONALIDADE_FIADOR2: 'brasileiro(a)',
      ESTADO_CIVIL_FIADOR2: 'solteiro(a)',
      PROFISSÃO_FIADOR2: 'professor(a)',

      ENDERECO_IMOVEL: `${imovel.tipo || 'Imóvel'} Código ${imovel.codigo}, situado no bairro ${imovel.bairro}, na cidade de ${imovel.cidade}/${imovel.uf}, número ${imovel.numero}, CEP ${imovel.cep}`,
      BAIRRO_IMOVEL: imovel.bairro || '',
      CIDADE_IMOVEL: imovel.cidade || '',
      ESTADO_IMOVEL: imovel.uf || '',
      CEP_IMOVEL: String(imovel.cep || ''),

      VALOR_ALUGUEL: aluguelNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_ALUGUEL_EXTENSO: aluguelExtenso,
      VALOR_BONIFICACAO: bonificacaoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_BONIFICACAO_EXTENSO: valorPorExtenso(bonificacaoNum),
      VALOR_ALUGUEL_BONIFICADO: aluguelBonificadoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_ALUGUEL_BONIFICADO_EXTENSO: aluguelBonificadoExtenso,
      DIA_VENCIMENTO: leaseVencimento,
      DIA_PAGAMENTO_BONIFICADO: diaPagamentoBonificado,

      VALOR_CONDOMINIO: (parseNumeroFlexivel(customCondominio) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_CONDOMINIO_EXTENSO: valorPorExtenso(parseNumeroFlexivel(customCondominio) || 0),
      VALOR_IPTU: (parseNumeroFlexivel(customIptu) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_ALUGUEL_APOS_MESES: aluguelNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      VALOR_ALUGUEL_APOS_MESES_EXTENSO: aluguelExtenso,

      PRAZO_MESES: String(months),
      PRAZO_CONTRATO: `${months} meses`,
      DATA_INICIO: dataInicioStr,
      DATA_FIM: dataFimStr,

      CIDADE_CONTRATO: imovel.cidade || 'Ilha Solteira-SP',
      DATA_ATUAL: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),

      DADOS_BANCARIOS_REPASSE: 'Agência: 0001-9 C/C: 378144324, Operador: 89847354 Banco Inter, Pix CNPJ 55.036.088/0001-93 (Mariano Escatolin Sociedade de Advocacia)',
      TAXA_LIMPEZA: '35,00',
      TAXA_GAS: '35,00',
      PROPRIETARIO_IMOVEL: proprietario?.nome || '_______________________',
      DADOS_IMOVEL_CAUCAO: fiador ? `Imóvel situado em Santa Fé do Sul-SP de propriedade do fiador ${fiador.nome}` : 'Imóvel residencial oferecido em garantia pelo inquilino',

      DESCONTO_PONTUALIDADE: tipoDescontoPontualidade === 'VALOR'
        ? formatarMoeda(descontoInformado)
        : formatarPercentual(descontoInformado),
      VALIDADE_DESCONTO_PONTUALIDADE: validadeDescontoPontualidade,
      MULTA_QUEBRA_CONTRATO: sanitizePercent(multaQuebraContrato),
      QUEBRA_CONTRATO_VENCE_EM: quebraContratoVenceEm ? new Date(quebraContratoVenceEm + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      MULTA_ATRASO: sanitizePercent(multaAtraso),
      COBRANCA_APOS_DIAS: cobrancaAposDias,
      MULTA_JUROS_MENSAL: sanitizePercent(multaJurosMensal),
      COBRANCA_APOS_DIAS_JUROS: cobrancaAposDiasJuros,
      HONORARIOS: sanitizePercent(honorarios),
      CARENCIA_DIAS_CORRIDOS: carenciaDiasCorridos,
      PERIODO_CARENCIA: periodoCarencia,
      ABRANGENCIA_GARANTIA: abrangenciaGarantia,
      PERIODICIDADE_REAJUSTE: periodicidadeReajuste
    };

    const contractCode = `LOC-${new Date().getFullYear()}-${dbContratoId ? dbContratoId.slice(0, 4).toUpperCase() : 'NEW'}`;
    const newContract = {
      id: dbContratoId,
      contrato: contractCode,
      inquilino: inquilino.nome,
      imovel: `${imovel.codigo} - ${imovel.bairro}`,
      vencimento: `${leaseVencimento}/${start.getMonth() + 2}/${start.getFullYear()}`,
      status: 'Pendente'
    };

    onSuccess(newContract, fields, selectedTemplateIdForNew);
  };

  return {
    modalView,
    setModalView,
    isSavingLocatario,
    locatarios,
    setLocatarios,
    fiadores,
    setFiadores,
    dbImoveis,
    selectedInquilinoIndex,
    setSelectedInquilinoIndex,
    selectedProprietarioIndex,
    setSelectedProprietarioIndex,
    selectedFiadorIndex,
    setSelectedFiadorIndex,
    selectedImovelId,
    setSelectedImovelId,
    selectedTemplateIdForNew,
    setSelectedTemplateIdForNew,
    customAluguel,
    setCustomAluguel,
    customCondominio,
    setCustomCondominio,
    customIptu,
    setCustomIptu,
    leasePrazo,
    setLeasePrazo,
    leaseVencimento,
    setLeaseVencimento,
    leaseDataInicio,
    setLeaseDataInicio,
    imovelSearchQuery,
    setImovelSearchQuery,
    imovelSearchResults,
    selectedImovelData,
    resolvedLandlord,
    vistoriaStatus,
    tenantNome,
    setTenantNome,
    tenantCpf,
    setTenantCpf,
    tenantRg,
    setTenantRg,
    tenantOrgao,
    setTenantOrgao,
    tenantEmail,
    setTenantEmail,
    tenantTelefonesList,
    setTenantTelefonesList,
    tenantTelefone,
    setTenantTelefone,
    tenantCep,
    setTenantCep,
    tenantLogradouro,
    setTenantLogradouro,
    tenantNumero,
    setTenantNumero,
    tenantComplemento,
    setTenantComplemento,
    tenantBairro,
    setTenantBairro,
    tenantCidade,
    setTenantCidade,
    tenantEstado,
    setTenantEstado,
    tenantDataNasc,
    setTenantDataNasc,
    tenantEstadoCivil,
    setTenantEstadoCivil,
    tenantProfissao,
    setTenantProfissao,
    tenantNacionalidade,
    setTenantNacionalidade,
    tenantGenero,
    setTenantGenero,
    tenantRendaMensal,
    setTenantRendaMensal,
    tenantRne,
    setTenantRne,
    conjugeNome,
    setConjugeNome,
    conjugeCpf,
    setConjugeCpf,
    conjugeRg,
    setConjugeRg,
    conjugeOrgao,
    setConjugeOrgao,
    conjugeEmail,
    setConjugeEmail,
    conjugeDataNasc,
    setConjugeDataNasc,
    conjugeProfissao,
    setConjugeProfissao,
    conjugeRendaMensal,
    setConjugeRendaMensal,
    conjugeNacionalidade,
    setConjugeNacionalidade,
    conjugeRne,
    setConjugeRne,
    conjugeTelefonesList,
    setConjugeTelefonesList,
    docPessoalUrl,
    setDocPessoalUrl,
    comprovanteResidenciaUrl,
    setComprovanteResidenciaUrl,
    holeriteConjugeUrl,
    setHoleriteConjugeUrl,
    holerite1NilsonUrl,
    setHolerite1NilsonUrl,
    holerite2NilsonUrl,
    setHolerite2NilsonUrl,
    addFiador,
    setAddFiador,
    pendingFiadorData,
    fiadorNome,
    setFiadorNome,
    fiadorCpf,
    setFiadorCpf,
    fiadorRg,
    setFiadorRg,
    fiadorOrgao,
    setFiadorOrgao,
    fiadorEmail,
    setFiadorEmail,
    fiadorTelefone,
    setFiadorTelefone,
    fiadorCep,
    setFiadorCep,
    fiadorLogradouro,
    setFiadorLogradouro,
    fiadorNumero,
    setFiadorNumero,
    fiadorComplemento,
    setFiadorComplemento,
    fiadorBairro,
    setFiadorBairro,
    fiadorCidade,
    setFiadorCidade,
    fiadorEstado,
    setFiadorEstado,
    fiadorDataNasc,
    setFiadorDataNasc,
    fiadorEstadoCivil,
    setFiadorEstadoCivil,
    fiadorProfissao,
    setFiadorProfissao,
    fiadorNacionalidade,
    setFiadorNacionalidade,
    fiadorGenero,
    setFiadorGenero,
    descontoPontualidade,
    setDescontoPontualidade,
    validadeDescontoPontualidade,
    setValidadeDescontoPontualidade,
    multaQuebraContrato,
    setMultaQuebraContrato,
    tipoMultaQuebra,
    setTipoMultaQuebra,
    tipoDescontoPontualidade,
    setTipoDescontoPontualidade,
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
    setAbrangenciaGarantia,
    periodicidadeReajuste,
    setPeriodicidadeReajuste,
    indiceReajuste,
    setIndiceReajuste,
    taxaAdministracao,
    setTaxaAdministracao,
    taxaMultasEncargos,
    setTaxaMultasEncargos,
    taxaIntermediacao,
    setTaxaIntermediacao,
    irrfResponsabilidade,
    setIrrfResponsabilidade,
    carenciaRepasse,
    setCarenciaRepasse,
    carenciaHonorarios,
    setCarenciaHonorarios,
    inicioPrimeiroPeriodo,
    setInicioPrimeiroPeriodo,
    fimPrimeiroPeriodo,
    setFimPrimeiroPeriodo,
    vencimentoPrimeiroPeriodo,
    setVencimentoPrimeiroPeriodo,
    handlePropertySearch,
    handleSelectSearchedProperty,
    handleCreateTenantAndFiador,
    handleGenerateLease,
    startEditTenant,
    editingTenantId,
    startEditLocador,
    handleUpdateLocador,
    isSavingLocador,
    editingLocadorId,
    locadorNome,
    setLocadorNome,
    locadorCpf,
    setLocadorCpf,
    locadorEmail,
    setLocadorEmail,
    locadorTelefone,
    setLocadorTelefone,
    locadorCep,
    setLocadorCep,
    locadorLogradouro,
    setLocadorLogradouro,
    locadorNumero,
    setLocadorNumero,
    locadorComplemento,
    setLocadorComplemento,
    locadorBairro,
    setLocadorBairro,
    locadorCidade,
    setLocadorCidade,
    locadorEstado,
    setLocadorEstado,
    locadorDataNasc,
    setLocadorDataNasc,
    locadorRg,
    setLocadorRg,
    locadorOrgao,
    setLocadorOrgao,
    locadorEstadoCivil,
    setLocadorEstadoCivil,
    locadorProfissao,
    setLocadorProfissao,
    locadorNacionalidade,
    setLocadorNacionalidade,
    locadorGenero,
    setLocadorGenero,
    startEditImovel,
    handleUpdateImovel,
    isSavingImovel,
    editingImovelId,
    imovelTipo,
    setImovelTipo,
    imovelCep,
    setImovelCep,
    imovelCidade,
    setImovelCidade,
    imovelUf,
    setImovelUf,
    imovelBairro,
    setImovelBairro,
    imovelNumero,
    setImovelNumero,
    imovelArea,
    setImovelArea,
    tenantUploadedDocs,
    setTenantUploadedDocs,
    contractUploadedDocs,
    setContractUploadedDocs
  };
}
