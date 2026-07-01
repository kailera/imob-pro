"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { LeadStatus } from "@/generated/prisma";

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
