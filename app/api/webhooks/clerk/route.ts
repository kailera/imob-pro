import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { UsersRole } from "@/generated/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Segredo do webhook CLERK_WEBHOOK_SECRET não configurado.");
    return new Response("Segredo do webhook não configurado.", { status: 500 });
  }

  // Obter cabeçalhos
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Se não houver cabeçalhos svix, retornar erro
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Erro: Cabeçalhos Svix não encontrados", {
      status: 400,
    });
  }

  // Obter o body do request
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Instanciar svix com o segredo
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Validar assinatura
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Erro ao verificar webhook:", err);
    return new Response("Erro ao verificar webhook", {
      status: 400,
    });
  }

  const { type } = evt;

  try {
    // 1. Manipular criação de organização
    if (type === "organization.created") {
      const { id: orgId } = evt.data;
      
      // Criar a Imob local correspondente à organização do Clerk
      await prisma.imob.upsert({
        where: { orgId: orgId },
        update: {},
        create: {
          orgId: orgId,
        },
      });
      
      console.log(`Organização/Imob criada com sucesso: ${orgId}`);
    }

    // 2. Manipular entrada de membro na organização
    if (type === "organizationMembership.created") {
      const { organization, public_user_data, role } = evt.data;
      const orgId = organization.id;
      const userId = public_user_data.user_id;

      // Garantir que a Imob exista
      const imobObj = await prisma.imob.upsert({
        where: { orgId: orgId },
        update: {},
        create: {
          orgId: orgId,
        },
      });

      // Mapear role do Clerk para UsersRole do Prisma
      let dbRole: UsersRole = UsersRole.OPERADOR;
      if (role === "org:admin" || role === "admin") {
        dbRole = UsersRole.ADMIN;
      } else if (role === "org:corretor" || role === "corretor") {
        dbRole = UsersRole.CORRETOR;
      }

      const email = public_user_data.identifier || "";

      await prisma.users.upsert({
        where: { id: userId },
        update: {
          role: dbRole,
          imobId: imobObj.id,
          email: email,
          firstName: public_user_data.first_name || "",
          lastName: public_user_data.last_name || "",
          ativo: true, // Reativa o usuário caso estivesse inativo
        },
        create: {
          id: userId,
          email: email,
          firstName: public_user_data.first_name || "",
          lastName: public_user_data.last_name || "",
          role: dbRole,
          imobId: imobObj.id,
          ativo: true,
        },
      });

      console.log(`Usuário ${userId} sincronizado e associado à Imob ${imobObj.id} com a role ${dbRole}`);
    }

    // 3. Manipular alteração de papel/role de membro na organização
    if (type === "organizationMembership.updated") {
      const { public_user_data, role } = evt.data;
      const userId = public_user_data.user_id;

      let dbRole: UsersRole = UsersRole.OPERADOR;
      if (role === "org:admin" || role === "admin") {
        dbRole = UsersRole.ADMIN;
      } else if (role === "org:corretor" || role === "corretor") {
        dbRole = UsersRole.CORRETOR;
      }

      await prisma.users.updateMany({
        where: { id: userId },
        data: {
          role: dbRole,
          ativo: true, // Garante que esteja ativo ao atualizar papel
        },
      });

      console.log(`Papel/role do usuário ${userId} atualizado no banco para ${dbRole}`);
    }

    // 4. Manipular remoção de membro da organização (Soft Delete)
    if (type === "organizationMembership.deleted") {
      const { public_user_data } = evt.data;
      const userId = public_user_data.user_id;

      await prisma.users.updateMany({
        where: { id: userId },
        data: {
          ativo: false,
        },
      });
      console.log(`Usuário ${userId} inativado (soft delete) no banco de dados local.`);
    }

    // 5. Sincronizar atualizações cadastrais do perfil (user.updated)
    if (type === "user.updated") {
      const { id, first_name, last_name, email_addresses, primary_email_address_id } = evt.data;
      const primaryEmailObj = email_addresses?.find((e: any) => e.id === primary_email_address_id);
      const email = primaryEmailObj?.email_address || email_addresses?.[0]?.email_address || "";

      await prisma.users.updateMany({
        where: { id: id },
        data: {
          firstName: first_name || "",
          lastName: last_name || "",
          email: email,
        },
      });
      console.log(`Cadastro do usuário ${id} sincronizado com banco local (user.updated).`);
    }

    return new Response("Webhook processado com sucesso", { status: 200 });
  } catch (dbError) {
    console.error("Erro ao sincronizar dados com o banco:", dbError);
    return new Response("Erro interno do servidor ao gravar dados", { status: 500 });
  }
}
