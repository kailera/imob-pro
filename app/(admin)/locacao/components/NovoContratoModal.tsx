"use client";

import React from 'react';
import { Building, User, Shield, X } from 'lucide-react';
import { useNovoContratoForm } from '../hooks/useNovoContratoForm';
import { ImovelSearchSection } from './novo-contrato/ImovelSearchSection';
import { CondicoesContratuaisSection } from './novo-contrato/CondicoesContratuaisSection';
import { CadastroInquilinoForm } from './novo-contrato/CadastroInquilinoForm';

interface NovoContratoModalProps {
    isOpen: boolean;
    onClose: () => void;
    allLocatarios: any[];
    allFiadores: any[];
    allLocador: any[];
    templates: any[];
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
    const form = useNovoContratoForm({
        isOpen,
        initialLocatarios,
        initialFiadores,
        allLocador,
        templates,
        onSuccess,
        onClose
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden border border-zinc-200 animate-scale-up">

                {/* Header do Modal */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-[#004777]" />
                        <h3 className="text-lg font-bold text-[#280003]">
                            {form.modalView === 'MAIN' ? 'Vincular Novo Inquilino e Gerar Contrato' : 'Cadastrar Novo Inquilino'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {form.modalView === 'MAIN' ? (
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
                            </button>
                        </div>

                        {/* Formulário com Scroll */}
                        <form onSubmit={form.handleGenerateLease} className="flex-1 flex flex-col min-w-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* 1. Selecionar Inquilino */}
                                    <div id="section-inquilino" className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-3 scroll-mt-2 col-span-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
                                                <User className="w-4 h-4" />
                                                1. Inquilino (Locatário)
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => form.setModalView('CREATE_TENANT')}
                                                    className="text-[10px] text-[#004777] font-bold hover:underline"
                                                >
                                                    Novo Inquilino
                                                </button>
                                                {form.selectedInquilinoIndex !== '' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => form.startEditTenant()}
                                                        className="text-[10px] text-[#004777] font-bold hover:underline"
                                                    >
                                                        | Editar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Selecionar Inquilino *</label>
                                            <select
                                                value={form.selectedInquilinoIndex}
                                                onChange={e => form.setSelectedInquilinoIndex(e.target.value)}
                                                required
                                                className="block w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white"
                                            >
                                                <option value="">-- Selecione o Inquilino --</option>
                                                {form.locatarios.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nome} (CPF: {c.cpfCnpj})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {form.selectedInquilinoIndex !== '' && (() => {
                                            const selectedInq = form.locatarios.find(i => i.id === form.selectedInquilinoIndex);
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
                                    <ImovelSearchSection
                                        imovelSearchQuery={form.imovelSearchQuery}
                                        imovelSearchResults={form.imovelSearchResults}
                                        selectedImovelId={form.selectedImovelId}
                                        resolvedLandlord={form.resolvedLandlord}
                                        vistoriaStatus={form.vistoriaStatus}
                                        customAluguel={form.customAluguel}
                                        customCondominio={form.customCondominio}
                                        customIptu={form.customIptu}
                                        selectedTemplateIdForNew={form.selectedTemplateIdForNew}
                                        templates={templates}
                                        handlePropertySearch={form.handlePropertySearch}
                                        handleSelectSearchedProperty={form.handleSelectSearchedProperty}
                                        setSelectedTemplateIdForNew={form.setSelectedTemplateIdForNew}
                                        setCustomAluguel={form.setCustomAluguel}
                                        setCustomCondominio={form.setCustomCondominio}
                                        setCustomIptu={form.setCustomIptu}
                                        onEditLandlord={form.startEditLocador}
                                        onEditProperty={form.startEditImovel}
                                    />

                                    {/* 3. Condições Contratuais & Fiador */}
                                    <CondicoesContratuaisSection
                                        selectedFiadorIndex={form.selectedFiadorIndex}
                                        setSelectedFiadorIndex={form.setSelectedFiadorIndex}
                                        pendingFiadorData={form.pendingFiadorData}
                                        fiadores={form.fiadores}
                                        leasePrazo={form.leasePrazo}
                                        setLeasePrazo={form.setLeasePrazo}
                                        leaseVencimento={form.leaseVencimento}
                                        setLeaseVencimento={form.setLeaseVencimento}
                                        periodicidadeReajuste={form.periodicidadeReajuste}
                                        setPeriodicidadeReajuste={form.setPeriodicidadeReajuste}
                                        leaseDataInicio={form.leaseDataInicio}
                                        setLeaseDataInicio={form.setLeaseDataInicio}
                                        descontoPontualidade={form.descontoPontualidade}
                                        setDescontoPontualidade={form.setDescontoPontualidade}
                                        validadeDescontoPontualidade={form.validadeDescontoPontualidade}
                                        setValidadeDescontoPontualidade={form.setValidadeDescontoPontualidade}
                                        multaQuebraContrato={form.multaQuebraContrato}
                                        setMultaQuebraContrato={form.setMultaQuebraContrato}
                                        quebraContratoVenceEm={form.quebraContratoVenceEm}
                                        setQuebraContratoVenceEm={form.setQuebraContratoVenceEm}
                                        multaAtraso={form.multaAtraso}
                                        setMultaAtraso={form.setMultaAtraso}
                                        cobrancaAposDias={form.cobrancaAposDias}
                                        setCobrancaAposDias={form.setCobrancaAposDias}
                                        multaJurosMensal={form.multaJurosMensal}
                                        setMultaJurosMensal={form.setMultaJurosMensal}
                                        cobrancaAposDiasJuros={form.cobrancaAposDiasJuros}
                                        setCobrancaAposDiasJuros={form.setCobrancaAposDiasJuros}
                                        honorarios={form.honorarios}
                                        setHonorarios={form.setHonorarios}
                                        carenciaDiasCorridos={form.carenciaDiasCorridos}
                                        setCarenciaDiasCorridos={form.setCarenciaDiasCorridos}
                                        periodoCarencia={form.periodoCarencia}
                                        setPeriodoCarencia={form.setPeriodoCarencia}
                                        abrangenciaGarantia={form.abrangenciaGarantia}
                                        setAbrangenciaGarantia={form.setAbrangenciaGarantia}
                                    />
                                    {/* Seção 4: Anexos e Documentos Finais */}
                                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-4 col-span-2">
                                        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                                            Documentos de Suporte e Contrato
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Documentos do Inquilino */}
                                            <div className="space-y-2">
                                                <span className="text-xs font-semibold text-gray-700 block">Documentos do Inquilino</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Descrição (ex: RG, CPF...)"
                                                        id="tenant-doc-desc"
                                                        className="border border-zinc-200 rounded px-2.5 py-1 text-xs flex-1 bg-white"
                                                    />
                                                    <input
                                                        type="file"
                                                        id="tenant-doc-file"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            const descInput = document.getElementById('tenant-doc-desc') as HTMLInputElement;
                                                            if (!file) return;
                                                            const desc = descInput?.value || file.name;
                                                            const fd = new FormData();
                                                            fd.append('file', file);
                                                            try {
                                                                const { uploadMediaToRustFS } = await import('@/app/actions/uploadMedia');
                                                                const res = await uploadMediaToRustFS(fd);
                                                                if (res.url) {
                                                                    form.setTenantUploadedDocs(prev => [...prev, { descricao: desc, url: res.url }]);
                                                                    if (descInput) descInput.value = '';
                                                                }
                                                            } catch (err: any) {
                                                                alert('Erro no upload: ' + err.message);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('tenant-doc-file')?.click()}
                                                        className="bg-[#004777] text-white px-3 py-1 text-xs rounded hover:bg-[#003355]"
                                                    >
                                                        Upload
                                                    </button>
                                                </div>
                                                <ul className="text-[11px] space-y-1 mt-1 text-gray-600">
                                                    {form.tenantUploadedDocs.map((doc, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-white p-1.5 rounded border">
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#004777] hover:underline font-medium truncate max-w-[80%]">
                                                                {doc.descricao}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => form.setTenantUploadedDocs(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-red-500 hover:text-red-700 text-xs px-1"
                                                            >
                                                                Remover
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Documentos do Contrato */}
                                            <div className="space-y-2">
                                                <span className="text-xs font-semibold text-gray-700 block">Documentos do Contrato</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Descrição (ex: Laudo, Procuração...)"
                                                        id="contract-doc-desc"
                                                        className="border border-zinc-200 rounded px-2.5 py-1 text-xs flex-1 bg-white"
                                                    />
                                                    <input
                                                        type="file"
                                                        id="contract-doc-file"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            const descInput = document.getElementById('contract-doc-desc') as HTMLInputElement;
                                                            if (!file) return;
                                                            const desc = descInput?.value || file.name;
                                                            const fd = new FormData();
                                                            fd.append('file', file);
                                                            try {
                                                                const { uploadMediaToRustFS } = await import('@/app/actions/uploadMedia');
                                                                const res = await uploadMediaToRustFS(fd);
                                                                if (res.url) {
                                                                    form.setContractUploadedDocs(prev => [...prev, { descricao: desc, url: res.url }]);
                                                                    if (descInput) descInput.value = '';
                                                                }
                                                            } catch (err: any) {
                                                                alert('Erro no upload: ' + err.message);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('contract-doc-file')?.click()}
                                                        className="bg-[#004777] text-white px-3 py-1 text-xs rounded hover:bg-[#003355]"
                                                    >
                                                        Upload
                                                    </button>
                                                </div>
                                                <ul className="text-[11px] space-y-1 mt-1 text-gray-600">
                                                    {form.contractUploadedDocs.map((doc, idx) => (
                                                        <li key={idx} className="flex justify-between items-center bg-white p-1.5 rounded border">
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[#004777] hover:underline font-medium truncate max-w-[80%]">
                                                                {doc.descricao}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={() => form.setContractUploadedDocs(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-red-500 hover:text-red-700 text-xs px-1"
                                                            >
                                                                Remover
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
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
                ) : (form.modalView === 'CREATE_TENANT' || form.modalView === 'EDIT_TENANT') ? (
                    <CadastroInquilinoForm
                        tenantNome={form.tenantNome}
                        setTenantNome={form.setTenantNome}
                        tenantCpf={form.tenantCpf}
                        setTenantCpf={form.setTenantCpf}
                        tenantEmail={form.tenantEmail}
                        setTenantEmail={form.setTenantEmail}
                        tenantTelefonesList={form.tenantTelefonesList}
                        setTenantTelefonesList={form.setTenantTelefonesList}
                        tenantRg={form.tenantRg}
                        setTenantRg={form.setTenantRg}
                        tenantOrgao={form.tenantOrgao}
                        setTenantOrgao={form.setTenantOrgao}
                        tenantNacionalidade={form.tenantNacionalidade}
                        setTenantNacionalidade={form.setTenantNacionalidade}
                        tenantProfissao={form.tenantProfissao}
                        setTenantProfissao={form.setTenantProfissao}
                        tenantDataNasc={form.tenantDataNasc}
                        setTenantDataNasc={form.setTenantDataNasc}
                        tenantRendaMensal={form.tenantRendaMensal}
                        setTenantRendaMensal={form.setTenantRendaMensal}
                        tenantRne={form.tenantRne}
                        setTenantRne={form.setTenantRne}
                        tenantEstadoCivil={form.tenantEstadoCivil}
                        setTenantEstadoCivil={form.setTenantEstadoCivil}
                        tenantGenero={form.tenantGenero}
                        setTenantGenero={form.setTenantGenero}
                        tenantCep={form.tenantCep}
                        setTenantCep={form.setTenantCep}
                        tenantLogradouro={form.tenantLogradouro}
                        setTenantLogradouro={form.setTenantLogradouro}
                        tenantNumero={form.tenantNumero}
                        setTenantNumero={form.setTenantNumero}
                        tenantComplemento={form.tenantComplemento}
                        setTenantComplemento={form.setTenantComplemento}
                        tenantBairro={form.tenantBairro}
                        setTenantBairro={form.setTenantBairro}
                        tenantCidade={form.tenantCidade}
                        setTenantCidade={form.setTenantCidade}
                        tenantEstado={form.tenantEstado}
                        setTenantEstado={form.setTenantEstado}
                        conjugeNome={form.conjugeNome}
                        setConjugeNome={form.setConjugeNome}
                        conjugeCpf={form.conjugeCpf}
                        setConjugeCpf={form.setConjugeCpf}
                        conjugeEmail={form.conjugeEmail}
                        setConjugeEmail={form.setConjugeEmail}
                        conjugeRg={form.conjugeRg}
                        setConjugeRg={form.setConjugeRg}
                        conjugeOrgao={form.conjugeOrgao}
                        setConjugeOrgao={form.setConjugeOrgao}
                        conjugeDataNasc={form.conjugeDataNasc}
                        setConjugeDataNasc={form.setConjugeDataNasc}
                        conjugeProfissao={form.conjugeProfissao}
                        setConjugeProfissao={form.setConjugeProfissao}
                        conjugeRendaMensal={form.conjugeRendaMensal}
                        setConjugeRendaMensal={form.setConjugeRendaMensal}
                        conjugeNacionalidade={form.conjugeNacionalidade}
                        setConjugeNacionalidade={form.setConjugeNacionalidade}
                        conjugeRne={form.conjugeRne}
                        setConjugeRne={form.setConjugeRne}
                        conjugeTelefonesList={form.conjugeTelefonesList}
                        setConjugeTelefonesList={form.setConjugeTelefonesList}
                        docPessoalUrl={form.docPessoalUrl}
                        setDocPessoalUrl={form.setDocPessoalUrl}
                        comprovanteResidenciaUrl={form.comprovanteResidenciaUrl}
                        setComprovanteResidenciaUrl={form.setComprovanteResidenciaUrl}
                        holeriteConjugeUrl={form.holeriteConjugeUrl}
                        setHoleriteConjugeUrl={form.setHoleriteConjugeUrl}
                        holerite1NilsonUrl={form.holerite1NilsonUrl}
                        setHolerite1NilsonUrl={form.setHolerite1NilsonUrl}
                        holerite2NilsonUrl={form.holerite2NilsonUrl}
                        setHolerite2NilsonUrl={form.setHolerite2NilsonUrl}
                        addFiador={form.addFiador}
                        setAddFiador={form.setAddFiador}
                        fiadorNome={form.fiadorNome}
                        setFiadorNome={form.setFiadorNome}
                        fiadorCpf={form.fiadorCpf}
                        setFiadorCpf={form.setFiadorCpf}
                        fiadorEmail={form.fiadorEmail}
                        setFiadorEmail={form.setFiadorEmail}
                        fiadorTelefone={form.fiadorTelefone}
                        setFiadorTelefone={form.setFiadorTelefone}
                        fiadorRg={form.fiadorRg}
                        setFiadorRg={form.setFiadorRg}
                        fiadorOrgao={form.fiadorOrgao}
                        setFiadorOrgao={form.setFiadorOrgao}
                        fiadorNacionalidade={form.fiadorNacionalidade}
                        setFiadorNacionalidade={form.setFiadorNacionalidade}
                        fiadorProfissao={form.fiadorProfissao}
                        setFiadorProfissao={form.setFiadorProfissao}
                        fiadorDataNasc={form.fiadorDataNasc}
                        setFiadorDataNasc={form.setFiadorDataNasc}
                        fiadorEstadoCivil={form.fiadorEstadoCivil}
                        setFiadorEstadoCivil={form.setFiadorEstadoCivil}
                        fiadorGenero={form.fiadorGenero}
                        setFiadorGenero={form.setFiadorGenero}
                        fiadorCep={form.fiadorCep}
                        setFiadorCep={form.setFiadorCep}
                        fiadorLogradouro={form.fiadorLogradouro}
                        setFiadorLogradouro={form.setFiadorLogradouro}
                        fiadorNumero={form.fiadorNumero}
                        setFiadorNumero={form.setFiadorNumero}
                        fiadorComplemento={form.fiadorComplemento}
                        setFiadorComplemento={form.setFiadorComplemento}
                        fiadorBairro={form.fiadorBairro}
                        setFiadorBairro={form.setFiadorBairro}
                        fiadorCidade={form.fiadorCidade}
                        setFiadorCidade={form.setFiadorCidade}
                        fiadorEstado={form.fiadorEstado}
                        setFiadorEstado={form.setFiadorEstado}
                        isSavingLocatario={form.isSavingLocatario}
                        handleCreateTenantAndFiador={form.handleCreateTenantAndFiador}
                        setModalView={form.setModalView}
                        isEditing={form.modalView === 'EDIT_TENANT'}
                    />
                ) : form.modalView === 'EDIT_LANDLORD' ? (
                    <form onSubmit={form.handleUpdateLocador} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                        <h4 className="text-sm font-bold text-[#004777]">Editar Proprietário (Locador)</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Nome Completo</label>
                                <input type="text" value={form.locadorNome} onChange={e => form.setLocadorNome(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">CPF/CNPJ</label>
                                <input type="text" value={form.locadorCpf} onChange={e => form.setLocadorCpf(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">E-mail</label>
                                <input type="email" value={form.locadorEmail} onChange={e => form.setLocadorEmail(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Telefone</label>
                                <input type="text" value={form.locadorTelefone} onChange={e => form.setLocadorTelefone(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">CEP</label>
                                <input type="text" value={form.locadorCep} onChange={e => form.setLocadorCep(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Logradouro</label>
                                <input type="text" value={form.locadorLogradouro} onChange={e => form.setLocadorLogradouro(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Número</label>
                                <input type="text" value={form.locadorNumero} onChange={e => form.setLocadorNumero(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Bairro</label>
                                <input type="text" value={form.locadorBairro} onChange={e => form.setLocadorBairro(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Cidade</label>
                                <input type="text" value={form.locadorCidade} onChange={e => form.setLocadorCidade(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Estado</label>
                                <input type="text" value={form.locadorEstado} onChange={e => form.setLocadorEstado(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => form.setModalView('MAIN')} className="border border-zinc-200 rounded px-4 py-2 text-xs">Cancelar</button>
                            <button type="submit" disabled={form.isSavingLocador} className="bg-[#004777] text-white rounded px-4 py-2 text-xs">{form.isSavingLocador ? 'Salvando...' : 'Salvar Proprietário'}</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={form.handleUpdateImovel} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                        <h4 className="text-sm font-bold text-[#004777]">Editar Imóvel</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Tipo de Imóvel</label>
                                <select value={form.imovelTipo} onChange={e => form.setImovelTipo(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white">
                                    <option value="CASA">Casa</option>
                                    <option value="APARTAMENTO">Apartamento</option>
                                    <option value="COMERCIAL">Comercial</option>
                                    <option value="LOTE">Lote</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">CEP</label>
                                <input type="text" value={form.imovelCep} onChange={e => form.setImovelCep(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Cidade</label>
                                <input type="text" value={form.imovelCidade} onChange={e => form.setImovelCidade(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Estado (UF)</label>
                                <input type="text" value={form.imovelUf} onChange={e => form.setImovelUf(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Bairro</label>
                                <input type="text" value={form.imovelBairro} onChange={e => form.setImovelBairro(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Número</label>
                                <input type="text" value={form.imovelNumero} onChange={e => form.setImovelNumero(e.target.value)} required className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                            <div className="flex flex-col">
                                <label className="font-semibold text-gray-500 mb-1">Área (m²)</label>
                                <input type="text" value={form.imovelArea} onChange={e => form.setImovelArea(e.target.value)} className="border border-zinc-200 rounded px-2.5 py-1.5 bg-white" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button type="button" onClick={() => form.setModalView('MAIN')} className="border border-zinc-200 rounded px-4 py-2 text-xs">Cancelar</button>
                            <button type="submit" disabled={form.isSavingImovel} className="bg-[#004777] text-white rounded px-4 py-2 text-xs">{form.isSavingImovel ? 'Salvando...' : 'Salvar Imóvel'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}