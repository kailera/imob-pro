"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { Key, DollarSign, FileText, Printer, Check, Info, ChevronRight, Plus, X, Loader2, Building, User, Calendar, Shield, Settings, Download, Search } from 'lucide-react';
import FinancialFilterBar from '@/components/FinancialFilterBar';
import FinancialTable, { BilletData } from '@/components/FinancialTable';
import FinancialSummary from '@/components/FinancialSummary';
import { getImoveis } from '@/app/actions/imoveisActions';
import LocacaoApartamentosTemplate from '@/lib/templates/LocacaoontratoLocacaoApartamentos';
import LocacaocontratoResidencialSimples from '@/lib/templates/LocacaocontratoResidencialSimples';
import LocacaocontratoResidencialCompleto from '@/lib/templates/LocacaocontratoResidencialCompleto';
import { ContractRenderer } from '@/components/ContractRenderer';
import {
  getInquilinos,
  getFiadores,
  createLocatario,
  searchImovelWithResolution,
  createContratoLocacao
} from '@/app/(admin)/contratos/actions';
import Link from 'next/link';
import { getCobrancas, getContratosLocacao } from './actions';
import CobrancasTabContent from './components/CobrancasTabContent';

interface Contrato {
  id?: string;
  contrato: string;
  inquilino: string;
  imovel: string;
  vencimento: string;
  status: 'Ativo' | 'Pendente' | 'Encerrado' | 'Atrasado' | 'Em Acordo';
  valorOriginal?: number;
  parcelasAtrasadas?: number;
}

interface ContractTemplate {
  id: string;
  name: string;
  type: 'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA';
  content: string;
  variables?: string[];
  isDefault?: boolean;
}


interface DbImovel {
  id: string;
  codigo: string;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
  cep: number;
  tipo: string;
  valorAluguel: number | null;
  valorCondominio: number | null;
  valorIPTU: number | null;
  forLocacao: boolean;
}



function valorPorExtenso(valor: number): string {

  return `${valor.toLocaleString('pt-BR')} reais`;
}

const mockCobrancas: BilletData[] = [
  {
    id: '1',
    recepcaoData: '25/06/2026', recepcaoHora: '10:15',
    movimentoData: '25/06/2026', movimentoHora: '10:15',
    vencimento: '30/06/2026', situacao: 'Liquidado', valor: 2500.00,
    cedente: 'Imob Pro', sacadoNome: 'João Silva Oliveira', sacadoCpf: '111.222.333-44',
    pagamentoData: '24/06/2026', pagamentoValor: 2500.00,
  },
  {
    id: '2',
    recepcaoData: '24/06/2026', recepcaoHora: '14:30',
    movimentoData: '24/06/2026', movimentoHora: '14:30',
    vencimento: '05/07/2026', situacao: 'Recepcionado', valor: 1850.50,
    cedente: 'Imob Pro', sacadoNome: 'Maria Mendes', sacadoCpf: '222.333.444-55',
    pagamentoData: null, pagamentoValor: null,
  },
  {
    id: '3',
    recepcaoData: '23/06/2026', recepcaoHora: '09:00',
    movimentoData: '23/06/2026', movimentoHora: '09:00',
    vencimento: '20/06/2026', situacao: 'Pendente', valor: 3200.00,
    cedente: 'Imob Pro', sacadoNome: 'Carlos Drummond', sacadoCpf: '333.444.555-66',
    pagamentoData: null, pagamentoValor: null,
  },
  {
    id: '4',
    recepcaoData: '22/06/2026', recepcaoHora: '11:45',
    movimentoData: '22/06/2026', movimentoHora: '11:45',
    vencimento: '25/06/2026', situacao: 'Cancelado', valor: 1500.00,
    cedente: 'Imob Pro', sacadoNome: 'Ana Paula Rocha', sacadoCpf: '444.555.666-77',
    pagamentoData: null, pagamentoValor: null,
  },
  {
    id: '5',
    recepcaoData: '21/06/2026', recepcaoHora: '16:20',
    movimentoData: '21/06/2026', movimentoHora: '16:20',
    vencimento: '10/06/2026', situacao: 'Liquidado', valor: 4100.00,
    cedente: 'Imob Pro', sacadoNome: 'Empresa Fictícia LTDA', sacadoCpf: '12.345.678/0001-99',
    pagamentoData: '09/06/2026', pagamentoValor: 4100.00,
  }
];

const cobrancasTotals = {
  registrado: 13150.50, liquidado: 6600.00, baixado: 0.00,
  recepcionado: 1850.50, cancelado: 1500.00
};

// Modelos reais baseados nos arquivos do usuário na pasta model
const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'res-simples',
    name: 'Locação – Residencial Simples',
    type: 'LOCACAO',
    content: LocacaocontratoResidencialSimples,
    isDefault: true,
  },
  {
    id: 'res-completo',
    name: 'Locação – Residencial Completo',
    type: 'LOCACAO',
    content: LocacaocontratoResidencialCompleto,
    isDefault: true,
  },
  {
    id: 'apt-agatha',
    name: 'Locação – Contrato de Apartamentos (Res. Agatha)',
    type: 'LOCACAO',
    content: LocacaoApartamentosTemplate,
    isDefault: true,
  }
];


function renderContractDocument(
  content: string,
  fields: Record<string, string>,
  fontSize?: number,
  onChange?: (key: string, value: string) => void
) {
  return <ContractRenderer content={content} data={fields} fontSize={fontSize} onChange={onChange} />;
}

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

export default async function LocacaoPage() {
  const [activeTab, setActiveTab] = useState<'contratos' | 'cobrancas' | 'modelos'>('contratos');

  // List of leases / contracts
  const [contracts, setContracts] = useState<Contrato[]>([]);

  // Database properties loaded
  const [dbImoveis, setDbImoveis] = useState<DbImovel[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);

  // Modal to add a new lease contract
  const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);

  // Form selections for new lease
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

  // Dynamic collections from DB
  const [inquilinos, setInquilinos] = useState<any[]>([]);
  const [fiadores, setFiadores] = useState<any[]>([]);
  const [modalView, setModalView] = useState<'MAIN' | 'CREATE_TENANT'>('MAIN');

  // New Client creation form states
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

  const [addFiador, setAddFiador] = useState(false);
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

  const [isSavingLocatario, setIsSavingLocatario] = useState(false);
  const [pendingFiadorData, setPendingFiadorData] = useState<any | null>(null);

  // Property Search & Resolution states
  const [imovelSearchQuery, setImovelSearchQuery] = useState('');
  const [imovelSearchResults, setImovelSearchResults] = useState<any[]>([]);
  const [selectedImovelData, setSelectedImovelData] = useState<any | null>(null);
  const [resolvedLandlord, setResolvedLandlord] = useState<any | null>(null);
  const [vistoriaStatus, setVistoriaStatus] = useState<string>('');

  // Merged collections (DB + Mocks)


  // 1. Busque os dados
  const contratos = await getContratosLocacao()
  const cobrancas = await getCobrancas()

  // 2. Garanta que temos os dados antes de reduzir
  const listaContratos = contratos.data || [];

  // Extrai o tipo exato que o Prisma retorna para cada array
  type ElementType<T> = T extends (infer U)[] ? U : never;
  type ContratoType = ElementType<typeof listaContratos>;

  // 3. Executa o reduce com a tipagem correta no acumulador
  const { allLocatarios, allFiadores, allImoveis, allLocador } = listaContratos.reduce(
    (acc, contrato) => {
      // CORREÇÃO: Usa o 'contrato' da iteração atual (sem o .map que quebrava o tipo)
      acc.allLocatarios.push(...contrato.locatarios);
      acc.allFiadores.push(...contrato.fiadors);

      if (contrato.imovel) {
        acc.allImoveis.push(contrato.imovel);

        const locadoresDoContrato = contrato.imovel.imovelLocacaos.flatMap((i) => i.locadors);
        acc.allLocador.push(...locadoresDoContrato);
      }

      return acc;
    },
    {
      // CORREÇÃO: Força a tipagem explícita para evitar o tipo 'never[]'
      allLocatarios: [] as ContratoType['locatarios'],
      allFiadores: [] as ContratoType['fiadors'],
      allImoveis: [] as Exclude<ContratoType['imovel'], null>[],
      allLocador: [] as ElementType<ElementType<Exclude<ContratoType['imovel'], null>['imovelLocacaos']>['locadors']>[]
    }
  );


  const removerDuplicados = (arr: any[]) =>
    Array.from(new Map(arr.map((item) => [item.id, item])).values());

  const locatariosUnicos = removerDuplicados(allLocatarios);
  const fiadoresUnicos = removerDuplicados(allFiadores);
  const imoveisUnicos = removerDuplicados(allImoveis);
  const locadoresUnicos = removerDuplicados(allLocador);

  // Templates state
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateMode, setTemplateMode] = useState<'fill' | 'edit'>('fill');

  // Font and margin styling states
  const [fontSize, setFontSize] = useState<number>(10);
  const [paddingTop, setPaddingTop] = useState<number>(4.5);
  const [paddingLeft, setPaddingLeft] = useState<number>(3.0);
  const [paddingRight, setPaddingRight] = useState<number>(2.5);
  const [paddingBottom, setPaddingBottom] = useState<number>(2.0);
  const [frameScale, setFrameScale] = useState<number>(1.0);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [showMoldura, setShowMoldura] = useState(true);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [estimatedPages, setEstimatedPages] = useState(1);

  const customKeys = useMemo(() => {
    const matched = templates.find(t => t.id === selectedTemplateId);
    if (!matched) return [];
    if (matched.variables) {
      return matched.variables.filter(v => !STANDARD_KEYS.has(v) && !v.startsWith('SYS_'));
    }
    // Fallback regex
    const matches = [...matched.content.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)];
    const allKeys = Array.from(new Set(matches.map(m => m[1])));
    return allKeys.filter(v => !STANDARD_KEYS.has(v) && !v.startsWith('SYS_'));
  }, [selectedTemplateId, templates]);

  // Gera e baixa o contrato preenchido como .docx
  const handleDownloadDocx = async () => {
    if (!selectedTemplateId) {
      alert('Selecione um modelo de contrato antes de baixar.');
      return;
    }
    setIsDownloadingDocx(true);
    try {
      const res = await fetch('/api/contratos/gerar-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, fields: contractFields }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro ao gerar DOCX: ${err.error}\n\nVerifique se o arquivo template existe em public/templates-docx/`);
        return;
      }

      // Dispara o download via blob URL
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
      alert('Erro de rede ao tentar baixar o contrato.');
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const [contractFields, setContractFields] = useState<Record<string, string>>({
    PRAZO_MESES: '36',
    DIA_VENCIMENTO: '10',
    DATA_ATUAL: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  });

  useEffect(() => {
    if (containerRef.current) {
      const heightPx = containerRef.current.scrollHeight;
      const heightCm = heightPx / 37.795;
      const pages = Math.max(1, Math.ceil(heightCm / 29.7));
      setEstimatedPages(pages);
    }
  }, [templateContent, contractFields, fontSize, paddingTop, paddingBottom, activeTab]);

  useEffect(() => {
    const current = templates.find(t => t.id === selectedTemplateId);
    if (current) {
      setShowMoldura(current.isDefault ?? true);
    }
  }, [selectedTemplateId, templates]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/contratos/modelos');
      if (res.ok) {
        let data = await res.json();

        // Mesclar com alterações locais de modelos padrões (se houver no localStorage)
        const localSaved = localStorage.getItem('imob-pro-contract-templates');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            data = data.map((t: any) => {
              const localOverride = parsed.find((p: any) => p.id === t.id);
              if (localOverride) {
                return { ...t, name: localOverride.name, content: localOverride.content };
              }
              return t;
            });
          } catch (e) { console.error(e); }
        }

        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
          setTemplateName(data[0].name);
          setTemplateContent(data[0].content);
        }
      }
    } catch (e) {
      console.error("Erro ao buscar templates", e);
    }
  };

  const fetchInquilinosAndFiadores = async () => {
    try {
      const resInq = await getInquilinos();
      if (resInq.success && resInq.data) {
        setInquilinos(resInq.data);
      }
      const resFia = await getFiadores();
      if (resFia.success && resFia.data) {
        setFiadores(resFia.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load contracts and templates
  useEffect(() => {
    // 1. Load Contracts
    const savedContracts = localStorage.getItem('imob-pro-contracts-state');
    if (savedContracts) {
      try {
        setContracts(JSON.parse(savedContracts));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultContracts: Contrato[] = [
        { contrato: 'LOC-2023-001', inquilino: 'João da Silva', imovel: 'IMB-001 - Apto Centro', vencimento: '10/11/2024', status: 'Ativo' },
        { contrato: 'LOC-2023-002', inquilino: 'Maria Souza', imovel: 'IMB-005 - Sobrado', vencimento: '15/12/2024', status: 'Ativo' },
        { contrato: 'LOC-2024-001', inquilino: 'Carlos Mendes', imovel: 'IMB-002 - Casa Cond.', vencimento: '05/01/2025', status: 'Pendente' },
        { contrato: 'LOC-2022-045', inquilino: 'Ana Beatriz', imovel: 'IMB-004 - Kitnet', vencimento: '01/08/2023', status: 'Encerrado' },
        { contrato: 'LOC-2024-005', inquilino: 'Roberto Justos', imovel: 'IMB-003 - Cobertura', vencimento: '20/02/2025', status: 'Ativo' },
      ];
      setContracts(defaultContracts);
      localStorage.setItem('imob-pro-contracts-state', JSON.stringify(defaultContracts));
    }

    // 2. Load Templates
    fetchTemplates();
    fetchInquilinosAndFiadores();
    fetchDbContracts();
  }, []);

  const fetchDbContracts = async () => {
    try {
      const res = await getContratosLocacao();
      if (res.success && res.data) {
        const dbMapped: Contrato[] = res.data.map((c: any) => {
          const locatario = c.locatarios?.[0]?.nome || "Inquilino não vinculado";
          const imovelStr = c.imovel ? `${c.imovel.codigo} - ${c.imovel.bairro}` : "Imóvel não vinculado";
          const locacao = c.imovel?.imovelLocacaos?.find((l: any) => l.id === c.imovelLocacaoId);
          const venc = locacao ? new Date(locacao.dataFim).toLocaleDateString('pt-BR') : '-';

          return {
            id: c.id,
            contrato: `LOC-${new Date(locacao?.dataInicio || Date.now()).getFullYear()}-${c.id.slice(0, 4).toUpperCase()}`,
            inquilino: locatario,
            imovel: imovelStr,
            vencimento: venc,
            status: 'Ativo'
          };
        });

        // Merge with local state / mock contracts (deduplicating by id/contrato)
        setContracts(prev => {
          const combined = [...dbMapped, ...prev];
          const seen = new Set();
          return combined.filter(item => {
            const key = item.id || item.contrato;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      }
    } catch (e) {
      console.error("Erro ao carregar contratos do banco:", e);
    }
  };

  // Fetch db properties
  const fetchDbImoveis = async () => {
    setIsDbLoading(true);
    try {
      const res = await getImoveis();
      if (res.success && res.data) {
        // Filter only properties for lease or generic
        const list = (res.data as any[]).map(i => ({
          id: i.id,
          codigo: i.codigo,
          numero: i.numero,
          bairro: i.bairro,
          cidade: i.cidade,
          uf: i.uf,
          cep: i.cep,
          tipo: i.tipo,
          valorAluguel: i.valorAluguel,
          valorCondominio: i.valorCondominio,
          valorIPTU: i.valorIPTU,
          forLocacao: i.forLocacao
        }));
        setDbImoveis(list);
      }
    } catch (e) {
      console.error(e);
    }
    setIsDbLoading(false);
  };

  useEffect(() => {
    if (isAddContractModalOpen) {
      fetchDbImoveis();
      fetchInquilinosAndFiadores();
      setModalView('MAIN');
      // Set default date to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setLeaseDataInicio(`${yyyy}-${mm}-${dd}`);

      // Reset selections
      setSelectedInquilinoIndex('');
      setSelectedFiadorIndex('');
      setSelectedImovelId('');
      setImovelSearchQuery('');
      setImovelSearchResults([]);
      setSelectedImovelData(null);
      setResolvedLandlord(null);
      setVistoriaStatus('');
      setPendingFiadorData(null);
    }
  }, [isAddContractModalOpen]);

  // Handle searched property select
  const handleSelectSearchedProperty = (imovel: any) => {
    setSelectedImovelId(imovel.id);
    setSelectedImovelData(imovel);
    setImovelSearchQuery(`${imovel.codigo} - ${imovel.bairro}, ${imovel.cidade}`);
    setImovelSearchResults([]);

    // Autofill values
    setCustomAluguel(imovel.valorAluguel ? String(imovel.valorAluguel / 100) : '0');
    setCustomCondominio(imovel.valorCondominio ? String(imovel.valorCondominio / 100) : '0');
    setCustomIptu(imovel.valorIPTU ? String(imovel.valorIPTU / 100) : '0');

    // 1. Resolve Owner (Locador)
    if (imovel.imovelLocacaos && imovel.imovelLocacaos.length > 0) {
      const activeLocacao = imovel.imovelLocacaos[0];
      if (activeLocacao.locadors && activeLocacao.locadors.length > 0) {
        const owner = activeLocacao.locadors[0];
        setResolvedLandlord(owner);
        setSelectedProprietarioIndex(owner.id);
      } else {
        setResolvedLandlord(null);
        setSelectedProprietarioIndex('');
      }
    } else {
      setResolvedLandlord(null);
      setSelectedProprietarioIndex('');
    }

    // 2. Resolve Vistoria
    if (imovel.vistorias && imovel.vistorias.length > 0) {
      const latestVistoria = imovel.vistorias[0];
      setVistoriaStatus(`Última vistoria: ${latestVistoria.codigo} (${latestVistoria.tipo}) - Status: ${latestVistoria.status}`);
    } else {
      setVistoriaStatus('Nenhuma vistoria encontrada para este imóvel.');
    }
  };

  // Property address search
  const handlePropertySearch = async (val: string) => {
    setImovelSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setImovelSearchResults([]);
      return;
    }
    try {
      const res = await searchImovelWithResolution(val);
      if (res.success && res.data) {
        setImovelSearchResults(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create new tenant and optional guarantor
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

        await fetchInquilinosAndFiadores();
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

  // Handle selected property changes in form
  const handleImovelChange = (id: string) => {
    setSelectedImovelId(id);
    const found = dbImoveis.find(i => i.id === id);
    if (found) {
      setCustomAluguel(found.valorAluguel ? String(found.valorAluguel / 100) : '');
      setCustomCondominio(found.valorCondominio ? String(found.valorCondominio / 100) : '');
      setCustomIptu(found.valorIPTU ? String(found.valorIPTU / 100) : '');
    }
  };

  const handleSelectTemplate = (id: string) => {
    const found = templates.find(t => t.id === id);
    if (found) {
      setSelectedTemplateId(id);
      setTemplateName(found.name);
      setTemplateContent(found.content);
    }
  };

  const handleSaveTemplate = () => {
    const updated = templates.map(t =>
      t.id === selectedTemplateId ? { ...t, name: templateName, content: templateContent } : t
    );
    setTemplates(updated);
    localStorage.setItem('imob-pro-contract-templates', JSON.stringify(updated));
    alert("Modelo de contrato atualizado com sucesso!");
  };

  // Generate the new contract and auto-fill data to save time
  const handleGenerateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquilinoIndex || !selectedImovelId) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const inquilino = allLocatarios.find((i) => i.id === selectedInquilinoIndex);
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
      fiador = allFiadores.find(f => f.id === selectedFiadorIndex);
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

    // Persist to DB if not mocks
    const isMockLocatario = String(inquilino.id).startsWith('mock-');
    const isMockImovel = String(imovel.id).startsWith('mock-');

    let dbContratoId: string | undefined = undefined;
    if (!isMockLocatario && !isMockImovel) {
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

    // Build variables
    const fields: Record<string, string> = {
      NOME_LOCADOR: proprietario.nome,
      CPF_LOCADOR: proprietario.cpfCnpj,
      RG_LOCADOR: proprietario.rg || 'ISENTO',
      ENDERECO_LOCADOR: Array.isArray(proprietario.endereco) ? getAddressStr(proprietario.endereco) : proprietario.endereco,
      NACIONALIDADE_LOCADOR: proprietario.nacionalidade || 'brasileiro(a)',
      ESTADO_CIVIL_LOCADOR: proprietario.estadoCivil || 'solteiro(a)',
      PROFISSÃO_LOCADOR: proprietario.profissao || 'proprietário(a)',
      CIDADE_LOCADOR: 'Ilha Solteira',
      ESTADO_LOCADOR: 'SP',
      CEP_LOCADOR: '15385-000',

      NOME_LOCATARIO: inquilino.nome,
      CPF_LOCATARIO: inquilino.cpfCnpj,
      RG_LOCATARIO: inquilino.rg || 'ISENTO',
      ENDERECO_ATUAL_LOCATARIO: Array.isArray(inquilino.endereco) ? getAddressStr(inquilino.endereco.map((e: any) => JSON.parse(e))) : inquilino.endereco as any,
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

      // Defaults for Residencial Agatha details if chosen
      DADOS_BANCARIOS_REPASSE: 'Agência: 0001-9 C/C: 378144324, Operador: 89847354 Banco Inter, Pix CNPJ 55.036.088/0001-93 (Mariano Escatolin Sociedade de Advocacia)',
      TAXA_LIMPEZA: '35,00',
      TAXA_GAS: '35,00',
      PROPRIETARIO_IMOVEL: proprietario.nome,
      DADOS_IMOVEL_CAUCAO: fiador ? `Imóvel situado em Santa Fé do Sul-SP de propriedade do fiador ${fiador.nome}` : 'Imóvel residencial oferecido em garantia pelo inquilino'
    };

    // 1. Add contract to table
    const contractCode = `LOC-${new Date().getFullYear()}-${contracts.length + 101}`;
    const newContract: Contrato = {
      id: dbContratoId,
      contrato: contractCode,
      inquilino: inquilino.nome,
      imovel: `${imovel.codigo} - ${imovel.bairro}`,
      vencimento: `${leaseVencimento}/${start.getMonth() + 2}/${start.getFullYear()}`,
      status: 'Pendente'
    };

    const updatedContracts = [newContract, ...contracts];
    setContracts(updatedContracts);
    localStorage.setItem('imob-pro-contracts-state', JSON.stringify(updatedContracts));

    // 2. Load the template in full editor/viewer
    setContractFields(fields);
    handleSelectTemplate(template.id);

    setIsAddContractModalOpen(false);
    setActiveTab('modelos');
  };

  const columns: Column<Contrato>[] = [
    { header: 'Contrato', accessorKey: 'contrato' },
    { header: 'Inquilino', accessorKey: 'inquilino' },
    { header: 'Imóvel', accessorKey: 'imovel' },
    { header: 'Vencimento', accessorKey: 'vencimento' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: Contrato) => {
        let bgClass = 'bg-gray-100 text-gray-700';
        if (item.status === 'Ativo') bgClass = 'bg-[#708D81]/10 text-[#708D81]';
        else if (item.status === 'Pendente') bgClass = 'bg-[#F0D18A]/35 text-[#8B7535]';
        else if (item.status === 'Encerrado') bgClass = 'bg-gray-200 text-gray-500';
        else bgClass = 'bg-blue-100 text-blue-800';
        return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgClass}`}>{item.status}</span>;
      }
    },
    {
      header: 'Ações',
      accessorKey: 'id',
      cell: (item: Contrato) => {
        const targetId = item.id || item.contrato;
        return (
          <Link
            href={`/locacao/view-locacao/${targetId}`}
            className="inline-flex items-center gap-1 text-[#004777] hover:text-[#002f50] font-bold text-xs hover:underline"
          >
            Visualizar <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        );
      }
    },
  ];

  const typeColors: Record<string, string> = {
    LOCACAO: 'bg-blue-100 text-blue-700',
    VENDA: 'bg-emerald-100 text-emerald-700',
    LIMPEZA: 'bg-amber-100 text-amber-700',
    PROPOSTA: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Abas de Navegação */}
      <div className="flex border-b border-gray-200 justify-between items-center">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('contratos')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'contratos'
              ? 'border-[#004777] text-[#004777]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Key className="w-4 h-4" />
            Contratos de Locação
          </button>
          <button
            onClick={() => setActiveTab('cobrancas')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'cobrancas'
              ? 'border-[#004777] text-[#004777]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <DollarSign className="w-4 h-4" />
            Cobranças de Aluguéis
          </button>
          <button
            onClick={() => setActiveTab('modelos')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'modelos'
              ? 'border-[#004777] text-[#004777]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <FileText className="w-4 h-4" />
            Modelos de Contratos
          </button>
        </div>

        {activeTab === 'contratos' && (
          <button
            onClick={() => setIsAddContractModalOpen(true)}
            className="flex items-center gap-2 bg-[#004777] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-[#003355] transition-all cursor-pointer mb-2"
          >
            <Plus className="w-4 h-4" />
            Vincular Novo Inquilino e Contrato
          </button>
        )}
      </div>

      {/* ── TAB: CONTRATOS ── */}
      {activeTab === 'contratos' && (
        <DataTable
          title="Contratos de Locação"
          data={contracts}
          columns={columns}
          onAddClick={() => setIsAddContractModalOpen(true)}
        />
      )}

      {activeTab === 'cobrancas' && (
        <CobrancasTabContent activeTab={activeTab} cobrancaTotals={cobrancasTotals} cobrancas={cobrancas} />
      )}

      {/* ── TAB: MODELOS DE CONTRATOS ── */}
      {activeTab === 'modelos' && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex min-h-[700px] overflow-hidden">
          {/* Left sidebar: template list */}
          <div className="w-60 flex-shrink-0 border-r border-[#EEEEF3] bg-[#EEEEF3]/30 flex flex-col">
            <div className="px-4 py-4 border-b border-[#EEEEF3]">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modelos Pré-Definidos</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Clique para selecionar e usar</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t.id)}
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

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedTemplateId ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic flex-col gap-2">
                <FileText className="w-10 h-10 text-gray-300" />
                <p>Selecione um modelo no painel esquerdo para começar.</p>
              </div>
            ) : (
              <>
                {/* Mode switcher header */}
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
                        {/* Baixar como .docx (gerado via docxtemplater) */}
                        <button
                          onClick={handleDownloadDocx}
                          disabled={isDownloadingDocx}
                          className="flex items-center gap-1.5 bg-[#708D81] hover:bg-[#708D81]/90 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                        >
                          {isDownloadingDocx
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                          }
                          {isDownloadingDocx ? 'Gerando...' : 'Baixar DOCX'}
                        </button>
                        {/* Imprimir pelo browser */}
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
                        onClick={handleSaveTemplate}
                        className="flex items-center gap-1.5 bg-[#708D81] hover:bg-[#708D81]/90 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Salvar Modelo
                      </button>
                    )}
                  </div>
                </div>

                {/* FILL MODE */}
                {templateMode === 'fill' && (
                  <div className="flex flex-1 overflow-hidden">
                    {/* Form panel */}
                    <div className="w-72 flex-shrink-0 border-r border-[#EEEEF3] overflow-y-auto px-5 py-4 space-y-4 bg-[#EEEEF3]/20">
                      {/* Ajustes de Layout (Margens e Fonte) */}
                      <div className="bg-[#004777]/5 p-3.5 rounded-xl border border-[#004777]/10 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#004777] uppercase tracking-wide">
                          <Settings className="w-3.5 h-3.5" />
                          Ajustes de Layout
                        </div>
                        <p className="text-[10px] text-gray-400 -mt-1">Ajuste a fonte e as margens para encaixar o texto dentro da moldura.</p>

                        <div className="space-y-2 text-[11px]">
                          {/* Tamanho da Fonte */}
                          <div>
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Tamanho da Fonte:</span>
                              <span className="text-[#004777] font-bold">{fontSize}pt</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="16"
                              step="0.5"
                              value={fontSize}
                              onChange={e => setFontSize(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                          </div>

                          {/* Margem Superior */}
                          <div>
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Recuo do Topo:</span>
                              <span className="text-[#004777] font-bold">{paddingTop}cm</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="0.1"
                              value={paddingTop}
                              onChange={e => setPaddingTop(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                          </div>

                          {/* Margem Esquerda */}
                          <div>
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Margem Esquerda:</span>
                              <span className="text-[#004777] font-bold">{paddingLeft}cm</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="0.1"
                              value={paddingLeft}
                              onChange={e => setPaddingLeft(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                          </div>

                          {/* Margem Direita */}
                          <div>
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Margem Direita:</span>
                              <span className="text-[#004777] font-bold">{paddingRight}cm</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="0.1"
                              value={paddingRight}
                              onChange={e => setPaddingRight(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                          </div>

                          {/* Margem Inferior */}
                          <div>
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Margem Inferior:</span>
                              <span className="text-[#004777] font-bold">{paddingBottom}cm</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="0.1"
                              value={paddingBottom}
                              onChange={e => setPaddingBottom(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                          </div>

                          {/* Exibir Moldura da Empresa */}
                          <div className="pt-2 border-t border-[#004777]/10 flex items-center justify-between">
                            <span className="text-gray-500 font-semibold text-xs">Exibir Moldura:</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={showMoldura}
                                onChange={e => setShowMoldura(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#004777]"></div>
                            </label>
                          </div>

                          {/* Escala da Moldura */}
                          <div className="pt-2 border-t border-[#004777]/10">
                            <div className="flex justify-between text-gray-500 font-semibold mb-1">
                              <span>Escala da Moldura:</span>
                              <span className="text-[#004777] font-bold">{Math.round(frameScale * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.01"
                              value={frameScale}
                              onChange={e => setFrameScale(Number(e.target.value))}
                              className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#004777]"
                            />
                            <p className="text-[9px] text-gray-400 mt-1">Reduz/aumenta a moldura sem alterar o texto.</p>
                          </div>
                        </div>
                      </div>

                      {[
                        {
                          label: 'Proprietário / Locador',
                          fields: [
                            { key: 'NOME_LOCADOR', label: 'Nome Completo' },
                            { key: 'CPF_LOCADOR', label: 'CPF / CNPJ' },
                            { key: 'RG_LOCADOR', label: 'RG' },
                            { key: 'ENDERECO_LOCADOR', label: 'Endereço Residencial' },
                            { key: 'NACIONALIDADE_LOCADOR', label: 'Nacionalidade' },
                            { key: 'ESTADO_CIVIL_LOCADOR', label: 'Estado Civil' },
                            { key: 'PROFISSÃO_LOCADOR', label: 'Profissão' },
                            { key: 'CIDADE_LOCADOR', label: 'Cidade' },
                            { key: 'ESTADO_LOCADOR', label: 'Estado/UF' },
                            { key: 'CEP_LOCADOR', label: 'CEP' },
                          ]
                        },
                        {
                          label: 'Inquilino / Locatário',
                          fields: [
                            { key: 'NOME_LOCATARIO', label: 'Nome Completo' },
                            { key: 'CPF_LOCATARIO', label: 'CPF' },
                            { key: 'RG_LOCATARIO', label: 'RG' },
                            { key: 'ENDERECO_ATUAL_LOCATARIO', label: 'Endereço Atual' },
                            { key: 'NACIONALIDADE_LOCATARIO', label: 'Nacionalidade' },
                            { key: 'ESTADO_CIVIL_LOCATARIO', label: 'Estado Civil' },
                            { key: 'PROFISSÃO_LOCATARIO', label: 'Profissão' },
                            { key: 'CIDADE_LOCATARIO', label: 'Cidade' },
                            { key: 'ESTADO_LOCATARIO', label: 'Estado/UF' },
                            { key: 'CEP_LOCATARIO', label: 'CEP' },
                          ]
                        },
                        {
                          label: 'Imóvel & Valores',
                          fields: [
                            { key: 'ENDERECO_IMOVEL', label: 'Endereço Imóvel' },
                            { key: 'BAIRRO_IMOVEL', label: 'Bairro do Imóvel' },
                            { key: 'CIDADE_IMOVEL', label: 'Cidade do Imóvel' },
                            { key: 'ESTADO_IMOVEL', label: 'UF do Imóvel' },
                            { key: 'CEP_IMOVEL', label: 'CEP do Imóvel' },
                            { key: 'VALOR_ALUGUEL', label: 'Aluguel (R$)' },
                            { key: 'VALOR_ALUGUEL_EXTENSO', label: 'Aluguel por Extenso' },
                            { key: 'VALOR_BONIFICACAO', label: 'Bonificação (R$)' },
                            { key: 'VALOR_BONIFICACAO_EXTENSO', label: 'Bonificação por Extenso' },
                            { key: 'VALOR_ALUGUEL_BONIFICADO', label: 'Valor Líquido Bonificado' },
                            { key: 'VALOR_ALUGUEL_BONIFICADO_EXTENSO', label: 'Líquido por Extenso' },
                            { key: 'VALOR_CONDOMINIO', label: 'Condomínio (R$)' },
                            { key: 'VALOR_CONDOMINIO_EXTENSO', label: 'Condomínio por Extenso' },
                            { key: 'VALOR_IPTU', label: 'IPTU (R$)' },
                            { key: 'VALOR_ALUGUEL_APOS_MESES', label: 'Aluguel Após Carência' },
                            { key: 'VALOR_ALUGUEL_APOS_MESES_EXTENSO', label: 'Aluguel Carência Extenso' },
                          ]
                        },
                        {
                          label: 'Geral & Fiador',
                          fields: [
                            { key: 'NOME_FIADOR', label: 'Nome do Fiador' },
                            { key: 'CPF_FIADOR', label: 'CPF Fiador' },
                            { key: 'RG_FIADOR', label: 'RG Fiador' },
                            { key: 'ENDERECO_FIADOR', label: 'Endereço Fiador' },
                            { key: 'NACIONALIDADE_FIADOR', label: 'Nacionalidade Fiador' },
                            { key: 'ESTADO_CIVIL_FIADOR', label: 'Estado Civil Fiador' },
                            { key: 'PROFISSÃO_FIADOR', label: 'Profissão Fiador' },
                            { key: 'CIDADE_FIADOR', label: 'Cidade Fiador' },
                            { key: 'ESTADO_FIADOR', label: 'Estado Fiador' },
                            { key: 'CEP_FIADOR', label: 'CEP Fiador' },
                            { key: 'DADOS_IMOVEL_CAUCAO', label: 'Caução (Imóvel Garantidor)' },
                            { key: 'MATRICULA_IMOBILIARIA_FIADOR', label: 'Matrícula Caução' },
                            { key: 'FICHA_IMOBILIARIA_FIADOR', label: 'Ficha Caução' },
                            { key: 'ENDERECO_IMOBILIARIA_FIADOR', label: 'Endereço Imóvel Caução' },
                            { key: 'NOME_FIADOR2', label: 'Nome do Fiador 2' },
                            { key: 'CPF_FIADOR2', label: 'CPF Fiador 2' },
                            { key: 'RG_FIADOR2', label: 'RG Fiador 2' },
                            { key: 'NACIONALIDADE_FIADOR2', label: 'Nacionalidade Fiador 2' },
                            { key: 'ESTADO_CIVIL_FIADOR2', label: 'Estado Civil Fiador 2' },
                            { key: 'PROFISSÃO_FIADOR2', label: 'Profissão Fiador 2' },
                            { key: 'PRAZO_MESES', label: 'Prazo (Meses)' },
                            { key: 'PRAZO_CONTRATO', label: 'Prazo (Formatado)' },
                            { key: 'DATA_INICIO', label: 'Data Início' },
                            { key: 'DATA_FIM', label: 'Data Fim' },
                            { key: 'DIA_VENCIMENTO', label: 'Dia Vencimento' },
                            { key: 'DIA_PAGAMENTO_BONIFICADO', label: 'Venc. c/ Bonificação' },
                            { key: 'CIDADE_CONTRATO', label: 'Cidade Contrato' },
                            { key: 'DATA_ATUAL', label: 'Data Atual' },
                          ]
                        },
                        {
                          label: 'Campos do Res. Agatha',
                          fields: [
                            { key: 'DADOS_BANCARIOS_REPASSE', label: 'Dados Bancários do Depósito' },
                            { key: 'TAXA_LIMPEZA', label: 'Taxa Limpeza (R$)' },
                            { key: 'TAXA_GAS', label: 'Taxa Gás (R$)' },
                            { key: 'PROPRIETARIO_IMOVEL', label: 'Proprietário Geral' }
                          ]
                        }
                      ].map(section => (
                        <div key={section.label}>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2 mb-3">
                            {section.label}
                          </div>
                          <div className="space-y-3">
                            {section.fields.map(f => (
                              <div key={f.key} className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                                <input
                                  type="text"
                                  value={contractFields[f.key] || ''}
                                  onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                                  className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {customKeys.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-[#EEEEF3]">
                          <div className="text-xs font-bold text-[#004777] uppercase tracking-wider border-b border-[#004777]/10 pb-2 mb-3">
                            Campos Extra (Modelo Word)
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

                    {/* Live A4 preview – fiel ao modelo de contrato real */}
                    <div className="flex-1 overflow-y-auto bg-[#d0d0d0] p-8 flex justify-start lg:justify-center overflow-x-auto">
                      <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                          /* Oculta toda a interface do sistema na impressão */
                          body * {
                            visibility: hidden !important;
                          }
                          /* Mostra apenas a folha do contrato e seus elementos filhos */
                          .contract-print-area, .contract-print-area * {
                            visibility: visible !important;
                          }
                          /* Posiciona a folha no início absoluto da página a ser impressa */
                          .contract-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 210mm !important;
                            min-height: 297mm !important;
                            background: white !important;
                            box-shadow: none !important;
                            border: none !important;
                            box-sizing: border-box !important;
                          }
                          .contract-print-content {
                            padding: var(--print-padding-top, 3.5cm) var(--print-padding-right, 2cm) var(--print-padding-bottom, 2cm) var(--print-padding-left, 3cm) !important;
                            box-sizing: border-box !important;
                          }
                          @page {
                            size: A4;
                            margin: 0;
                          }
                        }
                      `}} />
                      <div
                        ref={containerRef}
                        className="contract-print-area"
                        style={{
                          background: '#fff',
                          width: '210mm',
                          minHeight: `${estimatedPages * 29.7}cm`,
                          boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          color: '#000',
                          position: 'relative',
                          boxSizing: 'border-box',
                          // Variáveis CSS repassadas ao escopo de impressão
                          '--print-padding-top': `${paddingTop}cm`,
                          '--print-padding-right': `${paddingRight}cm`,
                          '--print-padding-bottom': `${paddingBottom}cm`,
                          '--print-padding-left': `${paddingLeft}cm`,
                        } as React.CSSProperties}
                      >
                        {/* Molduras repetidas para cada página A4 individual */}
                        {showMoldura && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              pointerEvents: 'none',
                              zIndex: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {Array.from({ length: estimatedPages }).map((_, index) => (
                              <div
                                key={index}
                                style={{
                                  position: 'absolute',
                                  top: `${index * 29.7}cm`,
                                  left: 0,
                                  width: '100%',
                                  height: '29.7cm',
                                  display: 'flex',
                                  alignItems: 'flex-start', // Garante que a moldura comece exatamente no topo físico de cada página
                                  justifyContent: 'center',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${frameScale * 100}%`,
                                    height: `${frameScale * 100}%`,
                                    position: 'relative',
                                  }}
                                >
                                  <img
                                    src="/lais.svg"
                                    alt=""
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'fill',
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Texto do Contrato ABNT */}
                        <div
                          className="contract-print-content"
                          style={{
                            paddingTop: `${paddingTop}cm`,
                            paddingRight: `${paddingRight}cm`,
                            paddingBottom: `${paddingBottom}cm`,
                            paddingLeft: `${paddingLeft}cm`,
                            boxSizing: 'border-box',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            color: '#000',
                            position: 'relative',
                            zIndex: 2,
                            width: '100%',
                            minHeight: '100%',
                          }}
                        >
                          {renderContractDocument(templateContent, contractFields, fontSize, (key, val) => {
                            setContractFields(prev => ({ ...prev, [key]: val }));
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT MODE */}
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
                              Use tags como {`{{NOME_LOCATARIO}}`} para campos dinâmicos
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
                    {/* Tags reference panel */}
                    <div className="w-56 flex-shrink-0 border-l border-[#EEEEF3] overflow-y-auto p-4 bg-white">
                      <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-3">Tags Disponíveis</h4>
                      {[
                        { section: 'Locador', tags: ['NOME_LOCADOR', 'CPF_LOCADOR', 'RG_LOCADOR', 'ENDERECO_LOCADOR'] },
                        { section: 'Locatário', tags: ['NOME_LOCATARIO', 'CPF_LOCATARIO', 'RG_LOCATARIO', 'ENDERECO_ATUAL_LOCATARIO'] },
                        { section: 'Imóvel', tags: ['ENDERECO_IMOVEL', 'VALOR_ALUGUEL', 'VALOR_ALUGUEL_EXTENSO', 'VALOR_BONIFICACAO', 'VALOR_ALUGUEL_BONIFICADO', 'VALOR_ALUGUEL_BONIFICADO_EXTENSO', 'VALOR_CONDOMINIO', 'VALOR_IPTU'] },
                        { section: 'Fiador', tags: ['NOME_FIADOR', 'CPF_FIADOR', 'RG_FIADOR', 'ENDERECO_FIADOR', 'DADOS_IMOVEL_CAUCAO'] },
                        { section: 'Datas & Geral', tags: ['PRAZO_MESES', 'DATA_INICIO', 'DATA_FIM', 'DIA_VENCIMENTO', 'DIA_PAGAMENTO_BONIFICADO', 'CIDADE_CONTRATO', 'DATA_ATUAL'] },
                        { section: 'Res. Agatha', tags: ['DADOS_BANCARIOS_REPASSE', 'TAXA_LIMPEZA', 'TAXA_GAS', 'PROPRIETARIO_IMOVEL'] }
                      ].map(sec => (
                        <div key={sec.section} className="mb-4">
                          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">{sec.section}</p>
                          <div className="flex flex-col gap-1">
                            {sec.tags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setTemplateContent(prev => prev + `{{${tag}}}`)}
                                className="text-left px-2 py-1 rounded font-mono text-[10px] bg-[#EEEEF3] hover:bg-[#004777]/10 hover:text-[#004777] text-[#280003]/70 transition-colors"
                              >
                                {`{{${tag}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: VINCULAR NOVO INQUILINO & CONTRATO ── */}
      {isAddContractModalOpen && (
        <div className="fixed inset-0 bg-[#280003]/40 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-zinc-200 animate-scale-up">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#EEEEF3]/50 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#004777]" />
                <h3 className="text-lg font-bold text-[#280003]">
                  {modalView === 'MAIN' ? 'Vincular Novo Inquilino e Gerar Contrato' : 'Cadastrar Novo Inquilino'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddContractModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalView === 'MAIN' ? (
              /* MAIN VIEW FORM */
              <form onSubmit={handleGenerateLease} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* 1. Selecionar Inquilino */}
                  <div className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-3">
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
                        {allLocatarios.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome} (CPF: {c.cpfCnpj})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedInquilinoIndex !== '' && (() => {
                      const selectedInq = allLocatarios.find(i => i.id === selectedInquilinoIndex);
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

                  {/* 3. Condições Contratuais & Fiador (Now Step 3, side-by-side with Inquilino) */}
                  <div className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-3">
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
                              {allFiadores.map(c => (
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

                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Data Início *</label>
                        <input
                          type="date"
                          value={leaseDataInicio}
                          onChange={e => setLeaseDataInicio(e.target.value)}
                          required
                          className="block w-full border border-zinc-200 rounded-lg px-3 py-1 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Dados do Imóvel da Carteira (Now Step 2, full-width at the bottom) */}
                  <div className="bg-[#EEEEF3]/10 p-4 rounded-xl border border-zinc-100 space-y-4 md:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#004777]">
                      <Building className="w-4 h-4" />
                      2. Dados do Imóvel da Carteira
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Property search by address */}
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
                        {/* Imóvel Details, Landlord, and Inspection Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* Proprietário (Locador) details extracted from property */}
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

                          {/* Vistoria Details */}
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

                        {/* Financial custom inputs */}
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Aluguel do Imóvel (R$)</span>
                            <input
                              type="number"
                              value={customAluguel}
                              onChange={e => setCustomAluguel(e.target.value)}
                              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa Condomínio (R$)</span>
                            <input
                              type="number"
                              value={customCondominio}
                              onChange={e => setCustomCondominio(e.target.value)}
                              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Taxa IPTU (R$)</span>
                            <input
                              type="number"
                              value={customIptu}
                              onChange={e => setCustomIptu(e.target.value)}
                              className="w-full border border-zinc-200 rounded px-2.5 py-1.5 text-xs mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsAddContractModalOpen(false)}
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
            ) : (
              /* CREATE TENANT AND OPTIONAL GUARANTOR SUB-FORM */
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

                {/* Optional Guarantor Section */}
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

                {/* Sub-form Action Buttons */}
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
      )}
    </div>
  );
}
