"use server";

import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getLegacyContractDeletionInfo,
  hasLegacyDocument,
} from "@/lib/locacao/legacy-contract-deletion";

export async function deleteLegacyContrato(contratoId: string) {
  try {
    const id = contratoId.trim();
    if (!id) {
      return { success: false as const, message: "Contrato inválido." };
    }

    const context = await requireUserContext();
    const contrato = await prisma.contratoImovelLocacao.findFirst({
      where: { id, imobId: context.tenantId },
      select: {
        id: true,
        imovelLocacaoId: true,
        documentoUrl: true,
        _count: {
          select: { transacaoFinanceiras: true, manutencoes: true },
        },
        locatarios: {
          select: {
            documentoUrl: true,
            _count: { select: { vistorias: true, acessosVistoria: true } },
          },
        },
        fiadors: { select: { documentoUrl: true } },
      },
    });

    if (!contrato) {
      return {
        success: false as const,
        message: "Contrato legado não encontrado ou sem permissão de acesso.",
      };
    }

    const deletionInfo = getLegacyContractDeletionInfo({
      transactions: contrato._count.transacaoFinanceiras,
      maintenances: contrato._count.manutencoes,
      inspectionLinks: contrato.locatarios.reduce(
        (total, tenant) =>
          total + tenant._count.vistorias + tenant._count.acessosVistoria,
        0,
      ),
      documents:
        Number(hasLegacyDocument(contrato.documentoUrl)) +
        contrato.locatarios.filter((tenant) =>
          hasLegacyDocument(tenant.documentoUrl),
        ).length +
        contrato.fiadors.filter((guarantor) =>
          hasLegacyDocument(guarantor.documentoUrl),
        ).length,
    });

    if (!deletionInfo.canDelete) {
      return {
        success: false as const,
        message: deletionInfo.blockedReason ?? "Este contrato não pode ser excluído.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // As cobranças são histórico financeiro: elas permanecem no sistema,
      // mas deixam de apontar para o contrato removido.
      await tx.transacaoFinanceira.updateMany({
        where: { contratoId: contrato.id },
        data: { contratoId: null },
      });

      if (contrato.imovelLocacaoId) {
        const siblingContracts = await tx.contratoImovelLocacao.count({
          where: {
            imovelLocacaoId: contrato.imovelLocacaoId,
            id: { not: contrato.id },
          },
        });
        if (siblingContracts === 0) {
          // Remove também a ficha locatícia exclusiva e seus períodos, para
          // não deixar dados órfãos capazes de reaparecer em outras telas.
          await tx.imovelLocacao.delete({
            where: { id: contrato.imovelLocacaoId },
          });
          return;
        }
      }

      await tx.contratoImovelLocacao.delete({ where: { id: contrato.id } });
    });

    revalidatePath("/locacao");
    revalidatePath("/locacao/inativos");
    revalidatePath(`/locacao/view-locacao/${contrato.id}`);

    const preserved = deletionInfo.transactions > 0
      ? ` ${deletionInfo.transactions} cobrança(s) existente(s) foram preservadas no financeiro.`
      : "";
    return {
      success: true as const,
      message: `Contrato legado excluído permanentemente.${preserved}`,
    };
  } catch (error) {
    console.error("Erro ao excluir contrato legado:", error);
    return {
      success: false as const,
      message: error instanceof Error
        ? error.message
        : "Não foi possível excluir o contrato legado.",
    };
  }
}
