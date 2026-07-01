'use client';

import { useState, useEffect } from 'react';
import { ContractSidebar } from '@/components/ContractSidebar';
import { ContractPreview } from '@/components/ContractPreview';
import { ContractTemplateEditor } from '@/components/ContractTemplateEditor';
import { Settings, FilePlus, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';

interface ContractTemplate {
  id: string;
  name: string;
  type: 'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA';
  content: string;
}

const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'res-simples',
    name: 'Modelo Residencial (Simples)',
    type: 'LOCACAO',
    content: `CONTRATO DE LOCAÇÃO RESIDENCIAL

Pelo presente instrumento particular, de um lado, {{NOME_LOCADOR}}, inscrito(a) no CPF sob o nº {{CPF_LOCADOR}}, residente e domiciliado(a) na {{ENDERECO_LOCADOR}}, doravante denominado(a) simplesmente LOCADOR(A), e de outro lado, {{NOME_LOCATARIO}}, inscrito(a) no CPF sob o nº {{CPF_LOCATARIO}}, residente e domiciliado(a) na {{ENDERECO_ATUAL_LOCATARIO}}, doravante denominado(a) simplesmente LOCATÁRIO(A), têm entre si justo e contratado o que segue:

CLÁUSULA PRIMEIRA - DO OBJETO
O objeto da presente locação é o imóvel residencial situado na {{ENDERECO_IMOVEL}}, composto por {{DESCRICAO_COMODOS}}, de propriedade do(a) LOCADOR(A).

CLÁUSULA SEGUNDA - DO PRAZO
O prazo da locação é de {{PRAZO_MESES}} meses, iniciando-se em {{DATA_INICIO}} e terminando em {{DATA_FIM}}, data em que o(a) LOCATÁRIO(A) se obriga a restituir o imóvel completamente desocupado e em perfeitas condições.

CLÁUSULA TERCEIRA - DO VALOR DO ALUGUEL
O valor do aluguel mensal é de R$ {{VALOR_ALUGUEL}} ({{VALOR_ALUGUEL_EXTENSO}}), que deverá ser pago até o dia {{DIA_VENCIMENTO}} de cada mês, mediante boleto bancário ou transferência PIX na chave {{CHAVE_PIX_LOCADOR}}.

CLÁUSULA QUARTA - DOS ENCARGOS
Além do aluguel, o(a) LOCATÁRIO(A) arcará com o pagamento do Imposto Predial e Territorial Urbano (IPTU) no valor aproximado de R$ {{VALOR_IPTU}}, taxa de condomínio estipulada em R$ {{VALOR_CONDOMINIO}}, além das contas de consumo como água, luz e gás referentes ao imóvel locado.

{{CIDADE_CONTRATO}}, {{DATA_ATUAL}}

__________________________________________
{{NOME_LOCADOR}} (Locador)

__________________________________________
{{NOME_LOCATARIO}} (Locatário)`
  },
  {
    id: 'prest-servico',
    name: 'Modelo Prestação de Serviço (Limpeza)',
    type: 'LIMPEZA',
    content: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE LIMPEZA E CONSERVAÇÃO

Pelo presente instrumento, de um lado, {{NOME_LOCADOR}}, residente na {{ENDERECO_LOCADOR}}, doravante denominado simplesmente CONTRATANTE, e de outro lado, {{NOME_PRESTADOR}}, portador(a) do CPF sob o nº {{CPF_PRESTADOR}}, doravante denominado simplesmente PRESTADOR(A), ajustam entre si a presente prestação de serviço mediante as cláusulas seguintes:

CLÁUSULA PRIMEIRA - DO OBJETO
O objeto deste contrato é a prestação de serviços de limpeza e conservação profissional a serem realizados pelo(a) PRESTADOR(A) no imóvel situado na {{ENDERECO_IMOVEL}}, de responsabilidade do(a) CONTRATANTE.

CLÁUSULA SEGUNDA - DA FREQUÊNCIA E HORÁRIOS
Os serviços acordados serão executados com a frequência de {{FREQUENCIA_LIMPEZA}}, em dias e horários combinados mutuamente entre as partes.

CLÁUSULA TERCEIRA - DO PREÇO E PAGAMENTO
Pelos serviços prestados, o(a) CONTRATANTE pagará ao(à) PRESTADOR(A) a quantia de R$ {{VALOR_SERVICO}} por período trabalhado, devendo o pagamento ser efetuado através de PIX na chave {{CHAVE_PIX_LOCADOR}} em até 24 horas após a execução.

Cidade: {{CIDADE_CONTRATO}}, Data: {{DATA_ATUAL}}

__________________________________________
{{NOME_LOCADOR}} (Contratante)

__________________________________________
{{NOME_PRESTADOR}} (Prestador)`
  },
  {
    id: 'interm-venda',
    name: 'Intermediação de Venda de Imóvel',
    type: 'VENDA',
    content: `CONTRATO DE COMPROMISSO DE VENDA E COMPRA DE IMÓVEL

Por este instrumento particular, de um lado {{NOME_LOCADOR}} (Vendedor), CPF {{CPF_LOCADOR}}, residente na {{ENDERECO_LOCADOR}}, e de outro lado {{NOME_LOCATARIO}} (Comprador), CPF {{CPF_LOCATARIO}}, residente na {{ENDERECO_ATUAL_LOCATARIO}}, têm justo e acertado o presente contrato de compromisso de compra e venda.

CLÁUSULA PRIMEIRA - DO OBJETO
O vendedor é legítimo proprietário e possuidor do imóvel residencial situado na {{ENDERECO_IMOVEL}}, e declara vendê-lo livre e desembaraçado de quaisquer ônus judiciais ou extrajudiciais.

CLÁUSULA SEGUNDA - DO PREÇO E CONDIÇÕES
O preço certo e ajustado da venda é de R$ {{VALOR_VENDA}}, que será pago da seguinte forma:
a) R$ {{VALOR_SINAL}} ({{VALOR_SINAL_EXTENSO}}) a título de sinal e princípio de pagamento.
b) O saldo restante será pago mediante financiamento bancário com as seguintes condições: {{DADOS_FINANCIAMENTO}}.

Cidade: {{CIDADE_CONTRATO}}, Data: {{DATA_ATUAL}}

__________________________________________
{{NOME_LOCADOR}} (Vendedor)

__________________________________________
{{NOME_LOCATARIO}} (Comprador)`
  },
  {
    id: 'proposta-locacao',
    name: 'Proposta Comercial de Locação',
    type: 'PROPOSTA',
    content: `PROPOSTA COMERCIAL DE LOCAÇÃO DE IMÓVEL

À atenção do(a) proprietário(a) Sr(a). {{NOME_LOCADOR}}.

Prezado(a),
Apresentamos a presente proposta formal de locação para o imóvel de sua propriedade localizado na {{ENDERECO_IMOVEL}}, cujas características são descritas como {{DESCRICAO_COMODOS}}.

1. IDENTIFICAÇÃO DO PROPONENTE (LOCATÁRIO)
Nome: {{NOME_LOCATARIO}}
CPF: {{CPF_LOCATARIO}}
Endereço Atual: {{ENDERECO_ATUAL_LOCATARIO}}

2. CONDIÇÕES COMERCIAIS PROPOSTAS
a) Valor do Aluguel Mensal Proposto: R$ {{VALOR_ALUGUEL}}
b) Taxa de Condomínio: R$ {{VALOR_CONDOMINIO}}
c) IPTU Mensal: R$ {{VALOR_IPTU}}
d) Prazo de Locação Desejado: {{PRAZO_MESES}} meses
e) Data Proposta para Início: {{DATA_INICIO}}

Esta proposta é de caráter firme e aguarda o aceite do proprietário para elaboração do contrato definitivo.

{{CIDADE_CONTRATO}}, {{DATA_ATUAL}}

__________________________________________
{{NOME_LOCATARIO}} (Proponente)`
  }
];

export function renderTemplateWithHighlights(text: string) {
  if (!text) return null;
  const parts = text.split(/(\{\{[A-Z0-9_]+\}\})/g);
  return (
    <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-justify text-[#280003]">
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-[#F0D18A]/35 text-[#280003] font-mono text-[12.5px] font-semibold rounded border border-[#F0D18A]/50 shadow-sm transition-all hover:bg-[#F0D18A]/55 cursor-default align-baseline"
              title={`Placeholder dinâmico: ${part.slice(2, -2)}`}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}

export default function ContratosPage() {
  const [activeTab, setActiveTab] = useState<'gerar' | 'modelos'>('gerar');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  
  // Load templates from localStorage or DEFAULT_TEMPLATES
  useEffect(() => {
    const saved = localStorage.getItem('imob-pro-contract-templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      } catch (e) {
        setTemplates(DEFAULT_TEMPLATES);
        setSelectedId(DEFAULT_TEMPLATES[0].id);
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedId(DEFAULT_TEMPLATES[0].id);
      localStorage.setItem('imob-pro-contract-templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  const selectedModel = templates.find((m) => m.id === selectedId);

  // Save changes from template editor
  const handleSaveTemplate = (name: string, content: string) => {
    const updated = templates.map((t) => {
      if (t.id === selectedId) {
        return { ...t, name, content };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('imob-pro-contract-templates', JSON.stringify(updated));
  };

  // Add new template
  const handleAddTemplate = () => {
    const newId = `custom-${Date.now()}`;
    const newTemplate: ContractTemplate = {
      id: newId,
      name: 'Novo Modelo de Contrato Sem Título',
      type: 'LOCACAO',
      content: 'Digite o texto do contrato aqui... Use tags como {{NOME_LOCATARIO}}.',
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    setSelectedId(newId);
    localStorage.setItem('imob-pro-contract-templates', JSON.stringify(updated));
    setActiveTab('modelos');
  };

  // Reset to default templates
  const handleResetDefaults = () => {
    if (confirm('Tem certeza de que deseja restaurar os modelos padrões originais? Suas alterações serão perdidas.')) {
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedId(DEFAULT_TEMPLATES[0].id);
      localStorage.setItem('imob-pro-contract-templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  };

  // Save active contract model ID to localStorage to use on the Generate Page
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem('imob-pro-selected-contract-template-id', selectedId);
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-10rem)]">
      
      {/* Top Options Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <div className="bg-[#004777]/10 p-2 rounded-xl text-[#004777]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#280003]">Gestão de Contratos e Propostas</h1>
            <p className="text-xs text-[#280003]/60">Gere e edite templates dinâmicos de locação, venda, limpeza ou propostas comerciais</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-[#EEEEF3] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('gerar')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gerar'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#280003]'
            }`}
          >
            Gerar Contrato
          </button>
          <button
            onClick={() => setActiveTab('modelos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'modelos'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#280003]'
            }`}
          >
            Modelos & Templates
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleResetDefaults}
            title="Restaurar originais"
            className="p-2.5 rounded-lg border border-[#280003]/10 text-[#280003]/60 hover:text-[#004777] hover:bg-[#EEEEF3] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleAddTemplate}
            className="flex items-center gap-1.5 bg-[#004777] hover:bg-[#004777]/90 text-white px-4 py-2.5 rounded-lg font-medium text-xs shadow-md transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            Novo Modelo
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 min-h-0">
        {activeTab === 'gerar' ? (
          <div className="flex gap-6 h-full w-full">
            {/* Left Column: Sidebar list of models */}
            <div className="w-80 flex-shrink-0">
              <ContractSidebar
                models={templates.map(t => ({ id: t.id, name: t.name }))}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            {/* Right Column: Preview of the text with variables highlighted */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-sm flex flex-col bg-white border border-black/5">
              <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-[#EEEEF3] z-10 sticky top-0">
                <h2 className="text-lg font-semibold text-[#280003]">{selectedModel?.name}</h2>
                <Link
                  href="/contratos/gerar"
                  className="bg-[#004777] hover:bg-[#004777]/90 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm text-sm active:scale-95"
                >
                  Gerar Contrato com Dados
                </Link>
              </div>

              {/* A4 Sheet Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#EEEEF3]">
                <div className="bg-white rounded-md shadow-sm p-12 mx-auto max-w-3xl min-h-[1000px] border border-[#EEEEF3]">
                  {selectedModel ? (
                    renderTemplateWithHighlights(selectedModel.content)
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#280003]/50">
                      <p>Selecione um modelo de contrato para pré-visualização.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-6 h-full w-full">
            {/* Left Column: Sidebar list of models */}
            <div className="w-80 flex-shrink-0">
              <ContractSidebar
                models={templates.map(t => ({ id: t.id, name: t.name }))}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>

            {/* Right Column: Template editor */}
            <div className="flex-1 h-full min-h-0">
              {selectedModel ? (
                <ContractTemplateEditor
                  modelName={selectedModel.name}
                  modelContent={selectedModel.content}
                  onSave={handleSaveTemplate}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center h-full text-center text-[#280003]/60">
                  <div>
                    <Settings className="w-12 h-12 text-[#280003]/30 mx-auto mb-3" />
                    <p className="font-semibold text-lg">Nenhum modelo selecionado</p>
                    <p className="text-sm mt-1">Selecione um modelo no painel esquerdo ou clique em "Novo Modelo".</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

