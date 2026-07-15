"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { LeadStatus, TipoImovel } from "@/generated/prisma";
import { sendMatchingImoveisEmail, MailProperty } from "@/lib/mail";

export async function createLead(data: {
  nome: string;
  telefone: string;
  email?: string | null;
  loteInfo?: string | null;
  valorSimulado?: number | null;
  origem?: string;
}) {
  try {
    const lead = await prisma.lead.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || null,
        loteInfo: data.loteInfo || null,
        valorSimulado: data.valorSimulado || null,
        origem: data.origem || "SITE",
        status: "NOVO",
      },
    });
    revalidatePath("/crm");
    return { success: true, lead };
  } catch (error) {
    console.error("Error creating lead:", error);
    return { success: false, error: "Erro ao salvar lead." };
  }
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/crm");
    return { success: true, lead };
  } catch (error) {
    console.error("Error updating lead status:", error);
    return { success: false, error: "Erro ao atualizar status." };
  }
}

export async function getLeads() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });
    return leads;
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
}

export async function createContrapropostaLeadAction(data: {
  nome?: string | null;
  email?: string | null;
  telefone: string;
  valor: string;
  imovelCodigo: string;
  imovelTitulo: string;
  imovelOperacao: "venda" | "locacao";
  descricaoBusca?: string | null;
}) {
  try {
    if (!data.telefone || !data.telefone.trim()) {
      return { success: false, error: "Telefone é obrigatório." };
    }
    if (!data.valor || !data.valor.trim()) {
      return { success: false, error: "Valor da proposta é obrigatório." };
    }

    const valorNumerico = parseFloat(data.valor.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return { success: false, error: "Valor da proposta inválido." };
    }

    const lead = await prisma.lead.create({
      data: {
        nome: data.nome?.trim() || "Interessado Anônimo",
        telefone: data.telefone.trim(),
        email: data.email?.trim() || null,
        loteInfo: `Contraproposta: Código ${data.imovelCodigo} - ${data.imovelTitulo}${data.descricaoBusca ? ` | Procura: ${data.descricaoBusca.trim()}` : ""}`,
        valorSimulado: valorNumerico,
        origem: "CONTRAPROPOSTA",
        status: "NOVO",
        interesseNegocio: data.imovelOperacao === "venda" ? "VENDA" : "LOCACAO",
      },
    });

    revalidatePath("/crm");
    return { success: true, lead };
  } catch (error: any) {
    console.error("Error creating contraproposta lead:", error);
    return { success: false, error: error.message || "Erro ao salvar contraproposta." };
  }
}

export async function updateLeadPreferencesAction(
  id: string,
  data: {
    interesseTipo?: TipoImovel | null;
    interesseNegocio?: string | null;
    interessePrecoMin?: number | null;
    interessePrecoMax?: number | null;
    interesseQuartos?: number | null;
    interesseBanheiros?: number | null;
    interesseVagas?: number | null;
    interesseBairros?: string | null;
    envioAutomatico?: boolean;
  }
) {
  try {
    const oldLead = await prisma.lead.findUnique({
      where: { id }
    });

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        interesseTipo: data.interesseTipo === undefined ? undefined : data.interesseTipo,
        interesseNegocio: data.interesseNegocio === undefined ? undefined : data.interesseNegocio,
        interessePrecoMin: data.interessePrecoMin === undefined ? undefined : data.interessePrecoMin,
        interessePrecoMax: data.interessePrecoMax === undefined ? undefined : data.interessePrecoMax,
        interesseQuartos: data.interesseQuartos === undefined ? undefined : data.interesseQuartos,
        interesseBanheiros: data.interesseBanheiros === undefined ? undefined : data.interesseBanheiros,
        interesseVagas: data.interesseVagas === undefined ? undefined : data.interesseVagas,
        interesseBairros: data.interesseBairros === undefined ? undefined : data.interesseBairros,
        envioAutomatico: data.envioAutomatico === undefined ? undefined : data.envioAutomatico,
      },
    });

    // Se o envio automático foi ativado agora ou se as preferências mudaram e o envio automático está ativo,
    // podemos disparar o match e envio de e-mail automático.
    if (lead.envioAutomatico && lead.email) {
      const shouldTriggerAuto = !oldLead?.envioAutomatico || 
        oldLead.interessePrecoMax !== lead.interessePrecoMax ||
        oldLead.interesseTipo !== lead.interesseTipo ||
        oldLead.interesseQuartos !== lead.interesseQuartos;

      if (shouldTriggerAuto) {
        // Disparar e-mail em background sem travar o retorno da Server Action
        triggerAutomaticEmailSend(lead.id).catch(console.error);
      }
    }

    revalidatePath("/crm");
    return { success: true, lead };
  } catch (error) {
    console.error("Error updating lead preferences:", error);
    return { success: false, error: "Erro ao atualizar preferências." };
  }
}

export async function getMatchingImoveisForLeadAction(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) return [];

    const where: any = {};

    // Mapeamento do tipo de negócio
    if (lead.interesseNegocio === "LOCACAO") {
      where.forLocacao = true;
      if (lead.interessePrecoMax || lead.interessePrecoMin) {
        where.valorAluguel = {
          ...(lead.interessePrecoMax && { lte: lead.interessePrecoMax * 100 }),
          ...(lead.interessePrecoMin && { gte: lead.interessePrecoMin * 100 }),
        };
      }
    } else if (lead.interesseNegocio === "VENDA") {
      where.forVenda = true;
      if (lead.interessePrecoMax || lead.interessePrecoMin) {
        where.valorVenda = {
          ...(lead.interessePrecoMax && { lte: lead.interessePrecoMax * 100 }),
          ...(lead.interessePrecoMin && { gte: lead.interessePrecoMin * 100 }),
        };
      }
    } else {
      // Ambos ou indefinido
      where.OR = [
        {
          forLocacao: true,
          ...((lead.interessePrecoMax || lead.interessePrecoMin) && {
            valorAluguel: {
              ...(lead.interessePrecoMax && { lte: lead.interessePrecoMax * 100 }),
              ...(lead.interessePrecoMin && { gte: lead.interessePrecoMin * 100 }),
            }
          })
        },
        {
          forVenda: true,
          ...((lead.interessePrecoMax || lead.interessePrecoMin) && {
            valorVenda: {
              ...(lead.interessePrecoMax && { lte: lead.interessePrecoMax * 100 }),
              ...(lead.interessePrecoMin && { gte: lead.interessePrecoMin * 100 }),
            }
          })
        }
      ];
    }

    // Tipo de imóvel
    if (lead.interesseTipo) {
      if (where.OR) {
        where.OR = where.OR.map((cond: any) => ({ ...cond, tipo: lead.interesseTipo }));
      } else {
        where.tipo = lead.interesseTipo;
      }
    }

    // Cômodos (Mínimo solicitado ou superior)
    if (lead.interesseQuartos && lead.interesseQuartos > 0) {
      if (where.OR) {
        where.OR = where.OR.map((cond: any) => ({ ...cond, quartos: { gte: lead.interesseQuartos } }));
      } else {
        where.quartos = { gte: lead.interesseQuartos };
      }
    }
    if (lead.interesseBanheiros && lead.interesseBanheiros > 0) {
      if (where.OR) {
        where.OR = where.OR.map((cond: any) => ({ ...cond, banheiros: { gte: lead.interesseBanheiros } }));
      } else {
        where.banheiros = { gte: lead.interesseBanheiros };
      }
    }
    if (lead.interesseVagas && lead.interesseVagas > 0) {
      if (where.OR) {
        where.OR = where.OR.map((cond: any) => ({ ...cond, vagas: { gte: lead.interesseVagas } }));
      } else {
        where.vagas = { gte: lead.interesseVagas };
      }
    }

    // Bairros
    if (lead.interesseBairros && lead.interesseBairros.trim()) {
      const bairrosList = lead.interesseBairros
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      if (bairrosList.length > 0) {
        if (where.OR) {
          where.OR = where.OR.map((cond: any) => ({
            ...cond,
            bairro: { in: bairrosList, mode: "insensitive" },
          }));
        } else {
          where.bairro = { in: bairrosList, mode: "insensitive" };
        }
      }
    }

    // Evitar lotes de teste
    const baseFilter = { NOT: { codigo: { startsWith: "LOTE-" } } };
    let finalWhere: any = {};

    if (where.OR) {
      finalWhere = {
        AND: [baseFilter, { OR: where.OR }]
      };
    } else {
      finalWhere = {
        AND: [baseFilter, where]
      };
    }

    const imoveis = await prisma.imovel.findMany({
      where: finalWhere,
      orderBy: { codigo: "desc" },
      take: 20,
    });

    return imoveis;
  } catch (error) {
    console.error("Error fetching matching imoveis:", error);
    return [];
  }
}

export async function sendManualMatchEmailAction(leadId: string, imoveisIds: string[]) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || !lead.email) {
      return { success: false, error: "Lead não encontrado ou e-mail inválido." };
    }

    const imoveis = await prisma.imovel.findMany({
      where: {
        id: { in: imoveisIds },
      },
    });

    if (imoveis.length === 0) {
      return { success: false, error: "Nenhum imóvel selecionado ou correspondente." };
    }

    const mailProperties: MailProperty[] = imoveis.map((im) => ({
      id: im.id,
      codigo: im.codigo,
      titulo: im.titulo || "Imóvel Selecionado",
      bairro: im.bairro,
      cidade: im.cidade,
      uf: im.uf,
      preco: im.forLocacao ? (im.valorAluguel || 0) : (im.valorVenda || 0),
      operation: im.forLocacao ? "locacao" : "venda",
      quartos: im.quartos || 0,
      banheiros: im.banheiros || 0,
      vagas: im.vagas || 0,
      area: im.area || 0,
      imagem: im.imagens?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    }));

    await sendMatchingImoveisEmail(lead.email, lead.nome, mailProperties);

    return { success: true };
  } catch (error: any) {
    console.error("Error sending manual match email:", error);
    return { success: false, error: error.message || "Erro ao enviar e-mail." };
  }
}

// Helper interno para disparo automático
async function triggerAutomaticEmailSend(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) return;

    // Verificar se já foi enviado hoje para evitar spam
    if (lead.ultimoEnvioAuto) {
      const diffMs = Date.now() - new Date(lead.ultimoEnvioAuto).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 24) {
        console.log(`Envio automático ignorado para o lead ${lead.id} para evitar spam (último envio há ${diffHours.toFixed(1)}h).`);
        return;
      }
    }

    const matchingImoveis = await getMatchingImoveisForLeadAction(leadId);
    if (matchingImoveis.length === 0) return;

    const mailProperties: MailProperty[] = matchingImoveis.slice(0, 3).map((im) => ({
      id: im.id,
      codigo: im.codigo,
      titulo: im.titulo || "Imóvel Sugerido",
      bairro: im.bairro,
      cidade: im.cidade,
      uf: im.uf,
      preco: im.forLocacao ? (im.valorAluguel || 0) : (im.valorVenda || 0),
      operation: im.forLocacao ? "locacao" : "venda",
      quartos: im.quartos || 0,
      banheiros: im.banheiros || 0,
      vagas: im.vagas || 0,
      area: im.area || 0,
      imagem: im.imagens?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    }));

    await sendMatchingImoveisEmail(lead.email, lead.nome, mailProperties);

    // Atualizar a data do último envio
    await prisma.lead.update({
      where: { id: leadId },
      data: { ultimoEnvioAuto: new Date() },
    });

    console.log(`E-mail automático enviado com sucesso para ${lead.email} com ${mailProperties.length} imóveis.`);
  } catch (error) {
    console.error("Erro no envio de e-mail automático:", error);
  }
}

