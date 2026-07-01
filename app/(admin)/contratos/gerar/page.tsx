'use client';

import { useState, useEffect } from 'react';
import { SmartSelector } from '@/components/SmartSelector';
import { LiveFilledDocument } from '@/components/LiveFilledDocument';
import { Save, FileDown, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
}

const LOCADORES = [
  { name: 'Maria Oliveira', cpf: '111.222.333-44', rg: '12.345.678-9', address: 'Rua das Palmeiras, 500 - Jd. Botânico, São Paulo/SP' },
  { name: 'Carlos Santos', cpf: '222.333.444-55', rg: '23.456.789-0', address: 'Av. Paulista, 1000 - Bela Vista, São Paulo/SP' }
];

const LOCATARIOS = [
  { name: 'João da Silva', cpf: '999.888.777-66', rg: '98.765.432-1', address: 'Av. Brasil, 1500 - Centro, São Paulo/SP' },
  { name: 'Fernanda Lima', cpf: '888.777.666-55', rg: '87.654.321-2', address: 'Rua Bela Cintra, 800 - Consolação, São Paulo/SP' }
];

const IMOVEIS = [
  { name: 'Apt 402 - Ed. Central', address: 'Rua das Flores, 123 - Centro, São Paulo/SP', rooms: '02 quartos, 01 sala, 01 cozinha, 01 banheiro e 01 vaga de garagem', rent: '2.500,00', condo: '450,00', iptu: '150,00' },
  { name: 'Casa Comercial Jardim', address: 'Al. Lorena, 1400 - Jardins, São Paulo/SP', rooms: '04 salas, 02 banheiros, recepção e estacionamento para 3 carros', rent: '7.500,00', condo: '0,00', iptu: '480,00' }
];

export function renderFilledTemplate(text: string, values: Record<string, string>) {
  if (!text) return null;
  const parts = text.split(/(\{\{[A-Z0-9_]+\}\})/g);
  return (
    <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-justify text-[#280003]">
      {parts.map((part, index) => {
        if (part.startsWith('{{') && part.endsWith('}}')) {
          const keyName = part.slice(2, -2);
          const val = values[keyName] || part;
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 bg-[#708D81]/15 text-[#708D81] font-semibold rounded text-[13.5px] border border-[#708D81]/30 transition-all cursor-default align-baseline"
              title={`Dado preenchido: ${keyName}`}
            >
              {val}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}

export default function GerarContratoPage() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  
  // Selection Indices
  const [locadorIdx, setLocadorIdx] = useState(0);
  const [locatarioIdx, setLocatarioIdx] = useState(0);
  const [imovelIdx, setImovelIdx] = useState(0);
  const [hasFiador, setHasFiador] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Load selected template from localStorage
  useEffect(() => {
    const templateId = localStorage.getItem('imob-pro-selected-contract-template-id');
    const savedTemplates = localStorage.getItem('imob-pro-contract-templates');
    
    if (templateId && savedTemplates) {
      try {
        const parsedTemplates = JSON.parse(savedTemplates) as ContractTemplate[];
        const found = parsedTemplates.find(t => t.id === templateId);
        if (found) {
          setTemplate(found);
        }
      } catch (e) {
        console.error("Erro ao carregar templates", e);
      }
    }
  }, []);

  const activeLocador = LOCADORES[locadorIdx];
  const activeLocatario = LOCATARIOS[locatarioIdx];
  const activeImovel = IMOVEIS[imovelIdx];

  // Dynamic variable map based on active selections
  const variableValues: Record<string, string> = {
    NOME_LOCADOR: activeLocador.name,
    CPF_LOCADOR: activeLocador.cpf,
    RG_LOCADOR: activeLocador.rg,
    ENDERECO_LOCADOR: activeLocador.address,
    
    NOME_LOCATARIO: activeLocatario.name,
    CPF_LOCATARIO: activeLocatario.cpf,
    RG_LOCATARIO: activeLocatario.rg,
    ENDERECO_ATUAL_LOCATARIO: activeLocatario.address,
    
    ENDERECO_IMOVEL: activeImovel.address,
    DESCRICAO_COMODOS: activeImovel.rooms,
    VALOR_ALUGUEL: activeImovel.rent,
    VALOR_ALUGUEL_EXTENSO: activeImovel.rent === '2.500,00' ? 'dois mil e quinhentos reais' : 'sete mil e quinhentos reais',
    VALOR_CONDOMINIO: activeImovel.condo,
    VALOR_IPTU: activeImovel.iptu,
    
    // Services / Cleaning
    NOME_PRESTADOR: 'Luciana M. Santos',
    CPF_PRESTADOR: '444.555.666-77',
    VALOR_SERVICO: '180,00',
    FREQUENCIA_LIMPEZA: 'semanal (todas as quartas-feiras)',
    
    // Sales / Venda
    VALOR_VENDA: activeImovel.rent === '2.500,00' ? '450.000,00' : '1.200.000,00',
    VALOR_SINAL: activeImovel.rent === '2.500,00' ? '50.000,00' : '150.000,00',
    VALOR_SINAL_EXTENSO: activeImovel.rent === '2.500,00' ? 'cinquenta mil reais' : 'cento e cinquenta mil reais',
    DADOS_FINANCIAMENTO: activeImovel.rent === '2.500,00' 
      ? 'Financiamento CEF no valor de R$ 350.000,00 e R$ 50.000,00 de recursos próprios.'
      : 'Financiamento Itaú no valor de R$ 800.000,00 e R$ 250.000,00 de recursos próprios.',
      
    // General
    PRAZO_MESES: '12',
    DATA_INICIO: '01 de Julho de 2026',
    DATA_FIM: '30 de Junho de 2027',
    DIA_VENCIMENTO: '05',
    CHAVE_PIX_LOCADOR: activeLocador.cpf,
    CIDADE_CONTRATO: 'São Paulo',
    DATA_ATUAL: '30 de Junho de 2026',
  };

  const handleToggleLocador = () => {
    setLocadorIdx((prev) => (prev === 0 ? 1 : 0));
  };

  const handleToggleLocatario = () => {
    setLocatarioIdx((prev) => (prev === 0 ? 1 : 0));
  };

  const handleToggleImovel = () => {
    setImovelIdx((prev) => (prev === 0 ? 1 : 0));
  };

  const handleToggleFiador = () => {
    setHasFiador((prev) => !prev);
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 700);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full relative">
      {/* Top Header */}
      <header className="bg-white rounded-t-2xl px-6 py-4 flex items-center justify-between z-10 shadow-sm mb-4 border border-black/5">
        <div className="flex items-center gap-4">
          <Link href="/contratos" className="p-2 rounded-full hover:bg-[#EEEEF3] text-[#280003]/60 hover:text-[#280003] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#280003]">Gerar Contrato</h1>
            <p className="text-sm text-[#280003]/60">{template?.name || 'Carregando Modelo...'}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#004777]/20 text-[#004777] font-medium hover:bg-[#004777]/5 transition-colors text-sm active:scale-95"
          >
            {isSaving ? 'Salvando...' : (
              <>
                <Save className="w-4 h-4" />
                Salvar Rascunho
              </>
            )}
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#004777] hover:bg-[#004777]/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-colors text-sm active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            Salvar e Exportar PDF
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-6 h-full w-full">
          {/* Left Column: Context / Smart Selector */}
          <div className="w-[340px] flex-shrink-0 h-full">
            <SmartSelector 
              locadorName={activeLocador.name}
              locadorCpf={activeLocador.cpf}
              locatarioName={activeLocatario.name}
              locatarioCpf={activeLocatario.cpf}
              imovelName={activeImovel.name}
              imovelAddr={activeImovel.address}
              onToggleLocador={handleToggleLocador}
              onToggleLocatario={handleToggleLocatario}
              onToggleImovel={handleToggleImovel}
              onAddFiador={handleToggleFiador}
              hasFiador={hasFiador}
              fiadorName="Roberto Souza"
            />
          </div>

          {/* Right Column: Live Filled Document */}
          <div className="flex-1 h-full">
            <LiveFilledDocument 
              modelName={template?.name || ''} 
              content={
                template ? (
                  renderFilledTemplate(template.content, variableValues)
                ) : (
                  <div className="flex items-center justify-center p-12 text-[#280003]/40">
                    Nenhum modelo carregado. Volte para a lista de contratos.
                  </div>
                )
              } 
            />
          </div>
        </div>
      </div>

      {/* Draft Saved Toast */}
      {showToast && (
        <div className="absolute bottom-6 right-6 bg-[#708D81] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 animate-bounce">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold">Rascunho de contrato salvo com sucesso!</span>
        </div>
      )}
    </div>
  );
}

