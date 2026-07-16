'use client';

import { useState, useEffect, useMemo } from 'react';
import { Settings, FilePlus, RefreshCw, FileText, Upload, Trash2, Plus, X, Loader2, Check } from 'lucide-react';
import LocacaoApartamentosTemplate from '@/lib/templates/LocacaoontratoLocacaoApartamentos';
import LocacaoResidencialSimplesTemplate from '@/lib/templates/LocacaocontratoResidencialSimples';
import LocacaoResidencialCompletoTemplate from '@/lib/templates/LocacaocontratoResidencialCompleto';

interface ContractTemplate {
  id: string;
  name: string;
  type: 'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA';
  content: string;
  variables?: string[];
  isDefault?: boolean;
}

// FUNÇÃO 1: Visualização com destaque inteligente para delimitadores
export function renderRichTemplateWithHighlights(content: string) {
  if (!content) return null;
  // Colapsa múltiplos espaços horizontais e tabs para texto corrido limpo
  const cleanContent = content.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n');
  
  // Destaca duplos delimitadores {{VAR}}
  let processed = cleanContent.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="text-[#966b1d] bg-[#F0D18A]/20 font-mono font-semibold border-b border-dashed border-[#966b1d] px-1 rounded-sm" title="Placeholder: $1">{{$1}}</span>'
  );
  // Destaca delimitadores com cifrão ${VAR}
  processed = processed.replace(
    /\$\{([^}]+)\}/g,
    '<span class="text-[#966b1d] bg-[#F0D18A]/20 font-mono font-semibold border-b border-dashed border-[#966b1d] px-1 rounded-sm" title="Placeholder: $1">\${$1}</span>'
  );
  // Destaca delimitadores simples {VAR} (sem capturar chaves duplas)
  processed = processed.replace(
    /(?<!\{)\{([^}:<=]+)\}(?!\})/g,
    '<span class="text-[#966b1d] bg-[#F0D18A]/20 font-mono font-semibold border-b border-dashed border-[#966b1d] px-1 rounded-sm" title="Placeholder: $1">{$1}</span>'
  );
  
  return (
    <div
      className="html-contract-view whitespace-pre-wrap text-left font-serif leading-relaxed text-gray-800 p-8 bg-white border border-gray-200 shadow-sm rounded-xl max-w-4xl mx-auto"
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

// FUNÇÃO 2: Visualização na aba "Gerar Contrato"
export function renderLivePreview(htmlContent: string, data: Record<string, string>, settings: Record<string, string>) {
  if (!htmlContent) return null;
  // Colapsa múltiplos espaços horizontais e tabs para texto corrido limpo
  const cleanHtmlContent = htmlContent.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n');

  let processedHtml = cleanHtmlContent;
  const allData = { ...data, ...settings };

  // Regex para encontrar todas as tags
  const matches = [...cleanHtmlContent.matchAll(/\{\{([^}]+)\}\}/g)];

  matches.forEach(match => {
    const fullTag = match[0];
    const key = match[1].trim();
    // Tenta encontrar o valor usando a chave exata, em maiúsculo ou minúsculo
    const value = allData[key] || allData[key.toUpperCase()] || allData[key.toLowerCase()];

    if (value) {
      processedHtml = processedHtml.replace(fullTag, `<span class="text-[#004777] font-bold underline decoration-[#004777]/30">${value}</span>`);
    } else {
      processedHtml = processedHtml.replace(fullTag, `<span class="bg-[#F0D18A]/40 text-[#966b1d] font-mono text-xs px-1.5 py-0.5 rounded border border-dashed border-[#966b1d]/40">${key}</span>`);
    }
  });

  return (
    <div
      className="html-contract-view whitespace-pre-wrap text-left font-serif leading-relaxed text-gray-800 p-8 bg-white border border-gray-200 shadow-sm rounded-xl max-w-4xl mx-auto"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}

export default function ContratosPage() {
  const [activeTab, setActiveTab] = useState<'gerar' | 'modelos' | 'config'>('gerar');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({
    SYS_NOME_IMOBILIARIA: '',
    SYS_RAZAO_SOCIAL_IMOBILIARIA: '',
    SYS_CNPJ_IMOBILIARIA: '',
    SYS_CRECI_IMOBILIARIA: '',
    SYS_NOME_REPRESENTANTE: '',
    SYS_ENDERECO_IMOBILIARIA: '',
    SYS_TELEFONE_IMOBILIARIA: '',
    SYS_EMAIL_IMOBILIARIA: '',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estado para upload de novos templates
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA'>('LOCACAO');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [extractedVars, setExtractedVars] = useState<string[]>([]);

  const selectedModel = templates.find((m) => m.id === selectedId);

  const { operatorVariables } = useMemo(() => {
    if (!selectedModel) return { operatorVariables: [] };
    
    // Se o template já veio com a lista de variáveis extraídas do .docx
    if (selectedModel.variables && selectedModel.variables.length > 0) {
      return { operatorVariables: selectedModel.variables.filter(key => !key.startsWith('SYS_')) };
    }
    
    // Fallback: extração manual por regex se for template estático antigo
    const matches = [...selectedModel.content.matchAll(/\{\{([^}]+)\}\}/g)];
    const allKeys = Array.from(new Set(matches.map(m => m[1].trim())));
    return { operatorVariables: allKeys.filter(key => !key.startsWith('SYS_')) };
  }, [selectedModel]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/contratos/modelos');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          setSelectedId((prev) => (data.some((t: any) => t.id === prev) ? prev : data[0].id));
        }
      }
    } catch (e) {
      console.error('Erro ao buscar templates', e);
    }
  };

  const fetchImobSettings = async () => {
    try {
      const res = await fetch('/api/contratos/imob-settings');
      if (res.ok) {
        const data = await res.json();
        setCompanySettings(data.settings);
      }
    } catch (e) {
      console.error('Erro ao buscar configurações da imobiliária', e);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/contratos/imob-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companySettings),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de rede ao salvar configurações.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchImobSettings();
  }, []);

  const handleGenerateDocument = async () => {
    if (!selectedModel) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/contratos/gerar-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedModel.id,
          fields: { ...formData, ...companySettings }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro ao gerar contrato: ${err.error}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const nameMatch = disposition.match(/filename="(.+)"/);
      a.download = nameMatch ? nameMatch[1] : 'contrato.docx';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Erro de rede ao gerar documento.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newTemplateName || !newTemplateType) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('name', newTemplateName);
      form.append('type', newTemplateType);

      const res = await fetch('/api/contratos/modelos/upload', {
        method: 'POST',
        body: form
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedVars(data.template.variables);
        setUploadSuccess(true);
        await fetchTemplates();
        
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadSuccess(false);
          setSelectedFile(null);
          setNewTemplateName('');
          setExtractedVars([]);
        }, 3000);
      } else {
        const err = await res.json();
        alert(`Erro ao enviar: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de rede ao fazer upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Deseja realmente excluir este modelo de contrato? Esta ação é permanente.')) return;
    try {
      const res = await fetch(`/api/contratos/modelos?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchTemplates();
      } else {
        const err = await res.json();
        alert(`Erro ao excluir: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir template.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-6rem)]">
      <style jsx global>{`
        .html-contract-view-wrapper {
          background-color: #f9fafb;
          padding: 2.5rem 1.5rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          min-height: 100%;
          box-sizing: border-box;
        }
        .word-document {
          background-color: #ffffff;
          width: 100%;
          max-width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
          padding: 3cm 2cm 3cm 3cm; /* Standard Word/Legal margins */
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000000;
        }
        .word-document p {
          text-align: justify;
          text-indent: 2.5em;
          margin-top: 0;
          margin-bottom: 12pt;
        }
        .word-document h1, 
        .word-document h2, 
        .word-document h3 {
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
          margin-top: 18pt;
          margin-bottom: 12pt;
          text-indent: 0 !important;
        }
        .word-document h1 {
          font-size: 14pt;
        }
        .word-document h2 {
          font-size: 12pt;
        }
        .word-document h3 {
          font-size: 11pt;
        }
        .word-document strong {
          font-weight: bold;
        }
        .word-document ul, 
        .word-document ol {
          margin-top: 0;
          margin-bottom: 12pt;
          padding-left: 20pt;
        }
        .word-document li {
          margin-bottom: 6pt;
          text-align: justify;
        }
        .word-document .signature-section {
          margin-top: 40pt;
          display: flex;
          flex-direction: column;
          gap: 24pt;
        }
        .word-document .signature-section p {
          text-indent: 0 !important;
          margin-bottom: 0;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Gestão de Contratos</h1>
          <button
            onClick={fetchTemplates}
            className="text-xs text-gray-500 hover:text-[#004777] border border-gray-200 hover:border-[#004777]/30 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-gray-50 hover:bg-blue-50/40 font-medium"
            title="Atualizar lista de templates a partir do servidor"
          >
            <RefreshCw size={12} />
            Sincronizar Modelos
          </button>
        </div>
        <div className="flex gap-2 bg-[#EEEEF3] p-1 rounded-xl">
          {(['gerar', 'modelos', 'config'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>
              {tab === 'gerar' ? 'Gerar Contrato' : tab === 'modelos' ? 'Modelos & Templates' : 'Configurações'}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-h-0">

        {activeTab === 'gerar' && (
          <div className="flex gap-6 h-full min-h-0">
            <div className="w-80 bg-white rounded-2xl p-5 border border-black/5 flex flex-col gap-4 overflow-y-auto">
              <label className="text-xs uppercase font-bold text-gray-500">Selecione o Modelo</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full p-2 border rounded-xl bg-gray-50 border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]">
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <div className="border-t border-gray-100 pt-4 flex-1 flex flex-col gap-3">
                <span className="text-xs uppercase font-bold text-gray-500">Dados do Documento</span>
                {operatorVariables.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhuma variável customizável detectada neste template.</p>
                ) : (
                  operatorVariables.map(v => (
                    <div key={v} className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-600">{v.replace(/_/g, ' ')}</label>
                      <input placeholder={v.replace(/_/g, ' ')} onChange={e => setFormData({ ...formData, [v]: e.target.value })} className="border p-2 rounded-xl text-sm bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004777]" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 bg-gray-50 rounded-2xl p-6 overflow-y-auto border border-black/5 flex flex-col gap-4">
              <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100">
                {selectedModel && renderLivePreview(selectedModel.content, formData, companySettings)}
              </div>
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                <span className="text-sm text-gray-500">Preencha os campos para visualizar as alterações em tempo real</span>
                <button onClick={handleGenerateDocument} disabled={isGenerating} className="bg-[#004777] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#00365c] transition-colors disabled:opacity-50 flex items-center gap-2">
                  <FileText size={18} />
                  {isGenerating ? 'Gerando...' : 'Gerar Documento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white p-8 rounded-2xl border border-black/5 shadow-sm max-w-4xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Configurações da Empresa</h2>
              <p className="text-sm text-gray-500">Estes valores são carregados do perfil da imobiliária e substituem as variáveis <code className="bg-amber-50 text-amber-700 px-1 rounded font-mono text-xs">SYS_*</code> em todos os contratos gerados.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['SYS_NOME_IMOBILIARIA', 'Nome Fantasia da Imobiliária'],
                ['SYS_RAZAO_SOCIAL_IMOBILIARIA', 'Razão Social'],
                ['SYS_CNPJ_IMOBILIARIA', 'CNPJ'],
                ['SYS_CRECI_IMOBILIARIA', 'CRECI'],
                ['SYS_NOME_REPRESENTANTE', 'Nome do Representante / Corretor'],
                ['SYS_ENDERECO_IMOBILIARIA', 'Endereço Completo'],
                ['SYS_TELEFONE_IMOBILIARIA', 'Telefone'],
                ['SYS_EMAIL_IMOBILIARIA', 'E-mail de Contato'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase font-bold text-gray-600 flex items-center gap-1.5">
                    {label}
                    <span className="font-mono text-[9px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded normal-case">{key}</span>
                  </label>
                  <input
                    value={companySettings[key] || ''}
                    onChange={e => setCompanySettings({ ...companySettings, [key]: e.target.value })}
                    className="w-full border p-2.5 rounded-xl bg-gray-50 border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004777] text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="bg-[#004777] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#00365c] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {isSavingSettings ? (
                  <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                ) : (
                  <><Settings size={16} /> Salvar Configurações</>
                )}
              </button>
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <Check size={16} /> Salvo com sucesso!
                </span>
              )}
              <p className="text-xs text-gray-400 ml-auto">Os dados do perfil principal ficam em <strong>Configurações → Imobiliária</strong>.</p>
            </div>
          </div>
        )}

        {activeTab === 'modelos' && (
          <div className="flex gap-6 h-full min-h-0">
            {/* Sidebar list */}
            <div className="w-80 bg-white rounded-2xl p-5 border border-black/5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-xs uppercase font-bold text-gray-500">Modelos de Contratos</span>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#004777] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#00365c] transition-all"
                >
                  <Upload size={12} />
                  Upload .docx
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                      selectedId === t.id
                        ? 'border-[#004777] bg-blue-50/20 shadow-sm'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-semibold text-gray-900 truncate pr-2">{t.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        t.type === 'LOCACAO' ? 'bg-[#708D81]/15 text-[#708D81]' :
                        t.type === 'VENDA' ? 'bg-[#966b1d]/15 text-[#966b1d]' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {t.isDefault ? 'Padrão Scatolin' : 'Carregado via Word'}
                      </span>
                      {!t.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(t.id);
                          }}
                          className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Excluir este modelo"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview pane */}
            <div className="flex-1 bg-gray-50 p-6 rounded-2xl border border-black/5 overflow-y-auto h-full max-h-[calc(100vh-12rem)] flex flex-col gap-4">
              {selectedModel ? (
                <div className="w-full">
                  <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{selectedModel.name}</h3>
                      <p className="text-xs text-gray-400">Tipo: {selectedModel.type} | Variáveis: {selectedModel.variables?.length ?? 0}</p>
                    </div>
                    {!selectedModel.isDefault && (
                      <button
                        onClick={() => handleDeleteTemplate(selectedModel.id)}
                        className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-100/60 transition-colors"
                      >
                        <Trash2 size={14} />
                        Excluir Template
                      </button>
                    )}
                  </div>
                  {renderRichTemplateWithHighlights(selectedModel.content)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <FileText size={40} className="stroke-[1.5]" />
                  <p className="text-sm italic">Nenhum modelo selecionado.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#004777]" />
                <h3 className="text-base font-bold">Enviar Novo Template (.docx)</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadSuccess(false);
                  setSelectedFile(null);
                  setNewTemplateName('');
                }}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadTemplate} className="p-6 space-y-4">
              {!uploadSuccess ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nome do Modelo</label>
                    <input
                      type="text"
                      required
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Ex: Contrato de Locação Residencial Curto"
                      className="px-3.5 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Tipo do Contrato</label>
                    <select
                      value={newTemplateType}
                      onChange={(e: any) => setNewTemplateType(e.target.value)}
                      className="px-3.5 py-2 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    >
                      <option value="LOCACAO">Locação</option>
                      <option value="VENDA">Venda</option>
                      <option value="LIMPEZA">Limpeza</option>
                      <option value="PROPOSTA">Proposta / Outros</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Arquivo Word (.docx)</label>
                    <input
                      type="file"
                      required
                      accept=".docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="px-3.5 py-2 border border-zinc-200 border-dashed rounded-xl text-sm focus:outline-none bg-zinc-50"
                    />
                    <p className="text-[10px] text-gray-400">O arquivo deve conter placeholders como {"{nome_cliente}"} ou {"{{NOME_LOCATARIO}}"}.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold border border-zinc-200 rounded-lg hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || !selectedFile}
                      className="bg-[#004777] hover:bg-[#003355] text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Fazer Upload'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 animate-bounce">
                    <Check size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Upload Concluído!</h4>
                    <p className="text-xs text-gray-500 mt-1">O template foi analisado e adicionado à base de dados.</p>
                  </div>
                  {extractedVars.length > 0 && (
                    <div className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-left">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Variáveis Detectadas ({extractedVars.length})
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {extractedVars.map((v) => (
                          <span key={v} className="bg-[#F0D18A]/20 text-[#8B7535] font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#F0D18A]/35">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}