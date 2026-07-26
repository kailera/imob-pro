// lib/auth.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function requireUserContext() {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
        throw new Error("Não autenticado");
    }

    const user = await prisma.users.findUnique({
        where: { id: userId },
        include: { imob: true }
    });

    if (!user) {
        throw new Error("Usuário não encontrado");
    }

    return { userId, tenantId: user.imobId, user };
}
