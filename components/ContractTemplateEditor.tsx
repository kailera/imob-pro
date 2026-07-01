import React, { useRef, useState } from 'react';
import { Sparkles, Save, HelpCircle, Code, PlusCircle, Check } from 'lucide-react';

interface VariableTag {
  code: string;
  label: string;
  description: string;
}

interface VariableCategory {
  category: string;
  tags: VariableTag[];
}

const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    category: 'Locador / Proprietário',
    tags: [
      { code: '{{NOME_LOCADOR}}', label: 'Nome', description: 'Nome completo do proprietário/locador' },
      { code: '{{CPF_LOCADOR}}', label: 'CPF', description: 'CPF do proprietário/locador' },
      { code: '{{RG_LOCADOR}}', label: 'RG', description: 'RG do proprietário/locador' },
      { code: '{{ENDERECO_LOCADOR}}', label: 'Endereço', description: 'Endereço residencial do locador' },
    ],
  },
  {
    category: 'Locatário / Inquilino / Cliente',
    tags: [
      { code: '{{NOME_LOCATARIO}}', label: 'Nome', description: 'Nome completo do cliente/locatário' },
      { code: '{{CPF_LOCATARIO}}', label: 'CPF', description: 'CPF do inquilino/locatário' },
      { code: '{{RG_LOCATARIO}}', label: 'RG', description: 'RG do inquilino/locatário' },
      { code: '{{ENDERECO_ATUAL_LOCATARIO}}', label: 'Endereço Atual', description: 'Endereço atual do locatário' },
    ],
  },
  {
    category: 'Imóvel',
    tags: [
      { code: '{{ENDERECO_IMOVEL}}', label: 'Endereço Imóvel', description: 'Endereço completo do imóvel alugado/vendido' },
      { code: '{{DESCRICAO_COMODOS}}', label: 'Comodõs / Descrição', description: 'Número de cômodos, quartos, banheiros, etc.' },
      { code: '{{VALOR_ALUGUEL}}', label: 'Valor Aluguel', description: 'Valor mensal do aluguel' },
      { code: '{{VALOR_CONDOMINIO}}', label: 'Condomínio', description: 'Valor estimado da taxa de condomínio' },
      { code: '{{VALOR_IPTU}}', label: 'Valor IPTU', description: 'Valor estimado do imposto municipal' },
    ],
  },
  {
    category: 'Serviços & Limpeza',
    tags: [
      { code: '{{NOME_PRESTADOR}}', label: 'Prestador', description: 'Nome do prestador do serviço de limpeza' },
      { code: '{{CPF_PRESTADOR}}', label: 'CPF Prestador', description: 'CPF ou CNPJ do prestador de limpeza' },
      { code: '{{VALOR_SERVICO}}', label: 'Valor Serviço', description: 'Preço fixado da diária ou serviço mensal' },
      { code: '{{FREQUENCIA_LIMPEZA}}', label: 'Frequência', description: 'Ex: semanal, quinzenal, 2x por semana' },
    ],
  },
  {
    category: 'Valores & Venda',
    tags: [
      { code: '{{VALOR_VENDA}}', label: 'Preço Venda', description: 'Preço total de compra/venda do imóvel' },
      { code: '{{VALOR_SINAL}}', label: 'Sinal/Entrada', description: 'Valor pago como sinal de reserva' },
      { code: '{{VALOR_SINAL_EXTENSO}}', label: 'Sinal por Extenso', description: 'Valor do sinal por extenso' },
      { code: '{{DADOS_FINANCIAMENTO}}', label: 'Dados Financiamento', description: 'Condições de financiamento e saldo devedor' },
    ],
  },
  {
    category: 'Geral & Datas',
    tags: [
      { code: '{{PRAZO_MESES}}', label: 'Prazo (Meses)', description: 'Prazo de vigência em meses' },
      { code: '{{DATA_INICIO}}', label: 'Data Início', description: 'Data de início de vigência' },
      { code: '{{DATA_FIM}}', label: 'Data Fim', description: 'Data final do contrato' },
      { code: '{{DIA_VENCIMENTO}}', label: 'Vencimento (Dia)', description: 'Dia do mês para vencimento de pagamentos' },
      { code: '{{CHAVE_PIX_LOCADOR}}', label: 'Chave Pix', description: 'Chave Pix para depósito' },
      { code: '{{CIDADE_CONTRATO}}', label: 'Cidade Contrato', description: 'Cidade onde o contrato foi firmado' },
      { code: '{{DATA_ATUAL}}', label: 'Data Atual', description: 'Data atual em formato extenso (ex: 30 de Junho de 2026)' },
    ],
  },
];

interface ContractTemplateEditorProps {
  modelName: string;
  modelContent: string;
  onSave: (name: string, content: string) => void;
}

export function ContractTemplateEditor({ modelName, modelContent, onSave }: ContractTemplateEditorProps) {
  const [name, setName] = useState(modelName);
  const [content, setContent] = useState(modelContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with prop updates
  React.useEffect(() => {
    setName(modelName);
    setContent(modelContent);
  }, [modelName, modelContent]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(name, content);
      setIsSaving(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }, 800);
  };

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = content.substring(0, start) + tag + content.substring(end);
    
    setContent(newText);
    
    // Recalcular foco e manter o cursor logo após a tag inserida
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + tag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#EEEEF3] rounded-2xl overflow-hidden shadow-sm border border-black/5 relative">
      {/* Header Visualizer */}
      <div className="bg-[#280003] px-6 py-4 flex items-center justify-between text-white border-b border-[#004777]/20">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F0D18A]"></span>
          <span className="text-sm font-semibold opacity-90">Modo de Edição de Template</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#004777] hover:bg-[#004777]/90 disabled:bg-[#004777]/55 text-white px-5 py-2 rounded-lg font-medium shadow-md transition-all text-sm active:scale-95"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                Gravando...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Modelo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-14rem)]">
        
        {/* Left Side: A4 Page Editor */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
          <div className="bg-white rounded-md shadow-lg p-10 w-full max-w-3xl min-h-[1000px] flex flex-col text-[#280003] border border-[#EEEEF3]">
            {/* Input Name Template */}
            <div className="mb-6 pb-4 border-b border-[#EEEEF3]">
              <label className="block text-xs font-semibold text-[#004777] uppercase tracking-wider mb-1">
                Nome do Modelo de Contrato
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xl font-bold bg-transparent border-0 border-b border-transparent focus:border-[#004777]/30 pb-1 outline-none text-[#280003] placeholder-[#280003]/40"
                placeholder="Insira o nome do modelo..."
              />
            </div>

            {/* Simulated document body */}
            <div className="flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-[#280003] text-[14.5px] leading-relaxed font-mono resize-none p-2 placeholder-[#280003]/30 min-h-[800px]"
                placeholder="Digite o texto do contrato aqui... Use as tags dinâmicas à direita para automatizar o preenchimento de dados."
              />
            </div>
            
            <div className="mt-8 pt-4 border-t border-[#EEEEF3] flex justify-between items-center text-xs text-[#280003]/50">
              <span>* Use variáveis entre chaves duplas ex: <strong>{"{{NOME_LOCATARIO}}"}</strong></span>
              <span>Dica: Clique em qualquer tag à direita para inserir no texto</span>
            </div>
          </div>
        </div>

        {/* Right Side: Variables Panel */}
        <div className="w-[340px] flex-shrink-0 bg-white border-l border-[#EEEEF3] overflow-y-auto p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[#280003] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#004777]" />
              Tags Dinâmicas
            </h3>
            <p className="text-xs text-[#280003]/60 mt-1">
              Coloque estas chaves no modelo. Elas serão substituídas automaticamente pelos dados do banco no ato de geração.
            </p>
          </div>

          <div className="flex-1 space-y-5">
            {VARIABLE_CATEGORIES.map((category) => (
              <div key={category.category} className="border-t border-[#EEEEF3] pt-3 first:border-0 first:pt-0">
                <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-2">
                  {category.category}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {category.tags.map((tag) => (
                    <button
                      key={tag.code}
                      onClick={() => insertTag(tag.code)}
                      className="group flex flex-col text-left p-2 rounded-lg border border-[#EEEEF3] hover:border-[#004777]/30 hover:bg-[#004777]/5 transition-all w-full cursor-pointer"
                      title="Clique para inserir esta variável no cursor"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-[12.5px] font-semibold text-[#280003] bg-[#EEEEF3] group-hover:bg-[#004777]/10 group-hover:text-[#004777] px-1.5 py-0.5 rounded transition-colors">
                          {tag.code}
                        </span>
                        <PlusCircle className="w-3.5 h-3.5 text-[#004777] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[11.5px] text-[#280003]/50 mt-1 leading-tight group-hover:text-[#280003]/75">
                        <strong>{tag.label}:</strong> {tag.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Save Toast Notification */}
      {showSavedToast && (
        <div className="absolute bottom-6 right-6 bg-[#708D81] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 animate-bounce">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold">Modelo de contrato salvo com sucesso!</span>
        </div>
      )}
    </div>
  );
}
