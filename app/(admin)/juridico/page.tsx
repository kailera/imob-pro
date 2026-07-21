'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Send,
  PenTool,
  DollarSign,
  Plus,
  Download,
  CreditCard,
  ChevronRight,
  Info,
  User,
  Building,
  FileSpreadsheet,
  Check,
  Printer,
  X
} from 'lucide-react';
import { getLocatariosListAction, criarAcordoManualAction, getAgreementTransactionsAction, getInterPdfUrlAction } from '@/app/actions/interActions';


interface Contrato {
  contrato: string;
  inquilino: string;
  imovel: string;
  vencimento: string;
  status: 'Ativo' | 'Pendente' | 'Encerrado' | 'Atrasado' | 'Em Acordo';
  valorOriginal?: number;
  parcelasAtrasadas?: number;
}

interface NFSe {
  numero: string;
  tomador: string;
  cpfCnpj: string;
  valor: number;
  iss: number;
  pis: number;
  cofins: number;
  data: string;
  status: 'Emitida' | 'Cancelada';
  descricao: string;
}

interface ContractTemplate {
  id: string;
  name: string;
  type: 'LOCACAO' | 'VENDA' | 'LIMPEZA' | 'PROPOSTA';
  content: string;
}

export default function JuridicoPage() {
  const [activeTab, setActiveTab] = useState<'assinaturas' | 'nfse' | 'modelos' | 'renegociacao'>('assinaturas');
  
  // LocalStorage States
  const [contracts, setContracts] = useState<Contrato[]>([]);
  const [nfses, setNfses] = useState<NFSe[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  // Modals
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedContractForSign, setSelectedContractForSign] = useState<Contrato | null>(null);
  const [signType, setSignType] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSent, setTokenSent] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // NFSe Form
  const [showNfseModal, setShowNfseModal] = useState(false);
  const [selectedContractForNfse, setSelectedContractForNfse] = useState<string>('');
  const [nfseServiceDesc, setNfseServiceDesc] = useState('');
  const [nfseValue, setNfseValue] = useState<number>(0);
  
  // NFSe Viewer DANFE
  const [showDanfeModal, setShowDanfeModal] = useState(false);
  const [selectedNfseForView, setSelectedNfseForView] = useState<NFSe | null>(null);

  // Renegotiation Form
  const [showRenegotiateModal, setShowRenegotiateModal] = useState(false);
  const [selectedContractForReneg, setSelectedContractForReneg] = useState<Contrato | null>(null);
  const [renegDiscount, setRenegDiscount] = useState<number>(0); // 0 to 100%
  const [renegInstallments, setRenegInstallments] = useState<number>(1);
  const [renegEntryValue, setRenegEntryValue] = useState<number>(500);

  // Boleto Modal
  const [showBoletoModal, setShowBoletoModal] = useState(false);
  const [boletoValue, setBoletoValue] = useState<number>(0);
  const [boletoPayer, setBoletoPayer] = useState<{ name: string; cpf: string }>({ name: '', cpf: '' });

  // Manual Agreement States (Banco Inter Integration)
  const [locatarios, setLocatarios] = useState<any[]>([]);
  const [loadingLocatarios, setLoadingLocatarios] = useState(false);
  const [showManualAgreementModal, setShowManualAgreementModal] = useState(false);
  const [selectedLocatarioId, setSelectedLocatarioId] = useState('');
  const [agreementValue, setAgreementValue] = useState<number>(0);
  const [agreementDate, setAgreementDate] = useState('');
  const [agreementDesc, setAgreementDesc] = useState('');
  const [customCpfCnpj, setCustomCpfCnpj] = useState('');
  const [customAddress, setCustomAddress] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' });
  const [generatedAgreementBoleto, setGeneratedAgreementBoleto] = useState<any | null>(null);
  const [isGeneratingAgreement, setIsGeneratingAgreement] = useState(false);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [agreementTransactions, setAgreementTransactions] = useState<any[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [tenantSearchTerm, setTenantSearchTerm] = useState('');



  // Template Editing & Fill State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateMode, setTemplateMode] = useState<'fill' | 'edit'>('fill');
  const [contractFields, setContractFields] = useState<Record<string, string>>({
    NOME_LOCADOR: '',
    CPF_LOCADOR: '',
    RG_LOCADOR: '',
    ENDERECO_LOCADOR: '',
    NOME_LOCATARIO: '',
    CPF_LOCATARIO: '',
    RG_LOCATARIO: '',
    ENDERECO_ATUAL_LOCATARIO: '',
    ENDERECO_IMOVEL: '',
    DESCRICAO_COMODOS: '',
    VALOR_ALUGUEL: '',
    VALOR_ALUGUEL_EXTENSO: '',
    VALOR_CONDOMINIO: '',
    VALOR_IPTU: '',
    NOME_PRESTADOR: '',
    CPF_PRESTADOR: '',
    VALOR_SERVICO: '',
    FREQUENCIA_LIMPEZA: '',
    VALOR_VENDA: '',
    VALOR_SINAL: '',
    VALOR_SINAL_EXTENSO: '',
    DADOS_FINANCIAMENTO: '',
    PRAZO_MESES: '12',
    DATA_INICIO: '',
    DATA_FIM: '',
    DIA_VENCIMENTO: '10',
    CHAVE_PIX_LOCADOR: '',
    CIDADE_CONTRATO: '',
    DATA_ATUAL: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load locatarios from database
  useEffect(() => {
    async function loadLocatarios() {
      setLoadingLocatarios(true);
      try {
        const res = await getLocatariosListAction();
        if (res.success && res.locatarios) {
          setLocatarios(res.locatarios);
        } else {
          console.error("Erro ao carregar locatários:", res.error);
        }
      } catch (err) {
        console.error("Erro no loadLocatarios:", err);
      } finally {
        setLoadingLocatarios(false);
      }
    }
    loadLocatarios();
    loadAgreements();
  }, []);

  const loadAgreements = async () => {
    setLoadingAgreements(true);
    try {
      const res = await getAgreementTransactionsAction();
      if (res.success && res.transactions) {
        setAgreementTransactions(res.transactions);
      } else {
        console.error("Erro ao carregar acordos:", res.error);
      }
    } catch (err) {
      console.error("Erro no loadAgreements:", err);
    } finally {
      setLoadingAgreements(false);
    }
  };

  const handleDownloadBoleto = async (pdfKey: string) => {
    try {
      const url = await getInterPdfUrlAction(pdfKey);
      window.open(url, '_blank');
    } catch (err) {
      console.error("Erro ao obter URL do PDF:", err);
      setToastMessage("Erro ao carregar o PDF do boleto.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleLocatarioChange = (locatarioId: string) => {
    setSelectedLocatarioId(locatarioId);
    setAgreementError(null);
    setGeneratedAgreementBoleto(null);
    
    const loc = locatarios.find(l => l.id === locatarioId);
    if (loc) {
      setCustomCpfCnpj(loc.cpfCnpj || '');
      setAgreementDesc(`Acordo de Débitos - ${loc.nome}`);
      
      // Parse address
      let addr = { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' };
      if (loc.endereco) {
        try {
          const parsed = typeof loc.endereco === 'string' ? JSON.parse(loc.endereco) : loc.endereco;
          addr = {
            logradouro: parsed.logradouro || '',
            numero: parsed.numero || '',
            complemento: parsed.complemento || '',
            bairro: parsed.bairro || '',
            cidade: parsed.cidade || parsed.municipio || '',
            uf: parsed.uf || parsed.estado || '',
            cep: parsed.cep || ''
          };
        } catch (e) {
          console.error("Erro ao fazer parse do endereço do locatário:", e);
          if (typeof loc.endereco === 'string') {
            addr.logradouro = loc.endereco;
          }
        }
      }
      setCustomAddress(addr);
    } else {
      setCustomCpfCnpj('');
      setCustomAddress({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' });
      setAgreementDesc('');
    }
  };

  const handleGenerateManualAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocatarioId) {
      setAgreementError("Selecione um inquilino.");
      return;
    }
    if (agreementValue <= 0) {
      setAgreementError("O valor do acordo deve ser maior que zero.");
      return;
    }
    if (!agreementDate) {
      setAgreementError("Defina uma data de vencimento.");
      return;
    }
    if (!agreementDesc.trim()) {
      setAgreementError("Defina uma descrição para o acordo.");
      return;
    }

    const loc = locatarios.find(l => l.id === selectedLocatarioId);
    if (!loc) return;

    setIsGeneratingAgreement(true);
    setAgreementError(null);
    setGeneratedAgreementBoleto(null);

    try {
      const res = await criarAcordoManualAction({
        locatarioId: selectedLocatarioId,
        contratoId: loc.contratoId || null,
        descricao: agreementDesc,
        valor: agreementValue,
        vencimentoStr: agreementDate,
        cpfCnpj: customCpfCnpj,
        enderecoJson: customAddress
      });

      if (res.success) {
        setGeneratedAgreementBoleto(res);
        setToastMessage("Boleto de acordo gerado com sucesso!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        loadAgreements();
      } else {
        setAgreementError(res.error || "Erro ao emitir boleto no Banco Inter.");
      }
    } catch (err: any) {
      console.error("Erro ao submeter acordo manual:", err);
      setAgreementError(err.message || "Erro inesperado ao gerar o acordo.");
    } finally {
      setIsGeneratingAgreement(false);
    }
  };

  // Initial Load from LocalStorage
  useEffect(() => {

    // 1. Load Contracts
    const savedContracts = localStorage.getItem('imob-pro-contracts-state');
    if (savedContracts) {
      try { setContracts(JSON.parse(savedContracts)); } catch (e) { console.error(e); }
    } else {
      const defaultContracts: Contrato[] = [
        { contrato: 'LOC-2023-001', inquilino: 'João da Silva', imovel: 'IMB-001 - Apto Centro', vencimento: '10/07/2026', status: 'Ativo' },
        { contrato: 'LOC-2023-002', inquilino: 'Maria Souza', imovel: 'IMB-005 - Sobrado', vencimento: '15/07/2026', status: 'Ativo' },
        { contrato: 'LOC-2024-001', inquilino: 'Carlos Mendes', imovel: 'IMB-002 - Casa Cond.', vencimento: '05/06/2026', status: 'Atrasado', valorOriginal: 3200.00, parcelasAtrasadas: 2 },
        { contrato: 'LOC-2022-045', inquilino: 'Ana Beatriz', imovel: 'IMB-004 - Kitnet', vencimento: '01/05/2026', status: 'Atrasado', valorOriginal: 1500.00, parcelasAtrasadas: 3 },
        { contrato: 'LOC-2024-005', inquilino: 'Roberto Justos', imovel: 'IMB-003 - Cobertura', vencimento: '20/07/2026', status: 'Pendente' },
      ];
      setContracts(defaultContracts);
      localStorage.setItem('imob-pro-contracts-state', JSON.stringify(defaultContracts));
    }

    // 2. Load NFSe
    const savedNfses = localStorage.getItem('imob-pro-nfse-state');
    if (savedNfses) {
      try { setNfses(JSON.parse(savedNfses)); } catch (e) { console.error(e); }
    } else {
      const defaultNfses: NFSe[] = [
        {
          numero: '20260001',
          tomador: 'Maria Souza',
          cpfCnpj: '222.333.444-55',
          valor: 1850.00,
          iss: 92.50,
          pis: 12.03,
          cofins: 55.50,
          data: '28/06/2026',
          status: 'Emitida',
          descricao: 'Serviços de intermediação e corretagem imobiliária referentes ao imóvel IMB-005 conforme contrato LOC-2023-002.'
        },
        {
          numero: '20260002',
          tomador: 'João da Silva',
          cpfCnpj: '111.222.333-44',
          valor: 2500.00,
          iss: 125.00,
          pis: 16.25,
          cofins: 75.00,
          data: '29/06/2026',
          status: 'Emitida',
          descricao: 'Taxa de administração mensal sobre locação imobiliária de imóvel IMB-001 (Apto Centro) - Período Junho/2026.'
        }
      ];
      setNfses(defaultNfses);
      localStorage.setItem('imob-pro-nfse-state', JSON.stringify(defaultNfses));
    }

    // 3. Load Templates – seed with defaults if nothing saved yet (same as /contratos page)
    const DEFAULT_TEMPLATES: ContractTemplate[] = [
      {
        id: 'res-caninde',
        name: 'Locação - Passeio Canindé 203 (Original)',
        type: 'LOCACAO',
        content: `CONTRATO DE LOCAÇÃO

LOCADOR: {{NOME_LOCADOR}}, brasileiro(a), aposentado(a), inscrito(a) no CPF sob o nº {{CPF_LOCADOR}} e no RG nº {{RG_LOCADOR}} neste ato representado pela Sra. LAÍS FERNANDA CARAVANTE MARIANO ESCATOLIN, brasileira, casada, corretora de imóveis portadora do CRECI da 2º região, sob o nº 293.493-SP e inscrita no CPF/MF sob nº 427.195.158-76, estabelecida com escritório profissional denominada SCATOLIN IMÓVEIS, possuidora do endereço eletrônico: scatolinimoveis@gmail.com, com endereço profissional no Passeio Cristalina, 113, Zona Norte, Ilha Solteira - SP, CEP 15385-000, cidade e comarca de Ilha Solteira, Estado de São Paulo.

LOCATÁRIO: {{NOME_LOCATARIO}}, brasileiro(a), casado(a), auxiliar de serviços gerais, inscrito(a) no RG sob o nº {{RG_LOCATARIO}} e CPF nº {{CPF_LOCATARIO}}, residente e domiciliado(a) na {{ENDERECO_ATUAL_LOCATARIO}}.

FIADOR: {{NOME_FIADOR}}, brasileiro(a), casado(a), inscrito(a) no RG e CPF sob o nº {{CPF_FIADOR}}, residente e domiciliado(a) no {{ENDERECO_FIADOR}}.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Locação Residencial do Imóvel citado abaixo, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

OBJETO DE LOCAÇÃO: Locação do Imóvel Residencial, situado no {{ENDERECO_IMOVEL}}, livre de ônus ou quaisquer dívidas.

FIM A QUE SE DESTINA: O Imóvel, objeto de locação, destina-se exclusivamente ao uso RESIDENCIAL, não podendo ser mudada a sua destinação em hipótese alguma.

VALOR MENSAL DA LOCAÇÃO: O valor da locação do Imóvel é de R\${{VALOR_ALUGUEL}} ({{VALOR_ALUGUEL_EXTENSO}}), com vencimento dia {{DIA_VENCIMENTO}}, com bonificação acordada de R\${{VALOR_BONIFICACAO}} resultando para R\${{VALOR_ALUGUEL_BONIFICADO}} ({{VALOR_ALUGUEL_BONIFICADO_EXTENSO}}) desde que pagos impreterivelmente até o dia {{DIA_PAGAMENTO_BONIFICADO}} de cada mês, a ser efetuado exclusivamente por boleto bancário. 

Parágrafo Único: O não pagamento dos alugueres e demais encargos implicará na cobrança judicial e envio do nome do locatário e execução do imóvel (objeto de caução desse contrato) ao serviço de proteção ao credito, Serasa e Cartório de Protesto de Títulos, tudo de acordo com a Lei Paulista número 13.160/2008 de 21/07/08. Além de possíveis medidas extrajudiciais e/ou judiciais, quando incidirá no acréscimo de honorários advocatícios de 20% sobre o valor do débito, bem como eventuais custas e despesas processuais.  

MORA: Em caso de mora do Locatário quanto ao pagamento do aluguel e encargos locatícios, qualquer que seja o atraso, o débito será acrescido de juros de moratória de 0,34% ao dia, contados dia a dia e multa moratória de 10% (dez por cento). E se o atraso for superior a 30 dias, incidirá também correção monetária e encerramento deste contrato, com a desocupação de imediato do Locatário do imóvel  

REAJUSTE: O aluguel reajustado automaticamente, na periocidade mínima determinada pela Medida Provisória n. 1106 de 29/08/95, aplicando-se o Índice Geral de Preços do Mercado (IGP-M), ou em sua falta pelo Índice de Preços ao Consumidor (IPCA), ou também não sendo este calculado pôr qualquer outro índice de preços, oficial ou não, que reflita a variação dos preços, no período do reajuste, caso haja deflação fica o valor atual de locação.

PRAZO DA LOCAÇÃO: {{PRAZO_MESES}} meses.

INICIO: {{DATA_INICIO}}               TÉRMINO: {{DATA_FIM}}

TRIBUTOS E DEMAIS ENCARGOS: Além do aluguel, obriga-se a LOCATÁRIA a efetuar o pagamento dos seguintes encargos, que poderão ser exigidos juntamente com o aluguel: 

A) O imposto predial e territorial (IPTU) no valor de R\${{VALOR_IPTU}};
B) O consumo de água e energia elétrica;
C) As taxas de condomínio de R\${{VALOR_CONDOMINIO}} se houverem;
D) Os demais encargos e tributos que normalmente incidem ou venham a incidir sobre o imóvel, se houverem; 
E) Taxa de incêndio, alvará de funcionamento se houverem.

O LOCATÁRIO deverá entregar os comprovantes de pagamento a LOCADORA no prazo de 30 (trinta) dias após o (s) vencimento (s) da (s) parcelas sob pena de incorrer em rescisão contratual. O não pagamento desses encargos nas épocas próprias, facultará o LOCADOR a justa recusa ao recebimento dos alugueres, sujeitando-se o LOCATÁRIO ao pagamento dos ônus decorrentes do inadimplemento, previstos para cada débito, independentemente de eventual ação de despejo. 

Compete ao LOCATÁRIO, de posse do contrato assinado, em um prazo máximo de 10 dias úteis, requerer a transferência da titularidade da energia elétrica e serviço de água, bem como pagar eventual taxa pelo ato, e quando da devolução do imóvel, promover seu desligamento, com a consequente quitação do consumo final, apresentando à LOCADORA os comprovantes destes pagamentos e a transferência da titularidade de ambos os serviços para o nome da LOCADORA.  

Compromete-se o LOCATÁRIO a contratar empresa idônea para fazer o contrato de seguro contra incêndio, vendaval e outros danos, sendo certo que tal contrato deverá ter vênia da LOCADORA, com base no valor de mercado do imóvel, tendo o contrato de seguro vigência enquanto perdurar a locação, incluindo-se eventual renovação. 

Obriga-se o LOCATÁRIO a contratar empresa de seguro no prazo de 10(dez) dias, contados a partir da data inicial de vigência deste contrato, apresentando a respectiva apólice para arquivo da LOCADORA, sob pena de infração contratual. 

O LOCADOR não exigirá ressarcimento ao LOCATÁRIO pelo pagamento do prêmio do seguro contra incêndio, a ser contratado com companhia seguradora de confiança da LOCADORA e sendo está a beneficiária do prêmio indenizatório, que deverá ser fixado sempre com base no valor de mercado do imóvel. 

OBRIGAÇÕES GERAIS: o LOCATÁRIO declara ter procedido a vistoria do Imóvel, recebendo-o em perfeito estado e obrigando-se a: 

Manter o objeto da locação no mais perfeito estado de conservação e limpeza, para assim restituir a LOCADORA, quando finda ou rescindida a locação, correndo por sua conta exclusiva as despesas necessárias para este fim, notadamente, as que se referem à conservação de pinturas, portas, fechaduras, trincos, puxadores, acabamentos, chuveiros, armários do banheiro, cozinha, instalações elétricas, torneiras, aparelhos sanitários, e quaisquer outras, inclusive obrigando-se a pintá-lo novamente em sua desocupação com tintas de primeira qualidade atendendo o laudo de vistoria, assinado e anexado a este contrato, fazendo parte integrante do mesmo;

As despesas de limpeza, conservação e manutenção do imóvel serão de responsabilidade do LOCATÁRIO, incluindo Desentupimento e limpeza de calhas, ralo, pias, lavabos, esgotos, caixas de gordura, valetas, caneletas, reparos de telhados (substituição de telhas quebras ou deslocadas), consertos de vazamentos de água (torneiras e chuveiros, pingando, reparo de válvulas), manutenção de caixas d’água, forros, Controles de Insetos, trocas de soquetes, tomadas, e interruptores de luzes, e entregar todos os pontos de luz com as lâmpadas. 

Não fazer instalação, adaptação, obra ou benfeitoria, inclusive colocação de novos pontos de internet, sem permissão de instalação aérea da mesma, ou seja, que sejam usados os pontos já instalados no imóvel, além de luminosos, placas, letreiros e cartazes sem prévia autorização, por escrito, da LOCADORA, não poderá fixar pregos, armários, telas, adornos nas paredes, fica vedado a fixação de buchas, pregos, parafusos nas paredes que forem revestidas de azulejos cerâmicos.

Não transferir este contrato, não sublocar, não ceder ou emprestar, sob qualquer pretexto e de igual forma alterar a destinação da locação, não constituindo o decurso do tempo, por si só, na demora da LOCADORA reprimir a infração, assentimento à mesma;

Encaminhar a LOCADORA todas as notificações, avisos ou intimações dos poderes públicos que forem entregues no imóvel, sob pena de responder pelas multas, correção monetária e penalidades decorrentes do atraso no pagamento ou satisfação no cumprimento de determinações por aqueles poderes;

No caso de qualquer obra, reforma ou adaptação, devidamente autorizada pela LOCADORA, repor por ocasião da entrega efetiva das chaves do imóvel locado, seu estado primitivo, não podendo exigir qualquer indenização;

Na entrega do imóvel, verificando-se infração da parte do LOCATÁRIO de quaisquer das cláusulas que se compõe este contrato, e que então, o imóvel necessite de algum conserto ou reparo, ficará o mesmo LOCATÁRIO, pagando o aluguel, até a entrega das chaves do imóvel na sua total integridade;
Findo o prazo deste contrato, por ocasião da entrega das chaves, a LOCADORA realizará uma vistoria minuciosa no imóvel locado, a fim de verificar se o mesmo se encontra nas mesmas condições em que foi recebido, pelo LOCATÁRIO;

DA VENDA DO IMÓVEL: Na hipótese de o LOCADOR decidir vender o imóvel objeto deste contrato durante a vigência da locação, o LOCATÁRIO terá direito de preferência para adquiri-lo, em igualdade de condições com terceiros, nos termos da legislação vigente. Para tanto, o LOCADOR notificará formalmente o LOCATÁRIO, por escrito, informando o preço, as condições de pagamento e demais termos da proposta, iniciando-se, a partir do recebimento da notificação, o prazo de 30 (trinta) dias para que o LOCATÁRIO manifeste, por escrito, seu interesse na aquisição do imóvel, sob pena de decadência do direito de preferência. Caso o LOCATÁRIO não exerça o direito de preferência no prazo acima estipulado, ou manifeste expressamente sua desistência, o LOCADOR ficará livre para vender o imóvel a terceiros.

Parágrafo primeiro: Na hipótese de efetiva venda do imóvel a terceiros, o LOCATÁRIO será formalmente notificado para desocupá-lo, comprometendo-se a entregá-lo livre e desocupado no prazo máximo de 90 (noventa) dias, contados do recebimento da notificação, no estado em que o recebeu, ressalvadas apenas as deteriorações decorrentes do uso normal, não sendo devida qualquer indenização ao LOCATÁRIO em razão da venda do imóvel.

Parágrafo segundo: O LOCATÁRIO compromete-se a permitir visitas ao imóvel por interessados na compra, comprometendo-se a permitir o acesso do LOCADOR, corretores ou terceiros autorizados, em horário comercial, mediante agendamento prévio com antecedência mínima de 01 (um) dia útil, de forma a não prejudicar o uso regular do imóvel. As visitas deverão ocorrer de forma a não prejudicar o uso normal do imóvel pelo LOCATÁRIO, sendo vedadas visitas em horários noturnos, salvo acordo entre as partes.

RESCISÃO CONTRATUAL: A infração das obrigações consignadas na cláusula oitava, sem prejuízo de qualquer outra prevista em Lei, por parte do LOCATÁRIO, é considerada como de natureza grave, acarretando a rescisão contratual, com o consequente despejo e obrigatoriedade de imediata satisfação dos consectários contratuais e legais;

Parágrafo Primeiro: Caso o objeto da locação vier a ser desapropriado pelos Poderes Públicos, ficará o presente contrato, bem como a LOCADORA, exonerado de toda e qualquer responsabilidade decorrente.

Parágrafo segundo: Por ocasião da desocupação do imóvel e entrega das chaves, o LOCATÁRIO obriga-se ao pagamento de taxa de limpeza no valor de R$ 300,00 (trezentos reais), correspondente à limpeza simples e padrão do imóvel. Caso o imóvel seja devolvido em estado de sujeira excessiva, acúmulo de gordura, resíduos, mofo, odores fortes ou qualquer condição que ultrapasse uma limpeza simples, o LOCATÁRIO deverá arcar também com o custo da limpeza adicional necessária, conforme valor cobrado por profissional de limpeza (faxineira ou diarista) contratado para esse fim.

RENOVAÇÃO: Obriga-se a LOCATÁRIA a renovar expressamente um novo contrato, caso vier a permanecer no imóvel após o prazo de validade deste. O novo aluguel, após o vencimento será calculado mediante índice determinado pelo governo federal, o Índice Geral de Preços do Mercado (IGP-M), ou em sua falta pelo Índice de Preços ao Consumidor (IPCA), ou também não sendo este calculado pôr qualquer outro índice de preços, oficial ou não, que reflita a variação dos preços, no período do reajuste, caso haja deflação fica o valor atual de locação.

DOS FIADORES: O FIADOR se obriga solidária e integralmente com O LOCATÁRIO pelo cumprimento de todas as obrigações decorrentes deste contrato, respondendo na mesma medida que o LOCATÁRIO, inclusive em caso de prorrogação legal ou contratual, até a efetiva entrega das chaves. Na hipótese de falência, insolvência, morte ou incapacidade do FIADOR, o LOCATÁRIO deverá, no prazo de 30 (trinta) dias apresentar novo fiador idôneo que seja aceito pelo LOCADOR, sob pena de rescisão contratual.

Parágrafo primeiro: O FIADOR responde solidariamente até a efetiva entrega das chaves, mesmo em caso de prorrogação tácita do contrato, renunciando expressamente ao benefício de ordem previsto no artigo 827 do Código Civil.

DA CAUÇÃO: Como garantia do fiel cumprimento de todas as obrigações assumidas neste instrumento, o(a) FIADOR(A) oferece em caução o imóvel abaixo descrito: {{DADOS_IMOVEL_CAUCAO}}. O(a) FIADOR(A) declara, sob as penas da lei, ser legítimo(a) proprietário(a) e possuidor(a) do referido imóvel, responsabilizando-se pela veracidade das informações prestadas. A presente caução é prestada em caráter irrevogável e irretratável, garantindo todas as obrigações decorrentes deste contrato, inclusive principal, encargos, multas, juros, custas e honorários advocatícios. Em caso de inadimplemento das obrigações garantidas, poderá o(a) CREDOR(A)/LOCADOR(A), independentemente de notificação judicial ou extrajudicial, promover a execução da presente garantia na forma da legislação aplicável. A extinção desta caução ocorrerá somente após a quitação integral de todas as obrigações assumidas neste instrumento, mediante declaração expressa do(a) CREDOR(A)/LOCADOR(A).

VANTAGENS LEGAIS SUPERVENIENTES: A locação estará sempre sujeita ao Regime do Código Civil Brasileiro e a Lei nº 8.245 de 18/10/1991, ficando assegurado ao LOCADOR todos os direitos e vantagens conferidas pela legislação que vier a ser promulgada durante a locação.

CLÁUSULA PENAL: O LOCADOR e o LOCATÁRIO obrigam-se a respeitar o presente contrato em todas as suas cláusulas e condições, incorrendo a parte que infringir qualquer disposição contratual ou legal na multa igual a 3 (três) vezes o valor mensal do aluguel, que será sempre paga integralmente, qualquer que seja o tempo contratual decorrido, inclusive se verificada a prorrogação da vigência da locação. O pagamento da multa não obsta a rescisão do contrato pela parte inocente, caso lhe convier;

Sabe-se que o pagamento da multa acima pactuada não eximirá o LOCATÁRIO de solver os aluguéis vencidos, nem de ressarcir os danos que, porventura, vier à causa ao imóvel.

Paragrafo único: O LOCATÁRIO que ao final de um ano de contrato, a contar do início da vigência do mesmo, optar pela desocupação do imóvel, ficará isento da multa de rescisão contratual, desde que, por escrito, comunique esta intenção ao LOCADOR, com a antecedência de no mínimo 30 (trinta) dias do término contratual, sob pena de multa correspondente a 01 (um) mês de aluguel e encargos vigentes. OBS: Considera-se ano contratual o interstício de 12 meses, contados do dia {{DATA_INICIO}} com término em {{DATA_FIM}}, podendo receber as seguintes denominações: 1º ano contratual (12 meses); 2º ano contratual (24 meses); 3º ano contratual (36 meses); etc.

Fica estipulado entre as partes contratantes que o valor da cláusula penal será reajustado toda vez que ocorrer alteração do valor do aluguel, ficando sempre respeitada igual proporcionalidade, reajustamento esse que será automático, bem como o seu pagamento não exime no caso de rescisão, a obrigação do pagamento dos aluguéis e danos ocasionados no imóvel locado;

As partes contratantes elegem o foro da situação do imóvel, quaisquer que sejam os seus domicílios, para dirimir qualquer dúvida ou litígio oriundo do presente contrato.

E, por estarem justos e contratados, assinam o presente instrumento em 03 (três) vias de igual teor

{{CIDADE_CONTRATO}}, {{DATA_ATUAL}}

______________________________________________
{{NOME_LOCADOR}}
Locador(a)

______________________________________________
{{NOME_LOCATARIO}}
Locatário(a)

______________________________________________
{{NOME_FIADOR}}
Fiador(a)`
      },
      {
        id: 'res-agatha',
        name: 'Locação - Residencial Agatha (Original)',
        type: 'LOCACAO',
        content: `CONTRATO DE LOCAÇÃO

LOCADORA: {{NOME_LOCADOR}}, inscrita no CPF/CNPJ sob o nº {{CPF_LOCADOR}}, neste ato representada pela Sra. LAÍS FERNANDA CARAVANTE MARIANO ESCATOLIN, brasileira, casada, corretora de imóveis portadora do CRECI da 2º região, sob o nº 293.493-SP e inscrita no CPF/MF sob nº 427.195.158-76, estabelecida com escritório profissional denominada SCATOLIN IMÓVEIS, possuidora do endereço eletrônico: scatolinimoveis@gmail.com, com endereço profissional no Passeio Cristalina, 113, Zona Norte, Ilha Solteira - SP, CEP 15385-000, cidade e comarca de Ilha Solteira, Estado de São Paulo.

LOCATÁRIO: {{NOME_LOCATARIO}}, brasileiro(a), solteiro(a), professor(a), inscrito(a) no CPF sob o nº {{CPF_LOCATARIO}}, RG nº {{RG_LOCATARIO}}.

FIADOR: {{NOME_FIADOR}}, brasileiro(a), casado(a), inscrito(a) no CPF sob o nº {{CPF_FIADOR}} e RG nº {{RG_FIADOR}}, residente e domiciliado(a) na {{ENDERECO_FIADOR}}.

As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Locação Residencial do Imóvel citado abaixo, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.

OBJETO DE LOCAÇÃO: Locação do Imóvel Residencial Agatha, situado no {{ENDERECO_IMOVEL}}, o qual possui a delimitação de até 3 (três) pessoas o residindo, ou seja, dois adultos e uma criança, livre de ônus ou quaisquer dívidas.

FIM A QUE SE DESTINA: O Imóvel, objeto de locação, destina-se exclusivamente ao uso RESIDENCIAL, não podendo ser mudada a sua destinação em hipótese alguma.

VALOR MENSAL DA LOCAÇÃO: O valor da locação do Imóvel é de R\${{VALOR_ALUGUEL}} ({{VALOR_ALUGUEL_EXTENSO}}), com vencimento todo dia {{DIA_VENCIMENTO}} de cada mês. Fica acordada bonificação de R\${{VALOR_BONIFICACAO}}, resultando então para R\${{VALOR_ALUGUEL_BONIFICADO}} ({{VALOR_ALUGUEL_BONIFICADO_EXTENSO}}), desde que pagos impreterivelmente até o dia {{DIA_PAGAMENTO_BONIFICADO}} de cada mês, a ser efetuado através de depósito bancário na conta da LOCADORA sendo esta, {{DADOS_BANCARIOS_REPASSE}}.  

Parágrafo Único: O não pagamento dos alugueres e demais encargos implicará na cobrança judicial e envio do nome do(a) LOCATÁRIO(A) e execução do imóvel (objeto de caução desse contrato) ao serviço de proteção ao credito, Serasa e Cartório de Protesto de Títulos, tudo de acordo com a Lei Paulista número 13.160/2008 de 21/07/08. Além de possíveis medidas extrajudiciais e/ou judiciais, quando incidirá no acréscimo de honorários advocatícios de 20% sobre o valor do débito, bem como eventuais custas e despesas processuais.  

MORA: Em caso de mora do(a) LOCATÁRIO(A) quanto ao pagamento do aluguel e encargos locatícios, qualquer que seja o atraso, o débito será acrescido de juros de moratória de 0,034% ao dia, contados dia a dia e multa moratória de 10% (dez por cento). E se o atraso for superior a 30 dias, incidirá também correção monetária e encerramento deste contrato, com a desocupação de imediato do(a) LOCATÁRIO(A) do imóvel. 

REAJUSTE: O aluguel reajustado automaticamente, na periocidade mínima determinada pela Medida Provisória n. 1106 de 29/08/95, aplicando-se o Índice Geral de Preços do Mercado (IGP-M), ou em sua falta pelo Índice de Preços ao Consumidor (IPCA), ou também não sendo este calculado pôr qualquer outro índice de preços, oficial ou não, que reflita a variação dos preços, no período do reajuste, caso haja deflação fica o valor atual de locação.

PRAZO DA LOCAÇÃO: {{PRAZO_MESES}} meses.

INICIO: {{DATA_INICIO}}               TÉRMINO: {{DATA_FIM}}

TRIBUTOS E DEMAIS ENCARGOS: Além do aluguel, obriga-se o(a) LOCATÁRIO(A) a efetuar o pagamento dos seguintes encargos, que poderão ser exigidos juntamente com o aluguel: 

A) O imposto predial e territorial (IPTU) no valor de R\${{VALOR_IPTU}}; que será cobrado em uma única parcela, no início de cada ano, no mês de fevereiro. 
B) O consumo de energia elétrica, enviando mensalmente as contas pagas para a LOCADORA;
C) A taxa de limpeza do residencial de R\${{TAXA_LIMPEZA}};
D) A taxa de gás, cujo valor mensal cobrado será de R\${{TAXA_GAS}}; 
F) Pagamento de água. Todos os meses o(a) LOCATÁRIO(A) deverá entrar em contato com o DAE pelo e-mail dae@ilhasolteira.sp.gov.br ou setor pessoal de água e efetuar o pagamento.

5.1. O(A) LOCATÁRIO(A) deverá entregar os comprovantes de pagamento a LOCADORA no prazo de 30 (trinta) dias após o (s) vencimento (s) da (s) parcelas sob pena de incorrer em rescisão contratual. O não pagamento desses encargos nas épocas próprias, facultará a LOCADORA a justa recusa ao recebimento dos alugueres, sujeitando-se ao LOCATÁRIO(A) o pagamento dos ônus decorrentes do inadimplemento, previstos para cada débito, independentemente de eventual ação de despejo. 

Compete O(A) LOCATÁRIO(A), de posse do contrato assinado, em um prazo máximo de 10 dias úteis, requerer a transferência da titularidade da energia elétrica, bem como pagar eventual taxa pelo ato, enviando mensalmente o comprovante de pagamento para a locatária, e quando da devolução do imóvel, promover seu desligamento, com a consequente quitação do consumo final, apresentando à LOCADORA os comprovantes destes pagamentos e a transferência da titularidade de ambos os serviços para o nome do proprietário, ora {{PROPRIETARIO_IMOVEL}}.  

Observação: Vale ressaltar, que todos os meses, após o efetivo pagamento da conta de água, e energia, o(a) LOCATÁRIO(A) deverá enviar a LOCADORA o comprovante de pagamento de ambos os serviços. 

OBRIGAÇÕES GERAIS: O(A) LOCATÁRIO(A) declara ter procedido a vistoria do Imóvel, recebendo-o em perfeito estado e obrigando-se a: 

Manter o objeto da locação no mais perfeito estado de conservação e limpeza, para assim restituir o LOCADORA, quando finda ou rescindida a locação, correndo por sua conta exclusiva as despesas necessárias para este fim, notadamente, as que se referem à conservação de pinturas, portas, fechaduras, trincos, puxadores, acabamentos, chuveiros, armários do banheiro, cozinha, instalações elétricas, torneiras, aparelhos sanitários, e quaisquer outras, inclusive obrigando-se a pintá-lo novamente em sua desocupação com tintas de primeira qualidade na cor Branco Gelo nas paredes e teto, Esmalte Sintético na cor Branca nas ferragens, e Verniz Marítimo Brilhante nas portas, atendendo o laudo de vistoria, assinado e anexado a este contrato;

As despesas de limpeza, conservação e manutenção do imóvel serão de responsabilidade do(a) LOCATÁRIO(A), incluindo Desentupimento e limpeza de ralos, pias, esgotos, caixa d´água consertos de vazamentos de água (torneiras e chuveiros, pingando, reparo de válvulas), Controles de Insetos, trocas de soquetes, tomadas, e interruptores de luzes, ventilador de teto, higienização dos ares condicionado, entregando a cada um ano, e também na entrega do apartamento, o comprovante de limpeza da empresa climatizadora, e entregar todos os pontos de luz com as lâmpadas. 

Não fazer instalação, adaptação, obra ou benfeitoria, inclusive colocação de novos pontos de internet, sem permissão de instalação aérea da mesma, ou seja, que sejam usados os pontos já instalados no imóvel, além de luminosos, placas, letreiros e cartazes sem prévia autorização, por escrito, da LOCADORA, não poderá fixar pregos, armários, telas, adornos pregos, parafusos nas paredes que forem revestidas de azulejos cerâmicos, não colocar de bicicletas, motocicletas, brinquedos, objetos pessoais na escada ou área comum.

Não transferir este contrato, não sublocar, não ceder ou emprestar, sob qualquer pretexto e de igual forma alterar a destinação da locação, não constituindo o decurso do tempo, por si só, na demora da LOCADORA reprimir a infração, assentimento à mesma;

Encaminhar a LOCADORA todas as notificações, avisos ou intimações dos poderes públicos que forem entregues no imóvel, sob pena de responder pelas multas, correção monetária e penalidades decorrentes do atraso no pagamento ou satisfação no cumprimento de determinações por aqueles poderes;

No caso de qualquer obra, reforma ou adaptação, devidamente autorizada pela LOCADORA, repor por ocasião da entrega efetiva das chaves do imóvel locado, seu estado primitivo, não podendo exigir qualquer indenização;

Na entrega do imóvel, verificando-se infração da parte do(a) LOCATÁRIO(A) de quaisquer das cláusulas que se compõe este contrato, e que então, o imóvel necessite de algum conserto ou reparo, ficará o mesmo, LOCATÁRIO(A), pagando o aluguel, até a entrega das chaves do imóvel na sua total integridade;

Findo o prazo deste contrato, por ocasião da entrega das chaves, a LOCADORA realizará uma vistoria minuciosa no imóvel locado, a fim de verificar se o apartamento se encontra nas mesmas condições em que foi recebido, pelo(a) LOCATÁRIO(A);

O(A) LOCATÁRIO(A) dá a LOCADORA a faculdade de, por si ou por seu representante, vistoriar o imóvel, em dias marcados com antecedência mínima de 05 (cinco) dias, em horas e dias combinados por ambas as partes. 

Se feita a vistoria, for constatado qualquer dano ao imóvel ou suas instalações, a LOCADORA, notificara o(a) LOCATÁRIO(A) para, no prazo máximo de 10 (dez) dias, proceder ao conserto ou reparo necessário, às duas próprias expensas. A notificação poderá ser judicial, extrajudicial. 

Não executando o conserto ou reparo constato segundo dispositivo acima narrado, a LOCADORA, mandará executá-lo, por pessoa ou empresa de sua livre escolha, ficando o(a) LOCATÁRIO(A) obrigado ao pagamento em dobro de todos os gastos verificados, podendo a despesa ser incluída no recibo de quitação mensal do aluguel, ora boleto, além disso, caso a LOCADORA entenda por necessário a desocupação do imóvel, essa notificará o LOCATÁRIO(A) para que no prazo de 10 (dez) dias desocupe o mesmo, deixando o imóvel nas condições iniciais, ou seja, respeitando o termo de vistoria e o que foi combinado entre ambas as partes. 

REGRAS DO CONDOMINIO: O(A) LOCATÁRIO(A), declara estar cientes das regras do condomínio, quais sejam:
É terminantemente proibido o estacionamento de motocicletas e bicicletas em qualquer área comum, jardins, que não a respectiva garagem, demarcação para motos, ou no bicicletário do apartamento;
É proibida a permanência de objetos pessoais na área comum do condomínio, a qual não seja a garagem (destinada a veículos), e caso esses objetos continuem nas permanências do condomínio, se não identificados, todos os condôminos serão notificados, sendo a segunda notificação passível de multa no valor de um aluguel de cada morador. 
Os animais existentes no condomínio serão tolerados, desde que não perturbem os demais moradores, sejam vacinados, de pequeno porte, que não sujem áreas comuns e que permaneçam sob estrita vigilância. O abuso e a não observância destas normas, ocasionarão multas e a possível desocupação do imóvel;
Não é permitido pendurar toalhas, tapetes, ou quaisquer outros acessórios nas escadas ou dependências do condomínio;
Não é permitido deixar objetos de caráter pessoal nas dependências do condomínio tais como cadeiras em frente aos apartamentos, brinquedos, carrinhos de supermercados, etc.
Não é permitido festas, confraternizações na área comum do condomínio, respeitando a Lei de Perturbação e Sossego (silêncio das 22h às 07h da manhã).
Não é permitido o uso de drogas ilícitas e lícitas nas dependências do condomínio; 
Não é permitido deixar pelo residencial bitucas de cigarro ou lixos na porta do apartamento; 
Ficando acordado entre as partes que o descumprimento de quaisquer destas mencionadas acima, poderá acarretar no pedido de desocupação do imóvel, ou multa no valor de pelo menos 1 (um) aluguel. 

RESCISÃO CONTRATUAL: A infração das obrigações consignadas neste, sem prejuízo de qualquer outra prevista em Lei, por parte do(a) LOCATÁRIO(A), é considerada como de natureza grave, acarretando a rescisão contratual, com o consequente despejo e obrigatoriedade de imediata satisfação dos consectários contratuais e legais;

Parágrafo Primeiro: Caso o objeto da locação vier a ser desapropriado pelos Poderes Públicos, ficará o presente contrato, bem como a LOCADORA, exonerado de toda e qualquer responsabilidade decorrente.

Parágrafo Segundo: Por ocasião da desocupação do imóvel e entrega das chaves, o LOCATÁRIO obriga-se ao pagamento de taxa de limpeza no valor de R$ 300,00 (trezentos reais), correspondente à limpeza simples e padrão do imóvel. Caso o imóvel seja devolvido em estado de sujeira excessiva, acúmulo de gordura, resíduos, mofo, odores fortes ou qualquer condição que ultrapasse uma limpeza simples, o LOCATÁRIO deverá arcar também com o custo da limpeza adicional necessária, conforme valor cobrado por profissional de limpeza (faxineira ou diarista) contratado para esse fim.

RENOVAÇÃO: Obriga-se o(a) LOCATÁRIO(A) a renovar expressamente um novo contrato, caso vier a permanecer no imóvel após o prazo de validade deste. O aluguel será reajustado anualmente, sendo calculado mediante índice determinado pelo governo federal, o Índice Geral de Preços do Mercado (IGP-M), ou em sua falta pelo Índice de Preços ao Consumidor (IPCA).

DOS FIADORES: Responderão, solidariamente e integralmente, pelas obrigações assumidas pelo(a) LOCATARIO(A), os FIADORES acima identificados, ou outros que venham substitui-los, que renunciam ao benefício a que se refere o art. 827 e 835, com observância ao artigo 828, todos do Código Civil, bem como, do artigo 595 do Código de Processo Civil, como pagadores principais e solidários de quaisquer importâncias devidas e pelo exato cumprimento de todas as cláusulas e condições do presente contrato, até a efetiva desocupação do imóvel, entrega das chaves e quitação final das despesas apuradas. 

VANTAGENS LEGAIS SUPERVENIENTES: A locação estará sempre sujeita ao Regime do Código Civil Brasileiro e a Lei nº 8.245 de 18/10/1991.

CLÁUSULA PENAL: A LOCADORA e O(A) LOCATÁRIO(A) obrigam-se a respeitar o presente contrato em todas as suas cláusulas e condições, incorrendo a parte que infringir qualquer disposição contratual ou legal na multa igual a 3 (três) vezes o valor mensal do aluguel, que será sempre paga integralmente, qualquer que seja o tempo contratual decorrido.

Paragrafo único: O(A) LOCATÁRIO(A) que ao final de um ano de contrato, a contar do início da vigência do mesmo, optar pela desocupação do imóvel, ficará isento da multa de rescisão contratual, desde que, por escrito, comunique esta intenção a LOCADORA, com a antecedência de no mínimo 30 (trinta) dias do término contratual.

OBS: Considera-se ano contratual o interstício de 12 meses, contados do dia {{DATA_INICIO}} com término em {{DATA_FIM}}.

As partes contratantes elegem o foro da situação do imóvel, quaisquer que sejam os seus domicílios, para dirimir qualquer dúvida ou litígio oriundo do presente contrato.

E, por estarem justos e contratados, assinam o presente instrumento em 03 (três) vias de igual teor.

{{CIDADE_CONTRATO}}, {{DATA_ATUAL}}

______________________________________________
{{NOME_LOCADOR}} (por Lais Escatolin)
Locadora

______________________________________________
{{NOME_LOCATARIO}}
Locatário(a)

______________________________________________
{{NOME_FIADOR}}
Fiador(a)`
      },
      {
        id: 'adm-imoveis',
        name: 'Prestação de Serviço - Administração de Imóveis (Original)',
        type: 'PROPOSTA',
        content: `CONTRATO DE PRESTAÇÃO DE SERVIÇO PARA ADMINISTRAÇÃO DE IMÓVEIS

CONTRATANTE: {{NOME_LOCADOR}}, casado(a), aposentado(a), portador(a) do CPF nº {{CPF_LOCADOR}} e RG nº {{RG_LOCADOR}}, residente e domiciliado(a) no {{ENDERECO_LOCADOR}}.
 
CONTRATADA: LAÍS FERNANDA CARAVANTE MARIANO ESCATOLIN, CRECI sob nº 293493-F, CPF: 427.195.158-76, casada, residente e domiciliada na Rua Rachel de Queiroz, 765, CEP: 15.387.224, na cidade de Ilha Solteira-SP, representando a imobiliária Scatolin Imóveis, cujo escritório profissional se localiza no passeio Cristalina, 113, Zona Norte, na cidade de Ilha Solteira-SP. 

“CONTRATADA” e “CONTRATANTE” acima nomeados e qualificados, convencionam e firmam o presente Contrato de Prestação de Serviço, do imóvel localizado no {{ENDERECO_IMOVEL}}, mediante as cláusulas e condições que se seguem:

CLÁUSULA PRIMEIRA: O presente contrato é celebrado por prazo indeterminado, iniciando-se em {{DATA_INICIO}}, podendo ser rescindido por qualquer das partes, a qualquer tempo, mediante aviso prévio por escrito com antecedência mínima de 30 (trinta) dias. 
 
Parágrafo único: No caso de rescisão do presente contrato, caso existam imóveis locados pela Contratada a terceiros, as partes acordam que os respectivos contratos de locação permanecerão vigentes até o seu término, observadas as condições originalmente pactuadas com os locatários.

CLÁUSULA SEGUNDA: Manifestada a intenção do "CONTRATANTE" de rescindir o presente contrato, a "CONTRATADA" terá o prazo de 30 (trinta) dias para devolver toda a documentação e apresentar sua prestação de contas ao "CONTRATANTE".

CLÁUSULA TERCEIRA: Compete à “CONTRATADA” promover a locação do imóvel mencionado, agindo com zelo e diligência, com a finalidade de conseguir para o proprietário, um aluguel compatível com o mercado imobiliário da cidade.

CLÁUSULA QUARTA: Compete à “CONTRATADA”, proceder a análise e ao cadastro de eventuais locatários e respectivos fiadores, agindo de acordo com os meios existentes a seu alcance.

CLÁUSULA QUINTA: Compete à “CONTRATADA”, providenciar o competente e indispensável laudo de vistoria do imóvel, antes de sua entrega, comparando-o com o estado de conservação do mesmo.

CLÁUSULA SEXTA: Compete à “CONTRATADA”, proceder a cobrança do locatário dos aluguéis e acessórios da locação, com poderes para lhe dar quitação.

CLÁUSULA SÉTIMA: A CONTRATADA será responsável pelo recebimento do aluguel referente ao imóvel objeto deste contrato. A CONTRATADA se compromete a realizar o repasse do valor recebido à CONTRATANTE até o dia 20 (vinte) de cada mês, mediante transferência bancaria de titularidade da CONTRATANTE, na chave Pix CPF: {{CPF_LOCADOR}} já descontadas as taxas de administração.

CLÁUSULA OITAVA: Compete à “CONTRATADA”, assegurar que o locatário efetue o pagamento, a tempo e modo das obrigações incidentes sobre o imóvel objeto da locação.

CLÁUSULA NONA: Compete à “CONTRATADA”, caso o imóvel objeto da locação venha a necessitar de reparos, pinturas, consertos ou reformas, proceder à busca de empresas ou profissionais para a realização.

CLÁUSULA DÉCIMA: Compete à CONTRATADA, em caso de falta de pagamento do aluguel ou demais encargos, autorizar o setor jurídico da imobiliária a promover as ações de execução.

CLÁUSULA DÉCIMA PRIMEIRA: Compete ao “CONTRATANTE”, assumir a responsabilidade de efetuar ao pagamento das custas processuais, despesas judiciais e extra judiciais.

CLÁUSULA DÉCIMA ESTRUTURA: Compete ao “CONTRATANTE”, pagar as despesas bancárias e extraordinárias de comunicação.

CLÁUSULA DÉCIMA TERCEIRA: Compete ao “CONTRATANTE”, pagar as despesas decorrentes de manutenção do imóvel que forem de sua responsabilidade.

CLÁUSULA DÉCIMA QUARTA: Compete ao “CONTRATANTE”, não manter contato ou entendimento direto com o locatário ou fiadores.

CLÁUSULA DÉCIMA QUINTA: Compete ao “CONTRATANTE” proceder ao envio com antecedência para a imobiliária de documentos de cobrança de impostos.

CLÁUSULA DÉCIMA SEXTA: Compete ao “CONTRATANTE”, uma vez desocupado o imóvel, assumir o pagamento de todos impostos e despesas até que esse venha a ser novamente alugado.

CLÁUSULA DÉCIMA SÉTIMA: O CONTRATANTE pagará à IMOBILIÁRIA o correspondente a 100% (cem por cento) do primeiro aluguel recebido, a título de intermediação, e 10% (dez por cento) sobre o valor do aluguel a título de taxa de administração mensal.

CLÁUSULA DÉCIMA OITAVA: O contratante declara ser proprietário do imóvel mencionado, estando no pleno uso e gozo do mesmo.

CLÁUSULA DÉCIMA NONA: Que as partes elegem o foro da Comarca de cidade de Ilha Solteira/SP para dirimir eventuais dúvidas do presente instrumento.

{{CIDADE_CONTRATO}}, {{DATA_ATUAL}}

________________________________________
{{NOME_LOCADOR}}
CONTRATANTE

______________________________________________
LAÍS FERNANDA CARAVANTE MARIANO ESCATOLIN
CONTRATADA`
      }
    ];

    const savedTemplates = localStorage.getItem('imob-pro-contract-templates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        if (parsed.length > 0) {
          setTemplates(parsed);
          setSelectedTemplateId(parsed[0].id);
          setTemplateName(parsed[0].name);
          setTemplateContent(parsed[0].content);
        } else {
          // Empty array saved – seed defaults
          setTemplates(DEFAULT_TEMPLATES);
          setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
          setTemplateName(DEFAULT_TEMPLATES[0].name);
          setTemplateContent(DEFAULT_TEMPLATES[0].content);
          localStorage.setItem('imob-pro-contract-templates', JSON.stringify(DEFAULT_TEMPLATES));
        }
      } catch (e) {
        console.error(e);
        setTemplates(DEFAULT_TEMPLATES);
        setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
        setTemplateName(DEFAULT_TEMPLATES[0].name);
        setTemplateContent(DEFAULT_TEMPLATES[0].content);
        localStorage.setItem('imob-pro-contract-templates', JSON.stringify(DEFAULT_TEMPLATES));
      }
    } else {
      // Nothing saved yet – first visit, seed defaults (same as /contratos page)
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
      setTemplateName(DEFAULT_TEMPLATES[0].name);
      setTemplateContent(DEFAULT_TEMPLATES[0].content);
      localStorage.setItem('imob-pro-contract-templates', JSON.stringify(DEFAULT_TEMPLATES));
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // ----------------------------------------------------
  // CONTRACT SIGNATURES LOGIC
  // ----------------------------------------------------
  const handleOpenSignModal = (contract: Contrato) => {
    setSelectedContractForSign(contract);
    setTypedName(contract.inquilino);
    setTokenInput('');
    setTokenSent(false);
    setShowSignModal(true);
  };

  const handleSendToken = () => {
    setTokenSent(true);
    triggerToast('Código de verificação enviado para ' + selectedContractForSign?.inquilino + ' (Token Simulado: 4892)');
  };

  const handleSignContract = () => {
    if (tokenInput !== '4892') {
      alert('Token de verificação incorreto! Utilize o token simulado: 4892');
      return;
    }
    setIsSigning(true);
    setTimeout(() => {
      if (selectedContractForSign) {
        const updated = contracts.map(c => {
          if (c.contrato === selectedContractForSign.contrato) {
            return { ...c, status: 'Ativo' as const };
          }
          return c;
        });
        setContracts(updated);
        localStorage.setItem('imob-pro-contracts-state', JSON.stringify(updated));
        
        // Registrar nas cobranças
        const savedCobrancas = localStorage.getItem('imob-pro-cobrancas-state');
        if (savedCobrancas) {
          try {
            const cobList = JSON.parse(savedCobrancas);
            const novaCobranca = {
              id: `REC-${Date.now()}`,
              recepcaoData: new Date().toLocaleDateString('pt-BR'),
              recepcaoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              movimentoData: new Date().toLocaleDateString('pt-BR'),
              movimentoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              vencimento: '10/08/2026',
              situacao: 'Recepcionado',
              valor: 2000.00,
              cedente: 'Imob Pro',
              sacadoNome: selectedContractForSign.inquilino,
              sacadoCpf: 'xxx.xxx.xxx-xx',
              pagamentoData: null,
              pagamentoValor: null
            };
            localStorage.setItem('imob-pro-cobrancas-state', JSON.stringify([novaCobranca, ...cobList]));
          } catch(e) { console.error(e); }
        }

        triggerToast(`Contrato ${selectedContractForSign.contrato} assinado com sucesso!`);
      }
      setIsSigning(false);
      setShowSignModal(false);
    }, 1000);
  };

  const handleSendD4Sign = (contract: Contrato) => {
    const updated = contracts.map(c => {
      if (c.contrato === contract.contrato) {
        return { ...c, status: 'Pendente' as const }; // Simulates waiting for signers
      }
      return c;
    });
    setContracts(updated);
    localStorage.setItem('imob-pro-contracts-state', JSON.stringify(updated));
    triggerToast(`Contrato ${contract.contrato} enviado para assinaturas via D4Sign.`);
  };

  // ----------------------------------------------------
  // INVOICING / NFSE LOGIC
  // ----------------------------------------------------
  const handleOpenNfseModal = () => {
    if (contracts.length > 0) {
      setSelectedContractForNfse(contracts[0].contrato);
      const matched = contracts[0];
      setNfseValue(matched.valorOriginal || 2500.00);
      setNfseServiceDesc(`Serviço de administração imobiliária mensal referente ao imóvel associado ao contrato ${matched.contrato} para o inquilino ${matched.inquilino}.`);
    }
    setShowNfseModal(true);
  };

  const handleContractNfseChange = (contratoId: string) => {
    setSelectedContractForNfse(contratoId);
    const matched = contracts.find(c => c.contrato === contratoId);
    if (matched) {
      setNfseValue(matched.valorOriginal || 2500.00);
      setNfseServiceDesc(`Serviço de administração imobiliária mensal referente ao imóvel associado ao contrato ${matched.contrato} para o inquilino ${matched.inquilino}.`);
    }
  };

  const handleEmitNfse = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedContract = contracts.find(c => c.contrato === selectedContractForNfse);
    if (!matchedContract) return;

    const iss = Number((nfseValue * 0.05).toFixed(2));
    const pis = Number((nfseValue * 0.0065).toFixed(2));
    const cofins = Number((nfseValue * 0.03).toFixed(2));
    const numero = (20260000 + nfses.length + 1).toString();

    const novaNfse: NFSe = {
      numero,
      tomador: matchedContract.inquilino,
      cpfCnpj: '111.222.333-44', // Mocked or fetched
      valor: nfseValue,
      iss,
      pis,
      cofins,
      data: new Date().toLocaleDateString('pt-BR'),
      status: 'Emitida',
      descricao: nfseServiceDesc
    };

    const atualizadas = [novaNfse, ...nfses];
    setNfses(atualizadas);
    localStorage.setItem('imob-pro-nfse-state', JSON.stringify(atualizadas));
    
    setShowNfseModal(false);
    triggerToast(`Nota Fiscal NFSe nº ${numero} emitida com sucesso!`);
  };

  const handleCancelNfse = (numero: string) => {
    if (confirm(`Deseja cancelar a nota fiscal nº ${numero}?`)) {
      const atualizadas = nfses.map(n => {
        if (n.numero === numero) {
          return { ...n, status: 'Cancelada' as const };
        }
        return n;
      });
      setNfses(atualizadas);
      localStorage.setItem('imob-pro-nfse-state', JSON.stringify(atualizadas));
      triggerToast(`Nota Fiscal nº ${numero} cancelada com sucesso.`);
    }
  };

  // ----------------------------------------------------
  // TEMPLATES MANAGEMENT LOGIC
  // ----------------------------------------------------
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const matched = templates.find(t => t.id === id);
    if (matched) {
      setTemplateName(matched.name);
      setTemplateContent(matched.content);
    }
  };

  const handleSaveTemplate = () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return { ...t, name: templateName, content: templateContent };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('imob-pro-contract-templates', JSON.stringify(updated));
    triggerToast('Modelo de contrato atualizado com sucesso!');
  };

  // ----------------------------------------------------
  // RENEGOTIATION LOGIC
  // ----------------------------------------------------
  const handleOpenRenegModal = (contract: Contrato) => {
    setSelectedContractForReneg(contract);
    setRenegDiscount(0);
    setRenegInstallments(1);
    setRenegEntryValue(500);
    setShowRenegotiateModal(true);
  };

  // Computes interest, fine, total dynamically
  const getRenegSummary = () => {
    if (!selectedContractForReneg) return { original: 0, multa: 0, juros: 0, total: 0, totalNegotiated: 0, installmentVal: 0 };
    
    const original = (selectedContractForReneg.valorOriginal || 2500) * (selectedContractForReneg.parcelasAtrasadas || 2);
    const multaOriginal = original * 0.10; // 10% multa contratual
    const jurosOriginal = original * 0.02; // 2% juros de mora (1% ao mês)
    
    // Apply discount
    const discFactor = (100 - renegDiscount) / 100;
    const multa = multaOriginal * discFactor;
    const juros = jurosOriginal * discFactor;
    
    const totalOriginal = original + multaOriginal + jurosOriginal;
    const totalNegotiated = original + multa + juros;
    
    const installmentVal = (totalNegotiated - renegEntryValue) / renegInstallments;
    
    return {
      original,
      multa,
      juros,
      total: totalOriginal,
      totalNegotiated,
      installmentVal: Math.max(0, installmentVal)
    };
  };

  const reneg = getRenegSummary();

  const handleOpenBoleto = (value: number, name: string) => {
    setBoletoValue(value);
    setBoletoPayer({ name, cpf: '222.333.444-55' });
    setShowBoletoModal(true);
  };

  const handleRegisterRenegotiation = () => {
    if (!selectedContractForReneg) return;

    // 1. Update contract in Locacao list
    const updatedContracts = contracts.map(c => {
      if (c.contrato === selectedContractForReneg.contrato) {
        return {
          ...c,
          status: 'Em Acordo' as const,
          inquilino: `${c.inquilino} (Acordo Fechado)`
        };
      }
      return c;
    });
    setContracts(updatedContracts);
    localStorage.setItem('imob-pro-contracts-state', JSON.stringify(updatedContracts));

    // 2. Add New installments to Cobranças
    const savedCobrancas = localStorage.getItem('imob-pro-cobrancas-state');
    if (savedCobrancas) {
      try {
        const cobList = JSON.parse(savedCobrancas);
        
        // Boleto de entrada
        const boletoEntrada = {
          id: `NEG-ENT-${Date.now()}`,
          recepcaoData: new Date().toLocaleDateString('pt-BR'),
          recepcaoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          movimentoData: new Date().toLocaleDateString('pt-BR'),
          movimentoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          situacao: 'Recepcionado',
          valor: renegEntryValue,
          cedente: 'Imob Pro - Acordos',
          sacadoNome: selectedContractForReneg.inquilino,
          sacadoCpf: '222.333.444-55',
          pagamentoData: null,
          pagamentoValor: null
        };

        const parcelasAdicionadas = [boletoEntrada];

        // Parcelas
        for (let i = 1; i <= renegInstallments; i++) {
          const vDate = new Date();
          vDate.setMonth(vDate.getMonth() + i);
          
          parcelasAdicionadas.push({
            id: `NEG-PARC-${i}-${Date.now()}`,
            recepcaoData: new Date().toLocaleDateString('pt-BR'),
            recepcaoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            movimentoData: new Date().toLocaleDateString('pt-BR'),
            movimentoHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            vencimento: vDate.toLocaleDateString('pt-BR'),
            situacao: 'Recepcionado',
            valor: Number(reneg.installmentVal.toFixed(2)),
            cedente: `Imob Pro - Parcela ${i}/${renegInstallments}`,
            sacadoNome: selectedContractForReneg.inquilino,
            sacadoCpf: '222.333.444-55',
            pagamentoData: null,
            pagamentoValor: null
          });
        }

        // Cancel existing late charges for this user (mock deletion/cancel)
        const filteredCobrancas = cobList.map((c: any) => {
          if (c.sacadoNome === selectedContractForReneg.inquilino && c.situacao === 'Pendente') {
            return { ...c, situacao: 'Cancelado' }; // Cancelled in favor of negotiation
          }
          return c;
        });

        localStorage.setItem(
          'imob-pro-cobrancas-state', 
          JSON.stringify([...parcelasAdicionadas, ...filteredCobrancas])
        );
      } catch (e) { console.error(e); }
    }

    setShowRenegotiateModal(false);
    triggerToast(`Acordo registrado com sucesso para o contrato ${selectedContractForReneg.contrato}! Cobranças geradas.`);
  };

  return (
    <div className="flex flex-col gap-6 w-full min-h-screen pb-12 bg-[#EEEEF3]">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <div className="bg-[#004777]/10 p-3 rounded-xl text-[#004777]">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#280003]">Assessoria & Gestão Jurídica</h1>
            <p className="text-xs text-[#280003]/60">Administre as notas fiscais (NFSe), contratos digitais e negociações de débitos</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#EEEEF3] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('assinaturas')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'assinaturas'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#004777]'
            }`}
          >
            Assinaturas & D4Sign
          </button>
          <button
            onClick={() => setActiveTab('nfse')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'nfse'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#004777]'
            }`}
          >
            Notas Fiscais (NFSe)
          </button>
          <button
            onClick={() => setActiveTab('modelos')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'modelos'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#004777]'
            }`}
          >
            Modelos de Contratos
          </button>
          <button
            onClick={() => setActiveTab('renegociacao')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'renegociacao'
                ? 'bg-white text-[#004777] shadow-sm'
                : 'text-[#280003]/60 hover:text-[#004777]'
            }`}
          >
            Renegociação (Atrasados)
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="w-full flex-1">
        
        {/* 1. ASSINATURAS TAB */}
        {activeTab === 'assinaturas' && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#EEEEF3] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#280003]">Fluxo de Assinaturas de Contratos</h2>
                <p className="text-xs text-gray-500">Monitore, assine localmente ou envie para o D4Sign</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500">Pendentes de Assinatura</h3>
                  <p className="text-xl font-bold text-[#280003]">{contracts.filter(c => c.status === 'Pendente' || c.status === 'Atrasado').length}</p>
                </div>
              </div>
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#708D81]/20 rounded-lg flex items-center justify-center text-[#708D81]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500">Assinados / Ativos</h3>
                  <p className="text-xl font-bold text-[#280003]">{contracts.filter(c => c.status === 'Ativo').length}</p>
                </div>
              </div>
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500">Total de Contratos</h3>
                  <p className="text-xl font-bold text-[#280003]">{contracts.length}</p>
                </div>
              </div>
            </div>

            {/* Table of contracts awaiting signatures */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEF3] text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 px-4">Contrato</th>
                    <th className="py-3 px-4">Inquilino / Tomador</th>
                    <th className="py-3 px-4">Imóvel</th>
                    <th className="py-3 px-4 text-center">Status de Assinatura</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3] text-sm text-[#280003]">
                  {contracts.map(c => (
                    <tr key={c.contrato} className="hover:bg-[#EEEEF3]/20 transition-colors">
                      <td className="py-4 px-4 font-semibold">{c.contrato}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{c.inquilino}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Building className="w-3.5 h-3.5" />
                          <span>{c.imovel}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === 'Ativo' ? 'bg-[#708D81]/10 text-[#708D81]' :
                          c.status === 'Pendente' ? 'bg-[#F0D18A]/35 text-[#8B7535]' :
                          c.status === 'Atrasado' ? 'bg-rose-100 text-rose-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {c.status === 'Ativo' ? 'Totalmente Assinado' :
                           c.status === 'Pendente' ? 'Aguardando Assinatura' :
                           c.status === 'Atrasado' ? 'Pendência Financeira' :
                           'Acordo Firmado'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {c.status === 'Pendente' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSendD4Sign(c)}
                              className="px-3 py-1.5 text-xs border border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                            >
                              D4Sign
                            </button>
                            <button
                              onClick={() => handleOpenSignModal(c)}
                              className="px-3 py-1.5 text-xs bg-[#004777] text-white rounded-lg font-semibold hover:bg-[#004777]/90 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            >
                              <PenTool className="w-3 h-3" />
                              Assinar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Nenhuma ação pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. NFSE TAB */}
        {activeTab === 'nfse' && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#EEEEF3] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#280003]">Notas Fiscais de Serviço Eletrônicas (NFSe)</h2>
                <p className="text-xs text-gray-500">Emita e controle o recolhimento tributário sobre suas transações</p>
              </div>
              <button
                onClick={handleOpenNfseModal}
                className="flex items-center gap-2 bg-[#004777] text-white px-4 py-2.5 rounded-lg font-semibold text-xs shadow-md active:scale-95 hover:bg-[#004777]/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Emitir Nova NFSe
              </button>
            </div>

            {/* Dashboard metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Faturamento Declarado</h3>
                  <p className="text-xl font-bold text-[#280003] mt-1">
                    R$ {nfses.filter(n => n.status === 'Emitida').reduce((acc, curr) => acc + curr.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#708D81]/70" />
              </div>
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Impostos Retidos (ISS)</h3>
                  <p className="text-xl font-bold text-[#280003] mt-1">
                    R$ {nfses.filter(n => n.status === 'Emitida').reduce((acc, curr) => acc + curr.iss, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#004777]/70" />
              </div>
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Total Notas Emitidas</h3>
                  <p className="text-xl font-bold text-[#280003] mt-1">{nfses.filter(n => n.status === 'Emitida').length}</p>
                </div>
                <FileSpreadsheet className="w-8 h-8 text-blue-700/60" />
              </div>
              <div className="bg-[#EEEEF3]/55 border border-[#280003]/5 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase">Notas Canceladas</h3>
                  <p className="text-xl font-bold text-[#280003] mt-1">{nfses.filter(n => n.status === 'Cancelada').length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-rose-700/60" />
              </div>
            </div>

            {/* List of issued NFSe */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEF3] text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 px-4">Número NFSe</th>
                    <th className="py-3 px-4">Tomador do Serviço</th>
                    <th className="py-3 px-4">Data Emissão</th>
                    <th className="py-3 px-4">Valor Serviço</th>
                    <th className="py-3 px-4">Imposto ISS (5%)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3] text-sm text-[#280003]">
                  {nfses.map(n => (
                    <tr key={n.numero} className="hover:bg-[#EEEEF3]/20 transition-colors">
                      <td className="py-4 px-4 font-mono font-semibold">#{n.numero}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{n.tomador}</span>
                          <span className="text-xs text-gray-400">{n.cpfCnpj}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500">{n.data}</td>
                      <td className="py-4 px-4 font-semibold">
                        R$ {n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 text-xs text-amber-700 font-medium">
                        R$ {n.iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          n.status === 'Emitida' ? 'bg-[#708D81]/15 text-[#708D81]' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedNfseForView(n);
                              setShowDanfeModal(true);
                            }}
                            className="px-2.5 py-1.5 text-xs bg-[#EEEEF3] text-[#004777] rounded-lg font-semibold hover:bg-[#004777]/5 transition-colors"
                          >
                            DANFE
                          </button>
                          {n.status === 'Emitida' && (
                            <button
                              onClick={() => handleCancelNfse(n.numero)}
                              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 transition-colors"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MODELOS TAB */}
        {activeTab === 'modelos' && (
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm flex min-h-[700px] overflow-hidden">

            {/* ── Left Sidebar: Template list ── */}
            <div className="w-64 flex-shrink-0 border-r border-[#EEEEF3] bg-[#EEEEF3]/30 flex flex-col">
              <div className="px-4 py-4 border-b border-[#EEEEF3]">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modelos Pré-Definidos</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Clique para selecionar e usar</p>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
                {templates.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6 italic">Nenhum modelo encontrado.<br/>Vá para /contratos para criar modelos.</p>
                )}
                {templates.map(t => {
                  const typeColors: Record<string, string> = {
                    LOCACAO: 'bg-blue-100 text-blue-700',
                    VENDA: 'bg-emerald-100 text-emerald-700',
                    LIMPEZA: 'bg-amber-100 text-amber-700',
                    PROPOSTA: 'bg-purple-100 text-purple-700',
                  };
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTemplate(t.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex flex-col gap-1 ${
                        t.id === selectedTemplateId
                          ? 'bg-[#004777] text-white shadow-md'
                          : 'hover:bg-white hover:shadow-sm text-[#280003]/80'
                      }`}
                    >
                      <p className={`text-xs font-semibold leading-tight ${t.id === selectedTemplateId ? 'text-white' : ''}`}>{t.name}</p>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded w-fit ${
                        t.id === selectedTemplateId ? 'bg-white/20 text-white' : (typeColors[t.type] || 'bg-gray-100 text-gray-600')
                      }`}>{t.type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Main Content Area ── */}
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
                      <p className="text-xs text-gray-500">Preencha os dados do cliente ou edite o texto do modelo abaixo</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-[#EEEEF3] p-0.5 rounded-lg">
                        <button
                          onClick={() => setTemplateMode('fill')}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            templateMode === 'fill'
                              ? 'bg-white text-[#004777] shadow-sm'
                              : 'text-gray-500 hover:text-[#280003]'
                          }`}
                        >
                          Preencher & Usar
                        </button>
                        <button
                          onClick={() => setTemplateMode('edit')}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            templateMode === 'edit'
                              ? 'bg-white text-[#004777] shadow-sm'
                              : 'text-gray-500 hover:text-[#280003]'
                          }`}
                        >
                          Editar Modelo
                        </button>
                      </div>
                      {templateMode === 'fill' ? (
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-1.5 bg-[#004777] hover:bg-[#004777]/90 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-md active:scale-95 transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir / PDF
                        </button>
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

                  {/* ── FILL MODE ── */}
                  {templateMode === 'fill' && (
                    <div className="flex flex-1 overflow-hidden">

                      {/* Left: Data form */}
                      <div className="w-72 flex-shrink-0 border-r border-[#EEEEF3] overflow-y-auto px-5 py-4 space-y-5 bg-[#EEEEF3]/20">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2">Proprietário / Locador</div>
                        {[
                          { key: 'NOME_LOCADOR', label: 'Nome Completo', placeholder: 'Ex: Maria Oliveira' },
                          { key: 'CPF_LOCADOR', label: 'CPF', placeholder: '000.000.000-00' },
                          { key: 'RG_LOCADOR', label: 'RG', placeholder: '00.000.000-0' },
                          { key: 'ENDERECO_LOCADOR', label: 'Endereço Residencial', placeholder: 'Rua, nº, Bairro, Cidade/UF' },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                            <input
                              type="text"
                              value={contractFields[f.key] || ''}
                              onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                            />
                          </div>
                        ))}

                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2 pt-2">Inquilino / Cliente / Locatário</div>
                        {[
                          { key: 'NOME_LOCATARIO', label: 'Nome Completo', placeholder: 'Ex: João da Silva' },
                          { key: 'CPF_LOCATARIO', label: 'CPF', placeholder: '000.000.000-00' },
                          { key: 'RG_LOCATARIO', label: 'RG', placeholder: '00.000.000-0' },
                          { key: 'ENDERECO_ATUAL_LOCATARIO', label: 'Endereço Atual', placeholder: 'Av. Brasil, 123, Centro' },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                            <input
                              type="text"
                              value={contractFields[f.key] || ''}
                              onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                            />
                          </div>
                        ))}

                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2 pt-2">Imóvel</div>
                        {[
                          { key: 'ENDERECO_IMOVEL', label: 'Endereço do Imóvel', placeholder: 'Rua das Flores, 45, Ap 12, Centro' },
                          { key: 'DESCRICAO_COMODOS', label: 'Descrição dos Cômodos', placeholder: '2 quartos, 1 sala, 1 banheiro...' },
                          { key: 'VALOR_ALUGUEL', label: 'Valor do Aluguel (R$)', placeholder: '2.500,00' },
                          { key: 'VALOR_ALUGUEL_EXTENSO', label: 'Valor por Extenso', placeholder: 'dois mil e quinhentos reais' },
                          { key: 'VALOR_CONDOMINIO', label: 'Taxa de Condomínio (R$)', placeholder: '450,00' },
                          { key: 'VALOR_IPTU', label: 'IPTU Mensal (R$)', placeholder: '150,00' },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                            <input
                              type="text"
                              value={contractFields[f.key] || ''}
                              onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                            />
                          </div>
                        ))}

                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2 pt-2">Vigência & Pagamento</div>
                        {[
                          { key: 'PRAZO_MESES', label: 'Prazo (meses)', placeholder: '12' },
                          { key: 'DATA_INICIO', label: 'Data de Início', placeholder: '01 de Julho de 2026' },
                          { key: 'DATA_FIM', label: 'Data de Fim', placeholder: '30 de Junho de 2027' },
                          { key: 'DIA_VENCIMENTO', label: 'Dia de Vencimento', placeholder: '10' },
                          { key: 'CHAVE_PIX_LOCADOR', label: 'Chave Pix do Locador', placeholder: 'CPF ou e-mail' },
                          { key: 'CIDADE_CONTRATO', label: 'Cidade do Contrato', placeholder: 'São Paulo' },
                          { key: 'DATA_ATUAL', label: 'Data de Assinatura', placeholder: '01 de Julho de 2026' },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                            <input
                              type="text"
                              value={contractFields[f.key] || ''}
                              onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                            />
                          </div>
                        ))}

                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-[#EEEEF3] pb-2 pt-2">Serviços & Venda (se aplicável)</div>
                        {[
                          { key: 'NOME_PRESTADOR', label: 'Nome do Prestador', placeholder: 'Luciana M. Santos' },
                          { key: 'CPF_PRESTADOR', label: 'CPF do Prestador', placeholder: '000.000.000-00' },
                          { key: 'VALOR_SERVICO', label: 'Valor do Serviço (R$)', placeholder: '180,00' },
                          { key: 'FREQUENCIA_LIMPEZA', label: 'Frequência Limpeza', placeholder: 'semanal (todas as quartas)' },
                          { key: 'VALOR_VENDA', label: 'Preço de Venda (R$)', placeholder: '450.000,00' },
                          { key: 'VALOR_SINAL', label: 'Valor do Sinal (R$)', placeholder: '50.000,00' },
                          { key: 'VALOR_SINAL_EXTENSO', label: 'Sinal por Extenso', placeholder: 'cinquenta mil reais' },
                          { key: 'DADOS_FINANCIAMENTO', label: 'Dados do Financiamento', placeholder: 'Financiamento CEF de R$ 350.000,00...' },
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                            <input
                              type="text"
                              value={contractFields[f.key] || ''}
                              onChange={e => setContractFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Right: Live A4 Contract Preview */}
                      <div className="flex-1 overflow-y-auto bg-[#EEEEF3] p-8">
                        <div className="bg-white shadow-xl mx-auto max-w-2xl min-h-[900px] p-12 rounded-sm border border-gray-200" id="contrato-print-area">
                          <div className="text-center mb-8 pb-6 border-b-2 border-[#280003]/10">
                            <p className="text-[10px] font-bold uppercase text-[#004777] tracking-widest">Imob Pro Administração de Bens</p>
                            <h2 className="text-lg font-bold text-[#280003] mt-1">{templateName}</h2>
                          </div>
                          <div className="whitespace-pre-wrap font-serif text-[13.5px] leading-relaxed text-left text-[#280003]">
                            {(() => {
                              const parts = (templateContent || '').split(/(\{\{[A-Z0-9_]+\}\})/g);
                              return parts.map((part, idx) => {
                                if (part.startsWith('{{') && part.endsWith('}}')) {
                                  const key = part.slice(2, -2);
                                  const val = contractFields[key];
                                  if (val && val.trim() !== '') {
                                    return (
                                      <strong key={idx} className="text-[#004777] font-bold">
                                        {val}
                                      </strong>
                                    );
                                  }
                                  return (
                                    <span key={idx} className="text-[#966b1d] font-mono font-semibold border-b border-dashed border-[#966b1d] px-0.5">
                                      {part}
                                    </span>
                                  );
                                }
                                return <span key={idx}>{part}</span>;
                              });
                            })()}
                          </div>
                          <div className="mt-16 pt-8 border-t border-[#280003]/10 grid grid-cols-2 gap-12 text-xs text-center text-[#280003]/70">
                            <div>
                              <div className="border-t border-[#280003]/30 pt-2 mt-8">
                                {contractFields.NOME_LOCADOR || '________________________________________'}
                                <p className="font-semibold mt-1">Locador / Proprietário</p>
                              </div>
                            </div>
                            <div>
                              <div className="border-t border-[#280003]/30 pt-2 mt-8">
                                {contractFields.NOME_LOCATARIO || '________________________________________'}
                                <p className="font-semibold mt-1">Locatário / Cliente</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── EDIT MODE ── */}
                  {templateMode === 'edit' && (
                    <div className="flex flex-1 overflow-hidden">
                      {/* Text editor */}
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
                                Clique nas tags da direita para inserir no cursor
                              </span>
                            </div>
                            <textarea
                              value={templateContent}
                              onChange={e => setTemplateContent(e.target.value)}
                              rows={22}
                              className="px-4 py-3 border border-[#280003]/10 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#004777]/20 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Tags reference panel */}
                      <div className="w-64 flex-shrink-0 border-l border-[#EEEEF3] overflow-y-auto p-4 bg-white">
                        <h4 className="text-xs font-bold text-[#004777] uppercase tracking-wider mb-3">Tags Disponíveis</h4>
                        {[
                          { section: 'Locador', tags: ['NOME_LOCADOR','CPF_LOCADOR','RG_LOCADOR','ENDERECO_LOCADOR'] },
                          { section: 'Locatário', tags: ['NOME_LOCATARIO','CPF_LOCATARIO','RG_LOCATARIO','ENDERECO_ATUAL_LOCATARIO'] },
                          { section: 'Imóvel', tags: ['ENDERECO_IMOVEL','DESCRICAO_COMODOS','VALOR_ALUGUEL','VALOR_ALUGUEL_EXTENSO','VALOR_CONDOMINIO','VALOR_IPTU'] },
                          { section: 'Prestador', tags: ['NOME_PRESTADOR','CPF_PRESTADOR','VALOR_SERVICO','FREQUENCIA_LIMPEZA'] },
                          { section: 'Venda', tags: ['VALOR_VENDA','VALOR_SINAL','VALOR_SINAL_EXTENSO','DADOS_FINANCIAMENTO'] },
                          { section: 'Datas & Geral', tags: ['PRAZO_MESES','DATA_INICIO','DATA_FIM','DIA_VENCIMENTO','CHAVE_PIX_LOCADOR','CIDADE_CONTRATO','DATA_ATUAL'] },
                        ].map(sec => (
                          <div key={sec.section} className="mb-4">
                            <p className="text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">{sec.section}</p>
                            <div className="flex flex-col gap-1">
                              {sec.tags.map(tag => (
                                <button
                                  key={tag}
                                  onClick={() => {
                                    setTemplateContent(prev => prev + `{{${tag}}}`);
                                  }}
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

        {/* 4. RENEGOTIATION TAB */}
        {activeTab === 'renegociacao' && (
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#EEEEF3] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#280003]">Central de Renegociação de Dívidas</h2>
                <p className="text-xs text-gray-500">Calcule descontos, juros e multas contratuais, gere boletos de entrada e registre acordos</p>
              </div>
              <button
                onClick={() => {
                  setSelectedLocatarioId('');
                  setAgreementValue(0);
                  setAgreementDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                  setAgreementDesc('');
                  setCustomCpfCnpj('');
                  setCustomAddress({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' });
                  setGeneratedAgreementBoleto(null);
                  setAgreementError(null);
                  setShowManualAgreementModal(true);
                }}
                className="px-4 py-2 text-xs bg-[#004777] hover:bg-[#004777]/90 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Criar Acordo Manual (Inter)
              </button>
            </div>


            {/* Filter and Inquilinos Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EEEEF3] pb-4 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#004777]">Inquilinos e Contratos Ativos</h3>
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Buscar inquilino ou contrato..."
                  value={tenantSearchTerm}
                  onChange={e => setTenantSearchTerm(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#280003]/10 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEF3] text-xs font-bold text-gray-400 uppercase">
                    <th className="py-3 px-4">Inquilino</th>
                    <th className="py-3 px-4">CPF/CNPJ</th>
                    <th className="py-3 px-4">Contrato</th>
                    <th className="py-3 px-4">Imóvel</th>
                    <th className="py-3 px-4">Aluguel Base</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEF3] text-sm text-[#280003]">
                  {loadingLocatarios ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                        Carregando inquilinos cadastrados...
                      </td>
                    </tr>
                  ) : (() => {
                    const filtered = locatarios.filter(loc => {
                      if (!tenantSearchTerm) return true;
                      const term = tenantSearchTerm.toLowerCase();
                      return (
                        loc.nome.toLowerCase().includes(term) ||
                        (loc.cpfCnpj && loc.cpfCnpj.toLowerCase().includes(term)) ||
                        (loc.contratoId && loc.contratoId.toLowerCase().includes(term)) ||
                        (loc.contrato?.imovel?.codigo && loc.contrato.imovel.codigo.toLowerCase().includes(term))
                      );
                    });
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                            Nenhum inquilino correspondente encontrado.
                          </td>
                        </tr>
                      );
                    }
                    return filtered.map(loc => {
                      const rentVal = loc.contrato?.imovelLocacao?.valorTotal || loc.contrato?.imovel?.valorAluguel || 0;
                      return (
                        <tr key={loc.id} className="hover:bg-[#EEEEF3]/20 transition-colors">
                          <td className="py-4 px-4 font-semibold">{loc.nome}</td>
                          <td className="py-4 px-4 font-mono text-xs">{loc.cpfCnpj || 'Não cadastrado'}</td>
                          <td className="py-4 px-4 font-semibold text-[#004777]">{loc.contratoId || 'Sem contrato'}</td>
                          <td className="py-4 px-4 font-medium text-gray-500">{loc.contrato?.imovel?.codigo || 'N/D'}</td>
                          <td className="py-4 px-4 font-semibold">
                            R$ {rentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                handleLocatarioChange(loc.id);
                                setAgreementValue(0);
                                setAgreementDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                setGeneratedAgreementBoleto(null);
                                setAgreementError(null);
                                setShowManualAgreementModal(true);
                              }}
                              className="px-3 py-1.5 text-xs bg-[#004777] hover:bg-[#004777]/90 text-white rounded-lg font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1 ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Novo Acordo
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Real Generated Agreements Section */}
            <div className="pt-6 border-t border-[#EEEEF3] space-y-4">
              <div className="border-b border-[#EEEEF3] pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#004777]">Histórico de Acordos Gerados (Banco Inter)</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEEEF3] text-xs font-bold text-gray-400 uppercase">
                      <th className="py-3 px-4">Nosso Número</th>
                      <th className="py-3 px-4">Inquilino</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Vencimento</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEF3] text-sm text-[#280003]">
                    {loadingAgreements ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                          Carregando histórico do Banco Inter...
                        </td>
                      </tr>
                    ) : agreementTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                          Nenhum acordo manual emitido pelo sistema até o momento.
                        </td>
                      </tr>
                    ) : (
                      agreementTransactions.map(tx => {
                        const locName = tx.contrato?.locatarios?.[0]?.nome || "Inquilino Avulso";
                        return (
                          <tr key={tx.id} className="hover:bg-[#EEEEF3]/20 transition-colors">
                            <td className="py-4 px-4 font-semibold text-[#004777]">{tx.interNossoNumero || 'N/D'}</td>
                            <td className="py-4 px-4 font-medium">{locName}</td>
                            <td className="py-4 px-4 text-gray-500 font-medium">{tx.descricao}</td>
                            <td className="py-4 px-4 font-bold text-[#280003]">
                              R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-4">
                              {new Date(tx.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'LIQUIDADO' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : tx.status === 'CANCELADO'
                                  ? 'bg-gray-50 text-gray-600 border border-gray-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {tx.interPixCode && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(tx.interPixCode);
                                      setToastMessage("Pix copiado!");
                                      setShowToast(true);
                                      setTimeout(() => setShowToast(false), 2000);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-xs transition-all active:scale-95"
                                    title="Copiar Código Pix Copia e Cola"
                                  >
                                    Pix
                                  </button>
                                )}
                                {tx.interBarcode && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(tx.interBarcode);
                                      setToastMessage("Código de barras copiado!");
                                      setShowToast(true);
                                      setTimeout(() => setShowToast(false), 2000);
                                    }}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-xs transition-all active:scale-95"
                                    title="Copiar Código de Barras"
                                  >
                                    Código
                                  </button>
                                )}
                                {tx.interPdfKey && (
                                  <button
                                    onClick={() => handleDownloadBoleto(tx.interPdfKey)}
                                    className="px-2 py-1 bg-[#004777]/5 hover:bg-[#004777]/10 text-[#004777] border border-[#004777]/10 rounded font-bold text-xs transition-all active:scale-95 flex items-center gap-1"
                                    title="Visualizar PDF oficial do boleto"
                                  >
                                    <Download className="w-3 h-3" />
                                    PDF
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ----------------------------------------------------
          MODALS SECTION
         ---------------------------------------------------- */}

      {/* MANUAL AGREEMENT MODAL (BANCO INTER) */}
      {showManualAgreementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col border border-black/5 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="bg-[#004777] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Criar Acordo Manual (Banco Inter)</h3>
                <p className="text-xs opacity-80 mt-1">Selecione o inquilino, consulte as informações do contrato, preencha os dados e gere o boleto com Pix real.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowManualAgreementModal(false)}
                className="text-white hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateManualAgreement} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                {agreementError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <div>
                      <strong className="font-bold">Falha ao emitir boleto:</strong>
                      <p className="mt-0.5 leading-relaxed">{agreementError}</p>
                    </div>
                  </div>
                )}

                {/* Main columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  
                  {/* Left Column: Tenant Selection and Contract Reference */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Selecione o Inquilino</label>
                      <select
                        required
                        value={selectedLocatarioId}
                        onChange={(e) => handleLocatarioChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                      >
                        <option value="">-- Selecione --</option>
                        {loadingLocatarios ? (
                          <option disabled>Carregando inquilinos...</option>
                        ) : (
                          locatarios.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.nome} (CPF: {loc.cpfCnpj || 'Não cadastrado'})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Contract Reference Card */}
                    {selectedLocatarioId && (
                      <div className="space-y-4">
                        {/* Reference Card */}
                        {(() => {
                          const selectedLoc = locatarios.find(l => l.id === selectedLocatarioId);
                          if (selectedLoc?.contrato) {
                            const imovel = selectedLoc.contrato.imovel;
                            const locacao = selectedLoc.contrato.imovelLocacao;
                            return (
                              <div className="bg-[#004777]/5 border border-[#004777]/10 rounded-xl p-4 space-y-3 text-xs leading-relaxed">
                                <h4 className="font-bold text-[#004777] uppercase tracking-wider text-[10px] border-b border-[#004777]/10 pb-1.5 flex items-center gap-1.5">
                                  <Building className="w-3.5 h-3.5" />
                                  Informações do Contrato de Referência
                                </h4>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[#280003] font-semibold">
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Imóvel</span>
                                    <span>{imovel?.codigo || 'Sem código'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Bairro</span>
                                    <span>{imovel?.bairro || 'Centro'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Aluguel Contratual</span>
                                    <span className="text-[#004777] font-bold">
                                      R$ {(locacao?.valorTotal || imovel?.valorAluguel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Vigência</span>
                                    <span>
                                      {locacao?.dataInicio ? new Date(locacao.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''} até {locacao?.dataFim ? new Date(locacao.dataFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs font-semibold leading-relaxed flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <div>
                                  Inquilino sem contrato ativo. O boleto será emitido como cobrança avulsa e não estará associado a um contrato.
                                </div>
                              </div>
                            );
                          }
                        })()}

                        {/* Pagador Details (Editable) */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                          <h4 className="font-bold text-gray-500 uppercase tracking-wider text-[10px] border-b border-gray-200 pb-1.5">
                            Dados de Faturamento & Endereço do Pagador
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">CPF ou CNPJ</label>
                              <input 
                                type="text"
                                required
                                value={customCpfCnpj}
                                onChange={(e) => setCustomCpfCnpj(e.target.value)}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                            <div className="flex flex-col gap-1 col-span-2">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">Logradouro (Rua, Av, etc)</label>
                              <input 
                                type="text"
                                required
                                value={customAddress.logradouro}
                                onChange={(e) => setCustomAddress({ ...customAddress, logradouro: e.target.value })}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">Número</label>
                              <input 
                                type="text"
                                required
                                value={customAddress.numero}
                                onChange={(e) => setCustomAddress({ ...customAddress, numero: e.target.value })}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">CEP (Apenas Números)</label>
                              <input 
                                type="text"
                                required
                                maxLength={8}
                                value={customAddress.cep}
                                onChange={(e) => setCustomAddress({ ...customAddress, cep: e.target.value.replace(/\D/g, '') })}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">Bairro</label>
                              <input 
                                type="text"
                                required
                                value={customAddress.bairro}
                                onChange={(e) => setCustomAddress({ ...customAddress, bairro: e.target.value })}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="font-bold text-gray-400 uppercase text-[9px]">Cidade</label>
                              <input 
                                type="text"
                                required
                                value={customAddress.cidade}
                                onChange={(e) => setCustomAddress({ ...customAddress, cidade: e.target.value })}
                                className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none bg-white font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Agreement Details Input */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Valor do Boleto (R$)</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="1"
                          value={agreementValue || ''}
                          onChange={(e) => setAgreementValue(Number(e.target.value))}
                          placeholder="0,00"
                          className="w-full pl-9 pr-4 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                        />
                      </div>
                      <span className="text-[10px] text-gray-400 italic">Digite o valor livre que deseja para este boleto do acordo.</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Vencimento do Boleto</label>
                      <input
                        type="date"
                        required
                        value={agreementDate}
                        onChange={(e) => setAgreementDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Descrição da Cobrança / Instruções do Boleto</label>
                      <textarea
                        required
                        rows={3}
                        value={agreementDesc}
                        onChange={(e) => setAgreementDesc(e.target.value)}
                        placeholder="Escreva a descrição do acordo. Ela será impressa diretamente no campo de instruções/mensagem do boleto PDF (suporta múltiplas linhas)."
                        className="w-full px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20 resize-none"
                      />
                    </div>


                    {/* Result Card when generated */}
                    {generatedAgreementBoleto && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
                        <h4 className="font-bold text-emerald-800 text-xs uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          BolePix Emitido com Sucesso!
                        </h4>
                        <div className="text-xs space-y-2 text-emerald-900 leading-relaxed font-semibold">
                          <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                            <span className="text-gray-500">Nosso Número (Inter):</span>
                            <span>{generatedAgreementBoleto.nossoNumero}</span>
                          </div>
                          
                          {generatedAgreementBoleto.pixCopiaECola && (
                            <div className="space-y-1">
                              <span className="text-gray-500 block">PIX Copia e Cola</span>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedAgreementBoleto.pixCopiaECola}
                                  className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 font-mono text-[9px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedAgreementBoleto.pixCopiaECola);
                                    setToastMessage("Pix copiado!");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          )}

                          {generatedAgreementBoleto.codigoBarras && (
                            <div className="space-y-1">
                              <span className="text-gray-500 block">Código de Barras</span>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={generatedAgreementBoleto.codigoBarras}
                                  className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 font-mono text-[9px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedAgreementBoleto.codigoBarras);
                                    setToastMessage("Código de barras copiado!");
                                    setShowToast(true);
                                    setTimeout(() => setShowToast(false), 2000);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[10px]"
                                >
                                  Copiar
                                </button>
                              </div>
                            </div>
                          )}

                          {generatedAgreementBoleto.pdfUrl && (
                            <div className="pt-2 border-t border-emerald-100 flex justify-end">
                              <a
                                href={generatedAgreementBoleto.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs shadow flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Baixar PDF do Boleto
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div className="bg-[#EEEEF3]/40 border-t border-[#EEEEF3] p-4 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowManualAgreementModal(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAgreement || !selectedLocatarioId}
                  className="bg-[#004777] hover:bg-[#004777]/90 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  {isGeneratingAgreement ? 'Processando BolePix...' : 'Confirmar & Gerar Boleto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODALS SECTION
         ---------------------------------------------------- */}

      {/* SIGNATURE MODAL */}

      {showSignModal && selectedContractForSign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#004777] text-white p-5">
              <h3 className="text-lg font-bold">Assinatura Digital de Contrato</h3>
              <p className="text-xs opacity-80 mt-1">Contrato: {selectedContractForSign.contrato} | Inquilino: {selectedContractForSign.inquilino}</p>
            </div>

            <div className="p-6 flex-1 space-y-5">
              <div className="flex border-b border-[#EEEEF3]">
                <button
                  onClick={() => setSignType('draw')}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                    signType === 'draw' ? 'border-b-2 border-[#004777] text-[#004777]' : 'text-gray-400'
                  }`}
                >
                  Desenhar Assinatura
                </button>
                <button
                  onClick={() => setSignType('type')}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                    signType === 'type' ? 'border-b-2 border-[#004777] text-[#004777]' : 'text-gray-400'
                  }`}
                >
                  Digitar Nome Completo
                </button>
              </div>

              {signType === 'draw' ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl h-40 bg-[#EEEEF3]/30 flex flex-col items-center justify-center p-4 cursor-crosshair hover:bg-[#EEEEF3]/60 transition-all select-none">
                  <PenTool className="w-8 h-8 text-gray-400 mb-1.5" />
                  <p className="text-xs text-gray-500 font-medium">Use o cursor para desenhar a assinatura na área pontilhada</p>
                  <div className="w-full h-full relative mt-2 flex items-center justify-center">
                    {/* Simulated hand drawn path representation */}
                    <div className="absolute w-44 h-1 bg-black rotate-[-12deg] skew-x-12 opacity-80" />
                    <div className="absolute w-36 h-0.5 bg-black rotate-[5deg] skew-y-3 opacity-80 mt-4" />
                    <div className="absolute w-48 h-0.5 bg-black rotate-[-6deg] opacity-75 mt-8" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Digitar seu nome..."
                    className="w-full px-4 py-2.5 border border-[#280003]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004777]/20 text-sm font-semibold"
                  />
                  <div className="border border-[#EEEEF3] rounded-xl p-4 bg-[#EEEEF3]/30 h-24 flex items-center justify-center">
                    {/* Hand-writing style representation */}
                    <span className="font-serif italic text-3xl text-gray-800 tracking-wide font-light select-none">
                      {typedName || 'Sua Assinatura'}
                    </span>
                  </div>
                </div>
              )}

              {/* MFA Authentication */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    Autenticação Multifator: Para assinar legalmente, clique em enviar token para receber o código via e-mail ou SMS.
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Digitar Token..."
                    className="flex-1 px-3.5 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold focus:outline-none bg-white placeholder-amber-700/50"
                  />
                  <button
                    type="button"
                    onClick={handleSendToken}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm"
                  >
                    {tokenSent ? 'Reenviar Code' : 'Enviar Token'}
                  </button>
                </div>
                {tokenSent && (
                  <span className="text-[10px] text-amber-700 font-semibold italic block">
                    * Token enviado! Utilize o código <strong>4892</strong> para validar a assinatura.
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#EEEEF3]/40 border-t border-[#EEEEF3] p-4 flex justify-end gap-3.5">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignContract}
                disabled={isSigning || !tokenSent || !tokenInput}
                className="bg-[#004777] hover:bg-[#004777]/90 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-md disabled:opacity-50 transition-all"
              >
                {isSigning ? 'Processando Assinatura...' : 'Confirmar & Assinar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFSE FORM MODAL */}
      {showNfseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col border border-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#004777] text-white p-5">
              <h3 className="text-lg font-bold">Emissão de Nota Fiscal Eletrônica (NFSe)</h3>
              <p className="text-xs opacity-80 mt-1">Prefeitura de São Paulo - Emissão Simplificada</p>
            </div>

            <form onSubmit={handleEmitNfse} className="flex-1 flex flex-col">
              <div className="p-6 space-y-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Selecione o Contrato / Inquilino</label>
                  <select
                    value={selectedContractForNfse}
                    onChange={(e) => handleContractNfseChange(e.target.value)}
                    className="px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                  >
                    {contracts.map(c => (
                      <option key={c.contrato} value={c.contrato}>
                        {c.contrato} - {c.inquilino} ({c.imovel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor do Serviço (R$)</label>
                    <input
                      type="number"
                      required
                      value={nfseValue}
                      onChange={(e) => setNfseValue(Number(e.target.value))}
                      className="px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alíquota ISS (%)</label>
                    <input
                      type="text"
                      disabled
                      value="5.00% (Administração de Bens)"
                      className="px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm font-semibold bg-[#EEEEF3]/60 text-gray-500"
                    />
                  </div>
                </div>

                {/* Taxes break down estimation */}
                <div className="bg-[#EEEEF3]/40 border border-[#280003]/5 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-semibold block">Valor ISS</span>
                    <strong className="text-sm font-bold text-[#280003] block mt-0.5">
                      R$ {(nfseValue * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold block">Valor PIS (0.65%)</span>
                    <strong className="text-sm font-semibold text-gray-700 block mt-0.5">
                      R$ {(nfseValue * 0.0065).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 font-semibold block">Valor COFINS (3%)</span>
                    <strong className="text-sm font-semibold text-gray-700 block mt-0.5">
                      R$ {(nfseValue * 0.03).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descrição da Prestação de Serviço</label>
                  <textarea
                    rows={3}
                    required
                    value={nfseServiceDesc}
                    onChange={(e) => setNfseServiceDesc(e.target.value)}
                    placeholder="Detalhar o serviço prestado e dados contratuais..."
                    className="px-3.5 py-2.5 border border-[#280003]/10 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                </div>

              </div>

              <div className="bg-[#EEEEF3]/40 border-t border-[#EEEEF3] p-4 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowNfseModal(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="bg-[#004777] hover:bg-[#004777]/90 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-md active:scale-95 transition-all"
                >
                  Emitir NFSe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DANFE VIEW MODAL */}
      {showDanfeModal && selectedNfseForView && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-300 my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Action Header */}
            <div className="bg-[#EEEEF3] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 print:hidden">
              <span className="text-xs font-bold text-gray-500 uppercase font-mono">DANFE - Nota Fiscal Eletrônica</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir DANFE
                </button>
                <button
                  onClick={() => setShowDanfeModal(false)}
                  className="bg-[#004777] text-white hover:bg-[#004777]/95 font-semibold text-xs px-4 py-2 rounded-lg shadow-sm active:scale-95"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>

            {/* DANFE Layout */}
            <div className="p-8 font-sans text-xs text-black space-y-4 max-w-3xl mx-auto" id="danfe-print-area">
              
              {/* NFSe Logo and Header Block */}
              <div className="border border-black p-3 grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 text-center border-r border-black pr-2">
                  <div className="font-bold text-base leading-tight uppercase">Prefeitura de</div>
                  <div className="font-bold text-lg leading-tight uppercase">São Paulo</div>
                  <div className="text-[10px] text-gray-600 mt-1">Secretaria Municipal da Fazenda</div>
                </div>
                <div className="col-span-6 text-center border-r border-black px-2">
                  <div className="font-bold text-base uppercase">Nota Fiscal Eletrônica de Serviços - NFSe</div>
                  <div className="text-[10px] mt-1">RPS Nº 402, Série RPS, emitido em {selectedNfseForView.data}</div>
                </div>
                <div className="col-span-3 pl-2">
                  <div className="font-semibold">Número da Nota:</div>
                  <div className="font-bold text-sm text-red-600 font-mono">{selectedNfseForView.numero}</div>
                  <div className="font-semibold mt-1">Código de Verificação:</div>
                  <div className="font-bold font-mono text-[10px] text-blue-700">A89B-4D5E-F710</div>
                </div>
              </div>

              {/* Prestador de Servicos */}
              <div className="border border-black p-3 space-y-1 bg-gray-50/50">
                <div className="font-bold text-gray-500 uppercase tracking-wider text-[9px]">Prestador de Serviços</div>
                <div className="font-bold text-sm">IMOB PRO SERVIÇOS IMOBILIÁRIOS LTDA</div>
                <div>CNPJ: 12.345.678/0001-99 | Inscrição Municipal: 9.876.543-2</div>
                <div>Endereço: Av. Paulista, 1000, 14º Andar, Conj. 141 - Bela Vista, São Paulo/SP - CEP: 01310-100</div>
                <div>Telefone: (11) 3200-5000 | Email: financeiro@imobpro.com.br</div>
              </div>

              {/* Tomador de Servicos */}
              <div className="border border-black p-3 space-y-1">
                <div className="font-bold text-gray-500 uppercase tracking-wider text-[9px]">Tomador de Serviços</div>
                <div className="font-bold text-sm">{selectedNfseForView.tomador}</div>
                <div>CPF / CNPJ: {selectedNfseForView.cpfCnpj}</div>
                <div>Endereço: Alameda das Flores, 123, Centro, São Paulo/SP</div>
                <div>Email: {selectedNfseForView.tomador.toLowerCase().replace(/ /g, '')}@gmail.com</div>
              </div>

              {/* Descricao dos Servicos */}
              <div className="border border-black p-3 flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-bold text-gray-500 uppercase tracking-wider text-[9px] mb-1.5">Discriminação dos Serviços</div>
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{selectedNfseForView.descricao}</p>
                </div>
                {selectedNfseForView.status === 'Cancelada' && (
                  <div className="border-2 border-red-500 text-red-500 text-center font-bold text-base p-1.5 uppercase tracking-widest my-2 select-none">
                    NOTA FISCAL CANCELADA
                  </div>
                )}
              </div>

              {/* Detalhamento de Tributacao */}
              <div className="border border-black grid grid-cols-5 text-center font-mono">
                <div className="border-r border-black p-2 bg-gray-50">
                  <span className="text-[8px] font-bold block text-gray-500">PIS (0.65%)</span>
                  <strong className="text-xs">R$ {selectedNfseForView.pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="border-r border-black p-2 bg-gray-50">
                  <span className="text-[8px] font-bold block text-gray-500">COFINS (3.00%)</span>
                  <strong className="text-xs">R$ {selectedNfseForView.cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="border-r border-black p-2 bg-gray-50">
                  <span className="text-[8px] font-bold block text-gray-500">CSLL (1.00%)</span>
                  <strong className="text-xs">R$ {(selectedNfseForView.valor * 0.01).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="border-r border-black p-2 bg-gray-50">
                  <span className="text-[8px] font-bold block text-gray-500">IRRF (1.50%)</span>
                  <strong className="text-xs">R$ {(selectedNfseForView.valor * 0.015).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="p-2 bg-gray-50">
                  <span className="text-[8px] font-bold block text-gray-500">INSS (0.00%)</span>
                  <strong className="text-xs">R$ 0,00</strong>
                </div>
              </div>

              {/* Valores Totais da Nota */}
              <div className="border border-black p-4 grid grid-cols-4 gap-4 items-center bg-gray-100 font-mono">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 block">VALOR DO SERVIÇO</span>
                  <strong className="text-sm font-bold text-black">
                    R$ {selectedNfseForView.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 block">BASE DE CÁLCULO</span>
                  <strong className="text-sm font-bold text-black">
                    R$ {selectedNfseForView.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 block">ALÍQUOTA ISS</span>
                  <strong className="text-sm font-bold text-black">5.00%</strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-rose-600 block">VALOR DO ISS</span>
                  <strong className="text-sm font-bold text-rose-600">
                    R$ {selectedNfseForView.iss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Rodape Legal */}
              <div className="text-[9px] text-gray-500 text-center leading-relaxed">
                Código de Serviço: 03131 - Mediação de locação de imóveis em geral (ISS de 5.00%).<br />
                Documento emitido nos termos da Lei nº 14.097, de 8 de dezembro de 2005. Tributos Federais estimados pelo IBPT em R$ {(selectedNfseForView.valor * 0.1345).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (13.45%).
              </div>

            </div>
          </div>
        </div>
      )}

      {/* RENEGOTIATION MODAL */}
      {showRenegotiateModal && selectedContractForReneg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-black/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#280003] text-white p-5">
              <h3 className="text-lg font-bold">Renegociação de Débito Atrasado</h3>
              <p className="text-xs opacity-80 mt-1">Inquilino: {selectedContractForReneg.inquilino} | Contrato: {selectedContractForReneg.contrato}</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start overflow-y-auto max-h-[480px]">
              
              {/* Left Column: Debt metrics & details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhamento dos Valores</h4>
                
                <div className="space-y-2 text-sm text-[#280003]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Aluguel Original ({selectedContractForReneg.parcelasAtrasadas} meses):</span>
                    <strong className="font-semibold">R$ {reneg.original.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Multa Contratual (10%):</span>
                    <strong className="text-rose-600 font-semibold">+ R$ {(reneg.original * 0.10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#EEEEF3] pb-2">
                    <span className="text-gray-500 font-medium">Juros de Mora (1% a.m.):</span>
                    <strong className="text-rose-600 font-semibold">+ R$ {(reneg.original * 0.02).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-1.5">
                    <span>Dívida Total Acumulada:</span>
                    <span className="text-rose-700">R$ {reneg.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Dynamic Calculated Agreement Summary */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Proposta de Acordo</h5>
                  <div className="text-xs space-y-1 text-amber-900 font-medium">
                    <div className="flex justify-between">
                      <span>Total após descontos:</span>
                      <strong>R$ {reneg.totalNegotiated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor de Entrada:</span>
                      <strong>- R$ {renegEntryValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between border-t border-amber-300 pt-1.5 mt-1.5 text-sm font-bold text-amber-900">
                      <span>Saldo em {renegInstallments}x de:</span>
                      <span>R$ {reneg.installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Negotiation inputs */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ajuste de Parâmetros</h4>
                
                {/* Discount slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-500 uppercase">Desconto em Multas/Juros</span>
                    <span className="text-[#004777]">{renegDiscount}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={renegDiscount}
                    onChange={(e) => setRenegDiscount(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#EEEEF3] rounded-lg appearance-none cursor-pointer accent-[#004777]"
                  />
                </div>

                {/* Entry Value Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Valor de Entrada (R$)</label>
                  <input
                    type="number"
                    min="200"
                    max={reneg.totalNegotiated}
                    value={renegEntryValue}
                    onChange={(e) => setRenegEntryValue(Number(e.target.value))}
                    className="px-3 py-2 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20"
                  />
                  <span className="text-[10px] text-gray-400 italic font-medium">Recomendado mínimo R$ 500,00</span>
                </div>

                {/* Installments selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Parcelas Restantes</label>
                  <select
                    value={renegInstallments}
                    onChange={(e) => setRenegInstallments(Number(e.target.value))}
                    className="px-3 py-2 border border-[#280003]/10 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004777]/20 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n}x parcelas</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenBoleto(renegEntryValue, selectedContractForReneg.inquilino)}
                    className="w-full flex items-center justify-center gap-1.5 border border-[#004777]/20 text-[#004777] hover:bg-[#EEEEF3] px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Gerar Boleto de Entrada (A4)
                  </button>
                  <button
                    type="button"
                    onClick={handleRegisterRenegotiation}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#708D81] hover:bg-[#708D81]/90 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Registrar Renegociação no Contrato
                  </button>
                </div>
              </div>

            </div>

            <div className="bg-[#EEEEF3]/40 border-t border-[#EEEEF3] p-4 flex justify-end gap-3.5">
              <button
                onClick={() => setShowRenegotiateModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOLETO VISUAL MODAL */}
      {showBoletoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-300 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#EEEEF3] border-b border-gray-300 px-6 py-3 flex items-center justify-between sticky top-0 print:hidden">
              <span className="text-xs font-bold text-gray-500 uppercase font-mono">Simulador de Boleto Bancário</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Boleto (PDF)
                </button>
                <button
                  onClick={() => setShowBoletoModal(false)}
                  className="bg-[#004777] text-white hover:bg-[#004777]/95 font-semibold text-xs px-4 py-2 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Visual Boleto Layout */}
            <div className="p-8 font-mono text-[9px] text-black space-y-4 max-w-3xl mx-auto bg-white" id="boleto-print-area">
              
              {/* Receipt Header */}
              <div className="border-b-2 border-black border-dashed pb-3 text-center print:hidden">
                <p className="font-bold text-xs uppercase mb-1">Recibo do Sacado - Via de Controle</p>
                <p className="text-[8px] text-gray-500">Destaque na linha pontilhada abaixo para pagar no banco</p>
              </div>

              {/* Fictional Bank Header */}
              <div className="flex items-end justify-between border-b-2 border-black pb-1.5">
                <div className="flex items-end gap-3">
                  <div className="bg-orange-600 text-white font-bold px-2 py-0.5 text-sm italic tracking-tighter">ITAÚ</div>
                  <div className="font-bold text-xs border-x border-black px-3 py-0.5">341-7</div>
                </div>
                <div className="font-bold text-xs">34191.79001 01043.513184 91020.150008 7 99010000{Math.floor(boletoValue * 100).toString().padStart(6, '0')}</div>
              </div>

              {/* Recibo sacado fields */}
              <div className="border border-black">
                <div className="grid grid-cols-6 border-b border-black">
                  <div className="col-span-4 border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Beneficiário</span>
                    <strong className="text-[9px]">IMOB PRO ADMINISTRAÇÃO DE BENS LTDA - CNPJ: 12.345.678/0001-99</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Agência/Código Beneficiário</span>
                    <strong>4031 / 90150-8</strong>
                  </div>
                  <div className="p-1">
                    <span className="text-[7px] text-gray-500 block">Vencimento</span>
                    <strong>{new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-6 border-b border-black">
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Data Documento</span>
                    <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Número do Documento</span>
                    <strong>REC-2026/01</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Espécie Doc.</span>
                    <strong>DM</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Aceite</span>
                    <strong>N</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Data Processamento</span>
                    <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                  <div className="p-1 bg-gray-50">
                    <span className="text-[7px] text-gray-500 block">Valor do Documento</span>
                    <strong className="text-sm">R$ {boletoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="p-1.5 border-b border-black text-[8px] bg-gray-50/30">
                  <span className="text-[7px] text-gray-500 block">Instruções de Responsabilidade do Beneficiário</span>
                  - NÃO RECEBER APÓS O VENCIMENTO.<br />
                  - MULTA DE 2,00% APÓS O VENCIMENTO E JUROS DE 1,00% AO MÊS.<br />
                  - REFERENTE A ACORDO CONTRATUAL JURÍDICO - ENTRADA DE RENEGOCIAÇÃO.
                </div>

                <div className="p-1 text-[8px] leading-relaxed">
                  <span className="text-[7px] text-gray-500 block">Pagador</span>
                  <strong>{boletoPayer.name} (CPF: {boletoPayer.cpf})</strong><br />
                  Endereço: Alameda das Flores, 123 - Centro - São Paulo/SP - CEP: 01000-000
                </div>
              </div>

              {/* Barcode line separation */}
              <div className="border-b border-black border-dashed pt-4 mb-4 select-none print:hidden" />

              {/* Ficha de compensacao (actual bank receipt card) */}
              <div className="flex items-end justify-between border-b-2 border-black pb-1.5">
                <div className="flex items-end gap-3">
                  <div className="bg-orange-600 text-white font-bold px-2 py-0.5 text-sm italic tracking-tighter">ITAÚ</div>
                  <div className="font-bold text-xs border-x border-black px-3 py-0.5">341-7</div>
                </div>
                <div className="font-bold text-xs">34191.79001 01043.513184 91020.150008 7 99010000{Math.floor(boletoValue * 100).toString().padStart(6, '0')}</div>
              </div>

              <div className="border border-black">
                <div className="grid grid-cols-6 border-b border-black">
                  <div className="col-span-5 border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Local de Pagamento</span>
                    <strong>ATÉ O VENCIMENTO EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO</strong>
                  </div>
                  <div className="p-1 bg-gray-50">
                    <span className="text-[7px] text-gray-500 block">Vencimento</span>
                    <strong>{new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-6 border-b border-black">
                  <div className="col-span-5 border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Beneficiário</span>
                    <strong>IMOB PRO ADMINISTRAÇÃO DE BENS LTDA - CNPJ: 12.345.678/0001-99</strong>
                  </div>
                  <div className="p-1">
                    <span className="text-[7px] text-gray-500 block">Agência/Código Beneficiário</span>
                    <strong>4031 / 90150-8</strong>
                  </div>
                </div>

                <div className="grid grid-cols-6 border-b border-black">
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Data do Doc.</span>
                    <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Nº Documento</span>
                    <strong>REC-2026/01</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Espécie Doc.</span>
                    <strong>DM</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Aceite</span>
                    <strong>N</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Data Processam.</span>
                    <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
                  </div>
                  <div className="p-1">
                    <span className="text-[7px] text-gray-500 block">Nosso Número</span>
                    <strong>09/10435131-8</strong>
                  </div>
                </div>

                <div className="grid grid-cols-6 border-b border-black">
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Uso do Banco</span>
                    <strong></strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Carteira</span>
                    <strong>109</strong>
                  </div>
                  <div className="border-r border-black p-1">
                    <span className="text-[7px] text-gray-500 block">Espécie Moeda</span>
                    <strong>R$</strong>
                  </div>
                  <div className="border-r border-black p-1 col-span-2">
                    <span className="text-[7px] text-gray-500 block">Quantidade</span>
                    <strong></strong>
                  </div>
                  <div className="p-1 bg-gray-50">
                    <span className="text-[7px] text-gray-500 block">(=) Valor do Documento</span>
                    <strong className="text-xs">R$ {boletoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-6 items-stretch">
                  <div className="col-span-5 border-r border-black p-1.5 text-[8px] space-y-1.5">
                    <span className="text-[7px] text-gray-500 block">Instruções de Responsabilidade</span>
                    <div>- NÃO RECEBER APÓS O VENCIMENTO.</div>
                    <div>- MULTA DE 2,00% APÓS O VENCIMENTO E JUROS DE 1,00% AO MÊS.</div>
                    <div>- REFERENTE A ACORDO CONTRATUAL JURÍDICO - ENTRADA DE RENEGOCIAÇÃO.</div>
                  </div>
                  <div className="col-span-1 divide-y divide-black font-mono">
                    <div className="p-1">
                      <span className="text-[7px] text-gray-500 block">(-) Desconto / Abatimento</span>
                      <strong></strong>
                    </div>
                    <div className="p-1">
                      <span className="text-[7px] text-gray-500 block">(+) Multa / Juros</span>
                      <strong></strong>
                    </div>
                    <div className="p-1 bg-gray-50">
                      <span className="text-[7px] text-gray-500 block">(=) Valor Cobrado</span>
                      <strong></strong>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black p-1.5 text-[8px] leading-relaxed">
                  <span className="text-[7px] text-gray-500 block">Pagador</span>
                  <strong>{boletoPayer.name} (CPF: {boletoPayer.cpf})</strong><br />
                  Sacador/Avalista: IMOB PRO ADMINISTRAÇÃO DE BENS LTDA - CNPJ: 12.345.678/0001-99
                </div>
              </div>

              {/* Simulated Barcode */}
              <div className="pt-6 space-y-2 flex flex-col items-center">
                {/* Simple simulated lines representing barcode */}
                <div className="flex h-12 w-full gap-[1.5px] items-stretch bg-white select-none">
                  {Array.from({ length: 120 }).map((_, i) => {
                    const seed = (i * 3 + Math.floor(boletoValue)) % 11;
                    const w = seed === 0 ? 'w-[4px] bg-black' : seed < 5 ? 'w-[1.5px] bg-black' : 'w-[1px] bg-white';
                    return <div key={i} className={w} />;
                  })}
                </div>
                <div className="text-center font-bold text-sm tracking-widest text-black mt-1">
                  34199.90103 00010.435138 18491.020150 8 99010000{Math.floor(boletoValue * 100).toString().padStart(6, '0')}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DRAFT SAVED TOAST */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#708D81] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-2.5 z-[100] animate-bounce">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
