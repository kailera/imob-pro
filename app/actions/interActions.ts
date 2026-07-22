"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

async function getOrCreateDefaultImobId() {
  const imob = await prisma.imob.findFirst();
  if (imob) return imob.id;
  const newImob = await prisma.imob.create({
    data: {
      orgId: "org_default"
    }
  });
  return newImob.id;
}

async function requireInterAdmin() {
  const { userId, orgRole } = await auth();
  if (!userId) throw new Error("Não autenticado.");
  if (orgRole === "org:admin") return;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true, ativo: true },
  });
  if (!user?.ativo || user.role !== "ADMIN") {
    throw new Error("Apenas administradores podem gerenciar o webhook do Banco Inter.");
  }
}

function safeInterActionError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("administradores") || error.message === "Não autenticado.") {
      return error.message;
    }
  }
  return "Não foi possível concluir a operação no Banco Inter. Verifique as credenciais, permissões e o ambiente selecionado.";
}

function logInterActionError(operation: string, error: unknown) {
  const axiosLikeError = error as {
    message?: string;
    code?: string;
    response?: { status?: number };
  };

  console.error(`[inter-webhook-config] Falha ao ${operation}:`, {
    status: axiosLikeError?.response?.status,
    code: axiosLikeError?.code,
    message: axiosLikeError?.message || "Erro desconhecido",
  });
}

export async function getInterConfigAction() {
  try {
    const imobId = await getOrCreateDefaultImobId();
    const config = await prisma.configuracaoInter.findUnique({
      where: { imobId },
    });

    if (!config) {
      return { success: true, config: null };
    }

    return {
      success: true,
      config: {
        clientId: config.clientId,
        sandbox: config.sandbox,
        hasCert: !!config.certPem,
        hasKey: !!config.keyPem,
      },
    };
  } catch (error: any) {
    console.error("Erro ao obter configurações do Banco Inter:", error);
    return { success: false, error: error.message || "Erro ao carregar configurações." };
  }
}

export async function saveInterConfigAction(prevState: any, formData: FormData) {
  try {
    const { orgRole } = await auth();
    if (orgRole !== "org:admin") {
      return { success: false, error: "Apenas corretores/administradores podem alterar as configurações do Banco Inter." };
    }

    const imobId = await getOrCreateDefaultImobId();
    const clientId = formData.get("clientId") as string;
    const clientSecret = formData.get("clientSecret") as string;
    const sandbox = formData.get("sandbox") === "on";

    const certFile = formData.get("certFile") as File | null;
    const keyFile = formData.get("keyFile") as File | null;

    if (!clientId) {
      return { success: false, error: "O Client ID é obrigatório." };
    }

    // Carrega dados atuais para preservar se não forem enviados novos arquivos
    const currentConfig = await prisma.configuracaoInter.findUnique({
      where: { imobId },
    });

    let certPem = currentConfig?.certPem || "";
    let keyPem = currentConfig?.keyPem || "";
    let finalClientSecret = clientSecret || currentConfig?.clientSecret || "";

    if (!finalClientSecret) {
      return { success: false, error: "O Client Secret é obrigatório para a primeira configuração." };
    }

    if (certFile && certFile.size > 0) {
      certPem = await certFile.text();
    }
    if (keyFile && keyFile.size > 0) {
      keyPem = await keyFile.text();
    }

    if (!certPem || !keyPem) {
      return { success: false, error: "O certificado (.pem) e a chave privada (.key) são obrigatórios." };
    }

    await prisma.configuracaoInter.upsert({
      where: { imobId },
      update: {
        clientId,
        clientSecret: finalClientSecret,
        certPem,
        keyPem,
        sandbox,
      },
      create: {
        imobId,
        clientId,
        clientSecret: finalClientSecret,
        certPem,
        keyPem,
        sandbox,
      },
    });

    revalidatePath("/configuracoes");

    return { success: true, message: "Configurações do Banco Inter salvas com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao salvar configurações do Banco Inter:", error);
    return { success: false, error: error.message || "Erro ao salvar as configurações." };
  }
}

export async function configureInterWebhookAction() {
  try {
    await requireInterAdmin();
    const imobId = await getOrCreateDefaultImobId();
    const webhookUrl = process.env.INTER_WEBHOOK_URL
      || "https://inter-webhook.euatendo.online/api/webhooks/inter";
    const { configureInterWebhook } = await import("@/lib/inter");
    const registration = await configureInterWebhook(imobId, webhookUrl);
    return {
      success: true as const,
      registration,
      message: `Webhook ${registration.environment === "SANDBOX" ? "do Sandbox" : "de Produção"} cadastrado com sucesso.`,
    };
  } catch (error) {
    logInterActionError("cadastrar webhook", error);
    return { success: false as const, error: safeInterActionError(error) };
  }
}

export async function retrieveInterWebhookAction() {
  try {
    await requireInterAdmin();
    const imobId = await getOrCreateDefaultImobId();
    const { retrieveInterWebhook } = await import("@/lib/inter");
    const registration = await retrieveInterWebhook(imobId);
    return { success: true as const, registration };
  } catch (error) {
    logInterActionError("consultar webhook", error);
    return { success: false as const, error: safeInterActionError(error) };
  }
}

export async function gerarBolePixWrapperAction(transacaoId: string) {
  const { gerarBolePixAction } = await import("@/lib/inter");
  const result = await gerarBolePixAction(transacaoId);
  revalidatePath("/cobrancas");
  return result;
}

export async function consultarBolePixWrapperAction(transacaoId: string) {
  const { consultarBolePixAction } = await import("@/lib/inter");
  const result = await consultarBolePixAction(transacaoId);
  revalidatePath("/cobrancas");
  return result;
}

export async function simularPagamentoBolePixWrapperAction(transacaoId: string) {
  const { simularPagamentoBolePixAction } = await import("@/lib/inter");
  const result = await simularPagamentoBolePixAction(transacaoId);
  revalidatePath("/cobrancas");
  return result;
}

export async function getInterPdfUrlAction(pdfKey: string): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { s3Client, bucketName: s3Bucket } = await import("@/lib/storage");

  try {
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: pdfKey,
    });
    // URL assinada válida por 1 hora (3600 segundos)
    const rawUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    if (process.env.RUSTFS_PUBLIC_URL) {
      try {
        const rawUrlObj = new URL(rawUrl);
        const publicUrlObj = new URL(process.env.RUSTFS_PUBLIC_URL);
        rawUrlObj.protocol = publicUrlObj.protocol;
        rawUrlObj.host = publicUrlObj.host;
        return rawUrlObj.toString();
      } catch (err) {
        console.error("Erro ao mapear RUSTFS_PUBLIC_URL no PDF:", err);
      }
    }
    return rawUrl;
  } catch (error) {
    console.error("Erro ao gerar URL assinada para o PDF:", error);
    const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_ENDPOINT_URL || "http://localhost:9000";
    return `${endpoint}/${s3Bucket}/${pdfKey}`;
  }
}

export async function getLocatariosListAction() {
  try {
    const locatarios = await prisma.locatario.findMany({
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        endereco: true,
        email: true,
        contratoId: true,
        contrato: {
          select: {
            id: true,
            imovel: {
              select: {
                codigo: true,
                bairro: true,
                cidade: true,
                uf: true,
                valorAluguel: true
              }
            },
            imovelLocacao: {
              select: {
                valorTotal: true,
                dataInicio: true,
                dataFim: true
              }
            }
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    });
    return { success: true, locatarios };
  } catch (error: any) {
    console.error("Erro ao obter lista de locatários:", error);
    return { success: false, error: error.message || "Erro ao obter lista de locatários." };
  }
}

export async function criarAcordoManualAction(input: {
  locatarioId: string;
  contratoId: string | null;
  descricao: string;
  valor: number;
  vencimentoStr: string;
  cpfCnpj?: string;
  enderecoJson?: any;
}) {
  try {
    const { locatarioId, contratoId, descricao, valor, vencimentoStr, cpfCnpj, enderecoJson } = input;

    if (!descricao || descricao.trim() === "") {
      return { success: false, error: "A descrição é obrigatória." };
    }
    if (!valor || valor <= 0) {
      return { success: false, error: "O valor deve ser maior que zero." };
    }
    if (!vencimentoStr) {
      return { success: false, error: "A data de vencimento é obrigatória." };
    }

    // 1. Atualizar CPF/CNPJ e Endereço do Locatário se fornecidos
    if (cpfCnpj || enderecoJson) {
      const updateData: any = {};
      if (cpfCnpj) {
        updateData.cpfCnpj = cpfCnpj;
      }
      if (enderecoJson) {
        updateData.endereco = typeof enderecoJson === "string" ? enderecoJson : JSON.stringify(enderecoJson);
      }
      await prisma.locatario.update({
        where: { id: locatarioId },
        data: updateData
      });
    }

    // 2. Criar transação financeira
    const tx = await prisma.transacaoFinanceira.create({
      data: {
        descricao: descricao,
        valor: valor,
        tipo: "RECEITA",
        categoria: "ALUGUEL",
        status: "PENDENTE",
        dataVencimento: new Date(vencimentoStr),
        contratoId: contratoId || null
      }
    });

    console.log(`[criarAcordoManualAction] Transação criada com ID: ${tx.id}. Gerando BolePix...`);

    // 3. Emitir o BolePix no Banco Inter de forma síncrona
    const { gerarBolePixAction } = await import("@/lib/inter");
    const interRes = await gerarBolePixAction(tx.id);

    if (!interRes.success) {
      // Deletar a transação criada se falhar a emissão do Inter para evitar lixo no banco
      await prisma.transacaoFinanceira.delete({ where: { id: tx.id } });
      return { success: false, error: interRes.error || "Falha ao emitir boleto no Banco Inter." };
    }

    // Obter URL assinada para o PDF se nossoNumero estiver disponível
    let signedPdfUrl = "";
    if (interRes.nossoNumero) {
      try {
        signedPdfUrl = await getInterPdfUrlAction(`cobrancas/${interRes.nossoNumero}.pdf`);
      } catch (pdfErr) {
        console.error("Erro ao obter URL assinada para o PDF do acordo manual:", pdfErr);
      }
    }

    revalidatePath("/cobrancas");
    revalidatePath("/financeiro");
    revalidatePath("/juridico");

    return {
      success: true,
      transacaoId: tx.id,
      nossoNumero: interRes.nossoNumero,
      pixCopiaECola: interRes.pixCopiaECola,
      codigoBarras: interRes.codigoBarras,
      pdfUrl: signedPdfUrl || interRes.pdfUrl || ""
    };
  } catch (error: any) {
    console.error("Erro ao criar acordo manual:", error);
    return { success: false, error: error.message || "Erro inesperado ao criar acordo manual." };
  }
}

export async function getAgreementTransactionsAction() {
  try {
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: {
        interNossoNumero: {
          not: null
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        contrato: {
          select: {
            id: true,
            locatarios: {
              select: {
                nome: true,
                cpfCnpj: true
              }
            }
          }
        }
      }
    });
    return { success: true, transactions };
  } catch (error: any) {
    console.error("Erro ao obter transações de acordos:", error);
    return { success: false, error: error.message || "Erro ao obter acordos." };
  }
}


