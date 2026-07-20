import { prisma } from "@/lib/prisma";
import https from "https";
import axios from "axios";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/storage";

// Interface para estruturar o retorno das chamadas do Inter
export interface InterAuthCredentials {
  clientId: string;
  clientSecret: string;
  certPem: string;
  keyPem: string;
  sandbox: boolean;
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
        contrato: {
          include: {
            locatarios: true,
          },
        },
      },
    });

    if (!transacao) {
      return { success: false, error: "Transação não encontrada." };
    }

    let finalImobId = transacao.contrato?.imobId;
    if (!finalImobId) {
      const firstImob = await prisma.imob.findFirst();
      if (!firstImob) {
        return { success: false, error: "Nenhuma imobiliária cadastrada no sistema." };
      }
      finalImobId = firstImob.id;
    }

    let locatario = transacao.contrato?.locatarios?.[0] as any;
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

    // 2. Resolve credenciais do Inter
    const creds = await getInterCredentials(finalImobId);
    token = await getInterAccessToken(finalImobId);
    httpsAgent = createHttpsAgent(creds.certPem, creds.keyPem, creds.sandbox);
    baseUrl = getInterBaseUrl(creds.sandbox);

    // 3. Estrutura o pagador (Inquilino)
    let enderecoObj: any = { logradouro: "Rua não informada", bairro: "Centro", municipio: "Cidade", estado: "SP", cep: "00000000" };
    if (locatario.endereco) {
      try {
        const parsed = JSON.parse(locatario.endereco as string);
        enderecoObj = {
          logradouro: parsed.logradouro || enderecoObj.logradouro,
          bairro: parsed.bairro || enderecoObj.bairro,
          municipio: parsed.municipio || enderecoObj.municipio,
          estado: parsed.estado || enderecoObj.estado,
          cep: parsed.cep ? String(parsed.cep).replace(/\D/g, "") : enderecoObj.cep,
        };
      } catch (e) {
        // Fallback simples se não for JSON válido
        if (typeof locatario.endereco === "string") {
          enderecoObj.logradouro = locatario.endereco;
        }
      }
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let dataVencimentoStr = new Date(transacao.dataVencimento).toISOString().split("T")[0];
    if (dataVencimentoStr < todayStr) {
      dataVencimentoStr = todayStr;
    }

    const cleanCpfCnpj = locatario.cpfCnpj.replace(/\D/g, "");
    const payload = {
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

    // 4.5. Consulta os dados gerados (nossoNumero, pixCopiaECola, codigoBarras)
    const getResponse = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${codigoSolicitacao}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent,
    });

    const getData = getResponse.data;
    if (!getData || !getData.boleto || !getData.boleto.nossoNumero) {
      return { success: false, error: "Não foi possível obter os detalhes do boleto gerado." };
    }

    const nossoNumero = getData.boleto.nossoNumero;
    const pixCopiaECola = getData.pix?.pixCopiaECola || "";
    const codigoBarras = getData.boleto.codigoBarras || "";
    console.log(`[gerarBolePixAction] Detalhes obtidos. nossoNumero: ${nossoNumero}`);

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

    if (!transacao.interNossoNumero) {
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

    // Consulta a cobrança pelo nossoNumero
    const response = await axios.get(`${baseUrl}/cobranca/v3/cobrancas/${transacao.interNossoNumero}`, {
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

    if (!transacao.interNossoNumero) {
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
      `${baseUrl}/cobranca/v3/cobrancas/${transacao.interNossoNumero}/pagar`,
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

