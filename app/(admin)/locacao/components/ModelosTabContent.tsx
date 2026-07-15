"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Settings, Download, Printer, Check, Info, Loader2 } from 'lucide-react';
import { ContractRenderer } from '@/components/contratos/ContractRenderer'; // Ajuste o caminho se necessário

// Definições de tipos
export interface ContractTemplate {
    id: string;
    name: string;
    type: 'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA';
    content: string;
    variables?: string[];
    isDefault?: boolean;
}

interface ModelosTabContentProps {
    templates: ContractTemplate[];
    selectedTemplateId: string;
    onSelectTemplate: (id: string) => void;
    contractFields: Record<string, string>;
    setContractFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    onSaveTemplate: (id: string, name: string, content: string) => void;
}

// Chaves padrão para não serem duplicadas nos "Campos Extra"
const STANDARD_KEYS = new Set([
    'NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR', 'NACIONALIDADE_LOCADOR', 'ESTADO_CIVIL_LOCADOR', 'PROFISSÃO_LOCADOR', 'CIDADE_LOCADOR', 'ESTADO_LOCADOR', 'CEP_LOCADOR',
    'NOME_LOCATARIO', 'CPF_LOCATARIO', 'RG_LOCATARIO', 'ENDERECO_ATUAL_LOCATARIO', 'NACIONALIDADE_LOCATARIO', 'ESTADO_CIVIL_LOCATARIO', 'PROFISSÃO_LOCATARIO', 'CIDADE_LOCATARIO', 'ESTADO_LOCATARIO', 'CEP_LOCATARIO',
    'NOME_FIADOR', 'CPF_FIADOR', 'RG_FIADOR', 'ENDERECO_FIADOR', 'NACIONALIDADE_FIADOR', 'ESTADO_CIVIL_FIADOR', 'PROFISSÃO_FIADOR', 'CIDADE_FIADOR', 'ESTADO_FIADOR', 'CEP_FIADOR',
    'NOME_FIADOR2', 'CPF_FIADOR2', 'RG_FIADOR2', 'NACIONALIDADE_FIADOR2', 'ESTADO_CIVIL_FIADOR2', 'PROFISSÃO_FIADOR2',
    'ENDERECO_IMOVEL', 'BAIRRO_IMOVEL', 'CIDADE_IMOVEL', 'ESTADO_IMOVEL', 'CEP_IMOVEL',
    'VALOR_ALUGUEL', 'VALOR_ALUGUEL_EXTENSO', 'VALOR_BONIFICACAO', 'VALOR_BONIFICACAO_EXTENSO', 'VALOR_ALUGUEL_BONIFICADO', 'VALOR_ALUGUEL_BONIFICADO_EXTENSO', 'VALOR_CONDOMINIO', 'VALOR_IPTU', 'VALOR_ALUGUEL_APOS_MESES', 'VALOR_ALUGUEL_APOS_MESES_EXTENSO',
    'PRAZO_MESES', 'PRAZO_CONTRATO', 'DATA_INICIO', 'DATA_FIM', 'DIA_VENCIMENTO', 'DIA_PAGAMENTO_BONIFICADO', 'CIDADE_CONTRATO', 'DATA_ATUAL',
    'DADOS_BANCARIOS_REPASSE', 'TAXA_LIMPEZA', 'TAXA_GAS', 'PROPRIETARIO_IMOVEL', 'DADOS_IMOVEL_CAUCAO',
    'MATRICULA_IMOBILIARIA_FIADOR', 'FICHA_IMOBILIARIA_FIADOR', 'ENDERECO_IMOBILIARIA_FIADOR'
]);

const typeColors: Record<string, string> = {
    LOCACAO: 'bg-blue-100 text-blue-700',
    VENDA: 'bg-emerald-100 text-emerald-700',
    LIMPEZA: 'bg-amber-100 text-amber-700',
    PROPOSTA: 'bg-purple-100 text-purple-700',
};

export default function ModelosTabContent({
    templates,
    selectedTemplateId,
    onSelectTemplate,
    contractFields,
    setContractFields,
    onSaveTemplate
}: ModelosTabContentProps) {

    // ── ESTADOS LOCAIS DO EDITOR ──
    const [templateMode, setTemplateMode] = useState<'fill' | 'edit'>('fill');
    const [templateName, setTemplateName] = useState('');
    const [templateContent, setTemplateContent] = useState('');
    const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

    // ── ESTADOS DE LAYOUT / IMPRESSÃO ──
    const [fontSize, setFontSize] = useState<number>(10);
    const [paddingTop, setPaddingTop] = useState<number>(4.5);
    const [paddingLeft, setPaddingLeft] = useState<number>(3.0);
    const [paddingRight, setPaddingRight] = useState<number>(2.5);
    const [paddingBottom, setPaddingBottom] = useState<number>(2.0);
    const [frameScale, setFrameScale] = useState<number>(1.0);
    const [showMoldura, setShowMoldura] = useState(true);
    const [estimatedPages, setEstimatedPages] = useState(1);

    const containerRef = useRef<HTMLDivElement>(null);

    // Sincroniza o conteúdo local quando o usuário clica em um template novo no menu lateral
    useEffect(() => {
        const current = templates.find(t => t.id === selectedTemplateId);
        if (current) {
            setTemplateName(current.name);
            setTemplateContent(current.content);
            setShowMoldura(current.isDefault ?? true);
            setTemplateMode('fill');
        }
    }, [selectedTemplateId, templates]);

    // Calcula páginas estimadas para a impressão contínua da moldura
    useEffect(() => {
        if (containerRef.current) {
            const heightPx = containerRef.current.scrollHeight;
            const heightCm = heightPx / 37.795;
            const pages = Math.max(1, Math.ceil(heightCm / 29.7));
            setEstimatedPages(pages);
        }
    }, [templateContent, contractFields, fontSize, paddingTop, paddingBottom]);

    // Descobre as variáveis customizadas do texto que não estão na lista padrão
    const customKeys = useMemo(() => {
        const matched = templates.find(t => t.id === selectedTemplateId);
        if (!matched) return [];
        if (matched.variables) {
            return matched.variables.filter(v => !STANDARD_KEYS.has(v) && !v.startsWith('SYS_'));
        }
        const matches = [...matched.content.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)];
        const allKeys = Array.from(new Set(matches.map(m => m[1])));
        return allKeys.filter(v => !STANDARD_KEYS.has(v) && !v.startsWith('SYS_'));
    }, [selectedTemplateId, templates]);

    // ── FUNÇÕES DE AÇÃO ──
    const handleDownloadDocx = async () => {
        if (!selectedTemplateId) return;
        setIsDownloadingDocx(true);
        try {
            const res = await fetch('/api/contratos/gerar-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: selectedTemplateId, fields: contractFields }),
            });

            if (!res.ok) throw new Error('Erro ao gerar arquivo');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${templateName || 'contrato'}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Erro ao tentar baixar o contrato. Verifique os logs.');
        } finally {
            setIsDownloadingDocx(false);
        }
    };

    const handleLocalSave = () => {
        onSaveTemplate(selectedTemplateId, templateName, templateContent);
        alert("Modelo de contrato atualizado com sucesso!");
    };

    return (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex min-h-[700px] overflow-hidden animate-fade-in">
            {/* ── BARRA LATERAL: LISTA DE MODELOS ── */}
            <div className="w-60 flex-shrink-0 border-r border-[#EEEEF3] bg-[#EEEEF3]/30 flex flex-col">
                <div className="px-4 py-4 border-b border-[#EEEEF3]">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modelos Pré-Definidos</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Clique para selecionar e usar</p>
                </div>
                <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
                    {templates.map(t => (
                        <button
                            key={t.id}
                            onClick={() => onSelectTemplate(t.id)}
                            className={`w-full text-left px-3 py-3 rounded-xl transition-all flex flex-col gap-1 ${t.id === selectedTemplateId
                                    ? 'bg-[#004777] text-white shadow-md'
                                    : 'hover:bg-white hover:shadow-sm text-[#280003]/80'
                                }`}
                        >
                            <p className={`text-xs font-semibold leading-tight ${t.id === selectedTemplateId ? 'text-white' : ''}`}>
                                {t.name}
                            </p>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${t.id === selectedTemplateId ? 'bg-white/20 text-white' : (typeColors[t.type] || 'bg-gray-100 text-gray-600')
                                }`}>
                                {t.type}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── ÁREA PRINCIPAL DO EDITOR ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedTemplateId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic flex-col gap-2">
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p>Selecione um modelo no painel esquerdo para começar.</p>
                    </div>
                ) : (
                    <>
                        {/* CABEÇALHO DO MODO DE EDIÇÃO */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EEEEF3] bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-base font-bold text-[#280003]">{templateName}</h2>
                                <p className="text-xs text-gray-500">Preencha os dados do cliente ou edite o texto do modelo</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-[#EEEEF3] p-0.5 rounded-lg">
                                    <button
                                        onClick={() => setTemplateMode('fill')}
                                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${templateMode === 'fill' ? 'bg-white text-[#004777] shadow-sm' : 'text-gray-500 hover:text-[#280003]'
                                            }`}
                                    >
                                        Preencher & Usar
                                    </button>
                                    {templates.find(t => t.id === selectedTemplateId)?.isDefault && (
                                        <button
                                            onClick={() => setTemplateMode('edit')}
                                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${templateMode === 'edit' ? 'bg-white text-[#004777] shadow-sm' : 'text-gray-500 hover:text-[#280003]'
                                                }`}
                                        >
                                            Editar Modelo
                                        </button>
                                    )}
                                </div>
                                {templateMode === 'fill' ? (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleDownloadDocx}
                                            disabled={isDownloadingDocx}
                                            className="flex items-center gap-1.5 bg-[#708D81] hover:bg-[#708D81]/90 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                                        >
                                            {isDownloadingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                            {isDownloadingDocx ? 'Gerando...' : 'Baixar DOCX'}
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex items-center gap-1.5 bg-[#004777] hover:bg-[#004777]/90 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Imprimir
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleLocalSave}
                                        className="flex items-center gap-1.5 bg-[#708D81] hover:bg-[#708D81]/90 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Salvar Modelo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* MODO PREENCHER: Formulários Laterais + Visualização A4 */}
                        {templateMode === 'fill' && (
                            <div className="flex flex-1 overflow-hidden">
                                {/* PAINEL ESQUERDO: Layout e Formulários */}
                                <div className="w-72 flex-shrink-0 border-r border-[#EEEEF3] overflow-y-auto px-5 py-4 space-y-4 bg-[#EEEEF3]/20">
                                    {/* Ajustes de Margens */}
                                    <div className="bg-[#004777]/5 p-3.5 rounded-xl border border-[#004777]/10 space-y-3">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#004777] uppercase tracking-wide">
                                            <Settings className="w-3.5 h-3.5" /> Ajustes de Layout
                                        </div>
                                        <div className="space-y-2 text-[11px]">
                                            <div>
                                                <div className="flex justify-between text-gray-500 font-semibold mb-1">
                                                    <span>Tamanho da Fonte:</span><span className="text-[#004777] font-bold">{fontSize}pt</span>
                                                </div>
                                                <input type="range" min="8" max="16" step="0.5" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-gray-500 font-semibold mb-1">
                                                    <span>Recuo do Topo:</span><span className="text-[#004777] font-bold">{paddingTop}cm</span>
                                                </div>
                                                <input type="range" min="1" max="6" step="0.1" value={paddingTop} onChange={e => setPaddingTop(Number(e.target.value))} className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-gray-500 font-semibold mb-1">
                                                    <span>Margem Esquerda:</span><span className="text-[#004777] font-bold">{paddingLeft}cm</span>
                                                </div>
                                                <input type="range" min="1" max="6" step="0.1" value={paddingLeft} onChange={e => setPaddingLeft(Number(e.target.value))} className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-gray-500 font-semibold mb-1">
                                                    <span>Margem Direita:</span><span className="text-[#004777] font-bold">{paddingRight}cm</span>
                                                </div>
                                                <input type="range" min="1" max="6" step="0.1" value={paddingRight} onChange={e => setPaddingRight(Number(e.target.value))} className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-gray-500 font-semibold mb-1">
                                                    <span>Margem Inferior:</span><span className="text-[#004777] font-bold">{paddingBottom}cm</span>
                                                </div>
                                                <input type="range" min="1" max="6" step="0.1" value={paddingBottom} onChange={e => setPaddingBottom(Number(e.target.value))} className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]" />
                                            </div>
                                            <div className="pt-2 border-t border-[#004777]/10 flex items-center justify-between">
                                                <span className="text-gray-500 font-semibold text-xs">Exibir Moldura:</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={showMoldura} onChange={e => setShowMoldura(e.target.checked)} className="sr-only peer" />
                                                    <div className="w-8 h-4 bg-zinc-200 rounded-full peer peer-checked:bg-[#004777] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Campos Extras (Não listados nativamente no form do modal) */}
                                    {customKeys.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-dashed border-[#EEEEF3]">
                                            <div className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-[#004777]/10 pb-2 mb-3">
                                                Campos Extra do Modelo
                                            </div>
                                            <div className="space-y-3">
                                                {customKeys.map(key => (
                                                    <div key={key} className="flex flex-col gap-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">{key.replace(/_/g, ' ')}</label>
                                                        <input
                                                            type="text"
                                                            value={contractFields[key] || ''}
                                                            onChange={e => setContractFields(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* PAINEL DIREITO: Visualização A4 Live */}
                                <div className="flex-1 overflow-y-auto bg-[#d0d0d0] p-8 flex justify-start lg:justify-center overflow-x-auto">
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                        @media print {
                                            body * { visibility: hidden !important; }
                                            .contract-print-area, .contract-print-area * { visibility: visible !important; }
                                            .contract-print-area {
                                                position: absolute !important; left: 0 !important; top: 0 !important;
                                                width: 210mm !important; min-height: 297mm !important;
                                                background: white !important; box-shadow: none !important; border: none !important;
                                                box-sizing: border-box !important;
                                            }
                                            .contract-print-content {
                                                padding: var(--print-padding-top, 3.5cm) var(--print-padding-right, 2cm) var(--print-padding-bottom, 2cm) var(--print-padding-left, 3cm) !important;
                                                box-sizing: border-box !important;
                                            }
                                            @page { size: A4; margin: 0; }
                                        }
                                        `}}
                                    />
                                    <div
                                        ref={containerRef}
                                        className="contract-print-area"
                                        style={{
                                            background: '#fff', width: '210mm', minHeight: `${estimatedPages * 29.7}cm`,
                                            boxShadow: '0 4px 32px rgba(0,0,0,0.18)', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000',
                                            position: 'relative', boxSizing: 'border-box',
                                            '--print-padding-top': `${paddingTop}cm`, '--print-padding-right': `${paddingRight}cm`,
                                            '--print-padding-bottom': `${paddingBottom}cm`, '--print-padding-left': `${paddingLeft}cm`,
                                        } as React.CSSProperties}
                                    >
                                        {/* Molduras para cada página */}
                                        {showMoldura && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                                                {Array.from({ length: estimatedPages }).map((_, index) => (
                                                    <div key={index} style={{ position: 'absolute', top: `${index * 29.7}cm`, left: 0, width: '100%', height: '29.7cm', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                        <div style={{ width: `${frameScale * 100}%`, height: `${frameScale * 100}%`, position: 'relative' }}>
                                                            <img src="/lais.svg" alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* O Conteúdo do Contrato ABNT */}
                                        <div
                                            className="contract-print-content"
                                            style={{
                                                paddingTop: `${paddingTop}cm`, paddingRight: `${paddingRight}cm`, paddingBottom: `${paddingBottom}cm`, paddingLeft: `${paddingLeft}cm`,
                                                boxSizing: 'border-box', position: 'relative', zIndex: 2, width: '100%', minHeight: '100%'
                                            }}
                                        >
                                            <ContractRenderer
                                                content={templateContent}
                                                data={contractFields}
                                                fontSize={fontSize}
                                                onChange={(key, val) => setContractFields(prev => ({ ...prev, [key]: val }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODO EDITAR: Editor Raw de Texto */}
                        {templateMode === 'edit' && (
                            <div className="flex flex-1 overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-6 bg-[#EEEEF3]">
                                    <div className="bg-white rounded-xl shadow-sm border border-[#EEEEF3] p-6 flex flex-col gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Título do Modelo</label>
                                            <input
                                                type="text"
                                                value={templateName}
                                                onChange={e => setTemplateName(e.target.value)}
                                                className="px-4 py-2 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Texto do Contrato</label>
                                                <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Use tags como {'{{NOME_LOCATARIO}}'} para campos dinâmicos
                                                </span>
                                            </div>
                                            <textarea
                                                value={templateContent}
                                                onChange={e => setTemplateContent(e.target.value)}
                                                rows={24}
                                                className="px-4 py-3 border border-[#280003]/10 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#004777]/20 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}