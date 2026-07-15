"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

async function getActiveImobId() {
  const { orgId } = await auth();
  
  if (orgId) {
    // Busca pela organização vinculada do Clerk
    const imob = await prisma.imob.findUnique({
      where: { orgId: orgId },
    });
    if (imob) return imob.id;
    
    // Se não existir localmente ainda, cria
    const newImob = await prisma.imob.create({
      data: { orgId: orgId },
    });
    return newImob.id;
  }
  
  // Fallback para desenvolvimento sem orgId configurado
  const defaultImob = await prisma.imob.findFirst();
  if (defaultImob) return defaultImob.id;
  
  const created = await prisma.imob.create({
    data: { orgId: "org_default" },
  });
  return created.id;
}

export async function getImobConfigAction() {
  try {
    const imobId = await getActiveImobId();
    const imob = await prisma.imob.findUnique({
      where: { id: imobId },
    });
    return { success: true, imob };
  } catch (error: any) {
    console.error("Erro ao obter perfil da imobiliária:", error);
    return { success: false, error: error.message || "Erro ao carregar dados do perfil." };
  }
}

export async function saveImobConfigAction(prevState: any, formData: FormData) {
  try {
    const { orgRole } = await auth();
    // Em produção/autenticado, exige ser admin
    if (orgRole && orgRole !== "org:admin") {
      return { success: false, error: "Apenas corretores/administradores podem editar o perfil da imobiliária." };
    }

    const imobId = await getActiveImobId();

    const razaoSocial = formData.get("razaoSocial") as string;
    const nomeFantasia = formData.get("nomeFantasia") as string;
    const cnpj = formData.get("cnpj") as string;
    const creci = formData.get("creci") as string;
    const telefone = formData.get("telefone") as string;
    const emailContato = formData.get("emailContato") as string;
    
    // Endereço
    const cep = formData.get("cep") as string;
    const logradouro = formData.get("logradouro") as string;
    const numero = formData.get("numero") as string;
    const complemento = formData.get("complemento") as string;
    const bairro = formData.get("bairro") as string;
    const cidade = formData.get("cidade") as string;
    const uf = formData.get("uf") as string;

    await prisma.imob.update({
      where: { id: imobId },
      data: {
        razaoSocial,
        nomeFantasia,
        cnpj,
        creci,
        telefone,
        emailContato,
        cep,
        logradouro,
        numero: numero || null,
        complemento: complemento || null,
        bairro,
        cidade,
        uf,
      },
    });

    revalidatePath("/configuracoes");
    return { success: true, message: "Perfil da imobiliária salvo com sucesso!" };
  } catch (error: any) {
    console.error("Erro ao salvar perfil da imobiliária:", error);
    return { success: false, error: error.message || "Erro ao salvar as configurações." };
  }
}
