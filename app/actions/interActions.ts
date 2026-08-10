"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { requireUserContext } from "@/lib/auth";

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

export async function reemitirBolePixWrapperAction(transacaoId: string) {
  const { reemitirBolePixAction } = await import("@/lib/inter");
  const result = await reemitirBolePixAction(transacaoId);
  revalidatePath("/cobrancas");
  revalidatePath("/financeiro");
  revalidatePath("/locacao");
  return result;
}

export async function cancelarBolePixWrapperAction(transacaoId: string) {
  const { cancelarBolePixAction } = await import("@/lib/inter");
  const result = await cancelarBolePixAction(transacaoId);
  revalidatePath("/cobrancas");
  revalidatePath("/financeiro");
  revalidatePath("/locacao");
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
    const context = await requireUserContext();
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

    const documents = Array.from(new Set(locatarios
      .map(locatario => locatario.cpfCnpj?.replace(/\D/g, ""))
      .filter((document): document is string => document.length === 11 || document.length === 14)));
    const people = documents.length > 0
      ? await prisma.person.findMany({
          where: {
            imobId: context.tenantId,
            type: "LOCATARIO",
          },
          select: {
            cpfCnpj: true,
            email: true,
            addresses: {
              take: 1,
              select: {
                cep: true,
                logradouro: true,
                numero: true,
                complemento: true,
                bairro: true,
                municipio: true,
                estado: true,
              },
            },
          },
        })
      : [];
    const peopleByDocument = new Map(people.map(person => [
      person.cpfCnpj.replace(/\D/g, ""),
      person,
    ]));

    const enrichedLocatarios = locatarios.map(locatario => {
      const person = peopleByDocument.get(locatario.cpfCnpj.replace(/\D/g, ""));
      const personAddress = person?.addresses[0];
      let legacyAddress: Record<string, unknown> = {};
      if (locatario.endereco) {
        if (typeof locatario.endereco === "string") {
          try {
            const parsed = JSON.parse(locatario.endereco);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              legacyAddress = parsed as Record<string, unknown>;
            }
          } catch {
            legacyAddress = { logradouro: locatario.endereco };
          }
        } else if (typeof locatario.endereco === "object" && !Array.isArray(locatario.endereco)) {
          legacyAddress = locatario.endereco as Record<string, unknown>;
        }
      }

      const fallbackAddress = personAddress ? {
        cep: personAddress.cep,
        logradouro: personAddress.logradouro,
        numero: personAddress.numero,
        complemento: personAddress.complemento ?? "",
        bairro: personAddress.bairro,
        municipio: personAddress.municipio,
        estado: personAddress.estado,
      } : {};
      const cleanLegacyAddress = Object.fromEntries(
        Object.entries(legacyAddress)
          .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ""),
      );
      const mergedAddress = Object.fromEntries(
        Object.entries({ ...fallbackAddress, ...cleanLegacyAddress })
          .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== ""),
      );

      return {
        ...locatario,
        cpfCnpj: locatario.cpfCnpj || person?.cpfCnpj || "",
        email: locatario.email || person?.email || "",
        endereco: Object.keys(mergedAddress).length > 0 ? mergedAddress : null,
        enderecoOrigem: Object.keys(cleanLegacyAddress).length > 0
          ? "CADASTRO_LEGADO"
          : personAddress ? "CADASTRO_PESSOA" : null,
      };
    });

    return { success: true, locatarios: enrichedLocatarios };
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
    const context = await requireUserContext();
    const { locatarioId, contratoId, descricao, valor, vencimentoStr, cpfCnpj, enderecoJson } = input;

    if (contratoId) {
      const authorizedContract = await prisma.contratoImovelLocacao.findFirst({
        where: { id: contratoId, imobId: context.tenantId },
        select: { id: true },
      });
      if (!authorizedContract) {
        return { success: false, error: "Contrato não encontrado ou sem permissão de acesso." };
      }
    }

    if (!descricao || descricao.trim() === "") {
      return { success: false, error: "A descrição é obrigatória." };
    }
    if (!Number.isFinite(valor) || valor < 2.5 || valor > 99_999_999.99) {
      return { success: false, error: "O valor do boleto deve estar entre R$ 2,50 e R$ 99.999.999,99." };
    }
    if (!vencimentoStr) {
      return { success: false, error: "A data de vencimento é obrigatória." };
    }

    const hojeBrasil = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimentoStr) || vencimentoStr < hojeBrasil) {
      return { success: false, error: "O vencimento deve ser hoje ou uma data futura." };
    }
    if (vencimentoStr === hojeBrasil) {
      const partesHora = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const hora = Number(partesHora.find(part => part.type === "hour")?.value ?? 0);
      const minuto = Number(partesHora.find(part => part.type === "minute")?.value ?? 0);
      if (hora > 19 || (hora === 19 && minuto > 59)) {
        return { success: false, error: "Após 19h59, o Inter exige vencimento a partir do dia seguinte." };
      }
    }

    const cpfCnpjLimpo = (cpfCnpj ?? "").replace(/\D/g, "");
    if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
      return { success: false, error: "Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos." };
    }
    const endereco = enderecoJson && typeof enderecoJson === "object" ? enderecoJson : {};
    const cepLimpo = String(endereco.cep ?? "").replace(/\D/g, "");
    const ufNormalizada = String(endereco.uf ?? endereco.estado ?? "").trim().toUpperCase();
    if (!String(endereco.logradouro ?? "").trim()
      || !String(endereco.numero ?? "").trim()
      || !String(endereco.bairro ?? "").trim()
      || !String(endereco.cidade ?? endereco.municipio ?? "").trim()
      || !/^[A-Z]{2}$/.test(ufNormalizada)
      || cepLimpo.length !== 8) {
      return { success: false, error: "Complete logradouro, número, bairro, cidade, UF e CEP do pagador." };
    }

    // 1. Atualizar CPF/CNPJ e Endereço do Locatário se fornecidos
    if (cpfCnpj || enderecoJson) {
      const updateData: any = {};
      if (cpfCnpj) {
        updateData.cpfCnpj = cpfCnpjLimpo;
      }
      if (enderecoJson) {
        updateData.endereco = JSON.stringify({
          ...endereco,
          cidade: String(endereco.cidade ?? endereco.municipio ?? "").trim(),
          uf: ufNormalizada,
          cep: cepLimpo,
        });
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
        metadata: {
          origin: "MANUAL_AGREEMENT",
          agreementDescription: descricao.trim(),
          locatarioId,
          imobId: context.tenantId,
        },
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
    if (contratoId) {
      revalidatePath(`/locacao/view-locacao/${contratoId}`);
      revalidatePath(`/locacao/contratos/${contratoId}/editar`);
    }

    return {
      success: true,
      processing: interRes.processing ?? false,
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
    const context = await requireUserContext();
    const transactions = await prisma.transacaoFinanceira.findMany({
      where: {
        AND: [
          {
            OR: [
              { metadata: { path: ["origin"], equals: "MANUAL_AGREEMENT" } },
              { descricao: { startsWith: "Acordo de" }, interCodigoSolicitacao: { not: null } },
            ],
          },
          {
            OR: [
              { contrato: { imobId: context.tenantId } },
              { lease: { tenantId: context.tenantId } },
              { metadata: { path: ["imobId"], equals: context.tenantId } },
            ],
          },
        ],
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
