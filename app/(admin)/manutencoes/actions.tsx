"use server";

import { CreateBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bucketName, s3Client } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma";
import type {
  ActionResult,
  ContratoManutencaoOption,
  DocumentoManutencaoInput,
  ManutencaoInput,
  ManutencaoView,
  PrestadorManutencaoOption,
} from "./types";

const COMPETENCIA_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

async function getActiveImobId(): Promise<string> {
  const context = await requireUserContext();
  return context.tenantId;
}

function asErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function buildAddress(imovel: {
  logradouro: string | null;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
}) {
  const street = imovel.logradouro?.trim();
  const firstPart = street ? `${street}, ${imovel.numero}` : `Nº ${imovel.numero}`;
  return `${firstPart} — ${imovel.bairro}, ${imovel.cidade}/${imovel.uf}`;
}

function toDateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function getContractSituation(dataInicio?: Date | null, dataFim?: Date | null) {
  if (!dataInicio || !dataFim) return "SEM_VIGENCIA" as const;
  const now = new Date();
  if (now < dataInicio) return "FUTURO" as const;
  if (now > dataFim) return "ENCERRADO" as const;
  return "ATIVO" as const;
}

const manutencaoInclude = {
  imovel: true,
  contrato: {
    include: {
      locatarios: { orderBy: { nome: "asc" as const }, take: 1 },
      imovelLocacao: { include: { locadors: { orderBy: { nome: "asc" as const }, take: 1 } } },
    },
  },
  lease: {
    include: {
      parties: {
        where: { role: { in: ["TENANT" as const, "CO_TENANT" as const, "LANDLORD" as const] } },
        include: { person: true },
        orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
      },
    },
  },
  prestador: true,
  documentos: { orderBy: { createdAt: "asc" as const } },
  descontos: { orderBy: { competencia: "asc" as const } },
} satisfies Prisma.ManutencaoInclude;

type ManutencaoWithRelations = Prisma.ManutencaoGetPayload<{
  include: typeof manutencaoInclude;
}>;

function serializeManutencao(item: ManutencaoWithRelations): ManutencaoView {
  const locacao = item.contrato?.imovelLocacao;
  const tenant = item.lease?.parties.find((party) =>
    party.role === "TENANT" || party.role === "CO_TENANT"
  );
  const landlord = item.lease?.parties.find((party) => party.role === "LANDLORD");
  return {
    id: item.id,
    contratoId: item.leaseId || item.contratoId || "",
    imovelId: item.imovelId,
    prestadorId: item.prestadorId,
    descricao: item.descricao,
    dataManutencao: toDateInput(item.dataManutencao) || "",
    valor: Number(item.valor),
    status: item.status,
    repassarProprietario: item.repassarProprietario,
    createdAt: item.createdAt.toISOString(),
    imovel: {
      codigo: item.imovel.codigo,
      titulo: item.imovel.titulo,
      endereco: buildAddress(item.imovel),
    },
    locatario: tenant?.person.name || item.contrato?.locatarios[0]?.nome || "Não informado",
    locador: landlord?.person.name || locacao?.locadors[0]?.nome || "Não informado",
    prestador: item.prestador
      ? { id: item.prestador.id, nome: item.prestador.nome, area: item.prestador.area }
      : null,
    documentos: item.documentos.map((documento) => ({
      id: documento.id,
      nomeOriginal: documento.nomeOriginal,
      url: documento.url,
      storageKey: documento.storageKey,
      mimeType: documento.mimeType,
      tamanhoBytes: documento.tamanhoBytes,
    })),
    descontos: item.descontos.map((desconto) => ({
      id: desconto.id,
      competencia: desconto.competencia,
      valor: Number(desconto.valor),
      status: desconto.status,
      repasseId: desconto.repasseId,
    })),
  };
}

export async function getManutencoes(): Promise<ActionResult<ManutencaoView[]>> {
  try {
    const imobId = await getActiveImobId();
    const items = await prisma.manutencao.findMany({
      where: { imobId },
      include: manutencaoInclude,
      orderBy: [{ dataManutencao: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, data: items.map(serializeManutencao) };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao carregar manutenções.") };
  }
}

export async function getManutencaoFormOptions(): Promise<
  ActionResult<{ contratos: ContratoManutencaoOption[]; prestadores: PrestadorManutencaoOption[] }>
> {
  try {
    const imobId = await getActiveImobId();
    const [leases, contratos, prestadores] = await Promise.all([
      prisma.lease.findMany({
        where: { tenantId: imobId, status: "ACTIVE", propertyId: { not: null } },
        include: {
          property: true,
          terms: true,
          parties: {
            where: { role: { in: ["TENANT", "CO_TENANT", "LANDLORD"] } },
            include: { person: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.contratoImovelLocacao.findMany({
        where: { imobId },
        include: {
          imovel: true,
          locatarios: { orderBy: { nome: "asc" }, take: 1 },
          imovelLocacao: {
            include: { locadors: { orderBy: { nome: "asc" }, take: 1 } },
          },
        },
        orderBy: { id: "desc" },
        take: 300,
      }),
      prisma.prestadorServico.findMany({
        where: { imobId, ativo: true },
        orderBy: [{ nome: "asc" }, { area: "asc" }],
        select: { id: true, nome: true, area: true },
      }),
    ]);
    const legacyContractIds = new Set(contratos.map((contrato) => contrato.id));

    return {
      success: true,
      data: {
        contratos: [
          ...contratos.map((contrato) => ({
            id: contrato.id,
            imovelId: contrato.imovelId,
            codigoImovel: contrato.imovel.codigo,
            tituloImovel: contrato.imovel.titulo,
            endereco: buildAddress(contrato.imovel),
            locatario: contrato.locatarios[0]?.nome || "Não informado",
            locador: contrato.imovelLocacao?.locadors[0]?.nome || "Não informado",
            dataInicio: toDateInput(contrato.imovelLocacao?.dataInicio),
            dataFim: toDateInput(contrato.imovelLocacao?.dataFim),
            valorAluguel: contrato.imovelLocacao?.valorAluguel ?? null,
            situacao: getContractSituation(
              contrato.imovelLocacao?.dataInicio,
              contrato.imovelLocacao?.dataFim,
            ),
          })),
          ...leases.flatMap((lease) => {
            // Se o espelho legado existe, mantemos a opção antiga para não
            // duplicar o contrato e preservar a edição das manutenções atuais.
            if (lease.legacyCode && legacyContractIds.has(lease.legacyCode)) {
              return [];
            }
            if (!lease.property) return [];

            const tenant = lease.parties.find((party) =>
              party.role === "TENANT" || party.role === "CO_TENANT"
            );
            const landlord = lease.parties.find((party) => party.role === "LANDLORD");
            return [{
              id: lease.id,
              imovelId: lease.property.id,
              codigoImovel: lease.property.codigo,
              tituloImovel: lease.property.titulo,
              endereco: buildAddress(lease.property),
              locatario: tenant?.person.name || "Não informado",
              locador: landlord?.person.name || "Não informado",
              dataInicio: toDateInput(lease.startDate),
              dataFim: toDateInput(lease.endDate),
              valorAluguel: lease.terms ? Number(lease.terms.rentValue) : null,
              situacao: "ATIVO" as const,
            }];
          }),
        ],
        prestadores,
      },
    };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao carregar dados do formulário.") };
  }
}

function validateInput(input: ManutencaoInput) {
  if (!input.contratoId) return "Selecione um contrato.";
  if (!input.descricao.trim()) return "Descreva a manutenção.";
  if (!input.dataManutencao || Number.isNaN(new Date(`${input.dataManutencao}T12:00:00`).getTime())) {
    return "Informe uma data válida.";
  }
  if (!Number.isFinite(input.valor) || input.valor <= 0) return "Informe um valor maior que zero.";

  const discounts = input.status === "FINALIZADA" && input.repassarProprietario
    ? input.descontos
    : [];
  const competences = new Set<string>();
  let total = 0;
  for (const desconto of discounts) {
    if (!COMPETENCIA_PATTERN.test(desconto.competencia)) return "Informe competências válidas para os descontos.";
    if (competences.has(desconto.competencia)) return "Cada competência pode aparecer somente uma vez.";
    if (!Number.isFinite(desconto.valor) || desconto.valor <= 0) return "Cada desconto deve ser maior que zero.";
    competences.add(desconto.competencia);
    total += desconto.valor;
  }
  if (input.repassarProprietario && input.status === "FINALIZADA" && discounts.length === 0) {
    return "Adicione ao menos uma competência para o desconto.";
  }
  if (total > input.valor + 0.001) return "Os descontos não podem superar o valor da manutenção.";
  return null;
}

export async function createOrUpdateManutencoes(
  input: ManutencaoInput,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const imobId = await getActiveImobId();
    const validationError = validateInput(input);
    if (validationError) return { success: false, error: validationError };

    const [lease, contrato] = await Promise.all([
      prisma.lease.findFirst({
        where: { id: input.contratoId, tenantId: imobId, status: "ACTIVE" },
        select: { id: true, propertyId: true },
      }),
      prisma.contratoImovelLocacao.findFirst({
        where: { id: input.contratoId, imobId },
        select: { id: true, imovelId: true },
      }),
    ]);
    if (!lease && !contrato) {
      return { success: false, error: "Contrato não encontrado nesta imobiliária." };
    }
    if (lease && !lease.propertyId) {
      return { success: false, error: "O contrato selecionado não possui imóvel vinculado." };
    }

    const selectedContract = lease
      ? { contratoId: null, leaseId: lease.id, imovelId: lease.propertyId! }
      : { contratoId: contrato!.id, leaseId: null, imovelId: contrato!.imovelId };

    if (input.prestadorId) {
      const prestador = await prisma.prestadorServico.findFirst({
        where: { id: input.prestadorId, imobId, ativo: true },
        select: { id: true },
      });
      if (!prestador) return { success: false, error: "Prestador inválido ou inativo." };
    }

    const shouldDiscount = input.status === "FINALIZADA" && input.repassarProprietario;
    const data = {
      ...selectedContract,
      imobId,
      prestadorId: input.prestadorId || null,
      descricao: input.descricao.trim(),
      dataManutencao: new Date(`${input.dataManutencao}T12:00:00`),
      valor: input.valor,
      status: input.status,
      repassarProprietario: shouldDiscount,
    };

    const savedId = await prisma.$transaction(async (tx) => {
      if (id) {
        const current = await tx.manutencao.findFirst({
          where: { id, imobId },
          include: { descontos: { where: { status: "APLICADO" }, select: { id: true } } },
        });
        if (!current) throw new Error("Manutenção não encontrada.");
        if (current.descontos.length > 0) {
          throw new Error("Esta manutenção possui desconto já aplicado e não pode ser alterada.");
        }

        await tx.documentoManutencao.deleteMany({ where: { manutencaoId: id } });
        await tx.descontoManutencao.deleteMany({ where: { manutencaoId: id } });
        await tx.manutencao.update({
          where: { id },
          data: {
            ...data,
            documentos: { create: input.documentos },
            descontos: { create: shouldDiscount ? input.descontos : [] },
          },
        });
        return id;
      }

      const created = await tx.manutencao.create({
        data: {
          ...data,
          documentos: { create: input.documentos },
          descontos: { create: shouldDiscount ? input.descontos : [] },
        },
        select: { id: true },
      });
      return created.id;
    });

    revalidatePath("/manutencoes");
    revalidatePath("/pagamentos");
    return { success: true, data: { id: savedId } };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao salvar manutenção.") };
  }
}

export async function getOneManutencao(id: string): Promise<ActionResult<ManutencaoView>> {
  try {
    const imobId = await getActiveImobId();
    const item = await prisma.manutencao.findFirst({
      where: { id, imobId },
      include: manutencaoInclude,
    });
    if (!item) return { success: false, error: "Manutenção não encontrada." };
    return { success: true, data: serializeManutencao(item) };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao carregar manutenção.") };
  }
}

export async function deleteManutencao(id: string): Promise<ActionResult> {
  try {
    const imobId = await getActiveImobId();
    const item = await prisma.manutencao.findFirst({
      where: { id, imobId },
      include: { descontos: { where: { status: "APLICADO" }, select: { id: true } } },
    });
    if (!item) return { success: false, error: "Manutenção não encontrada." };
    if (item.descontos.length > 0) {
      return { success: false, error: "Não é possível excluir uma manutenção com desconto aplicado." };
    }

    await prisma.manutencao.delete({ where: { id } });
    revalidatePath("/manutencoes");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao excluir manutenção.") };
  }
}

export async function uploadDocumentoManutencao(
  formData: FormData,
): Promise<ActionResult<DocumentoManutencaoInput>> {
  try {
    await getActiveImobId();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Selecione um documento." };
    }
    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
      return { success: false, error: "Envie um PDF, JPG, PNG ou WEBP." };
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      return { success: false, error: "O documento deve ter no máximo 10 MB." };
    }

    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const storageKey = `manutencoes/documentos/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const isMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";
    let url: string;

    if (isMock) {
      url = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else {
      const params = {
        Bucket: bucketName,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
      };
      try {
        await s3Client.send(new PutObjectCommand(params));
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== "NoSuchBucket") throw error;
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        await s3Client.send(new PutObjectCommand(params));
      }
      const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
      url = `${endpoint.replace(/\/$/, "")}/${bucketName}/${storageKey}`;
    }

    return {
      success: true,
      data: {
        nomeOriginal: file.name,
        url,
        storageKey,
        mimeType: file.type,
        tamanhoBytes: file.size,
      },
    };
  } catch (error) {
    return { success: false, error: asErrorMessage(error, "Erro ao enviar documento.") };
  }
}
