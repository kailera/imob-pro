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
    // ... (Para encurtar o exemplo, imagine todos os estados de fiador aqui, idênticos ao seu original)
    // DICA: Em uma refatoração futura, considere agrupar esses campos em um único objeto de estado: const [tenantForm, setTenantForm] = useState({...})

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
    };

    // Aqui entra o seu handleCreateTenantAndFiador original, mas atualizando os estados locais
    const handleCreateTenantAndFiador = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (todo o seu código original de salvar o locatário vai aqui)
        // Ao finalizar com sucesso:
        // setSelectedInquilinoIndex(newLoc.id);
        // setModalView('MAIN');
        // alert('Salvo com sucesso!');
    };

    const handleGenerateLease = async (e: React.FormEvent) => {
        e.preventDefault();
        // Toda a sua lógica original de gerar o contrato vai aqui (calculo de datas, valores, mock/db).
        // A principal mudança é no final da função!

        // Em vez de atualizar o localStorage ou setContracts diretamente, você constrói o objeto:
        /* 
        const newContract = { id: dbContratoId, contrato: contractCode, ... };
        const fields = { NOME_LOCATARIO: inquilino.nome, ... }; 
        */

        // E envia tudo de volta para o componente Pai usando o onSuccess que recebemos via props:
        // onSuccess(newContract, fields, selectedTemplateIdForNew);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-zinc-200 animate-scale-up">

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

                {/* 
                    AQUI DENTRO VAI EXATAMENTE O SEU JSX ORIGINAL DO MODAL 
                    ({modalView === 'MAIN' ? ( ...form principal ) : ( ... form sub-form )})
                    Você pode copiar e colar o conteúdo interno das forms que você já tinha.
                */}

                <div className="p-8 text-center text-gray-500">
                    Aqui você cola o conteúdo do form original, mas agora ele vive no próprio arquivo!
                </div>
            </div>
        </div>
    );
}