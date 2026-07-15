"use client";

import React, { useState, useEffect } from 'react';
import { Building, User, Shield, Search, Plus, X, Loader2, Check, Info } from 'lucide-react';
// Importe suas actions aqui (ajuste os caminhos conforme sua estrutura)
import { createLocatario, searchImovelWithResolution, createContratoLocacao, getInquilinos, getFiadores } from '@/app/(admin)/contratos/actions';
import { getImoveis } from '@/app/actions/imoveisActions';

interface NovoContratoModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Dados iniciais que o pai já tem e pode emprestar pro modal
    allLocatarios: any[];
    allFiadores: any[];
    allLocador: any[];
    templates: any[];
    // Função chamada quando o contrato é gerado com sucesso
    onSuccess: (newContract: any, contractFields: Record<string, string>, templateId: string) => void;
}

export default function NovoContratoModal({
    isOpen,
    onClose,
    allLocatarios: initialLocatarios,
    allFiadores: initialFiadores,
    allLocador,
    templates,
    onSuccess
}: NovoContratoModalProps) {

    // ── ESTADOS DO MODAL ──
    const [modalView, setModalView] = useState<'MAIN' | 'CREATE_TENANT'>('MAIN');
    const [isSavingLocatario, setIsSavingLocatario] = useState(false);

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
    const [tenantTelefone, setTenantTelefone] = useState('');
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

    // ── EFEITOS ──
    useEffect(() => {
        if (isOpen) {
            // Configura a data inicial para hoje
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setLeaseDataInicio(`${yyyy}-${mm}-${dd}`);

            // Busca os imóveis da base ao abrir
            getImoveis().then(res => {
                if (res.success && res.data) setDbImoveis(res.data);
            });
        }
    }, [isOpen]);

    // ── FUNÇÕES DE AÇÃO ──

    // Função auxiliar (pode mover para um utils.ts depois)
    function valorPorExtenso(valor: number): string {
        return `${valor.toLocaleString('pt-BR')} reais`;
    }

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
            }
        }

        if (imovel.vistorias && imovel.vistorias.length > 0) {
            const latestVistoria = imovel.vistorias[0];
            setVistoriaStatus(`Última vistoria: ${latestVistoria.codigo} (${latestVistoria.tipo}) - Status: ${latestVistoria.status}`);
        } else {
            setVistoriaStatus('Nenhuma vistoria encontrada para este imóvel.');
        }
    };

    // Criar inquilino (Locatário) e opcionalmente salvar dados do fiador em memória temporária
    const handleCreateTenantAndFiador = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantNome || !tenantCpf || !tenantEmail) {
            alert("Por favor, preencha nome, CPF e e-mail do inquilino.");
            return;
        }

        setIsSavingLocatario(true);
        try {
            const serializeTelefone = (tel: string) => [
                JSON.stringify({ telefone: tel, qualificacao: 'Principal', observacao: '' })
            ];
            const serializeEndereco = (cep: string, logr: string, num: string, comp: string, bair: string, cid: string, est: string) => [
                JSON.stringify({ cep, logradouro: logr, numero: num, complemento: comp, bairro: bair, municipio: cid, estado: est })
            ];

            const locatarioPayload = {
                nome: tenantNome,
                cpfCnpj: tenantCpf,
                telefone: serializeTelefone(tenantTelefone),
                email: tenantEmail,
                endereco: serializeEndereco(tenantCep, tenantLogradouro, tenantNumero, tenantComplemento, tenantBairro, tenantCidade, tenantEstado),
                dataNasc: tenantDataNasc,
                rg: tenantRg,
                orgaoEmissor: tenantOrgao,
                estadoCivil: tenantEstadoCivil,
                profissao: tenantProfissao,
                nacionalidade: tenantNacionalidade,
                genero: tenantGenero,
            };

            const res = await createLocatario(locatarioPayload);
            if (res.success && res.data) {
                const newLoc = res.data;
                setLocatarios(prev => [newLoc, ...prev]);

                if (addFiador) {
                    const fiadorPayload = {
                        nome: fiadorNome,
                        cpfCnpj: fiadorCpf,
                        telefone: serializeTelefone(fiadorTelefone),
                        email: fiadorEmail,
                        endereco: serializeEndereco(fiadorCep, fiadorLogradouro, fiadorNumero, fiadorComplemento, fiadorBairro, fiadorCidade, fiadorEstado),
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

                // Reset tenant form
                setTenantNome(''); setTenantCpf(''); setTenantRg(''); setTenantOrgao(''); setTenantEmail(''); setTenantTelefone('');
                setTenantCep(''); setTenantLogradouro(''); setTenantNumero(''); setTenantComplemento(''); setTenantBairro(''); setTenantCidade(''); setTenantEstado('');
                setTenantDataNasc(''); setTenantEstadoCivil('solteiro(a)'); setTenantProfissao(''); setTenantNacionalidade('brasileiro(a)'); setTenantGenero('masculino');
                setAddFiador(false);
                // Reset fiador form
                setFiadorNome(''); setFiadorCpf(''); setFiadorRg(''); setFiadorOrgao(''); setFiadorEmail(''); setFiadorTelefone('');
                setFiadorCep(''); setFiadorLogradouro(''); setFiadorNumero(''); setFiadorComplemento(''); setFiadorBairro(''); setFiadorCidade(''); setFiadorEstado('');
                setFiadorDataNasc(''); setFiadorEstadoCivil('solteiro(a)'); setFiadorProfissao(''); setFiadorNacionalidade('brasileiro(a)'); setFiadorGenero('masculino');
            } else {
                alert("Erro ao criar inquilino: " + res.error);
            }
        } catch (e: any) {
            console.error(e);
            alert("Erro ao criar inquilino: " + e.message);
        } finally {
            setIsSavingLocatario(false);
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

        const aluguelNum = Number(customAluguel) || 0;
        const bonificacaoNum = 100;
        const aluguelBonificadoNum = Math.max(0, aluguelNum - bonificacaoNum);

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
                valorCondominio: Number(customCondominio) || 0,
                valorIPTU: Number(customIptu) || 0,
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

        const getAddressStr = (addrArray: string[]) => {
            if (!addrArray || addrArray.length === 0) return '';
            try {
                const parsed = JSON.parse(addrArray[0]);
                return `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.complemento || ''} - ${parsed.bairro || ''}, ${parsed.municipio || ''}/${parsed.estado || ''} CEP: ${parsed.cep || ''}`;
            } catch (e) {
                return addrArray[0] || '';
            }
        };

        const sanitizePercent = (val: string) => {
            if (!val) return "";
            return val.replace(/%/g, '').replace(/,/g, '.').trim();
        };

        // Build variables for templates/render
        const fields: Record<string, string> = {
            NOME_LOCADOR: proprietario?.nome || '_______________________',
            CPF_LOCADOR: proprietario?.cpfCnpj || '_______________________',
            RG_LOCADOR: proprietario?.rg || 'ISENTO',
            ENDERECO_LOCADOR: Array.isArray(proprietario?.endereco) ? getAddressStr(proprietario.endereco) : (proprietario?.endereco || '_______________________'),
            NACIONALIDADE_LOCADOR: proprietario?.nacionalidade || 'brasileiro(a)',
            ESTADO_CIVIL_LOCADOR: proprietario?.estadoCivil || 'solteiro(a)',
            PROFISSÃO_LOCADOR: proprietario?.profissao || 'proprietário(a)',
            CIDADE_LOCADOR: 'Ilha Solteira',
            ESTADO_LOCADOR: 'SP',
            CEP_LOCADOR: '15385-000',

            NOME_LOCATARIO: inquilino.nome,
            CPF_LOCATARIO: inquilino.cpfCnpj,
            RG_LOCATARIO: inquilino.rg || 'ISENTO',
            ENDERECO_ATUAL_LOCATARIO: Array.isArray(inquilino.endereco) ? getAddressStr(inquilino.endereco.map((e: any) => {
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
            ENDERECO_FIADOR: fiador ? (Array.isArray(fiador.endereco) ? getAddressStr(fiador.endereco) : fiador.endereco) : '_______________________',
            NACIONALIDADE_FIADOR: fiador ? (fiador.nacionalidade || 'brasileiro(a)') : 'brasileiro(a)',
            ESTADO_CIVIL_FIADOR: fiador ? (fiador.estadoCivil || 'solteiro(a)') : 'solteiro(a)',
            PROFISSÃO_FIADOR: fiador ? (fiador.profissao || 'professor(a)') : 'professor(a)',
            CIDADE_FIADOR: 'Ilha Solteira',
            ESTADO_FIADOR: 'SP',
            CEP_FIADOR: '15385-000',
            MATRICULA_IMOBILIARIA_FIADOR: '_______________________',
            FICHA_IMOBILIARIA_FIADOR: '_______________________',
            ENDERECO_IMOBILIARIA_FIADOR: fiador ? (Array.isArray(fiador.endereco) ? getAddressStr(fiador.endereco) : fiador.endereco) : '_______________________',

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
            DIA_PAGAMENTO_BONIFICADO: '10',

            VALOR_CONDOMINIO: (Number(customCondominio) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            VALOR_CONDOMINIO_EXTENSO: valorPorExtenso(Number(customCondominio) || 0),
            VALOR_IPTU: (Number(customIptu) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
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

            // Novos campos adicionados
            DESCONTO_PONTUALIDADE: sanitizePercent(descontoPontualidade),
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden border border-zinc-200 animate-scale-up">

                {/* Header do Modal */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-[#004777]" />
                        <h3 className="text-lg font-bold text-[#280003]">
                            {modalView === 'MAIN' ? 'Vincular Novo Inquilino e Gerar Contrato' : 'Cadastrar Novo Inquilino'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {modalView === 'MAIN' ? (
                    <div className="flex flex-row h-[75vh]">
                        {/* Sidebar com Links das Seções */}
                        <div className="w-56 bg-zinc-50 border-r border-zinc-100 p-4 space-y-1.5 hidden md:flex flex-col flex-shrink-0 select-none">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Seções do Cadastro</span>
                            <button
                                type="button"
                                onClick={() => {
                                    document.getElementById('section-inquilino')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#004777]/5 hover:text-[#004777] text-gray-600 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <User className="w-3.5 h-3.5" />
                                1. Inquilino (Locatário)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    document.getElementById('section-condicoes')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#004777]/5 hover:text-[#004777] text-gray-600 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Shield className="w-3.5 h-3.5" />
                                2. Condições & Fiador
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    document.getElementById('section-imovel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#004777]/5 hover:text-[#004777] text-gray-600 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Building className="w-3.5 h-3.5" />
                                3. Dados do Imóvel
                                2. Dados do Imóvel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    document.getElementById('section-condicoes')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#004777]/5 hover:text-[#004777] text-gray-600 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Shield className="w-3.5 h-3.5" />
                                3. Condições & Fiador
                            </button>
                        </div>

                        {/* Formulário com Scroll */}
                        <form onSubmit={handleGenerateLease} className="flex-1 flex flex-col min-w-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* 1. Selecionar Inquilino */}
                                    <div id="section-inquilino" className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-3 scroll-mt-2 col-span-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
                                                <User className="w-4 h-4" />
                                                1. Inquilino (Locatário)
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setModalView('CREATE_TENANT')}
                                                className="text-[10px] text-[#004777] font-bold hover:underline flex items-center gap-0.5"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Novo Inquilino
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Selecionar Inquilino *</label>
                                            <select
                                                value={selectedInquilinoIndex}
                                                onChange={e => setSelectedInquilinoIndex(e.target.value)}
                                                required
                                                className="block w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white"
                                            >
                                                <option value="">-- Selecione o Inquilino --</option>
                                                {locatarios.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nome} (CPF: {c.cpfCnpj})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedInquilinoIndex !== '' && (() => {
                                            const selectedInq = locatarios.find(i => i.id === selectedInquilinoIndex);
                                            if (!selectedInq) return null;

                                            let displayAddr = selectedInq.endereco;
                                            if (Array.isArray(selectedInq.endereco) && selectedInq.endereco.length > 0) {
                                                try {
                                                    const parsed = JSON.parse(selectedInq.endereco.toString());
                                                    displayAddr = `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.bairro || ''} - ${parsed.municipio || ''}/${parsed.estado || ''}`;
                                                } catch (e) {
                                                    displayAddr = selectedInq.endereco[0];
                                                }
                                            }

                                            return (
                                                <div className="bg-white/80 p-2.5 rounded-lg border border-dashed border-zinc-200 text-[11px] space-y-1.5 text-gray-600">
                                                    <p><strong>Documentação Puxada:</strong></p>
                                                    <p>• RG: {selectedInq.rg || 'Não informado'}</p>
                                                    <p>• Endereço: {displayAddr?.toString() || 'Não informado'}</p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* 2. Dados do Imóvel da Carteira */}
                                    <div id="section-imovel" className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-4 col-span-1 scroll-mt-2">
                                        <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
                                            <Building className="w-4 h-4" />
                                            2. Dados do Imóvel da Carteira
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar Imóvel por Endereço *</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Digite o código ou endereço..."
                                                        value={imovelSearchQuery}
                                                        onChange={e => handlePropertySearch(e.target.value)}
                                                        className="block w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#004777]"
                                                    />
                                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                                                </div>

                                                {imovelSearchResults.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 mt-1 max-h-48 overflow-y-auto">
                                                        {imovelSearchResults.map(imovel => (
                                                            <button
                                                                key={imovel.id}
                                                                type="button"
                                                                onClick={() => handleSelectSearchedProperty(imovel)}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex flex-col gap-0.5"
                                                            >
                                                                <span className="font-semibold text-gray-700">{imovel.codigo} - {imovel.tipo}</span>
                                                                <span className="text-gray-500">{imovel.bairro}, {imovel.cidade} - {imovel.uf}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Modelo de Contrato a Usar *</label>
                                                <select
                                                    value={selectedTemplateIdForNew}
                                                    onChange={e => setSelectedTemplateIdForNew(e.target.value)}
                                                    required
                                                    className="block w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white"
                                                >
                                                    {templates.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {selectedImovelId !== '' && (
                                            <div className="space-y-4 mt-2">
                                                <div className="grid grid-cols-1 gap-4">
                                                    {/* Proprietário */}
                                                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                                                        <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block mb-1">Proprietário (Locador)</span>
                                                        {resolvedLandlord ? (
                                                            <div className="space-y-1.5 text-xs text-gray-700">
                                                                <p className="font-bold text-emerald-950 text-sm">{resolvedLandlord.nome}</p>
                                                                <p><strong>CPF/CNPJ:</strong> {resolvedLandlord.cpfCnpj}</p>
                                                                <p><strong>RG:</strong> {resolvedLandlord.rg || 'Não informado'}</p>
                                                                {(() => {
                                                                    let displayAddr = '';
                                                                    if (Array.isArray(resolvedLandlord.endereco) && resolvedLandlord.endereco.length > 0) {
                                                                        try {
                                                                            const parsed = JSON.parse(resolvedLandlord.endereco[0]);
                                                                            displayAddr = `${parsed.logradouro || ''}, ${parsed.numero || ''} ${parsed.bairro || ''} - ${parsed.municipio || ''}/${parsed.estado || ''}`;
                                                                        } catch (e) {
                                                                            displayAddr = resolvedLandlord.endereco[0];
                                                                        }
                                                                    } else {
                                                                        displayAddr = resolvedLandlord.endereco || '';
                                                                    }
                                                                    return displayAddr ? <p className="text-gray-500 leading-tight"><strong>Endereço:</strong> {displayAddr}</p> : null;
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">Nenhum proprietário associado a este imóvel no sistema.</p>
                                                        )}
                                                    </div>

                                                    {/* Vistoria */}
                                                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                                                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">Laudo de Vistoria</span>
                                                        {vistoriaStatus ? (
                                                            <div className="space-y-1.5 text-xs text-gray-700">
                                                                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                                                    <Info className="w-4 h-4 text-zinc-500" />
                                                                    {vistoriaStatus.includes('CONCLUIDA') ? 'Vistoria Concluída' : 'Vistoria Verificada'}
                                                                </p>
                                                                <p className="text-gray-600 leading-relaxed">{vistoriaStatus}</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">Nenhum registro de vistoria para este imóvel.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Valores Financeiros */}
                                                <div className="bg-white p-4 rounded-xl border border-zinc-200 text-xs grid grid-cols-1 gap-4">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Aluguel do Imóvel (R$)</span>
                                                        <input
                                                            type="number"
                                                            value={customAluguel}
                                                            onChange={e => setCustomAluguel(e.target.value)}
                                                            className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa Condomínio (R$)</span>
                                                        <input
                                                            type="number"
                                                            value={customCondominio}
                                                            onChange={e => setCustomCondominio(e.target.value)}
                                                            className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa IPTU (R$)</span>
                                                        <input
                                                            type="number"
                                                            value={customIptu}
                                                            onChange={e => setCustomIptu(e.target.value)}
                                                            className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Condições Contratuais & Fiador */}
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
                                </div>
                            </div>

                            {/* Ações (Fixo no rodapé) */}
                            <div className="flex justify-end gap-3 p-4 border-t border-zinc-100 bg-white flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-semibold border border-zinc-200 rounded-lg hover:bg-zinc-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
                                >
                                    Puxar Dados e Gerar Contrato
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handleCreateTenantAndFiador} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1 flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                Dados do Novo Inquilino (Locatário)
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={tenantNome}
                                        onChange={e => setTenantNome(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ *</label>
                                    <input
                                        type="text"
                                        required
                                        value={tenantCpf}
                                        onChange={e => setTenantCpf(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail *</label>
                                    <input
                                        type="email"
                                        required
                                        value={tenantEmail}
                                        onChange={e => setTenantEmail(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Telefone</label>
                                    <input
                                        type="text"
                                        value={tenantTelefone}
                                        onChange={e => setTenantTelefone(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">RG</label>
                                    <input
                                        type="text"
                                        value={tenantRg}
                                        onChange={e => setTenantRg(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Órgão Emissor</label>
                                    <input
                                        type="text"
                                        value={tenantOrgao}
                                        onChange={e => setTenantOrgao(e.target.value)}
                                        placeholder="Ex: SSP/SP"
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Nacionalidade</label>
                                    <input
                                        type="text"
                                        value={tenantNacionalidade}
                                        onChange={e => setTenantNacionalidade(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Profissão</label>
                                    <input
                                        type="text"
                                        value={tenantProfissao}
                                        onChange={e => setTenantProfissao(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
                                    <input
                                        type="text"
                                        value={tenantDataNasc}
                                        onChange={e => setTenantDataNasc(e.target.value)}
                                        placeholder="DD/MM/AAAA"
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Estado Civil</label>
                                    <select
                                        value={tenantEstadoCivil}
                                        onChange={e => setTenantEstadoCivil(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                    >
                                        <option value="solteiro(a)">Solteiro(a)</option>
                                        <option value="casado(a)">Casado(a)</option>
                                        <option value="divorciado(a)">Divorciado(a)</option>
                                        <option value="viúvo(a)">Viúvo(a)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Gênero</label>
                                    <select
                                        value={tenantGenero}
                                        onChange={e => setTenantGenero(e.target.value)}
                                        className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                    >
                                        <option value="masculino">Masculino</option>
                                        <option value="feminino">Feminino</option>
                                        <option value="outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Endereço do Inquilino</p>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <input
                                        type="text"
                                        placeholder="CEP"
                                        value={tenantCep}
                                        onChange={e => setTenantCep(e.target.value)}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-1"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Logradouro"
                                        value={tenantLogradouro}
                                        onChange={e => setTenantLogradouro(e.target.value)}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-3"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Número"
                                        value={tenantNumero}
                                        onChange={e => setTenantNumero(e.target.value)}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Complemento"
                                        value={tenantComplemento}
                                        onChange={e => setTenantComplemento(e.target.value)}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Bairro"
                                        value={tenantBairro}
                                        onChange={e => setTenantBairro(e.target.value)}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Cidade/UF"
                                        value={tenantCidade ? `${tenantCidade}/${tenantEstado}` : ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val.includes('/')) {
                                                const [c, u] = val.split('/');
                                                setTenantCidade(c.trim());
                                                setTenantEstado(u.trim());
                                            } else {
                                                setTenantCidade(val);
                                            }
                                        }}
                                        className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fiador Opcional */}
                        <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="addFiadorCheck"
                                    checked={addFiador}
                                    onChange={e => setAddFiador(e.target.checked)}
                                    className="rounded border-zinc-200 text-[#004777] focus:ring-[#004777]"
                                />
                                <label htmlFor="addFiadorCheck" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">
                                    Adicionar Fiador para este inquilino? (Garantidor)
                                </label>
                            </div>

                            {addFiador && (
                                <div className="space-y-4 animate-fade-in">
                                    <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-zinc-200 pb-1 flex items-center gap-1.5">
                                        <Shield className="w-4 h-4" />
                                        Dados do Fiador (Garantidor)
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Nome Completo *</label>
                                            <input
                                                type="text"
                                                required
                                                value={fiadorNome}
                                                onChange={e => setFiadorNome(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ *</label>
                                            <input
                                                type="text"
                                                required
                                                value={fiadorCpf}
                                                onChange={e => setFiadorCpf(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail *</label>
                                            <input
                                                type="email"
                                                required
                                                value={fiadorEmail}
                                                onChange={e => setFiadorEmail(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Telefone</label>
                                            <input
                                                type="text"
                                                value={fiadorTelefone}
                                                onChange={e => setFiadorTelefone(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">RG</label>
                                            <input
                                                type="text"
                                                value={fiadorRg}
                                                onChange={e => setFiadorRg(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Órgão Emissor</label>
                                            <input
                                                type="text"
                                                value={fiadorOrgao}
                                                onChange={e => setFiadorOrgao(e.target.value)}
                                                placeholder="Ex: SSP/SP"
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Nacionalidade</label>
                                            <input
                                                type="text"
                                                value={fiadorNacionalidade}
                                                onChange={e => setFiadorNacionalidade(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Profissão</label>
                                            <input
                                                type="text"
                                                value={fiadorProfissao}
                                                onChange={e => setFiadorProfissao(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Data de Nascimento</label>
                                            <input
                                                type="text"
                                                value={fiadorDataNasc}
                                                onChange={e => setFiadorDataNasc(e.target.value)}
                                                placeholder="DD/MM/AAAA"
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Estado Civil</label>
                                            <select
                                                value={fiadorEstadoCivil}
                                                onChange={e => setFiadorEstadoCivil(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                            >
                                                <option value="solteiro(a)">Solteiro(a)</option>
                                                <option value="casado(a)">Casado(a)</option>
                                                <option value="divorciado(a)">Divorciado(a)</option>
                                                <option value="viúvo(a)">Viúvo(a)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase">Gênero</label>
                                            <select
                                                value={fiadorGenero}
                                                onChange={e => setFiadorGenero(e.target.value)}
                                                className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1 bg-white"
                                            >
                                                <option value="masculino">Masculino</option>
                                                <option value="feminino">Feminino</option>
                                                <option value="outro">Outro</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Endereço do Fiador</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                            <input
                                                type="text"
                                                placeholder="CEP"
                                                value={fiadorCep}
                                                onChange={e => setFiadorCep(e.target.value)}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-1"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Logradouro"
                                                value={fiadorLogradouro}
                                                onChange={e => setFiadorLogradouro(e.target.value)}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs col-span-3"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Número"
                                                value={fiadorNumero}
                                                onChange={e => setFiadorNumero(e.target.value)}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Complemento"
                                                value={fiadorComplemento}
                                                onChange={e => setFiadorComplemento(e.target.value)}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Bairro"
                                                value={fiadorBairro}
                                                onChange={e => setFiadorBairro(e.target.value)}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Cidade/UF"
                                                value={fiadorCidade ? `${fiadorCidade}/${fiadorEstado}` : ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val.includes('/')) {
                                                        const [c, u] = val.split('/');
                                                        setFiadorCidade(c.trim());
                                                        setFiadorEstado(u.trim());
                                                    } else {
                                                        setFiadorCidade(val);
                                                    }
                                                }}
                                                className="border border-zinc-200 rounded px-2 py-1 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ações do Sub-form */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 sticky bottom-0 bg-white">
                            <button
                                type="button"
                                onClick={() => setModalView('MAIN')}
                                className="px-4 py-2 text-xs font-semibold border border-zinc-200 rounded-lg hover:bg-zinc-50"
                            >
                                Voltar
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingLocatario}
                                className="bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                {isSavingLocatario ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        Salvar e Vincular
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}