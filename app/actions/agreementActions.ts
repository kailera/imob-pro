"use server"

import type { Prisma } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { requireUserContext } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  criarEstadoParaNovaEmissaoInter,
  criarMetadataNovaEmissaoInter,
} from "@/lib/inter-cobranca"

type AgreementInput = {
  descricao: string
  valor: number
  vencimento: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function isAgreement(description: string, metadata: unknown) {
  return asRecord(metadata).origin === "MANUAL_AGREEMENT"
    || /^acordo de/i.test(description.trim())
}

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function assertDueDateCanBeIssued(dueDate: string) {
  const today = todayInBrazil()
  if (dueDate < today) {
    throw new Error("Atualize o vencimento para hoje ou uma data futura antes de emitir.")
  }
  if (dueDate === today) {
    const time = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
    if (time > "19:59") {
      throw new Error("Após 19h59, o Inter exige vencimento a partir do dia seguinte.")
    }
  }
}

function validateAgreementInput(input: AgreementInput) {
  const descricao = input.descricao.trim()
  if (!descricao) throw new Error("Informe a descrição do acordo.")
  if (!Number.isFinite(input.valor) || input.valor < 2.5 || input.valor > 99_999_999.99) {
    throw new Error("O valor deve estar entre R$ 2,50 e R$ 99.999.999,99.")
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.vencimento)) {
    throw new Error("Informe uma data de vencimento válida.")
  }
  const vencimento = new Date(`${input.vencimento}T00:00:00.000Z`)
  if (Number.isNaN(vencimento.getTime()) || vencimento.toISOString().slice(0, 10) !== input.vencimento) {
    throw new Error("Informe uma data de vencimento válida.")
  }
  assertDueDateCanBeIssued(input.vencimento)
  return { descricao, vencimento }
}

async function getAuthorizedAgreement(transactionId: string) {
  const context = await requireUserContext()
  const transaction = await prisma.transacaoFinanceira.findFirst({
    where: {
      id: transactionId,
      OR: [
        { contrato: { imobId: context.tenantId } },
        { lease: { tenantId: context.tenantId } },
        { metadata: { path: ["imobId"], equals: context.tenantId } },
      ],
    },
  })
  if (!transaction || !isAgreement(transaction.descricao, transaction.metadata)) {
    throw new Error("Acordo não encontrado ou sem permissão de acesso.")
  }
  return transaction
}

function assertNotPaid(transaction: { status: string; interStatus: string | null }) {
  if (
    transaction.status === "LIQUIDADO"
    || transaction.interStatus === "RECEBIDO"
    || transaction.interStatus === "MARCADO_RECEBIDO"
  ) {
    throw new Error("Acordos já pagos não podem ser alterados, reemitidos ou excluídos.")
  }
}

function revalidateAgreementPaths(transaction: { contratoId: string | null; leaseId: string | null }) {
  revalidatePath("/juridico")
  revalidatePath("/cobrancas")
  revalidatePath("/financeiro")
  revalidatePath("/locacao")
  if (transaction.contratoId) {
    revalidatePath(`/locacao/view-locacao/${transaction.contratoId}`)
  }
  if (transaction.leaseId) {
    revalidatePath(`/locacao/view-locacao/${transaction.leaseId}`)
    revalidatePath(`/locacao/contratos/${transaction.leaseId}/editar`)
  }
}

export async function updateAgreementAction(transactionId: string, input: AgreementInput) {
  try {
    const validated = validateAgreementInput(input)
    const transaction = await getAuthorizedAgreement(transactionId)
    assertNotPaid(transaction)

    const hadInterRegistration = Boolean(
      transaction.interCodigoSolicitacao
      || transaction.interNossoNumero
      || transaction.interTxId
      || transaction.interBarcode,
    )
    const inactiveStatuses = new Set(["CANCELADO", "EXPIRADO", "FALHA_EMISSAO"])
    if (
      transaction.interCodigoSolicitacao
      && !inactiveStatuses.has(transaction.interStatus ?? "")
    ) {
      const { cancelarBolePixAction } = await import("@/lib/inter")
      const cancellation = await cancelarBolePixAction(transaction.id)
      if (!cancellation.success) {
        throw new Error(`Não foi possível cancelar o boleto anterior: ${cancellation.error ?? "erro desconhecido"}`)
      }
    } else if (
      transaction.interNossoNumero
      && !transaction.interCodigoSolicitacao
      && !inactiveStatuses.has(transaction.interStatus ?? "")
    ) {
      throw new Error("O boleto antigo não possui o identificador V3 necessário para cancelamento automático.")
    }

    let metadata: Prisma.InputJsonObject = {
      ...asRecord(transaction.metadata),
      origin: "MANUAL_AGREEMENT",
      agreementDescription: validated.descricao,
      updatedAt: new Date().toISOString(),
    } satisfies Prisma.InputJsonObject
    if (hadInterRegistration) {
      metadata = criarMetadataNovaEmissaoInter(metadata) as Prisma.InputJsonObject
    }

    await prisma.transacaoFinanceira.update({
      where: { id: transaction.id },
      data: {
        descricao: validated.descricao,
        valor: input.valor,
        dataVencimento: validated.vencimento,
        metadata,
        ...(hadInterRegistration ? criarEstadoParaNovaEmissaoInter() : { status: "PENDENTE" as const }),
      },
    })

    let warning: string | null = null
    if (hadInterRegistration) {
      const { gerarBolePixAction } = await import("@/lib/inter")
      const emission = await gerarBolePixAction(transaction.id)
      if (!emission.success) {
        warning = `As alterações foram salvas e o boleto anterior foi cancelado, mas a nova emissão falhou: ${emission.error ?? "erro desconhecido"}`
      }
    }

    revalidateAgreementPaths(transaction)
    return {
      success: true as const,
      message: hadInterRegistration && !warning
        ? "Acordo atualizado e boleto reemitido no Inter."
        : "Acordo atualizado.",
      warning,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível atualizar o acordo.",
    }
  }
}

export async function reissueAgreementAction(transactionId: string) {
  try {
    const transaction = await getAuthorizedAgreement(transactionId)
    assertNotPaid(transaction)
    assertDueDateCanBeIssued(transaction.dataVencimento.toISOString().slice(0, 10))
    const { reemitirBolePixAction } = await import("@/lib/inter")
    const result = await reemitirBolePixAction(transaction.id)
    if (!result.success) throw new Error(result.error ?? "Não foi possível reemitir o boleto.")
    revalidateAgreementPaths(transaction)
    return { success: true as const, message: "Boleto do acordo reemitido no Inter." }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível reemitir o boleto.",
    }
  }
}

export async function deleteAgreementAction(transactionId: string) {
  try {
    const transaction = await getAuthorizedAgreement(transactionId)
    assertNotPaid(transaction)
    const inactiveStatuses = new Set(["CANCELADO", "EXPIRADO", "FALHA_EMISSAO"])
    if (
      transaction.interCodigoSolicitacao
      && !inactiveStatuses.has(transaction.interStatus ?? "")
    ) {
      const { cancelarBolePixAction } = await import("@/lib/inter")
      const cancellation = await cancelarBolePixAction(transaction.id)
      if (!cancellation.success) {
        throw new Error(`Não foi possível cancelar o boleto no Inter: ${cancellation.error ?? "erro desconhecido"}`)
      }
    } else if (
      transaction.interNossoNumero
      && !transaction.interCodigoSolicitacao
      && !inactiveStatuses.has(transaction.interStatus ?? "")
    ) {
      throw new Error("O boleto antigo não possui o identificador V3 necessário para cancelamento automático.")
    }

    await prisma.transacaoFinanceira.delete({ where: { id: transaction.id } })
    revalidateAgreementPaths(transaction)
    return { success: true as const, message: "Acordo excluído." }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Não foi possível excluir o acordo.",
    }
  }
}
