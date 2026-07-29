import { prisma } from "@/lib/prisma";
import https from "https";
import axios from "axios";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/storage";
import {
  calcularCompetenciaPorVencimento,
  substituirCompetenciaNaDescricao,
} from "@/lib/locacao/financeiro";
import {
  criarDescontoInterV3,
  criarEstadoParaNovaEmissaoInter,
  criarInstrucoesBoletoInter,
  criarResumoComposicaoBoletoInter,
  resolverBonificacaoLease,
  respostaInterIndicaCobrancaCancelada,
} from "@/lib/inter-cobranca";
import { resolverPeriodoDaCobranca } from "@/lib/locacao/resolverPeriodoCobranca";
import { lerCondicoesBoletoMetadata } from "@/lib/financeiro/boleto-composicao";

// Interface para estruturar o retorno das chamadas do Inter
export interface InterAuthCredentials {
  clientId: string;
  clientSecret: string;
  certPem: string;
  keyPem: string;
  sandbox: boolean;
}

/**
 * Sanitiza e formata a descrição da transação no formato aceito pelo Banco Inter (linha1..linha5 de no máximo 78 chars).
 */
export function formatMensagemInter(descricao: string): Record<string, string> {
  if (!descricao) return {};

  const blocks = descricao.split(/\r?\n/).map(block => block
    .replace(/R\$/gi, "RS")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s.,\-/:;()%]/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim()
  ).filter(Boolean);
  const lines: string[] = [];

  for (const block of blocks) {
    const words = block.split(" ");
    let currentLine = "";
    for (const word of words) {
      if (!word) continue;
      if ((currentLine ? `${currentLine} ${word}` : word).length <= 78) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) lines.push(currentLine);
        let remaining = word;
        while (remaining.length > 78) {
          lines.push(remaining.substring(0, 78));
          remaining = remaining.substring(78);
        }
        currentLine = remaining;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const msg: Record<string, string> = {};
  if (lines[0]) msg.linha1 = lines[0].substring(0, 78);
  if (lines[1]) msg.linha2 = lines[1].substring(0, 78);
  if (lines[2]) msg.linha3 = lines[2].substring(0, 78);
  if (lines[3]) msg.linha4 = lines[3].substring(0, 78);
  if (lines[4]) msg.linha5 = lines[4].substring(0, 78);

  return msg;
}

/**
 * Obtém as credenciais de integração com o Banco Inter da imobiliária a partir do banco de dados.
 */
export async function getInterCredentials(imobId: string): Promise<InterAuthCredentials> {
  let config = await prisma.configuracaoInter.findUnique({
    where: { imobId },
  });

  if (!config) {
    config = await prisma.configuracaoInter.findFirst();
  }

  if (!config) {
    throw new Error(`Configurações do Banco Inter não encontradas no sistema. Por favor, configure a integração no painel.`);
  }

  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    certPem: config.certPem,
    keyPem: config.keyPem,
    sandbox: config.sandbox,
  };
}

/**
 * Retorna a URL base correta do Banco Inter de acordo com o ambiente (sandbox ou produção).
 */
function getInterBaseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://cdpj-sandbox.partners.uatinter.co"
    : "https://cdpj.partners.bancointer.com.br";
}

export interface InterWebhookRegistration {
  webhookUrl: string;
  environment: "SANDBOX" | "PRODUCTION";
}

function validateWebhookUrl(webhookUrl: string): string {
  const parsed = new URL(webhookUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
    throw new Error("A URL do webhook deve usar HTTPS e não pode conter credenciais ou fragmentos.");
  }
  return parsed.toString().replace(/\/$/, "");
}

/** Cadastra ou atualiza o webhook da API Cobrança V3 no ambiente configurado. */
export async function configureInterWebhook(
  imobId: string,
  webhookUrl: string,
): Promise<InterWebhookRegistration> {
  const normalizedUrl = validateWebhookUrl(webhookUrl);
  const credentials = await getInterCredentials(imobId);
  const token = await getInterAccessToken(imobId);
  const baseUrl = getInterBaseUrl(credentials.sandbox);
  const httpsAgent = createHttpsAgent(credentials.certPem, credentials.keyPem, credentials.sandbox);

  await axios.put(
    `${baseUrl}/cobranca/v3/cobrancas/webhook`,
    { webhookUrl: normalizedUrl },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      httpsAgent,
    },
  );

  return {
    webhookUrl: normalizedUrl,
    environment: credentials.sandbox ? "SANDBOX" : "PRODUCTION",
  };
}

/** Consulta o webhook cadastrado no ambiente atual da integração. */
export async function retrieveInterWebhook(imobId: string): Promise<InterWebhookRegistration> {
  const credentials = await getInterCredentials(imobId);
  const token = await getInterAccessToken(imobId);
  const baseUrl = getInterBaseUrl(credentials.sandbox);
  const httpsAgent = createHttpsAgent(credentials.certPem, credentials.keyPem, credentials.sandbox);
  const response = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/webhook`, {
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent,
  });
  const webhookUrl = response.data?.webhookUrl;
  if (typeof webhookUrl !== "string" || !webhookUrl) {
    throw new Error("O Banco Inter não retornou uma URL de webhook cadastrada.");
  }

  return {
    webhookUrl,
    environment: credentials.sandbox ? "SANDBOX" : "PRODUCTION",
  };
}

/**
 * Cria o agente HTTPS com suporte a mTLS (certificados em memória obtidos do banco de dados).
 */
function createHttpsAgent(certPem: string, keyPem: string, sandbox: boolean): https.Agent {
  return new https.Agent({
    cert: certPem,
    key: keyPem,
    rejectUnauthorized: !sandbox, // Evita validação rígida de certificado apenas em sandbox
  });
}

/**
 * Solicita o token de acesso OAuth v3 via mTLS para a API do Banco Inter.
 */
export async function getInterAccessToken(imobId: string): Promise<string> {
  const creds = await getInterCredentials(imobId);
  const httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
  const baseUrl = getInterBaseUrl(creds.sandbox);

  const params = new URLSearchParams();
  params.append("client_id", creds.clientId);
  params.append("client_secret", creds.clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "boleto-cobranca.read boleto-cobranca.write");

  console.log("[inter-auth] Enviando requisicao de token para:", `${baseUrl}/oauth/v2/token`);
  console.log("[inter-auth] Parametros:", params.toString().replace(/client_secret=[^&]*/, "client_secret=*****"));

  try {
    const response = await axios.post(`${baseUrl}/oauth/v2/token`, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      httpsAgent,
    });

    if (!response.data || !response.data.access_token) {
      throw new Error("Falha ao obter token de acesso do Banco Inter.");
    }

    console.log("[inter-auth] Token de acesso obtido com sucesso.");
    return response.data.access_token;
  } catch (err: any) {
    console.error("[inter-auth] Erro ao obter token:", err.response?.status, err.response?.data || err.message);
    throw err;
  }
}

/**
 * Gera um BolePix (Cobrança v3) no Banco Inter para uma transação financeira existente.
 */
export async function gerarBolePixAction(transacaoId: string): Promise<{
  success: boolean;
  nossoNumero?: string;
  pixCopiaECola?: string;
  codigoBarras?: string;
  pdfUrl?: string;
  error?: string;
}> {
  let token = "";
  let httpsAgent: any = null;
  let baseUrl = "";
  try {
    // 1. Busca a transação e os detalhes do contrato/inquilino associado
    const transacao = await prisma.transacaoFinanceira.findUnique({
      where: { id: transacaoId },
      include: {
        imovel: true,
        contrato: {
          include: {
            imovel: true,
            locatarios: true,
            imovelLocacao: {
              include: {
                periodos: { orderBy: { dataInicio: "asc" } },
              },
            },
          },
        },
        lease: {
          include: {
            property: true,
            terms: true,
            termsPeriods: { orderBy: { createdAt: "desc" } },
            parties: {
              where: { role: "TENANT" },
              include: {
                person: {
                  include: {
                    addresses: true,
                    phones: true,
                  },
                },
              },
              orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    });

    if (!transacao) {
      return { success: false, error: "Transação não encontrada." };
    }

    const primeiroVencimento = transacao.lease?.terms?.firstPeriodDueDate;
    if (
      primeiroVencimento
      && transacao.dataVencimento.getTime() < primeiroVencimento.getTime()
    ) {
      const dataFormatada = primeiroVencimento.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
      });
      return {
        success: false,
        error: `Esta cobrança é anterior ao primeiro vencimento do contrato (${dataFormatada}). Corrija o contrato ou gere a cobrança no mês correto.`,
      };
    }

    let finalImobId = transacao.contrato?.imobId ?? transacao.lease?.tenantId;
    if (!finalImobId) {
      const firstImob = await prisma.imob.findFirst();
      if (!firstImob) {
        return { success: false, error: "Nenhuma imobiliária cadastrada no sistema." };
      }
      finalImobId = firstImob.id;
    }

    let locatario = transacao.contrato?.locatarios?.[0] as any;
    const leaseTenant = transacao.lease?.parties[0]?.person;
    if (!locatario && leaseTenant) {
      const address = leaseTenant.addresses[0];
      locatario = {
        id: leaseTenant.id,
        nome: leaseTenant.name,
        cpfCnpj: leaseTenant.cpfCnpj,
        email: leaseTenant.email,
        telefone: JSON.stringify(leaseTenant.phones.map(phone => ({
          telefone: phone.phone,
          qualificacao: phone.type,
        }))),
        endereco: address ? JSON.stringify({
          logradouro: address.logradouro,
          numero: address.numero,
          complemento: address.complemento,
          bairro: address.bairro,
          municipio: address.municipio,
          estado: address.estado,
          cep: address.cep,
        }) : null,
      };
    }
    if (!locatario) {
      // Fallback para inquilino de teste caso a transação tenha sido criada sem contrato
      const nomePagador = transacao.descricao.replace("Aluguel - ", "");
      locatario = {
        id: "mock-locatario-id",
        nome: nomePagador || "Pagador de Teste Sandbox",
        cpfCnpj: "01123456789", // CPF de teste válido
        email: "teste.pagador@bancointer.com.br",
        telefone: JSON.stringify([{ telefone: "31999999999", qualificacao: "Celular" }]),
        endereco: JSON.stringify({
          logradouro: "Avenida Brasil, 1200",
          bairro: "Centro",
          municipio: "Belo Horizonte",
          estado: "MG",
          cep: "30110000"
        }),
        dataNasc: "1990-01-01",
        rg: "MG123456",
        orgaoEmissor: "SSP",
        estadoCivil: "Solteiro",
        profissao: "Autônomo",
        nacionalidade: "Brasileiro",
        genero: "MASCULINO",
        contratoId: null
      } as any;
    }

    // Validação de nome
    if (!locatario.nome || locatario.nome.trim() === "") {
      return { success: false, error: "Nome do locatário é obrigatório." };
    }

    // Validação de CPF/CNPJ
    const cleanCpfCnpj = locatario.cpfCnpj ? locatario.cpfCnpj.replace(/\D/g, "") : "";
    if (!cleanCpfCnpj) {
      return { success: false, error: `Inquilino ${locatario.nome} não possui CPF/CNPJ cadastrado. Por favor, preencha o CPF/CNPJ no cadastro do inquilino.` };
    }
    if (cleanCpfCnpj.length !== 11 && cleanCpfCnpj.length !== 14) {
      return { success: false, error: `CPF/CNPJ do inquilino ${locatario.nome} é inválido (deve conter 11 ou 14 dígitos).` };
    }

    // 2. Resolve credenciais do Inter
    const creds = await getInterCredentials(finalImobId);
    token = await getInterAccessToken(finalImobId);
    httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
    baseUrl = getInterBaseUrl(creds.sandbox);

    // 3. Estrutura o pagador (Inquilino)
    let enderecoObj: any = { logradouro: "", bairro: "", municipio: "", estado: "", cep: "" };
    if (locatario.endereco) {
      try {
        const parsed = JSON.parse(locatario.endereco as string);
        enderecoObj = {
          logradouro: parsed.logradouro || "",
          bairro: parsed.bairro || "",
          municipio: parsed.municipio || parsed.cidade || "",
          estado: parsed.estado || parsed.uf || "",
          cep: parsed.cep ? String(parsed.cep).replace(/\D/g, "") : "",
        };
      } catch (e) {
        if (typeof locatario.endereco === "string") {
          enderecoObj.logradouro = locatario.endereco;
        }
      }
    }

    // Fallback dinâmico para endereço do imóvel
    if (!enderecoObj.logradouro || !enderecoObj.cep || enderecoObj.cep.length !== 8 || enderecoObj.cep === "00000000") {
      const imovel = transacao.imovel || transacao.contrato?.imovel || transacao.lease?.property;
      if (imovel) {
        let rawAddress = "";
        if (imovel.descricao && imovel.descricao.includes("Endereço completo importado:")) {
          rawAddress = imovel.descricao.replace("Endereço completo importado: ", "").trim();
        } else if (imovel.descricao) {
          rawAddress = imovel.descricao.trim();
        }

        enderecoObj = {
          logradouro: rawAddress || enderecoObj.logradouro || "Rua não informada",
          bairro: imovel.bairro && imovel.bairro !== "Importado via CSV" ? imovel.bairro : (enderecoObj.bairro || "Centro"),
          municipio: imovel.cidade && imovel.cidade !== "Indefinida" ? imovel.cidade : (enderecoObj.municipio || "Ilha Solteira"),
          estado: imovel.uf || (enderecoObj.estado || "SP"),
          cep: imovel.cep && imovel.cep > 0 ? String(imovel.cep).padStart(8, "0") : (enderecoObj.cep || "15385000"),
        };
      }
    }

    // Validação final de campos de endereço obrigatórios para o Inter
    if (!enderecoObj.logradouro || enderecoObj.logradouro.trim() === "" || enderecoObj.logradouro === "Rua não informada") {
      return { success: false, error: `Dados de endereço de ${locatario.nome} incompletos. Por favor, preencha o logradouro.` };
    }
    if (!enderecoObj.cep || enderecoObj.cep.length !== 8 || enderecoObj.cep === "00000000") {
      return { success: false, error: `CEP de ${locatario.nome} está ausente ou é inválido (deve conter 8 dígitos).` };
    }
    if (!enderecoObj.bairro) enderecoObj.bairro = "Centro";
    if (!enderecoObj.municipio) enderecoObj.municipio = "Ilha Solteira";
    if (!enderecoObj.estado) enderecoObj.estado = "SP";

    const todayStr = new Date().toISOString().split("T")[0];
    let dataVencimentoStr = new Date(transacao.dataVencimento).toISOString().split("T")[0];
    if (dataVencimentoStr < todayStr) {
      dataVencimentoStr = todayStr;
    }

    const descricaoBoleto = transacao.lease?.terms
      ? substituirCompetenciaNaDescricao(
          transacao.descricao,
          calcularCompetenciaPorVencimento(
            transacao.dataVencimento,
            transacao.lease.terms.firstPeriodEndDay,
          ),
        )
      : transacao.descricao;

    const payload: any = {
      seuNumero: transacao.id.replace(/-/g, "").substring(0, 15),
      valorNominal: transacao.valor,
      dataVencimento: dataVencimentoStr,
      numDiasAgenda: 30, // Fica recebível por 30 dias após vencimento
      pagador: {
        cpfCnpj: cleanCpfCnpj,
        tipoPessoa: cleanCpfCnpj.length > 11 ? "JURIDICA" : "FISICA",
        nome: locatario.nome,
        endereco: enderecoObj.logradouro,
        bairro: enderecoObj.bairro,
        cidade: enderecoObj.municipio,
        uf: enderecoObj.estado,
        cep: enderecoObj.cep,
      },
    };

    if (descricaoBoleto) {
      const msg = formatMensagemInter(descricaoBoleto);
      if (Object.keys(msg).length > 0) {
        payload.mensagem = msg;
      }
    }


    // Configura multa, juros e bonificação (desconto pontualidade) do contrato
    const condicoesSalvas = lerCondicoesBoletoMetadata(transacao.metadata);
    const imovelLocacao = transacao.contrato?.imovelLocacao;
    if (imovelLocacao) {
      const periodoCobranca = resolverPeriodoDaCobranca(
        imovelLocacao.periodos,
        transacao.metadata,
        transacao.dataVencimento,
      );

      // 1. Multa
      const multaAtraso = condicoesSalvas
        ? condicoesSalvas.lateFeePercentage
        : periodoCobranca?.multaAtrasoPercentual
          ?? imovelLocacao.multaAtrasoPercentual;
      if (multaAtraso && multaAtraso > 0) {
        payload.multa = {
          codigo: "PERCENTUAL",
          taxa: multaAtraso,
        };
      }

      // 2. Juros/Mora (pro-rata mensal)
      const jurosAtraso = condicoesSalvas
        ? condicoesSalvas.lateInterestMonthly
        : periodoCobranca?.jurosAtrasoPercentual
          ?? imovelLocacao.jurosAtrasoPercentual;
      if (jurosAtraso && jurosAtraso > 0) {
        payload.mora = {
          codigo: "TAXAMENSAL",
          taxa: jurosAtraso,
        };
      }

      // 3. Bonificação (Desconto de Pontualidade)
      const descPontualidade = condicoesSalvas
        ? condicoesSalvas.discountValue
        : periodoCobranca?.descontoPontualidade
          ?? imovelLocacao.descontoPontualidade;
      if (descPontualidade && descPontualidade > 0) {
        const diasAntecedencia = condicoesSalvas
          ? condicoesSalvas.discountDaysBefore
          : periodoCobranca?.diasAntecedenciaDesc
            ?? imovelLocacao.diasAntecedenciaDesc
            ?? 0;
        const tipoDesconto = condicoesSalvas
          ? condicoesSalvas.discountType
          : periodoCobranca?.tipoDesconto
            ?? imovelLocacao.tipoDesconto;
        const desconto = criarDescontoInterV3({
          valor: descPontualidade,
          tipo: tipoDesconto,
          diasAntesDoVencimento: diasAntecedencia,
        });
        if (desconto) payload.desconto = desconto;
      }
    } else if (transacao.lease) {
      const metadata = (transacao.metadata ?? {}) as Record<string, unknown>;
      const periodId = typeof metadata.termsPeriodId === "string" ? metadata.termsPeriodId : null;
      const termsPeriod = periodId
        ? transacao.lease.termsPeriods.find(period => period.id === periodId)
        : transacao.lease.termsPeriods.find(period =>
            transacao.dataVencimento >= period.effectiveFrom
            && (!period.effectiveTo || transacao.dataVencimento < period.effectiveTo),
          );

      if (!termsPeriod) {
        return { success: false, error: "Período locatício da cobrança não encontrado." };
      }

      const lateFee = condicoesSalvas
        ? condicoesSalvas.lateFeePercentage
        : Number(
            termsPeriod.lateFeePercentage
            ?? transacao.lease.terms?.lateFeePercentage
            ?? 0
          );
      if (lateFee > 0) {
        payload.multa = { codigo: "PERCENTUAL", taxa: lateFee };
      }

      const lateInterest = condicoesSalvas
        ? condicoesSalvas.lateInterestMonthly
        : Number(
            termsPeriod.lateInterestMonthly
            ?? transacao.lease.terms?.lateInterestMonthly
            ?? 0
          );
      if (lateInterest > 0) {
        payload.mora = { codigo: "TAXAMENSAL", taxa: lateInterest };
      }

      const bonificacao = condicoesSalvas
        ? {
            valor: condicoesSalvas.discountValue,
            tipo: condicoesSalvas.discountType,
            diasAntesDoVencimento: condicoesSalvas.discountDaysBefore,
          }
        : resolverBonificacaoLease({
            valorPeriodo: termsPeriod.earlyPaymentDiscount,
            tipoPeriodo: termsPeriod.discountType,
            diasPeriodo: termsPeriod.discountDaysBefore,
            valorContrato: transacao.lease.terms?.earlyPaymentDiscount,
            tipoContrato: transacao.lease.terms?.discountType,
            diasContrato: transacao.lease.terms?.discountDaysBefore,
          });
      if (bonificacao.valor > 0) {
        const desconto = criarDescontoInterV3({
          valor: bonificacao.valor,
          tipo: bonificacao.tipo,
          diasAntesDoVencimento: bonificacao.diasAntesDoVencimento,
        });
        if (desconto) payload.desconto = desconto;
      }
    }

    const instrucoes = criarInstrucoesBoletoInter({
      desconto: payload.desconto,
      multaPercentual: payload.multa?.taxa,
      jurosMensal: payload.mora?.taxa,
      dataVencimento: dataVencimentoStr,
    });
    const resumoComposicao = criarResumoComposicaoBoletoInter({
      metadata: transacao.metadata,
      valorNominal: transacao.valor,
      dataVencimento: dataVencimentoStr,
    });
    const mensagemBoleto = [...resumoComposicao, ...instrucoes]
      .filter(Boolean)
      .join("\n");
    payload.mensagem = formatMensagemInter(mensagemBoleto);

    console.log("[gerarBolePixAction] Enviando POST para:", `${baseUrl}/cobranca/v3/cobrancas`);
    console.log("[gerarBolePixAction] Payload:", JSON.stringify(payload, null, 2));

    // 4. Cria a cobrança no Inter
    const response = await axios.post(`${baseUrl}/cobranca/v3/cobrancas`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      httpsAgent,
    });

    console.log("[gerarBolePixAction] Resposta obtida:", response.status);
    const postData = response.data;
    if (!postData || !postData.codigoSolicitacao) {
      return { success: false, error: "Resposta inválida da API do Banco Inter (falta codigoSolicitacao)." };
    }

    const codigoSolicitacao = postData.codigoSolicitacao;
    console.log(`[gerarBolePixAction] Cobrança criada. codigoSolicitacao: ${codigoSolicitacao}. Buscando detalhes...`);

    // A Cobrança V3 é assíncrona. Persistimos os identificadores antes de
    // consultar os detalhes para não perder o vínculo caso essa consulta falhe.
    await prisma.transacaoFinanceira.update({
      where: { id: transacaoId },
      data: {
        interCodigoSolicitacao: codigoSolicitacao,
        interSeuNumero: payload.seuNumero,
        interStatus: "EM_PROCESSAMENTO",
      },
    });

    // 4.5. Consulta os dados gerados (nossoNumero, pixCopiaECola, codigoBarras) com retry
    let getData: any = null;
    const getAttempts = 4;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= getAttempts; attempt++) {
      try {
        console.log(`[gerarBolePixAction] Tentativa ${attempt} de buscar detalhes da solicitação no Banco Inter...`);
        const getResponse = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}`, {
          headers: { Authorization: `Bearer ${token}` },
          httpsAgent,
        });
        const temp = getResponse.data;
        if (temp && temp.boleto && temp.boleto.nossoNumero) {
          getData = temp;
          console.log(`[gerarBolePixAction] Detalhes obtidos com sucesso na tentativa ${attempt}.`);
          break;
        }
      } catch (e: any) {
        console.warn(`[gerarBolePixAction] Tentativa ${attempt} de obter detalhes falhou:`, e.response?.data || e.message || e);
      }
      if (attempt < getAttempts) {
        const delay = attempt * 1500; // 1.5s, 3s, 4.5s
        console.log(`[gerarBolePixAction] Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }

    if (!getData || !getData.boleto || !getData.boleto.nossoNumero) {
      return { success: false, error: "Não foi possível obter os detalhes do boleto gerado no Banco Inter após várias tentativas de consulta." };
    }

    const nossoNumero = getData.boleto.nossoNumero;
    const pixCopiaECola = getData.pix?.pixCopiaECola || "";
    const codigoBarras = getData.boleto.codigoBarras || "";
    console.log(`[gerarBolePixAction] Detalhes finais obtidos. nossoNumero: ${nossoNumero}`);

    // 5. Baixa o PDF do boleto gerado no Banco Inter
    let pdfKey = "";
    let pdfUrl = "";
    try {
      const pdfResponse = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent,
      });

      if (pdfResponse.data && pdfResponse.data.pdf) {
        const pdfBuffer = Buffer.from(pdfResponse.data.pdf, "base64");
        pdfKey = `cobrancas/${nossoNumero}.pdf`;

        // Upload para MinIO/RustFS
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: pdfKey,
            Body: pdfBuffer,
            ContentType: "application/pdf",
          })
        );
        pdfUrl = `/${bucketName}/${pdfKey}`;
      }
    } catch (pdfErr: any) {
      console.error("Erro ao baixar ou fazer upload do PDF da cobrança:", pdfErr.message || pdfErr);
      // Não falhamos a geração se for apenas erro no PDF, mas registramos
    }

    // 6. Atualiza a transação financeira no banco de dados com os dados retornados
    await prisma.transacaoFinanceira.update({
      where: { id: transacaoId },
      data: {
        interNossoNumero: nossoNumero,
        interCodigoSolicitacao: codigoSolicitacao,
        interSeuNumero: payload.seuNumero,
        interPixCode: pixCopiaECola,
        interBarcode: codigoBarras,
        interPdfKey: pdfKey || null,
        interStatus: "APROVADO",
      },
    });

    return {
      success: true,
      nossoNumero,
      pixCopiaECola,
      codigoBarras,
      pdfUrl: pdfUrl || undefined,
    };
  } catch (err: any) {
    if (err.response?.data) {
      console.error("Erro completo da API do Banco Inter:", JSON.stringify(err.response.data, null, 2));

      // Auto-recuperação caso a cobrança já tenha sido criada no Inter anteriormente
      const detail = err.response.data.detail || "";
      const match = detail.match(/código de solicitação:\s*([a-f0-9-]{36})/i);
      if (match) {
        const codigoSolicitacao = match[1];
        console.log(`[gerarBolePixAction] Auto-recuperando cobrança já existente. codigoSolicitacao: ${codigoSolicitacao}`);
        try {
          const getResponse = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}`, {
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent,
          });
          const getData = getResponse.data;
          if (getData && getData.boleto && getData.boleto.nossoNumero) {
            const nossoNumero = getData.boleto.nossoNumero;
            const pixCopiaECola = getData.pix?.pixCopiaECola || "";
            const codigoBarras = getData.boleto.codigoBarras || "";

            let pdfKey = "";
            let pdfUrl = "";
            try {
              const pdfResponse = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
                httpsAgent,
              });
              if (pdfResponse.data && pdfResponse.data.pdf) {
                const pdfBuffer = Buffer.from(pdfResponse.data.pdf, "base64");
                pdfKey = `cobrancas/${nossoNumero}.pdf`;
                await s3Client.send(new PutObjectCommand({ Bucket: bucketName, Key: pdfKey, Body: pdfBuffer, ContentType: "application/pdf" }));
                pdfUrl = `/${bucketName}/${pdfKey}`;
              }
            } catch (pdfErr) {
              console.error("Erro ao baixar PDF na auto-recuperação:", pdfErr);
            }

            await prisma.transacaoFinanceira.update({
              where: { id: transacaoId },
              data: {
                interNossoNumero: nossoNumero,
                interCodigoSolicitacao: codigoSolicitacao,
                interSeuNumero: transacaoId.replace(/-/g, "").substring(0, 15),
                interPixCode: pixCopiaECola,
                interBarcode: codigoBarras,
                interPdfKey: pdfKey || null,
                interStatus: "APROVADO",
              },
            });

            return {
              success: true,
              nossoNumero,
              pixCopiaECola,
              codigoBarras,
              pdfUrl: pdfUrl || undefined,
            };
          }
        } catch (recoverErr: any) {
          console.error("Falha ao auto-recuperar cobrança:", recoverErr.message);
        }
      }
    } else {
      console.error("Erro em gerarBolePixAction:", err.message || err);
    }
    return {
      success: false,
      error: err.response?.data?.title || err.response?.data?.message || err.response?.data?.detail || err.message || "Erro inesperado ao gerar BolePix.",
    };
  }
}

/**
 * Consulta e sincroniza o status de uma cobrança BolePix no Banco Inter.
 */
export async function consultarBolePixAction(transacaoId: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const transacao = await prisma.transacaoFinanceira.findUnique({
      where: { id: transacaoId },
      include: {
        contrato: true,
      },
    });

    if (!transacao) {
      return { success: false, error: "Transação não encontrada." };
    }

    if (!transacao.interCodigoSolicitacao) {
      return { success: false, error: "Esta transação não possui uma cobrança do Banco Inter associada." };
    }

    let imobId = transacao.contrato?.imobId;
    if (!imobId) {
      const firstImob = await prisma.imob.findFirst();
      imobId = firstImob?.id || "default";
    }

    // Resolve credenciais do Inter
    const creds = await getInterCredentials(imobId);
    const token = await getInterAccessToken(imobId);
    const httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
    const baseUrl = getInterBaseUrl(creds.sandbox);

    // A API Cobrança V3 identifica a solicitação pelo codigoSolicitacao.
    const response = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${transacao.interCodigoSolicitacao}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent,
    });

    const data = response.data;
    if (!data || !data.situacao) {
      return { success: false, error: "Situação da cobrança não retornada pelo Banco Inter." };
    }

    const situacao = data.situacao; // Ex: APROVADO, PAGO, VENCIDO, CANCELADO, etc.

    // Mapeamento de status para o nosso banco de dados
    let statusTransacao = transacao.status;
    let dataPagamento = transacao.dataPagamento;

    if (situacao === "PAGO") {
      statusTransacao = "LIQUIDADO";
      dataPagamento = new Date(); // Registra pagamento como hoje se não houver data detalhada
    } else if (situacao === "CANCELADO" || situacao === "EXPIRADO") {
      statusTransacao = "CANCELADO";
    }

    // Atualiza no banco
    await prisma.transacaoFinanceira.update({
      where: { id: transacaoId },
      data: {
        interStatus: situacao,
        status: statusTransacao,
        dataPagamento,
      },
    });

    if (statusTransacao === "LIQUIDADO") {
      try {
        const { criarRepassePendente } = await import("@/app/actions/financeiroActions");
        await criarRepassePendente(transacaoId);
      } catch (repasseErr) {
        console.error("Erro ao criar repasse automático após consulta Inter:", repasseErr);
      }
    }

    return {
      success: true,
      status: situacao,
    };
  } catch (err: any) {
    console.error("Erro em consultarBolePixAction:", err.response?.data || err.message || err);
    return {
      success: false,
      error: err.response?.data?.title || err.response?.data?.message || err.message || "Erro inesperado ao consultar BolePix.",
    };
  }
}

/**
 * Simula o pagamento de uma cobrança BolePix no ambiente Sandbox do Banco Inter.
 */
export async function simularPagamentoBolePixAction(transacaoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transacao = await prisma.transacaoFinanceira.findUnique({
      where: { id: transacaoId },
      include: {
        contrato: true,
      },
    });

    if (!transacao) {
      return { success: false, error: "Transação não encontrada." };
    }

    if (!transacao.interCodigoSolicitacao) {
      return { success: false, error: "Esta transação não possui uma cobrança do Banco Inter associada." };
    }

    let imobId = transacao.contrato?.imobId;
    if (!imobId) {
      const firstImob = await prisma.imob.findFirst();
      imobId = firstImob?.id || "default";
    }

    const creds = await getInterCredentials(imobId);
    if (!creds.sandbox) {
      return { success: false, error: "A simulação de pagamento só é permitida no ambiente Sandbox." };
    }

    const token = await getInterAccessToken(imobId);
    const httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
    const baseUrl = getInterBaseUrl(creds.sandbox);

    // Endpoint de simulação de pagamento: POST /cobranca/v3/cobrancas/{codigoSolicitacao}/pagar
    await axios.post(
      `${baseUrl}/cobranca/v3/cobrancas/${transacao.interCodigoSolicitacao}/pagar`,
      { pagarCom: "PIX" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    );

    // Consulta para sincronizar o status atualizado imediatamente no banco de dados local
    await consultarBolePixAction(transacaoId);

    return { success: true };
  } catch (err: any) {
    console.error("Erro em simularPagamentoBolePixAction:", err.response?.data || err.message || err);
    return {
      success: false,
      error: err.response?.data?.title || err.response?.data?.message || err.message || "Erro inesperado ao simular pagamento.",
    };
  }
}

/**
 * Cancela/Baixa uma cobrança BolePix no Banco Inter.
 */
export async function cancelarBolePixAction(transacaoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transacao = await prisma.transacaoFinanceira.findUnique({
      where: { id: transacaoId },
      include: {
        contrato: true,
      },
    });

    if (!transacao) {
      return { success: false, error: "Transação não encontrada." };
    }

    if (!transacao.interCodigoSolicitacao) {
      return { success: false, error: "Esta transação não possui uma cobrança do Banco Inter ativa." };
    }

    let imobId = transacao.contrato?.imobId;
    if (!imobId) {
      const firstImob = await prisma.imob.findFirst();
      imobId = firstImob?.id || "default";
    }

    const creds = await getInterCredentials(imobId);
    const token = await getInterAccessToken(imobId);
    const httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
    const baseUrl = getInterBaseUrl(creds.sandbox);

    // POST /cobranca/v3/cobrancas/{codigoSolicitacao}/cancelar
    await axios.post(
      `${baseUrl}/cobranca/v3/cobrancas/${transacao.interCodigoSolicitacao}/cancelar`,
      { motivoCancelamento: "APEDIDODOCLIENTE" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    );

    // Atualiza o status local para CANCELADO
    await prisma.transacaoFinanceira.update({
      where: { id: transacaoId },
      data: {
        interStatus: "CANCELADO",
        status: "CANCELADO",
      },
    });

    return { success: true };
  } catch (err: any) {
    if (respostaInterIndicaCobrancaCancelada(err.response?.data)) {
      console.info("[inter-cancelamento] Cobrança já estava cancelada no Banco Inter.");
      await prisma.transacaoFinanceira.update({
        where: { id: transacaoId },
        data: {
          interStatus: "CANCELADO",
          status: "CANCELADO",
        },
      });
      return { success: true };
    }

    console.error("Erro ao cancelar BolePix no Banco Inter:", err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.title || err.response?.data?.message || err.message || "Erro inesperado ao cancelar boleto.",
    };
  }
}

/**
 * Cancela a cobrança anterior, limpa integralmente o vínculo local com o Inter
 * e emite uma nova cobrança para a mesma transação financeira.
 */
export async function reemitirBolePixAction(transacaoId: string): Promise<{
  success: boolean;
  nossoNumero?: string;
  pixCopiaECola?: string;
  codigoBarras?: string;
  pdfUrl?: string;
  error?: string;
}> {
  const transacao = await prisma.transacaoFinanceira.findUnique({
    where: { id: transacaoId },
  });

  if (!transacao) {
    return { success: false, error: "Transação não encontrada." };
  }
  if (transacao.status === "LIQUIDADO") {
    return { success: false, error: "Não é possível reemitir uma cobrança já paga." };
  }

  const statusSemCobrancaAtiva = new Set(["CANCELADO", "FALHA_EMISSAO", "EXPIRADO"]);
  if (
    transacao.interCodigoSolicitacao
    && !statusSemCobrancaAtiva.has(transacao.interStatus ?? "")
  ) {
    const cancelamento = await cancelarBolePixAction(transacaoId);
    if (!cancelamento.success) {
      return {
        success: false,
        error: `Não foi possível cancelar o boleto anterior: ${cancelamento.error}`,
      };
    }
  } else if (transacao.interNossoNumero && !transacao.interCodigoSolicitacao) {
    return {
      success: false,
      error: "Este boleto não possui o identificador V3 necessário para cancelamento automático.",
    };
  }

  await prisma.transacaoFinanceira.update({
    where: { id: transacaoId },
    data: criarEstadoParaNovaEmissaoInter(),
  });

  return gerarBolePixAction(transacaoId);
}
