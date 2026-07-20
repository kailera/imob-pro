"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/nextjs/server";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});


async function getActiveImobId() {
  const { orgId } = await auth();

  if (orgId) {
    // Busca pela organização vinculada do Clerk
    const imob = await prisma.imob.findUnique({
      where: { orgId: orgId },
    });
    if (!imob) {
      revalidatePath('/sign-up')
      return
    }

    return imob.id;

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

export async function createNewUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string; // Senha temporária
  role: "ADMIN" | "OPERADOR" | "CORRETOR";
  orgId: string; // ID da organização Clerk ativa
}) {
  try {
    // 1. Criar o Usuário no Clerk
    const clerkUser = await createUserInClerk(input);
    if (!clerkUser.success) {
      return { success: false, error: clerkUser.error };
    }
    const { user } = clerkUser;

    console.log(`usuario clerk:  ${user}, dados: ${input.orgId}`);
    // 4. Salvar localmente no Banco via Prisma (JIT/Garantia de Sincronismo)
    const imob = await prisma.imob.findUnique({
      where: { orgId: input.orgId }
    });

    if (!imob) throw new Error("Imobiliária (Imob) não encontrada para essa organização.");

    const dbUser = await prisma.users.create({
      data: {
        id: user?.id!, // Mesmo ID do Clerk
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        imobId: imob.id,
      }
    });

    return { success: true, user: dbUser };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return { success: false, error: error.message };
  }
}

export async function inviteNewUser(input: {
  email: string;
  orgId: string;
  role: "ADMIN" | "OPERADOR" | "CORRETOR";
}) {
  try {
    const clerkRole = input.role === "ADMIN" ? "admin" : "member";

    // Envia um convite vinculado à Organização da Imobiliária
    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: input.orgId,
      emailAddress: input.email,
      role: clerkRole,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
    });

    // Nota: O usuário só é criado no banco local quando aceitar o convite
    // (através do webhook 'organizationMembership.created' que já temos)

    return { success: true, invitation };
  } catch (error: any) {
    console.error("Erro ao convidar usuário:", error);
    return { success: false, error: error.message };
  }
}


export async function getUsers() {
  const { orgId } = await auth();

  if (!orgId) {
    return { success: false, error: "Organização não encontrada." };
  }



  const users = await prisma.users.findMany({
    where: {
      imob: {
        orgId: orgId
      }
    },
  });

  return { success: true, users };
}

// funcoes daqui mesmo


async function createUserInClerk(input: {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: "ADMIN" | "OPERADOR" | "CORRETOR";
  orgId: string; // ID da organização Clerk ativa
}) {
  try {
    // Se não for informada uma senha, gera uma senha temporária aleatória mais robusta
    const defaultPassword = input.password || `Imob@${Math.random().toString(36).substring(2, 10)}${Math.floor(Math.random() * 100)}`;

    // 1. Criar o Usuário no Clerk
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [input.email],
      firstName: input.firstName,
      lastName: input.lastName,
      password: defaultPassword,
    });

    // 2. Mapear a role do Imob Pro para a role correspondente no Clerk
    const clerkRole = input.role === "ADMIN" ? "org:admin" : "org:member";

    // 3. Vincular o usuário à organização no Clerk
    await clerkClient.organizations.createOrganizationMembership({
      organizationId: input.orgId,
      userId: clerkUser.id,
      role: clerkRole,
    });
    return { success: true, user: clerkUser };
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return { success: false, error: error.message };
  }
}